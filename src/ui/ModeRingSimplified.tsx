/**
 * Simplified 24-hour ring visualization.
 *
 * Shows dominant mode per hour segment based on precedence.
 * Handles overlapping chronotypes (Aurora, etc.) cleanly.
 *
 * Ring shows: Temporal flow (what's active WHEN)
 * Legend shows: All modes with full context (handled separately)
 */

import { useMemo } from 'react';
import type { BaselineMode } from '../types.js';
import type { Mode, ModeWindow } from '../types/modeStates.js';
import { colors, typography } from './tokens.js';

interface ModeRingSimplifiedProps {
  modeWindows: ModeWindow[];
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  onHourClick?: (hour: number, dominantMode: Mode | null) => void;
  size?: number;
}

// Mode precedence for overlaps (highest stakes first)
const MODE_PRECEDENCE: Mode[] = [
  'EVALUATION',  // Highest stakes (Too Late discovery)
  'FRAMING',     // High stakes (Too Late discovery)
  'SYNTHESIS',   // Medium stakes (Tomorrow discovery)
  'EXECUTION',   // Low stakes (Immediate discovery)
  'REFLECTION',  // Opportunistic
];

// Mode colors
const MODE_COLORS: Record<Mode, string> = {
  EVALUATION: colors.modes.EVALUATION.primary,
  FRAMING: colors.modes.FRAMING.primary,
  SYNTHESIS: colors.modes.SYNTHESIS.primary,
  EXECUTION: colors.modes.EXECUTION.primary,
  REFLECTION: colors.modes.REFLECTION.primary,
};

// Mode abbreviations for ring labels
const MODE_ABBREV: Record<Mode, string> = {
  EVALUATION: 'EVA',
  FRAMING: 'FRA',
  SYNTHESIS: 'SYN',
  EXECUTION: 'EXE',
  REFLECTION: 'REF',
};

/**
 * Convert time string (HH:MM) to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if an hour (0-23) falls within a time window.
 */
function isHourInWindow(hour: number, window: { start: string; end: string }): boolean {
  if (!window.start || !window.end) return false;

  const windowStart = timeToMinutes(window.start);
  const windowEnd = timeToMinutes(window.end);
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;

  return hourStart < windowEnd && windowStart < hourEnd;
}

/**
 * Get all active modes at a given hour.
 */
function getActiveModesAtHour(hour: number, modeWindows: ModeWindow[]): Mode[] {
  return modeWindows
    .filter(mw => mw.state !== 'SILENCE' && isHourInWindow(hour, mw.fragmentation.baselineWindow))
    .map(mw => mw.mode);
}

/**
 * Get the dominant (highest precedence) mode at a given hour.
 */
function getDominantMode(hour: number, modeWindows: ModeWindow[]): Mode | null {
  const activeModes = getActiveModesAtHour(hour, modeWindows);

  if (activeModes.length === 0) return null;

  for (const mode of MODE_PRECEDENCE) {
    if (activeModes.includes(mode)) {
      return mode;
    }
  }

  return activeModes[0];
}

/**
 * Convert hour (0-23) to angle in radians.
 * 0° (top) = 12 o'clock, clockwise
 */
function hourToAngle(hour: number): number {
  // Map 0-24 hours to full circle, starting from top
  return ((hour / 24) * 2 * Math.PI) - (Math.PI / 2);
}

/**
 * Create SVG arc path.
 */
function createArcPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number
): string {
  // Handle small arcs
  const angleDiff = endAngle - startAngle;
  const largeArc = angleDiff > Math.PI ? 1 : 0;

  const x1 = cx + Math.cos(startAngle) * outerRadius;
  const y1 = cy + Math.sin(startAngle) * outerRadius;
  const x2 = cx + Math.cos(endAngle) * outerRadius;
  const y2 = cy + Math.sin(endAngle) * outerRadius;
  const x3 = cx + Math.cos(endAngle) * innerRadius;
  const y3 = cy + Math.sin(endAngle) * innerRadius;
  const x4 = cx + Math.cos(startAngle) * innerRadius;
  const y4 = cy + Math.sin(startAngle) * innerRadius;

  return `
    M ${x1} ${y1}
    A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
    Z
  `;
}

