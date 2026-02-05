/**
 * Interactive mode legend component.
 *
 * Shows all modes with full time ranges, color-coded,
 * with explicit overlap indicators.
 *
 * Complements the simplified ring by showing WHAT and for HOW LONG.
 */

import type { BaselineMode } from '../types.js';
import type { Mode, ModeWindow, ModeStateValue } from '../types/modeStates.js';
import { colors, radius, spacing, transitions } from './tokens.js';
import { MODE_PRECEDENCE } from './ModeRingSimplified.js';

interface ModeLegendProps {
  modeWindows: ModeWindow[];
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  onModeClick?: (mode: Mode) => void;
  baselineWindows?: Array<{ mode: string; start: string; end: string }>;
}

// Mode labels
const MODE_LABELS: Record<Mode, string> = {
  EVALUATION: 'Evaluation',
  FRAMING: 'Framing',
  SYNTHESIS: 'Synthesis',
  EXECUTION: 'Execution',
  REFLECTION: 'Reflection',
};

// State badge configuration
const STATE_BADGES: Record<ModeStateValue, { label: string; color: string; bgColor: string }> = {
  INTACT: { label: 'Intact', color: '#059669', bgColor: '#d1fae5' },
  AVAILABLE: { label: 'Available', color: '#2563eb', bgColor: '#dbeafe' },
  FRAGMENTED: { label: 'Fragmented', color: '#d97706', bgColor: '#fef3c7' },
  DEFERRED: { label: 'Deferred', color: '#7c3aed', bgColor: '#ede9fe' },
  STRAINED: { label: 'Strained', color: '#ea580c', bgColor: '#ffedd5' },
  WITHHELD: { label: 'Withheld', color: '#6b7280', bgColor: '#f3f4f6' },
  SILENCE: { label: 'Silent', color: '#6b7280', bgColor: '#f3f4f6' },
};

/**
 * Convert time string (HH:MM) to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time windows overlap.
 */
function windowsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string }
): boolean {
  if (!a.start || !a.end || !b.start || !b.end) return false;

  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Find overlap range between two windows.
 */
function getOverlapRange(
  a: { start: string; end: string },
  b: { start: string; end: string }
): { start: string; end: string } | null {
  if (!windowsOverlap(a, b)) return null;

  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);

  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    start: formatTime(overlapStart),
    end: formatTime(overlapEnd),
  };
}

/**
 * Detect all overlapping mode pairs.
 */
function detectOverlaps(modeWindows: ModeWindow[]): Array<{
  modes: Mode[];
  timeRange: string;
  dominantMode: Mode;
}> {
  const validModes = modeWindows.filter(
    mw => mw.state !== 'SILENCE' && mw.fragmentation.baselineWindow.start
  );

  const overlaps: Array<{ modes: Mode[]; timeRange: string; dominantMode: Mode }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < validModes.length; i++) {
    for (let j = i + 1; j < validModes.length; j++) {
      const a = validModes[i];
      const b = validModes[j];

      const overlapRange = getOverlapRange(
        a.fragmentation.baselineWindow,
        b.fragmentation.baselineWindow
      );

      if (overlapRange) {
        const key = `${overlapRange.start}-${overlapRange.end}`;
        if (!seen.has(key)) {
          seen.add(key);

          // Find all modes that overlap in this range
          const overlapModes = validModes
            .filter(mw => windowsOverlap(mw.fragmentation.baselineWindow, overlapRange))
            .map(mw => mw.mode);

          // Determine dominant mode
          let dominantMode = overlapModes[0];
          for (const mode of MODE_PRECEDENCE) {
            if (overlapModes.includes(mode)) {
              dominantMode = mode;
              break;
            }
          }

          overlaps.push({
            modes: overlapModes,
            timeRange: `${overlapRange.start}–${overlapRange.end}`,
            dominantMode,
          });
        }
      }
    }
  }

  return overlaps;
}

/**
 * Convert ISO datetime string to HH:mm format.
 */
