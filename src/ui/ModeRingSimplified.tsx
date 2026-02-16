/**
 * Zone-based 24-hour ring visualization.
 *
 * Shows 3 ZONES instead of 5 individual modes:
 * - PEAK zone: Union of Framing, Synthesis, Evaluation windows
 * - EXECUTION zone(s): May be split for Twilight/Nocturne
 * - REFLECTION zone
 *
 * The peak detail (F/S/E breakdown) is shown in a separate linear bar below.
 */

import { useMemo } from 'react';
import type { BaselineMode, BaselineWindow } from '../types.js';
import type { Mode, ModeWindow } from '../types/modeStates.js';
import { colors, typography } from './tokens.js';

interface ModeRingSimplifiedProps {
  modeWindows: ModeWindow[];
  baselineWindows?: BaselineWindow[];
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  onHourClick?: (hour: number, dominantMode: Mode | null) => void;
  size?: number;
  unavailableTimes?: Array<{ id: string; start: string; end: string }>;
}

// Zone types
type Zone = 'PEAK' | 'EXECUTION' | 'REFLECTION';

// Zone colors
const ZONE_COLORS: Record<Zone, string> = {
  PEAK: '#E8915A',      // Warm coral/amber
  EXECUTION: '#4CAF50', // Green
  REFLECTION: '#EC407A', // Pink/magenta
};

// Zone labels
const ZONE_LABELS: Record<Zone, string> = {
  PEAK: 'PEAK',
  EXECUTION: 'EXE',
  REFLECTION: 'REF',
};

// Peak modes (used to compute PEAK zone boundaries)
const PEAK_MODES: Mode[] = ['FRAMING', 'SYNTHESIS', 'EVALUATION'];

// Mode precedence for decision-making (exported for other components)
const MODE_PRECEDENCE: Mode[] = [
  'EVALUATION',
  'FRAMING',
  'SYNTHESIS',
  'EXECUTION',
  'REFLECTION',
];

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getWindowHours(window: { start: string; end: string }): {
  startHours: number;
  endHours: number;
} {
  const startDate = new Date(window.start);
  const endDate = new Date(window.end);

  const startHours = startDate.getHours() + startDate.getMinutes() / 60;
  let endHours = endDate.getHours() + endDate.getMinutes() / 60;

  // Handle midnight wraparound
  if (endDate.getDate() !== startDate.getDate() || endHours < startHours) {
    endHours += 24;
  }

  return { startHours, endHours };
}

function isHourInBaselineWindow(hour: number, window: { start: string; end: string }): boolean {
  if (!window.start || !window.end) return false;

  const { startHours, endHours } = getWindowHours(window);
  const hourStart = hour;
  const hourEnd = hour + 1;

  // Handle midnight wraparound
  if (endHours > 24) {
    const normalizedEnd = endHours - 24;
    if ((hourStart >= startHours && hourStart < 24) || hourStart < normalizedEnd) {
      return true;
    }
    return false;
  }

  return hourStart < endHours && startHours < hourEnd;
}

function isHourInWindow(hour: number, window: { start: string; end: string }): boolean {
  if (!window.start || !window.end) return false;

  const windowStart = timeToMinutes(window.start);
  const windowEnd = timeToMinutes(window.end);
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;

  return hourStart < windowEnd && windowStart < hourEnd;
}

function getActiveModesAtHourFromBaseline(hour: number, baselineWindows: BaselineWindow[]): Mode[] {
  const activeModes = new Set<Mode>();
  for (const bw of baselineWindows) {
    if (isHourInBaselineWindow(hour, { start: bw.start, end: bw.end })) {
      activeModes.add(bw.mode as Mode);
    }
  }
  return Array.from(activeModes);
}

function getActiveModesAtHour(hour: number, modeWindows: ModeWindow[]): Mode[] {
  return modeWindows
    .filter(mw => mw.state !== 'SILENCE' && isHourInWindow(hour, mw.fragmentation.baselineWindow))
    .map(mw => mw.mode);
}

