/**
 * Linear Peak Bar component.
 *
 * Shows the breakdown of Framing, Synthesis, and Evaluation
 * within the peak window as horizontal colored bars.
 *
 * Placed below the ring to provide "zoom in" detail on peak modes.
 */

import type { BaselineWindow } from '../types.js';
import type { Mode, ModeWindow, ModeStateValue } from '../types/modeStates.js';
import { colors, spacing, radius, typography } from './tokens.js';

interface PeakBarProps {
  baselineWindows: BaselineWindow[];
  modeWindows: ModeWindow[];
  unavailableTimes?: Array<{ id: string; start: string; end: string }>;
}

// Peak modes
const PEAK_MODES: Mode[] = ['FRAMING', 'EVALUATION', 'SYNTHESIS'];

// Mode colors matching the design tokens
const MODE_COLORS: Record<Mode, string> = {
  FRAMING: '#9575CD',   // Purple
  EVALUATION: '#FFB74D', // Amber
  SYNTHESIS: '#4DD0E1',  // Cyan
  EXECUTION: '#4CAF50',  // Green (not shown in peak bar)
  REFLECTION: '#EC407A', // Pink (not shown in peak bar)
};

// Mode abbreviations
const MODE_ABBREV: Record<Mode, string> = {
  FRAMING: 'FRA',
  EVALUATION: 'EVA',
  SYNTHESIS: 'SYN',
  EXECUTION: 'EXE',
  REFLECTION: 'REF',
};

// State badge labels
const STATE_LABELS: Record<ModeStateValue, string> = {
  INTACT: '',
  AVAILABLE: '',
  FRAGMENTED: 'Fragmented',
  DEFERRED: 'Disrupted',
  STRAINED: 'Strained',
  WITHHELD: 'Withheld',
  SILENCE: '',
};

// State badge colors
const STATE_COLORS: Record<ModeStateValue, { bg: string; text: string }> = {
  INTACT: { bg: 'transparent', text: 'transparent' },
  AVAILABLE: { bg: 'transparent', text: 'transparent' },
  FRAGMENTED: { bg: '#fef3c7', text: '#d97706' },
  DEFERRED: { bg: '#ede9fe', text: '#7c3aed' },
  STRAINED: { bg: '#ffedd5', text: '#ea580c' },
  WITHHELD: { bg: '#f3f4f6', text: '#6b7280' },
  SILENCE: { bg: 'transparent', text: 'transparent' },
};

function getWindowHours(window: { start: string; end: string }): {
  startHours: number;
  endHours: number;
} {
  const startDate = new Date(window.start);
  const endDate = new Date(window.end);

  const startHours = startDate.getHours() + startDate.getMinutes() / 60;
  let endHours = endDate.getHours() + endDate.getMinutes() / 60;

  if (endDate.getDate() !== startDate.getDate() || endHours < startHours) {
    endHours += 24;
  }

  return { startHours, endHours };
}

