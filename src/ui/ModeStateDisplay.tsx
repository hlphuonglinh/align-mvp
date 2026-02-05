/**
 * Mode state display card.
 *
 * Shows mode name, state badge, time window, and failure signature.
 * Expandable details for ALL states with application examples.
 * Shows conflicting unavailable times for fragmented states.
 *
 * Critical UX rules:
 * - Zero-friction override (no confirmation dialogs)
 * - Expandable details hidden by default
 * - Language must be concrete, not technical
 * - Never use "should", "recommended", "optimal"
 */

import { useState } from 'react';
import type { ModeWindow, ModeStateValue, Mode } from '../types/modeStates.js';
import { DISCOVERY_WINDOW_LABELS } from '../constants/failureSignatures.js';
import { colors, radius, spacing, typography, transitions } from './tokens.js';

interface ModeStateDisplayProps {
  modeWindow: ModeWindow;
  isHovered?: boolean;
  isDimmed?: boolean;
  onHover?: (mode: string | null) => void;
  onEditConflict?: (id: string) => void;
  onHighlightConflict?: (conflict: { start: string; end: string }) => void;
}

/**
 * State badge colors.
 */
const STATE_COLORS: Record<ModeStateValue, { bg: string; text: string; border: string }> = {
  INTACT: {
    bg: '#d1fae5',
    text: '#059669',
    border: '#a7f3d0',
  },
  FRAGMENTED: {
    bg: '#fef3c7',
    text: '#d97706',
    border: '#fde68a',
  },
  DEFERRED: {
    bg: '#ede9fe',
    text: '#7c3aed',
    border: '#ddd6fe',
  },
  STRAINED: {
    bg: '#ffedd5',
    text: '#ea580c',
    border: '#fed7aa',
  },
  AVAILABLE: {
    bg: '#dbeafe',
    text: '#2563eb',
    border: '#bfdbfe',
  },
  WITHHELD: {
    bg: '#f3f4f6',
    text: '#6b7280',
    border: '#e5e7eb',
  },
  SILENCE: {
    bg: '#f3f4f6',
    text: '#6b7280',
    border: '#e5e7eb',
  },
};

/**
 * State display labels (human-readable).
 */
const STATE_LABELS: Record<ModeStateValue, string> = {
  INTACT: 'Intact',
  FRAGMENTED: 'Fragmented',
  DEFERRED: 'Deferred',
  STRAINED: 'Strained',
  AVAILABLE: 'Available',
  WITHHELD: 'Withheld',
  SILENCE: 'Silent',
};

/**
 * Get mode-specific colors from tokens.
 */
function getModeColors(mode: Mode) {
  return colors.modes[mode] || {
    primary: colors.text.secondary,
    bg: colors.bg.subtle,
    border: colors.border.subtle,
    text: colors.text.secondary,
  };
}

/**
 * Check if state is a warning state (non-ideal).
 */
function isWarningState(state: ModeStateValue): boolean {
  return !['INTACT', 'AVAILABLE'].includes(state);
}

/**
 * Get border color for card based on state.
 */
function getCardBorderColor(state: ModeStateValue, mode: Mode): string {
  const modeColors = getModeColors(mode);
  if (state === 'WITHHELD') return colors.border.default;
  if (isWarningState(state)) return '#fbbf24'; // amber
  return modeColors.border;
}

/**
 * Convert time string (HH:MM) to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert time to percentage of day (0-100).
 */
function timeToPercentOfDay(time: string): number {
  const minutes = timeToMinutes(time);
  return (minutes / (24 * 60)) * 100;
}

/**
 * Get window width as percentage of day.
 */
function getWindowWidthPercent(window: { start: string; end: string }): number {
  const startMinutes = timeToMinutes(window.start);
  const endMinutes = timeToMinutes(window.end);
  const duration = endMinutes - startMinutes;
  return (duration / (24 * 60)) * 100;
}