export function ModeRingSimplified({
  modeWindows,
  hoveredMode,
  onModeHover,
  onHourClick,
  size = 360,
}: ModeRingSimplifiedProps) {
  const center = size / 2;
  const ringRadius = size / 2 - 50; // Leave space for hour labels outside
  const ringWidth = 40;
  const innerRadius = ringRadius - ringWidth / 2;
  const outerRadius = ringRadius + ringWidth / 2;

  // Current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentAngle = hourToAngle(currentHour + currentMinutes / 60);

  // Build hourly segments
  const hourlySegments = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      dominantMode: getDominantMode(hour, modeWindows),
      activeModes: getActiveModesAtHour(hour, modeWindows),
    }));
  }, [modeWindows]);

  // Compute mode spans (consecutive hours with same dominant mode) for labeling
  const modeSpans = useMemo(() => {
    const spans: Array<{ mode: Mode; startHour: number; endHour: number }> = [];
    let currentMode: Mode | null = null;
    let spanStart = 0;

    for (let hour = 0; hour < 24; hour++) {
      const mode = hourlySegments[hour].dominantMode;
      if (mode !== currentMode) {
        if (currentMode) {
          spans.push({ mode: currentMode, startHour: spanStart, endHour: hour });
        }
        currentMode = mode;
        spanStart = hour;
      }
    }
    // Close final span
    if (currentMode) {
      spans.push({ mode: currentMode, startHour: spanStart, endHour: 24 });
    }

    // Filter to spans with at least 2 hours (enough room for label)
    return spans.filter(s => s.endHour - s.startHour >= 2);
  }, [hourlySegments]);

  // Hour labels (every 3 hours)
  const hourLabels = useMemo(() => {
    return [0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
      const angle = hourToAngle(hour);
      const labelRadius = outerRadius + 20;
      const x = center + Math.cos(angle) * labelRadius;
      const y = center + Math.sin(angle) * labelRadius;

      const label = hour === 0 ? '12a' :
                   hour < 12 ? `${hour}a` :
                   hour === 12 ? '12p' :
                   `${hour - 12}p`;

      return { hour, x, y, label };
    });
  }, [center, outerRadius]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      data-testid="mode-ring-simplified"
    >
      <svg width={size} height={size}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={ringRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={ringWidth}
          opacity={0.3}
        />

        {/* Hour segments */}
        {hourlySegments.map(segment => {
          if (!segment.dominantMode) return null;

          const startAngle = hourToAngle(segment.hour);
          const endAngle = hourToAngle(segment.hour + 1);
          const modeColor = MODE_COLORS[segment.dominantMode];
          const isHovered = hoveredMode === segment.dominantMode;
          const isDimmed = hoveredMode !== null && !isHovered;

          return (
            <path
              key={segment.hour}
              d={createArcPath(startAngle, endAngle, innerRadius, outerRadius, center, center)}
              fill={modeColor}
              opacity={isDimmed ? 0.3 : isHovered ? 1 : 0.85}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={() => onModeHover?.(segment.dominantMode!)}
              onMouseLeave={() => onModeHover?.(null)}
              onClick={() => onHourClick?.(segment.hour, segment.dominantMode)}
            >
              <title>
                {segment.hour}:00 – {(segment.hour + 1) % 24}:00{'\n'}
                {segment.dominantMode}
                {segment.activeModes.length > 1 && `\n(${segment.activeModes.length} modes active)`}
              </title>
            </path>
          );
        })}

        {/* Mode abbreviation labels inside ring */}
        {modeSpans.map((span) => {
          const midHour = (span.startHour + span.endHour) / 2;
          const midAngle = hourToAngle(midHour);
          const labelRadius = ringRadius; // Center of ring
          const x = center + Math.cos(midAngle) * labelRadius;
          const y = center + Math.sin(midAngle) * labelRadius;
          const modeColor = MODE_COLORS[span.mode];
          const isHovered = hoveredMode === span.mode;
          const isDimmed = hoveredMode !== null && !isHovered;

          return (
            <text
              key={`mode-${span.mode}-${span.startHour}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isDimmed ? '#9ca3af' : '#ffffff'}
              fontSize="10"
              fontWeight="700"
              style={{
                textShadow: `0 1px 2px ${modeColor}`,
                pointerEvents: 'none',
                opacity: isDimmed ? 0.4 : 1,
              }}
            >
              {MODE_ABBREV[span.mode]}
            </text>
          );
        })}

        {/* Hour labels */}
        {hourLabels.map(({ hour, x, y, label }) => (
          <text
            key={`label-${hour}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#6b7280"
            fontSize="12"
            fontWeight="600"
          >
            {label}
          </text>
        ))}

        {/* Current time indicator line */}
        <line
          x1={center + Math.cos(currentAngle) * innerRadius}
          y1={center + Math.sin(currentAngle) * innerRadius}
          x2={center + Math.cos(currentAngle) * (outerRadius + 5)}
          y2={center + Math.sin(currentAngle) * (outerRadius + 5)}
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Current time indicator dot */}
        <circle
          cx={center + Math.cos(currentAngle) * (outerRadius + 5)}
          cy={center + Math.sin(currentAngle) * (outerRadius + 5)}
          r="5"
          fill="#ef4444"
        />

        {/* Center content */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.h2,
            fill: colors.text.primary,
            fontSize: '1.25rem',
          }}
        >
          {currentTimeStr}
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.caption,
            fill: colors.text.muted,
            fontSize: '0.6875rem',
          }}
        >
          24-hour view
        </text>
      </svg>
    </div>
  );
}

/**
 * Export helper for legend component.
 */
export { getActiveModesAtHour, getDominantMode, MODE_PRECEDENCE };
