/**
 * Simplified 24-hour ring visualization.
 *
 * Shows dominant mode per hour segment based on precedence.
 * Handles overlapping chronotypes (Aurora, etc.) cleanly.
 * Supports split windows (Twilight/Nocturne Execution have 2 windows).
 * Handles midnight wraparound (windows crossing midnight).
 *
 * Ring shows: Temporal flow (what's active WHEN)
 * Legend shows: All modes with full context (handled separately)
 */

import { useMemo } from 'react';
import type { BaselineMode, BaselineWindow } from '../types.js';
import type { Mode, ModeWindow } from '../types/modeStates.js';
import { colors, typography } from './tokens.js';

interface ModeRingSimplifiedProps {
  modeWindows: ModeWindow[];
  baselineWindows?: BaselineWindow[];  // Raw baseline windows (includes split windows)
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  onHourClick?: (hour: number, dominantMode: Mode | null) => void;
  size?: number;
  /** Unavailable time blocks to show as gaps on the ring */
  unavailableTimes?: Array<{ id: string; start: string; end: string }>;
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

// Mode abbreviations for ring labels (3-letter)
const MODE_ABBREV: Record<Mode, string> = {
  EVALUATION: 'EVA',
  FRAMING: 'FRA',
  SYNTHESIS: 'SYN',
  EXECUTION: 'EXE',
  REFLECTION: 'REF',
};

// 1-letter abbreviations for very small segments
const MODE_ABBREV_SHORT: Record<Mode, string> = {
  EVALUATION: 'E',
  FRAMING: 'F',
  SYNTHESIS: 'S',
  EXECUTION: 'X',
  REFLECTION: 'R',
};

/**
 * Convert time string (HH:MM) to minutes since midnight.
 * Handles times > 24:00 for midnight wraparound (e.g., "25:00" = 1500 minutes = 1:00 AM next day).
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get start and end hours from a baseline window, handling midnight wraparound.
 * Returns { start, end, crossesMidnight } where times are in decimal hours.
 */
function getWindowHours(window: { start: string; end: string }): {
  startHours: number;
  endHours: number;
  crossesMidnight: boolean;
} {
  const startDate = new Date(window.start);
  const endDate = new Date(window.end);

  const startHours = startDate.getHours() + startDate.getMinutes() / 60;
  let endHours = endDate.getHours() + endDate.getMinutes() / 60;

  // Check if window crosses midnight (end is on a different day)
  const crossesMidnight = endDate.getDate() !== startDate.getDate() || endHours < startHours;

  // If crosses midnight, add 24 to end for calculations
  if (crossesMidnight && endHours <= startHours) {
    endHours += 24;
  }

  return { startHours, endHours, crossesMidnight };
}

/**
 * Check if an hour (0-23) falls within a baseline window.
 * Handles midnight wraparound (windows crossing midnight).
 */
function isHourInBaselineWindow(hour: number, window: { start: string; end: string }): boolean {
  if (!window.start || !window.end) return false;

  const { startHours, endHours, crossesMidnight } = getWindowHours(window);
  const hourStart = hour;
  const hourEnd = hour + 1;

  if (crossesMidnight) {
    // Window crosses midnight: check both ranges
    // Range 1: startHours to 24 (before midnight)
    // Range 2: 0 to endHours-24 (after midnight)
    const normalizedEndHours = endHours - 24;

    // Check if hour is in the before-midnight portion
    if (hourStart < 24 && startHours < 24) {
      if (hourStart < 24 && hourEnd > startHours) return true;
    }
    // Check if hour is in the after-midnight portion
    if (hourStart < normalizedEndHours) return true;

    return false;
  }

  // Normal window (doesn't cross midnight)
  return hourStart < endHours && startHours < hourEnd;
}

/**
 * Check if an hour (0-23) falls within a time window (HH:MM format).
 * Legacy function for modeWindows compatibility.
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
 * Get all active modes at a given hour using baseline windows.
 * Handles split windows (multiple windows per mode).
 */
function getActiveModesAtHourFromBaseline(hour: number, baselineWindows: BaselineWindow[]): Mode[] {
  const activeModes = new Set<Mode>();

  for (const bw of baselineWindows) {
    if (isHourInBaselineWindow(hour, { start: bw.start, end: bw.end })) {
      activeModes.add(bw.mode as Mode);
    }
  }

  return Array.from(activeModes);
}

/**
 * Get all active modes at a given hour using modeWindows (legacy).
 */
function getActiveModesAtHour(hour: number, modeWindows: ModeWindow[]): Mode[] {
  return modeWindows
    .filter(mw => mw.state !== 'SILENCE' && isHourInWindow(hour, mw.fragmentation.baselineWindow))
    .map(mw => mw.mode);
}

/**
 * Get the dominant (highest precedence) mode at a given hour.
 * Uses baselineWindows if provided, otherwise falls back to modeWindows.
 */
function getDominantMode(
  hour: number,
  modeWindows: ModeWindow[],
  baselineWindows?: BaselineWindow[]
): Mode | null {
  // Use baseline windows if provided (better accuracy for split windows)
  const activeModes = baselineWindows && baselineWindows.length > 0
    ? getActiveModesAtHourFromBaseline(hour, baselineWindows)
    : getActiveModesAtHour(hour, modeWindows);

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
  baselineWindows = [],
  hoveredMode,
  onModeHover,
  onHourClick,
  size = 360,
  unavailableTimes = [],
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

  // Check if an hour is within an unavailable block
  const isHourUnavailable = (hour: number): boolean => {
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;
    for (const ut of unavailableTimes) {
      const [utStartH, utStartM] = ut.start.split(':').map(Number);
      const [utEndH, utEndM] = ut.end.split(':').map(Number);
      const utStart = utStartH * 60 + utStartM;
      const utEnd = utEndH * 60 + utEndM;
      // Check if this hour overlaps with the unavailable block
      if (hourStart < utEnd && utStart < hourEnd) {
        return true;
      }
    }
    return false;
  };

  // Get mode state for visual styling
  const getModeState = (mode: Mode): string => {
    const mw = modeWindows.find(m => m.mode === mode);
    return mw?.state || 'INTACT';
  };

  // Build hourly segments using baselineWindows if available (handles split windows correctly)
  const hourlySegments = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const activeModes = baselineWindows.length > 0
        ? getActiveModesAtHourFromBaseline(hour, baselineWindows)
        : getActiveModesAtHour(hour, modeWindows);

      return {
        hour,
        dominantMode: getDominantMode(hour, modeWindows, baselineWindows),
        activeModes,
        isUnavailable: isHourUnavailable(hour),
      };
    });
  }, [modeWindows, baselineWindows, unavailableTimes]);

  // Compute mode spans (consecutive hours with same dominant mode) for labeling
  // ALL modes get labels now - using 1-letter abbreviations for small segments
  const modeSpans = useMemo(() => {
    const spans: Array<{
      mode: Mode;
      startHour: number;
      endHour: number;
      duration: number;
      labelType: 'full' | 'short' | 'external';
    }> = [];
    let currentMode: Mode | null = null;
    let spanStart = 0;

    for (let hour = 0; hour < 24; hour++) {
      const mode = hourlySegments[hour].dominantMode;
      if (mode !== currentMode) {
        if (currentMode) {
          const duration = hour - spanStart;
          spans.push({
            mode: currentMode,
            startHour: spanStart,
            endHour: hour,
            duration,
            // Label type based on duration:
            // >= 2 hours: full 3-letter abbreviation
            // 1-2 hours: 1-letter abbreviation
            // < 1 hour (0.5h): external label with leader line
            labelType: duration >= 2 ? 'full' : duration >= 1 ? 'short' : 'external',
          });
        }
        currentMode = mode;
        spanStart = hour;
      }
    }
    // Close final span
    if (currentMode) {
      const duration = 24 - spanStart;
      spans.push({
        mode: currentMode,
        startHour: spanStart,
        endHour: 24,
        duration,
        labelType: duration >= 2 ? 'full' : duration >= 1 ? 'short' : 'external',
      });
    }

    return spans;
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

        {/* Hour segments - with gap/degraded visualization */}
        {hourlySegments.map(segment => {
          if (!segment.dominantMode) return null;

          const startAngle = hourToAngle(segment.hour);
          const endAngle = hourToAngle(segment.hour + 1);
          const modeColor = MODE_COLORS[segment.dominantMode];
          const isHovered = hoveredMode === segment.dominantMode;
          const isDimmed = hoveredMode !== null && !isHovered;
          const modeState = getModeState(segment.dominantMode);

          // Show as gap if unavailable time overlaps this hour
          if (segment.isUnavailable) {
            return (
              <path
                key={segment.hour}
                d={createArcPath(startAngle, endAngle, innerRadius, outerRadius, center, center)}
                fill="#f3f4f6"
                opacity={isDimmed ? 0.2 : 0.4}
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
                  {segment.dominantMode} (blocked)
                </title>
              </path>
            );
          }

          // Determine visual treatment based on mode state
          let opacity = isDimmed ? 0.3 : isHovered ? 1 : 0.85;
          let strokeDasharray: string | undefined;

          if (modeState === 'WITHHELD') {
            opacity = isDimmed ? 0.2 : 0.4;
            strokeDasharray = '4 2';
          } else if (modeState === 'DEFERRED') {
            opacity = isDimmed ? 0.25 : 0.6;
          } else if (modeState === 'FRAGMENTED' || modeState === 'STRAINED') {
            opacity = isDimmed ? 0.3 : isHovered ? 1 : 0.75;
          }

          return (
            <path
              key={segment.hour}
              d={createArcPath(startAngle, endAngle, innerRadius, outerRadius, center, center)}
              fill={modeColor}
              opacity={opacity}
              stroke={strokeDasharray ? modeColor : undefined}
              strokeWidth={strokeDasharray ? 1 : undefined}
              strokeDasharray={strokeDasharray}
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
                {modeState !== 'INTACT' && modeState !== 'AVAILABLE' && ` (${modeState.toLowerCase()})`}
                {segment.activeModes.length > 1 && `\n(${segment.activeModes.length} modes active)`}
              </title>
            </path>
          );
        })}

        {/* Mode abbreviation labels - adapts to segment size */}
        {modeSpans.map((span) => {
          const midHour = (span.startHour + span.endHour) / 2;
          const midAngle = hourToAngle(midHour);
          const modeColor = MODE_COLORS[span.mode];
          const isHovered = hoveredMode === span.mode;
          const isDimmed = hoveredMode !== null && !isHovered;

          if (span.labelType === 'external') {
            // Very small segment: place label outside with leader line
            const arcRadius = ringRadius;
            const labelOuterRadius = outerRadius + 35;
            const arcX = center + Math.cos(midAngle) * arcRadius;
            const arcY = center + Math.sin(midAngle) * arcRadius;
            const labelX = center + Math.cos(midAngle) * labelOuterRadius;
            const labelY = center + Math.sin(midAngle) * labelOuterRadius;

            return (
              <g key={`mode-${span.mode}-${span.startHour}`}>
                {/* Leader line */}
                <line
                  x1={arcX}
                  y1={arcY}
                  x2={labelX}
                  y2={labelY}
                  stroke={modeColor}
                  strokeWidth="1"
                  opacity={isDimmed ? 0.3 : 0.6}
                />
                {/* External label */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isDimmed ? '#9ca3af' : modeColor}
                  fontSize="9"
                  fontWeight="700"
                  style={{
                    pointerEvents: 'none',
                    opacity: isDimmed ? 0.4 : 1,
                  }}
                >
                  {MODE_ABBREV_SHORT[span.mode]}
                </text>
              </g>
            );
          }

          // Normal label inside the ring
          const labelRadius = ringRadius;
          const x = center + Math.cos(midAngle) * labelRadius;
          const y = center + Math.sin(midAngle) * labelRadius;
          const abbrev = span.labelType === 'short' ? MODE_ABBREV_SHORT[span.mode] : MODE_ABBREV[span.mode];

          return (
            <text
              key={`mode-${span.mode}-${span.startHour}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isDimmed ? '#9ca3af' : '#ffffff'}
              fontSize={span.labelType === 'short' ? '11' : '10'}
              fontWeight="700"
              style={{
                textShadow: `0 1px 2px ${modeColor}`,
                pointerEvents: 'none',
                opacity: isDimmed ? 0.4 : 1,
              }}
            >
              {abbrev}
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
export { getActiveModesAtHour, getActiveModesAtHourFromBaseline, getDominantMode, MODE_PRECEDENCE };