export function ModeStateDisplay({
  modeWindow,
  isHovered = false,
  isDimmed = false,
  onHover,
  onEditConflict,
  onHighlightConflict,
}: ModeStateDisplayProps) {
  // Auto-expand flagged modes (non-INTACT, non-AVAILABLE) to show structural cause immediately
  const initialExpanded = !['INTACT', 'AVAILABLE'].includes(modeWindow.state);
  const [expanded, setExpanded] = useState(initialExpanded);

  const { mode, state, window, failureSignature, fragmentation } = modeWindow;
  const stateColor = STATE_COLORS[state];
  const modeColors = getModeColors(mode);
  const hasWarning = isWarningState(state);
  const hasFragmentation = fragmentation.hasFragmentation;
  const hasDetails = failureSignature.applicationExamples || failureSignature.examples || failureSignature.overrideAdvice || hasFragmentation;

  // Always show full baseline window
  const baselineDisplay = fragmentation.baselineWindow.start && fragmentation.baselineWindow.end
    ? `${fragmentation.baselineWindow.start} – ${fragmentation.baselineWindow.end}`
    : window.start && window.end
    ? `${window.start} – ${window.end}`
    : '';

  // Available portions display for fragmented states
  const availableDisplay = hasFragmentation && fragmentation.availablePortions.length > 0
    ? fragmentation.availablePortions.map(p => `${p.start}–${p.end}`).join(', ')
    : null;

  // Discovery window label
  const discoveryLabel = DISCOVERY_WINDOW_LABELS[failureSignature.discoveryWindow];

  return (
    <div
      data-testid={`mode-state-${mode.toLowerCase()}`}
      style={{
        padding: spacing.lg,
        background: hasWarning ? 'rgba(251, 191, 36, 0.05)' : modeColors.bg,
        border: `1px solid ${getCardBorderColor(state, mode)}`,
        borderRadius: radius.md,
        opacity: isDimmed ? 0.4 : 1,
        transition: `opacity ${transitions.normal}, box-shadow ${transitions.normal}`,
        boxShadow: isHovered ? `0 0 0 2px ${modeColors.primary}40` : 'none',
        cursor: 'default',
      }}
      onMouseEnter={() => onHover?.(mode)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(mode)}
      onBlur={() => onHover?.(null)}
      tabIndex={0}
    >
      {/* Header: Mode name + State badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            {/* Mode color indicator */}
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: modeColors.primary,
            }} />
            <span style={{
              ...typography.h2,
              fontSize: '0.9375rem',
              color: colors.text.primary,
            }}>
              {mode}
            </span>

            {/* State badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: `${spacing.xs} ${spacing.sm}`,
              background: stateColor.bg,
              border: `1px solid ${stateColor.border}`,
              borderRadius: '9999px',
              ...typography.label,
              color: stateColor.text,
              fontWeight: 500,
            }}>
              {STATE_LABELS[state]}
            </span>
          </div>

          {/* Time windows - always show baseline */}
          {baselineDisplay && (
            <div style={{ marginBottom: spacing.xs }}>
              <span style={{
                ...typography.label,
                fontFamily: "'SF Mono', 'Monaco', monospace",
                color: colors.text.muted,
                fontSize: '0.75rem',
              }}>
                Baseline: {baselineDisplay}
              </span>
            </div>
          )}

          {/* Available portions - show if fragmented */}
          {hasFragmentation && availableDisplay && (
            <div>
              <span style={{
                ...typography.label,
                fontFamily: "'SF Mono', 'Monaco', monospace",
                color: '#dc2626',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}>
                Available: {availableDisplay} ({fragmentation.totalAvailableMinutes} min, {Math.round(fragmentation.percentageAvailable * 100)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mini timeline bar */}
      {fragmentation.baselineWindow.start && fragmentation.baselineWindow.end && (
        <div style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
          <div style={{
            position: 'relative',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            {/* Mode window (colored bar) */}
            <div style={{
              position: 'absolute',
              left: `${timeToPercentOfDay(fragmentation.baselineWindow.start)}%`,
              width: `${getWindowWidthPercent(fragmentation.baselineWindow)}%`,
              height: '100%',
              backgroundColor: modeColors.primary,
              opacity: 0.85,
            }} />

            {/* Unavailable blocks (red overlays) */}
            {fragmentation.conflicts.map((conflict, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${timeToPercentOfDay(conflict.start)}%`,
                  width: `${getWindowWidthPercent(conflict)}%`,
                  height: '100%',
                  backgroundColor: '#dc2626',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>

          {/* Time labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '3px',
            fontSize: '0.5625rem',
            color: colors.text.muted,
            fontFamily: "'SF Mono', 'Monaco', monospace",
          }}>
            <span>12a</span>
            <span>6a</span>
            <span>12p</span>
            <span>6p</span>
            <span>12a</span>
          </div>
        </div>
      )}

      {/* Consequence text */}
      <p style={{
        ...typography.bodySmall,
        color: hasWarning ? colors.text.secondary : colors.text.tertiary,
        margin: 0,
        lineHeight: 1.5,
      }}>
        {failureSignature.consequence}
      </p>

      {/* Expandable details for ALL states */}
      {hasDetails && (
        <div style={{ marginTop: spacing.md }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              ...typography.label,
              color: modeColors.primary,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${transitions.normal}`,
              fontSize: '0.5rem',
            }}>
              ▼
            </span>
            {expanded ? 'Less' : hasWarning ? 'Why?' : 'Examples'}
          </button>

          {expanded && (
            <div style={{ marginTop: spacing.md }}>
              {/* Structural cause - shown for non-ideal states with fragmentation */}
              {hasWarning && hasFragmentation && failureSignature.structuralCause && (
                <div style={{
                  padding: spacing.md,
                  background: '#fef3c7',
                  borderRadius: radius.sm,
                  marginBottom: spacing.md,
                }}>
                  <p style={{
                    ...typography.label,
                    color: '#92400e',
                    marginBottom: spacing.xs,
                    fontWeight: 600,
                  }}>
                    What's happening:
                  </p>
                  <p style={{
                    ...typography.bodySmall,
                    color: '#92400e',
                    margin: 0,
                    marginBottom: spacing.sm,
                    lineHeight: 1.6,
                  }}>
                    {failureSignature.structuralCause(fragmentation)}
                  </p>
                  <p style={{
                    ...typography.label,
                    color: '#92400e',
                    marginBottom: spacing.xs,
                    fontWeight: 600,
                  }}>
                    What might go wrong:
                  </p>
                  <p style={{
                    ...typography.bodySmall,
                    color: '#92400e',
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    {failureSignature.consequence}
                  </p>
                </div>
              )}

              {/* Application examples - shown for ALL states */}
              {failureSignature.applicationExamples && failureSignature.applicationExamples.length > 0 && (
                <div style={{ marginBottom: spacing.md }}>
                  <p style={{
                    ...typography.label,
                    color: colors.text.muted,
                    marginBottom: spacing.xs,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.6875rem',
                  }}>
                    Use this window for:
                  </p>
                  <ul style={{
                    margin: 0,
                    paddingLeft: spacing.lg,
                    ...typography.bodySmall,
                    color: colors.text.secondary,
                  }}>
                    {failureSignature.applicationExamples.map((example, i) => (
                      <li key={i} style={{ marginBottom: spacing.xs }}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conflicting unavailable times - from fragmentation analysis */}
              {hasFragmentation && fragmentation.conflicts.length > 0 && (
                <div style={{ marginBottom: spacing.md }}>
                  <p style={{
                    ...typography.label,
                    color: '#dc2626',
                    marginBottom: spacing.xs,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.6875rem',
                  }}>
                    Conflicting unavailable times:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                    {fragmentation.conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        onClick={() => onHighlightConflict?.({ start: conflict.start, end: conflict.end })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: radius.sm,
                          cursor: onHighlightConflict ? 'pointer' : 'default',
                        }}
                      >
                        <span style={{
                          ...typography.bodySmall,
                          fontFamily: "'SF Mono', 'Monaco', monospace",
                          color: colors.text.secondary,
                        }}>
                          {conflict.start} – {conflict.end}
                        </span>
                        {onEditConflict && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditConflict(conflict.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: `${spacing.xs} ${spacing.sm}`,
                              cursor: 'pointer',
                              ...typography.label,
                              color: '#dc2626',
                              fontWeight: 600,
                              textDecoration: 'underline',
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning-specific examples - shown only for warning states */}
              {hasWarning && failureSignature.examples && failureSignature.examples.length > 0 && (
                <div style={{ marginBottom: spacing.md }}>
                  <p style={{
                    ...typography.label,
                    color: colors.text.muted,
                    marginBottom: spacing.xs,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.6875rem',
                  }}>
                    Consider waiting for:
                  </p>
                  <ul style={{
                    margin: 0,
                    paddingLeft: spacing.lg,
                    ...typography.bodySmall,
                    color: colors.text.secondary,
                  }}>
                    {failureSignature.examples.map((example, i) => (
                      <li key={i} style={{ marginBottom: spacing.xs }}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Override advice */}
              {hasWarning && failureSignature.overrideAdvice && (
                <div style={{
                  padding: spacing.md,
                  background: colors.bg.subtle,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radius.sm,
                  marginBottom: spacing.md,
                }}>
                  <p style={{
                    ...typography.bodySmall,
                    color: colors.text.secondary,
                    margin: 0,
                    fontStyle: 'italic',
                  }}>
                    {failureSignature.overrideAdvice}
                  </p>
                </div>
              )}

              {/* Discovery window - shown for warning states */}
              {hasWarning && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  marginBottom: spacing.md,
                }}>
                  <span style={{
                    ...typography.label,
                    color: colors.text.muted,
                  }}>
                    Discovery:
                  </span>
                  <span style={{
                    ...typography.label,
                    color: failureSignature.discoveryWindow === 'TOO_LATE'
                      ? colors.status.caution.text
                      : failureSignature.discoveryWindow === 'TOMORROW'
                      ? colors.status.fragmented.text
                      : colors.text.tertiary,
                    fontWeight: 500,
                  }}>
                    {discoveryLabel}
                  </span>
                </div>
              )}

              {/* Action buttons - shown for warning states */}
              {hasWarning && (
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  <button
                    style={{
                      flex: 1,
                      ...typography.bodySmall,
                      background: colors.bg.hover,
                      color: colors.text.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: radius.sm,
                      padding: `${spacing.sm} ${spacing.md}`,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Do it anyway
                  </button>

                  {(state === 'DEFERRED' || hasFragmentation) && (
                    <button
                      style={{
                        flex: 1,
                        ...typography.bodySmall,
                        background: colors.text.primary,
                        color: colors.bg.page,
                        border: 'none',
                        borderRadius: radius.sm,
                        padding: `${spacing.sm} ${spacing.md}`,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {state === 'DEFERRED' ? 'Schedule for later' : 'Clear conflicts'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
