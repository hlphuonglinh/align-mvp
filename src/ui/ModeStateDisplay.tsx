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
// Discovery labels no longer used directly - plain English messages shown instead
import { colors, radius, spacing, typography, transitions } from './tokens.js';

interface ModeStateDisplayProps {
  modeWindow: ModeWindow;
  isHovered?: boolean;
  isDimmed?: boolean;
  onHover?: (mode: string | null) => void;
  baselineWindows?: Array<{ mode: string; start: string; end: string }>;
  /** Post-lunch dip window if applicable (from chronotype template) */
  postLunchDip?: { start: string; end: string } | null;
  /** Selected date for determining temporal status (YYYY-MM-DD) */
  selectedDate?: string;
  /** Whether to start collapsed (for clean/passed modes) */
  defaultCollapsed?: boolean;
}

/**
 * Temporal status for time-aware badges.
 */
type TemporalStatus = 'upcoming' | 'active' | 'passed';

/**
 * Get temporal status of a window based on current time and selected date.
 * Returns: 'upcoming' if before window, 'active' if inside, 'passed' if after.
 * Handles split windows (returns 'active' if in ANY segment).
 */
function getTemporalStatus(
  windows: Array<{ start: string; end: string }>,
  selectedDate: string
): { status: TemporalStatus; nextAt?: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // If viewing future date, all windows are upcoming
  if (selectedDate > todayStr) {
    return { status: 'upcoming' };
  }

  // If viewing past date, all windows have passed
  if (selectedDate < todayStr) {
    return { status: 'passed' };
  }

  // Viewing today - compare with current time
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let latestEnd = 0;
  let earliestStart: number | null = null;
  let nextSegmentStart: number | null = null;

  for (const win of windows) {
    if (!win.start || !win.end) continue;

    let winStart = timeToMinutes(win.start);
    let winEnd = timeToMinutes(win.end);

    // Handle midnight wraparound
    if (winEnd < winStart) {
      winEnd += 24 * 60;
    }

    // Check if current time is inside this window
    if (currentMinutes >= winStart && currentMinutes < winEnd) {
      return { status: 'active' };
    }

    // Track earliest start for upcoming calculation
    if (earliestStart === null || winStart < earliestStart) {
      earliestStart = winStart;
    }

    // Track latest end
    if (winEnd > latestEnd) {
      latestEnd = winEnd;
    }

    // Track next segment that starts after current time
    if (winStart > currentMinutes && (nextSegmentStart === null || winStart < nextSegmentStart)) {
      nextSegmentStart = winStart;
    }
  }

  // If current time is before all windows
  if (earliestStart !== null && currentMinutes < earliestStart) {
    return { status: 'upcoming' };
  }

  // If there's a next segment (for split windows)
  if (nextSegmentStart !== null) {
    const hours = Math.floor(nextSegmentStart / 60);
    const mins = nextSegmentStart % 60;
    return { status: 'upcoming', nextAt: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}` };
  }

  // Current time is after all windows
  return { status: 'passed' };
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
  DEFERRED: 'Disrupted',  // Disrupted reflects structural reality (not user choice)
  STRAINED: 'Strained',
  AVAILABLE: 'Available',
  WITHHELD: 'Withheld',
  SILENCE: 'Silent',
};

/**
 * Temporal status colors and labels.
 */
const TEMPORAL_STATUS_COLORS: Record<TemporalStatus, { bg: string; text: string; border: string }> = {
  active: {
    bg: '#dcfce7',  // vibrant green
    text: '#15803d',
    border: '#86efac',
  },
  upcoming: {
    bg: '#dbeafe',  // blue/neutral
    text: '#1d4ed8',
    border: '#93c5fd',
  },
  passed: {
    bg: '#f3f4f6',  // grey/muted
    text: '#6b7280',
    border: '#e5e7eb',
  },
};

const TEMPORAL_STATUS_LABELS: Record<TemporalStatus, string> = {
  active: 'Active now',
  upcoming: 'Upcoming',
  passed: 'Passed',
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
 * Get mode-specific failure risk description.
 * Describes the CONSEQUENCE of fragmentation in plain language.
 */
function getModeFailureRisk(mode: Mode, segmentCount: number): string {
  const isHeavy = segmentCount > 2;

  switch (mode) {
    case 'FRAMING':
      return isHeavy
        ? 'Heavy fragmentation makes it very likely you solve the wrong problem'
        : 'You may solve the wrong problem without realizing it';
    case 'SYNTHESIS':
      return isHeavy
        ? 'Heavy fragmentation makes hidden gaps very likely'
        : 'The result may feel done but have blind spots you won\'t see until later';
    case 'EVALUATION':
      return isHeavy
        ? 'Heavy fragmentation makes blind spots very likely'
        : 'Decisions may feel solid but miss what fell through the gaps';
    case 'EXECUTION':
      return 'Throughput drops but errors stay visible';
    case 'REFLECTION':
      return 'Hard to step back when constantly interrupted';
    default:
      return 'Fragmentation degrades reliability';
  }
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

/**
 * Convert ISO datetime string to HH:mm format.
 */
function isoToHHMM(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Check if a mode window overlaps with or is adjacent to the post-lunch dip.
 * Returns: 'inside' if dip is inside the window, 'adjacent' if within 30 min, or null if no overlap.
 * Handles midnight wraparound for windows crossing midnight.
 */
function checkDipOverlap(
  modeWindows: Array<{ start: string; end: string }>,
  dip: { start: string; end: string }
): 'inside' | 'adjacent' | null {
  const dipStart = timeToMinutes(dip.start);
  const dipEnd = timeToMinutes(dip.end);
  const adjacencyBuffer = 30; // 30 minutes

  for (const win of modeWindows) {
    if (!win.start || !win.end) continue;

    let modeStart = timeToMinutes(win.start);
    let modeEnd = timeToMinutes(win.end);

    // Handle midnight wraparound (e.g., 22:00 - 00:30 becomes 22:00 - 24:30)
    if (modeEnd < modeStart) {
      modeEnd += 24 * 60;
    }

    // Check if dip is fully inside the mode window
    if (modeStart <= dipStart && dipEnd <= modeEnd) {
      return 'inside';
    }

    // Check for actual overlap (not just adjacent)
    if (modeStart < dipEnd && dipStart < modeEnd) {
      return 'inside';
    }

    // Check for adjacency (within 30 minutes)
    // Adjacent before: mode ends within 30 min before dip starts
    // Adjacent after: mode starts within 30 min after dip ends
    if (
      (modeEnd >= dipStart - adjacencyBuffer && modeEnd <= dipStart) ||
      (modeStart >= dipEnd && modeStart <= dipEnd + adjacencyBuffer)
    ) {
      return 'adjacent';
    }
  }

  return null;
}

export function ModeStateDisplay({
  modeWindow,
  isHovered = false,
  isDimmed = false,
  onHover,
  baselineWindows = [],
  postLunchDip = null,
  selectedDate = new Date().toISOString().split('T')[0],
  defaultCollapsed = false,
}: ModeStateDisplayProps) {
  // Clean modes start collapsed, flagged modes start expanded
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  // For expanded cards, controls showing extra details
  const initialExpanded = !['INTACT', 'AVAILABLE'].includes(modeWindow.state);
  const [expanded, setExpanded] = useState(initialExpanded);

  const { mode, state, window, failureSignature, fragmentation } = modeWindow;
  const stateColor = STATE_COLORS[state];
  const modeColors = getModeColors(mode);
  const hasWarning = isWarningState(state);
  const hasFragmentation = fragmentation.hasFragmentation;
  const hasDetails = failureSignature.applicationExamples || failureSignature.examples || failureSignature.overrideAdvice || hasFragmentation;

  // Get all baseline windows for this mode (handles split windows)
  const modeBaselineWindows = baselineWindows.filter(b => b.mode === mode);
  const hasSplitWindows = modeBaselineWindows.length > 1;

  // Calculate temporal status for time-aware badge
  const modeTimeWindows = modeBaselineWindows.length > 0
    ? modeBaselineWindows.map(bw => ({ start: isoToHHMM(bw.start), end: isoToHHMM(bw.end) }))
    : [fragmentation.baselineWindow];
  const temporalStatus = getTemporalStatus(modeTimeWindows, selectedDate);
  const temporalColor = TEMPORAL_STATUS_COLORS[temporalStatus.status];
  const temporalLabel = temporalStatus.nextAt
    ? `Next at ${temporalStatus.nextAt}`
    : TEMPORAL_STATUS_LABELS[temporalStatus.status];

  // Always show full baseline window(s) - with fallback
  const baselineDisplay = (() => {
    // First try modeBaselineWindows (handles split windows)
    if (modeBaselineWindows.length > 0) {
      return modeBaselineWindows
        .map(bw => `${isoToHHMM(bw.start)} – ${isoToHHMM(bw.end)}`)
        .join(' + ');
    }
    // Fallback to fragmentation.baselineWindow
    if (fragmentation.baselineWindow.start && fragmentation.baselineWindow.end) {
      return `${fragmentation.baselineWindow.start} – ${fragmentation.baselineWindow.end}`;
    }
    if (window.start && window.end) {
      return `${window.start} – ${window.end}`;
    }
    return '';
  })();

  // Available portions display for fragmented states
  const availableDisplay = hasFragmentation && fragmentation.availablePortions.length > 0
    ? fragmentation.availablePortions.map(p => `${p.start}–${p.end}`).join(', ')
    : null;

  // Compact single-line view for collapsed clean modes
  if (isCollapsed && !hasWarning) {
    return (
      <div
        data-testid={`mode-state-${mode.toLowerCase()}`}
        onClick={() => setIsCollapsed(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: `${spacing.sm} ${spacing.md}`,
          background: colors.bg.subtle,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.md,
          opacity: isDimmed ? 0.4 : 1,
          transition: `opacity ${transitions.fast}, background ${transitions.fast}`,
          cursor: 'pointer',
        }}
        onMouseEnter={() => onHover?.(mode)}
        onMouseLeave={() => onHover?.(null)}
      >
        {/* Mode color indicator */}
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: modeColors.primary,
          flexShrink: 0,
        }} />
        {/* Mode name */}
        <span style={{
          fontWeight: 600,
          fontSize: '0.875rem',
          color: colors.text.primary,
          minWidth: '85px',
        }}>
          {mode}
        </span>
        {/* Time range */}
        <span style={{
          fontFamily: "'SF Mono', 'Monaco', monospace",
          fontSize: '0.75rem',
          color: colors.text.muted,
        }}>
          {baselineDisplay}
        </span>
        {/* Temporal badge */}
        <span style={{
          marginLeft: 'auto',
          padding: `2px 8px`,
          background: temporalColor.bg,
          border: `1px solid ${temporalColor.border}`,
          borderRadius: '9999px',
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: temporalColor.text,
        }}>
          {temporalLabel}
        </span>
        {/* Expand indicator */}
        <span style={{ color: colors.text.muted, fontSize: '0.75rem' }}>›</span>
      </div>
    );
  }

  return (
    <div
      data-testid={`mode-state-${mode.toLowerCase()}`}
      style={{
        padding: spacing.lg,
        background: hasWarning ? 'rgba(251, 191, 36, 0.05)' : modeColors.bg,
        border: `1px solid ${getCardBorderColor(state, mode)}`,
        borderLeft: hasWarning ? '3px solid #f59e0b' : `1px solid ${getCardBorderColor(state, mode)}`,
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

            {/* Temporal status badge (time-aware) */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: `${spacing.xs} ${spacing.sm}`,
              background: temporalColor.bg,
              border: `1px solid ${temporalColor.border}`,
              borderRadius: '9999px',
              ...typography.label,
              color: temporalColor.text,
              fontWeight: 500,
            }}>
              {temporalLabel}
            </span>

            {/* State badge (shown additionally for warning states) */}
            {hasWarning && (
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
            )}
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
              {hasSplitWindows && (
                <span style={{
                  ...typography.label,
                  color: '#7c3aed',
                  fontSize: '0.625rem',
                  marginLeft: spacing.sm,
                  padding: '1px 4px',
                  background: '#ede9fe',
                  borderRadius: '3px',
                }}>
                  SPLIT
                </span>
              )}
            </div>
          )}

          {/* Post-lunch dip warning - only show if mode window overlaps or is adjacent */}
          {(() => {
            if (!postLunchDip) return null;

            // Get all windows for this mode (including split windows)
            const modeBaseWindows = modeBaselineWindows.length > 0
              ? modeBaselineWindows.map(bw => ({ start: isoToHHMM(bw.start), end: isoToHHMM(bw.end) }))
              : [fragmentation.baselineWindow];

            const dipOverlap = checkDipOverlap(modeBaseWindows, postLunchDip);

            if (!dipOverlap) return null;

            const dipTime = `${postLunchDip.start}–${postLunchDip.end}`;

            return (
              <div style={{ marginBottom: spacing.xs }}>
                <span style={{
                  ...typography.label,
                  fontFamily: "'SF Mono', 'Monaco', monospace",
                  color: '#92400e',
                  fontSize: '0.6875rem',
                }}>
                  {dipOverlap === 'inside'
                    ? `⚠️ Energy dip expected ${dipTime}. Front-load demanding work before ${postLunchDip.start}.`
                    : `⚠️ Energy dip nearby (${dipTime})`}
                </span>
              </div>
            );
          })()}

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

      {/* Mini timeline bar - subtle, smaller */}
      {hasFragmentation && fragmentation.baselineWindow.start && fragmentation.baselineWindow.end && (
        <div style={{ marginTop: spacing.xs, marginBottom: spacing.sm, opacity: 0.7 }}>
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
              opacity: 0.6,
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
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Consequence text - warning headline, most prominent */}
      <p style={{
        ...typography.bodySmall,
        color: hasWarning ? '#92400e' : colors.text.tertiary,
        fontWeight: hasWarning ? 500 : 400,
        fontSize: hasWarning ? '0.875rem' : '0.8125rem',
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
                    {fragmentation.totalAvailableMinutes > 0 && (
                      <span style={{ display: 'block', marginTop: spacing.xs }}>
                        Available: {fragmentation.availablePortions.map(p => `${p.start}–${p.end}`).join(', ')} ({fragmentation.totalAvailableMinutes} min total)
                      </span>
                    )}
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
                    {getModeFailureRisk(mode, fragmentation.availablePortions.length)}
                  </p>
                </div>
              )}

              {/* Application examples - compact display */}
              {failureSignature.applicationExamples && failureSignature.applicationExamples.length > 0 && (
                <div style={{
                  marginBottom: spacing.md,
                  padding: spacing.sm,
                  background: colors.bg.subtle,
                  borderRadius: radius.sm,
                }}>
                  <p style={{
                    ...typography.caption,
                    color: colors.text.muted,
                    margin: 0,
                  }}>
                    <span style={{ fontWeight: 500 }}>Examples:</span>{' '}
                    {failureSignature.applicationExamples.slice(0, 3).join(', ')}
                    {failureSignature.applicationExamples.length > 3 && '...'}
                  </p>
                </div>
              )}

              {/* NOTE: Conflicting unavailable times moved to left column in layout */}

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

              {/* Timing notice - shown for warning states with non-immediate discovery */}
              {hasWarning && failureSignature.discoveryWindow !== 'IMMEDIATE' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  marginBottom: spacing.md,
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: failureSignature.discoveryWindow === 'TOO_LATE'
                    ? '#fef2f2'
                    : '#fefce8',
                  borderRadius: radius.sm,
                }}>
                  <span style={{
                    ...typography.label,
                    color: failureSignature.discoveryWindow === 'TOO_LATE'
                      ? '#b91c1c'
                      : '#a16207',
                    fontWeight: 500,
                  }}>
                    {failureSignature.discoveryWindow === 'TOO_LATE'
                      ? "If something goes wrong, you might not realize until it's too late to fix"
                      : "If something goes wrong, you'll likely notice by tomorrow"}
                  </span>
                </div>
              )}

              {/* Note: Action buttons removed - "Do it anyway" and "Clear conflicts" had no functionality */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