function formatHour(h: number): string {
  const hour = Math.floor(h % 24);
  const min = Math.round((h % 1) * 60);
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export function PeakBar({
  baselineWindows,
  modeWindows,
  unavailableTimes = [],
}: PeakBarProps) {
  // Compute peak zone boundaries
  let peakStart = Infinity;
  let peakEnd = -Infinity;

  const modeData: Array<{
    mode: Mode;
    startHours: number;
    endHours: number;
    state: ModeStateValue;
  }> = [];

  for (const bw of baselineWindows) {
    const mode = bw.mode as Mode;
    if (!PEAK_MODES.includes(mode)) continue;

    const { startHours, endHours } = getWindowHours(bw);
    peakStart = Math.min(peakStart, startHours);
    peakEnd = Math.max(peakEnd, endHours);

    // Get mode state from modeWindows
    const mw = modeWindows.find(m => m.mode === mode);
    const state = mw?.state || 'INTACT';

    modeData.push({ mode, startHours, endHours, state });
  }

  // If no peak modes found, don't render
  if (peakStart === Infinity || peakEnd === -Infinity || modeData.length === 0) {
    return null;
  }

  const peakDuration = peakEnd - peakStart;
  const barHeight = 12;
  const barGap = 4;
  const labelWidth = 80;

  // Check for unavailable time overlaps within a range
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

  // Sort modes by display order (FRA, EVA, SYN)
  const sortedModeData = [...modeData].sort((a, b) => {
    const order = ['FRAMING', 'EVALUATION', 'SYNTHESIS'];
    return order.indexOf(a.mode) - order.indexOf(b.mode);
  });

  return (
    <div
      style={{
        marginTop: spacing.lg,
        padding: spacing.md,
        background: colors.bg.subtle,
        borderRadius: radius.md,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: spacing.sm,
        }}
      >
        <span
          style={{
            ...typography.label,
            color: colors.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.6875rem',
          }}
        >
          Peak window
        </span>
        <span
          style={{
            fontFamily: "'SF Mono', 'Monaco', monospace",
            fontSize: '0.75rem',
            color: colors.text.tertiary,
          }}
        >
          {formatHour(peakStart)} – {formatHour(peakEnd % 24)}
        </span>
      </div>

      {/* Mode bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${barGap}px` }}>
        {sortedModeData.map(({ mode, startHours, endHours, state }) => {
          const unavailableOverlaps = getUnavailableOverlaps(startHours, endHours);
          const isFlagged = !['INTACT', 'AVAILABLE'].includes(state);

          // Calculate bar position as percentage of peak window
          const leftPercent = ((startHours - peakStart) / peakDuration) * 100;
          const widthPercent = ((endHours - startHours) / peakDuration) * 100;

          return (
            <div
              key={mode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              {/* Mode label and state badge */}
              <div
                style={{
                  width: `${labelWidth}px`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: MODE_COLORS[mode],
                  }}
                >
                  {MODE_ABBREV[mode]}
                </span>
                {isFlagged && STATE_LABELS[state] && (
                  <span
                    style={{
                      fontSize: '0.5625rem',
                      fontWeight: 600,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      backgroundColor: STATE_COLORS[state].bg,
                      color: STATE_COLORS[state].text,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {STATE_LABELS[state]}
                  </span>
                )}
              </div>

              {/* Bar container */}
              <div
                style={{
                  flex: 1,
                  height: `${barHeight}px`,
                  position: 'relative',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                {/* Render bar segments with gaps for unavailable times */}
                {unavailableOverlaps.length === 0 ? (
                  // No gaps - render full bar
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: '100%',
                      backgroundColor: MODE_COLORS[mode],
                      borderRadius: '4px',
                      opacity: isFlagged ? 0.7 : 1,
                    }}
                  />
                ) : (
                  // Has gaps - render segments
                  (() => {
                    const segments: JSX.Element[] = [];
                    let currentStart = startHours;
                    const sortedOverlaps = [...unavailableOverlaps].sort((a, b) => a.start - b.start);

                    for (const overlap of sortedOverlaps) {
                      if (currentStart < overlap.start) {
                        const segmentLeft = ((currentStart - peakStart) / peakDuration) * 100;
                        const segmentWidth = ((overlap.start - currentStart) / peakDuration) * 100;
                        segments.push(
                          <div
                            key={`segment-before-${overlap.start}`}
                            style={{
                              position: 'absolute',
                              left: `${segmentLeft}%`,
                              width: `${segmentWidth}%`,
                              height: '100%',
                              backgroundColor: MODE_COLORS[mode],
                              opacity: isFlagged ? 0.7 : 1,
                            }}
                          />
                        );
                      }
                      currentStart = overlap.end;
                    }

                    // Render remaining segment after last gap
                    if (currentStart < endHours) {
                      const segmentLeft = ((currentStart - peakStart) / peakDuration) * 100;
                      const segmentWidth = ((endHours - currentStart) / peakDuration) * 100;
                      segments.push(
                        <div
                          key="segment-after"
                          style={{
                            position: 'absolute',
                            left: `${segmentLeft}%`,
                            width: `${segmentWidth}%`,
                            height: '100%',
                            backgroundColor: MODE_COLORS[mode],
                            opacity: isFlagged ? 0.7 : 1,
                          }}
                        />
                      );
                    }

                    return segments;
                  })()
                )}
              </div>

              {/* Time range */}
              <span
                style={{
                  fontFamily: "'SF Mono', 'Monaco', monospace",
                  fontSize: '0.625rem',
                  color: colors.text.muted,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {formatHour(startHours)} – {formatHour(endHours % 24)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