function isoToHHMM(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function ModeLegend({
  modeWindows,
  hoveredMode,
  onModeHover,
  onModeClick,
  baselineWindows = [],
}: ModeLegendProps) {
  const visibleModes = modeWindows.filter(mw => mw.state !== 'SILENCE');
  const overlaps = detectOverlaps(modeWindows);

  // Create a lookup map for baseline windows by mode
  const baselineByMode: Record<string, { start: string; end: string }> = {};
  for (const bw of baselineWindows) {
    baselineByMode[bw.mode] = {
      start: isoToHHMM(bw.start),
      end: isoToHHMM(bw.end),
    };
  }

  return (
    <div style={{ marginTop: spacing.lg }}>
      {/* Header */}
      <div
        style={{
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: colors.text.muted,
          fontWeight: 600,
          marginBottom: spacing.sm,
        }}
      >
        Cognitive Modes
      </div>

      {/* Mode list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
        }}
      >
        {visibleModes.map(mw => {
          const isHovered = hoveredMode === mw.mode;
          const isDimmed = hoveredMode !== null && hoveredMode !== mw.mode;
          const badge = STATE_BADGES[mw.state];
          const isNonIdeal = mw.state !== 'INTACT' && mw.state !== 'AVAILABLE';

          return (
            <div
              key={mw.mode}
              onMouseEnter={() => onModeHover?.(mw.mode)}
              onMouseLeave={() => onModeHover?.(null)}
              onClick={() => onModeClick?.(mw.mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                backgroundColor: isHovered ? colors.bg.hover : 'transparent',
                border: isHovered ? `1px solid ${colors.border.light}` : '1px solid transparent',
                opacity: isDimmed ? 0.4 : 1,
                transition: `all ${transitions.fast}`,
              }}
            >
              {/* Color indicator */}
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  backgroundColor: colors.modes[mw.mode].primary,
                  flexShrink: 0,
                }}
              />

              {/* Mode name */}
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: colors.text.primary,
                  minWidth: '85px',
                }}
              >
                {MODE_LABELS[mw.mode]}
              </div>

              {/* Time range - always show baseline, even for WITHHELD */}
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontFamily: "'SF Mono', 'Monaco', monospace",
                  color: colors.text.tertiary,
                }}
              >
                {(() => {
                  const fragStart = mw.fragmentation.baselineWindow.start;
                  const fragEnd = mw.fragmentation.baselineWindow.end;
                  // Use fragmentation baseline if available, otherwise fallback to baselineWindows lookup
                  if (fragStart && fragEnd) {
                    return `${fragStart} – ${fragEnd}`;
                  }
                  const baseline = baselineByMode[mw.mode];
                  if (baseline) {
                    return `${baseline.start} – ${baseline.end}`;
                  }
                  return '–';
                })()}
              </div>

              {/* State badge (if non-ideal) */}
              {isNonIdeal && (
                <div
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: badge.bgColor,
                    color: badge.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginLeft: 'auto',
                  }}
                >
                  {badge.label}
                </div>
              )}

              {/* Chevron */}
              <div
                style={{
                  marginLeft: isNonIdeal ? spacing.xs : 'auto',
                  color: colors.text.muted,
                  fontSize: '0.875rem',
                }}
              >
                ›
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlap indicators */}
      {overlaps.length > 0 && (
        <div style={{ marginTop: spacing.md }}>
          {overlaps.map((overlap, idx) => (
            <div
              key={idx}
              style={{
                marginTop: spacing.sm,
                padding: spacing.md,
                backgroundColor: '#fef3c7',
                borderLeft: '3px solid #f59e0b',
                borderRadius: radius.sm,
                fontSize: '0.75rem',
                lineHeight: 1.5,
                color: '#92400e',
              }}
            >
              <strong>
                {overlap.modes.length} modes overlap {overlap.timeRange}
              </strong>
              <br />
              <span style={{ color: '#b45309' }}>
                {MODE_LABELS[overlap.dominantMode]} takes priority for high-stakes decisions.
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