function getDominantMode(
  hour: number,
  modeWindows: ModeWindow[],
  baselineWindows?: BaselineWindow[]
): Mode | null {
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

function hourToAngle(hour: number): number {
  return ((hour / 24) * 2 * Math.PI) - (Math.PI / 2);
}

function createArcPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number
): string {
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
  size = 360,
  unavailableTimes = [],
}: ModeRingSimplifiedProps) {
  const center = size / 2;
  const ringRadius = size / 2 - 50;
  const ringWidth = 24;
  const innerRadius = ringRadius - ringWidth / 2;
  const outerRadius = ringRadius + ringWidth / 2;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentAngle = hourToAngle(currentHour + currentMinutes / 60);

  // Compute zones from baseline windows
  const zones = useMemo(() => {
    const zoneArcs: Array<{
      zone: Zone;
      startHours: number;
      endHours: number;
    }> = [];

    // Group windows by mode
    const windowsByMode = new Map<Mode, { startHours: number; endHours: number }[]>();
    for (const bw of baselineWindows) {
      const mode = bw.mode as Mode;
      if (!windowsByMode.has(mode)) {
        windowsByMode.set(mode, []);
      }
      const { startHours, endHours } = getWindowHours(bw);
      windowsByMode.get(mode)!.push({ startHours, endHours });
    }

    // Fallback to modeWindows if no baselineWindows
    if (baselineWindows.length === 0) {
      for (const mw of modeWindows) {
        if (mw.state === 'SILENCE') continue;
        const { start, end } = mw.fragmentation.baselineWindow;
        if (!start || !end) continue;

        if (!windowsByMode.has(mw.mode)) {
          windowsByMode.set(mw.mode, []);
        }
        const startHours = timeToMinutes(start) / 60;
        let endHours = timeToMinutes(end) / 60;
        if (endHours < startHours) endHours += 24;
        windowsByMode.get(mw.mode)!.push({ startHours, endHours });
      }
    }

    // Compute PEAK zone (union of Framing, Synthesis, Evaluation)
    let peakStart = Infinity;
    let peakEnd = -Infinity;
    for (const mode of PEAK_MODES) {
      const windows = windowsByMode.get(mode) || [];
      for (const w of windows) {
        peakStart = Math.min(peakStart, w.startHours);
        peakEnd = Math.max(peakEnd, w.endHours);
      }
    }
    if (peakStart !== Infinity && peakEnd !== -Infinity) {
      zoneArcs.push({ zone: 'PEAK', startHours: peakStart, endHours: peakEnd });
    }

    // Add EXECUTION zone(s) - may be split
    const execWindows = windowsByMode.get('EXECUTION') || [];
    for (const w of execWindows) {
      zoneArcs.push({ zone: 'EXECUTION', startHours: w.startHours, endHours: w.endHours });
    }

    // Add REFLECTION zone
    const refWindows = windowsByMode.get('REFLECTION') || [];
    for (const w of refWindows) {
      zoneArcs.push({ zone: 'REFLECTION', startHours: w.startHours, endHours: w.endHours });
    }

    return zoneArcs;
  }, [baselineWindows, modeWindows]);

  // Check if a time range overlaps with unavailable blocks
  const getUnavailableOverlaps = (startHours: number, endHours: number): Array<{ start: number; end: number }> => {
    const overlaps: Array<{ start: number; end: number }> = [];
    for (const ut of unavailableTimes) {
      const [utStartH, utStartM] = ut.start.split(':').map(Number);
      const [utEndH, utEndM] = ut.end.split(':').map(Number);
      const utStart = utStartH + utStartM / 60;
      const utEnd = utEndH + utEndM / 60;
      if (startHours < utEnd && utStart < endHours) {
        overlaps.push({
          start: Math.max(startHours, utStart),
          end: Math.min(endHours, utEnd),
        });
      }
    }
    return overlaps;
  };

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

        {/* Zone arcs */}
        {zones.map((zoneArc, idx) => {
          const { zone, startHours, endHours } = zoneArc;
          const zoneColor = ZONE_COLORS[zone];
          const unavailableOverlaps = getUnavailableOverlaps(startHours, endHours);

          const formatHour = (h: number): string => {
            const hour = Math.floor(h % 24);
            const min = Math.round((h % 1) * 60);
            return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          };

          // Render zone arc(s) with gaps for unavailable times
          const arcElements: JSX.Element[] = [];

          if (unavailableOverlaps.length === 0) {
            // No gaps - render full arc
            const startAngle = hourToAngle(startHours);
            const endAngle = hourToAngle(endHours);

            arcElements.push(
              <path
                key={`zone-${zone}-${idx}`}
                d={createArcPath(startAngle, endAngle, innerRadius, outerRadius, center, center)}
                fill={zoneColor}
                opacity={0.85}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
              >
                <title>
                  {zone}: {formatHour(startHours)} – {formatHour(endHours % 24)}
                </title>
              </path>
            );
          } else {
            // Has gaps - render segments between unavailable times
            let currentStart = startHours;
            const sortedOverlaps = [...unavailableOverlaps].sort((a, b) => a.start - b.start);

            for (const overlap of sortedOverlaps) {
              if (currentStart < overlap.start) {
                const startAngle = hourToAngle(currentStart);
                const endAngle = hourToAngle(overlap.start);
                arcElements.push(
                  <path
                    key={`zone-${zone}-${idx}-before-${overlap.start}`}
                    d={createArcPath(startAngle, endAngle, innerRadius, outerRadius, center, center)}
                    fill={zoneColor}
                    opacity={0.85}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                  >
                    <title>{zone} ({formatHour(currentStart)} – {formatHour(overlap.start)})</title>
                  </path>
                );
              }
              currentStart = overlap.end;
            }

            // Render remaining segment after last gap
            if (currentStart < endHours) {
              const startAngle = hourToAngle(currentStart);
              const endAngle = hourToAngle(endHours);
              arcElements.push(
                <path
                  key={`zone-${zone}-${idx}-after`}
                  d={createArcPath(startAngle, endAngle, innerRadius, outerRadius, center, center)}
                  fill={zoneColor}
                  opacity={0.85}
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                >
                  <title>{zone} ({formatHour(currentStart)} – {formatHour(endHours % 24)})</title>
                </path>
              );
            }
          }

          return <g key={`zone-group-${zone}-${idx}`}>{arcElements}</g>;
        })}

        {/* Zone labels */}
        {zones.map((zoneArc, idx) => {
          const { zone, startHours, endHours } = zoneArc;
          const midHours = (startHours + endHours) / 2;
          const midAngle = hourToAngle(midHours % 24);
          const labelRadius = ringRadius;
          const x = center + Math.cos(midAngle) * labelRadius;
          const y = center + Math.sin(midAngle) * labelRadius;

          return (
            <text
              key={`zone-label-${zone}-${idx}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="700"
              style={{
                textShadow: `0 1px 2px ${ZONE_COLORS[zone]}`,
                pointerEvents: 'none',
              }}
            >
              {ZONE_LABELS[zone]}
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

        {/* Current time indicator */}
        <line
          x1={center + Math.cos(currentAngle) * innerRadius}
          y1={center + Math.sin(currentAngle) * innerRadius}
          x2={center + Math.cos(currentAngle) * (outerRadius + 5)}
          y2={center + Math.sin(currentAngle) * (outerRadius + 5)}
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
        />
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

// Export helpers for other components
export { getActiveModesAtHour, getActiveModesAtHourFromBaseline, getDominantMode, MODE_PRECEDENCE };

// Export peak zone computation for the linear bar
export function computePeakZone(baselineWindows: BaselineWindow[]): { start: number; end: number } | null {
  let peakStart = Infinity;
  let peakEnd = -Infinity;

  for (const bw of baselineWindows) {
    const mode = bw.mode as Mode;
    if (!PEAK_MODES.includes(mode)) continue;

    const { startHours, endHours } = getWindowHours(bw);
    peakStart = Math.min(peakStart, startHours);
    peakEnd = Math.max(peakEnd, endHours);
  }

  if (peakStart === Infinity || peakEnd === -Infinity) {
    return null;
  }

  return { start: peakStart, end: peakEnd };
}
