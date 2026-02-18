/**
 * Mode state display card.
 *
 * Shows mode name, state badge, time window, and failure signature.
 * Three-level progressive disclosure:
 * 1. Always visible: Mode name, badges, baseline, headline
 * 2. "More" section: Structural explanation + actionable advice
 * 3. "Examples" section: Use-case list
 *
 * Critical UX rules:
 * - Zero-friction override (no confirmation dialogs)
 * - Both "More" and "Examples" collapsed by default on flagged cards
 * - Language must be concrete, not technical
 * - Never use "should", "recommended", "optimal"
 */

import { useState } from 'react';
import type { ModeWindow, ModeStateValue, Mode } from '../types/modeStates.js';
import { colors, radius, spacing, typography, transitions } from './tokens.js';

interface ModeStateDisplayProps {
  modeWindow: ModeWindow;
  isHovered?: boolean;
  isDimmed?: boolean;
  onHover?: (mode: string | null) => void;
  baselineWindows?: Array<{ mode: string; start: string; end: string }>;
  postLunchDip?: { start: string; end: string } | null;
  selectedDate?: string;
  defaultCollapsed?: boolean;
}

type TemporalStatus = 'upcoming' | 'active' | 'passed';

function getTemporalStatus(
  windows: Array<{ start: string; end: string }>,
  selectedDate: string
): { status: TemporalStatus; nextAt?: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (selectedDate > todayStr) return { status: 'upcoming' };
  if (selectedDate < todayStr) return { status: 'passed' };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let earliestStart: number | null = null;
  let nextSegmentStart: number | null = null;

  for (const win of windows) {
    if (!win.start || !win.end) continue;
    let winStart = timeToMinutes(win.start);
    let winEnd = timeToMinutes(win.end);
    if (winEnd < winStart) winEnd += 24 * 60;

    if (currentMinutes >= winStart && currentMinutes < winEnd) {
      return { status: 'active' };
    }
    if (earliestStart === null || winStart < earliestStart) earliestStart = winStart;
    if (winStart > currentMinutes && (nextSegmentStart === null || winStart < nextSegmentStart)) {
      nextSegmentStart = winStart;
    }
  }

  if (earliestStart !== null && currentMinutes < earliestStart) return { status: 'upcoming' };
  if (nextSegmentStart !== null) {
    const hours = Math.floor(nextSegmentStart / 60);
    const mins = nextSegmentStart % 60;
    return { status: 'upcoming', nextAt: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}` };
  }
  return { status: 'passed' };
}

const STATE_COLORS: Record<ModeStateValue, { bg: string; text: string; border: string }> = {
  INTACT: { bg: '#d1fae5', text: '#059669', border: '#a7f3d0' },
  FRAGMENTED: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
  DEFERRED: { bg: '#ede9fe', text: '#7c3aed', border: '#ddd6fe' },
  STRAINED: { bg: '#ffedd5', text: '#ea580c', border: '#fed7aa' },
  AVAILABLE: { bg: '#dbeafe', text: '#2563eb', border: '#bfdbfe' },
  WITHHELD: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  SILENCE: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
};

const STATE_LABELS: Record<ModeStateValue, string> = {
  INTACT: 'Intact',
  FRAGMENTED: 'Fragmented',
  DEFERRED: 'Disrupted',
  STRAINED: 'Strained',
  AVAILABLE: 'Available',
  WITHHELD: 'Withheld',
  SILENCE: 'Silent',
};

const TEMPORAL_STATUS_COLORS: Record<TemporalStatus, { bg: string; text: string; border: string }> = {
  active: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  upcoming: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  passed: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
};

const TEMPORAL_STATUS_LABELS: Record<TemporalStatus, string> = {
  active: 'Active now',
  upcoming: 'Upcoming',
  passed: 'Passed',
};

// Headlines per mode (from spec)
const HEADLINES: Record<Mode, Record<string, string>> = {
  EVALUATION: {
    WITHHELD: 'Your judgment window is interrupted — decisions here need a second look',
    INTACT: 'Conditions support clear judgment',
  },
  FRAMING: {
    DEFERRED: 'Interruptions may cause you to frame the wrong problem',
    WITHHELD: 'Problem definition is not supported right now',
    INTACT: 'Good time to define the problem',
  },
  SYNTHESIS: {
    FRAGMENTED: 'Work here may have gaps you won\'t catch until tomorrow',
    WITHHELD: 'Integration is not supported right now',
    INTACT: 'Good window to integrate ideas',
  },
  EXECUTION: {
    STRAINED: 'Execution window is heavily broken up — expect slower throughput',
    FRAGMENTED: 'Execution window is heavily broken up — expect slower throughput',
    WITHHELD: 'Execution is severely degraded',
    INTACT: 'Flow conditions',
  },
  REFLECTION: {
    FRAGMENTED: 'Reflection window is too fragmented for effective review',
    AVAILABLE: 'Protected low-pressure window — good time to step back',
    SILENCE: '',
  },
};

function getModeColors(mode: Mode) {
  return colors.modes[mode] || {
    primary: colors.text.secondary,
    bg: colors.bg.subtle,
    border: colors.border.subtle,
    text: colors.text.secondary,
  };
}

function isWarningState(state: ModeStateValue): boolean {
  return !['INTACT', 'AVAILABLE'].includes(state);
}

function getCardBorderColor(state: ModeStateValue, mode: Mode): string {
  const modeColors = getModeColors(mode);
  if (state === 'WITHHELD') return colors.border.default;
  if (isWarningState(state)) return '#fbbf24';
  return modeColors.border;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isoToHHMM(iso: string): string {
  const date = new Date(iso);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function checkDipOverlap(
  modeWindows: Array<{ start: string; end: string }>,
  dip: { start: string; end: string }
): 'inside' | 'adjacent' | null {
  const dipStart = timeToMinutes(dip.start);
  const dipEnd = timeToMinutes(dip.end);
  const adjacencyBuffer = 30;

  for (const win of modeWindows) {
    if (!win.start || !win.end) continue;
    let modeStart = timeToMinutes(win.start);
    let modeEnd = timeToMinutes(win.end);
    if (modeEnd < modeStart) modeEnd += 24 * 60;

    if (modeStart <= dipStart && dipEnd <= modeEnd) return 'inside';
    if (modeStart < dipEnd && dipStart < modeEnd) return 'inside';
    if (
      (modeEnd >= dipStart - adjacencyBuffer && modeEnd <= dipStart) ||
      (modeStart >= dipEnd && modeStart <= dipEnd + adjacencyBuffer)
    ) {
      return 'adjacent';
    }
  }
  return null;
}

// "What's happening" templates
function getWhatsHappening(mode: Mode, fragmentation: ModeWindow['fragmentation']): string {
  const conflicts = fragmentation.conflicts;
  const segments = fragmentation.availablePortions;
  const n = conflicts.length;

  if (n === 0) return '';

  const firstConflict = conflicts[0];
  const label = firstConflict?.label;
  const time = firstConflict?.start || '';
  const segmentDurations = segments.map(s => {
    const start = timeToMinutes(s.start);
    const end = timeToMinutes(s.end);
    return end - start;
  });
  const shortestSegment = Math.min(...segmentDurations);

  switch (mode) {
    case 'EVALUATION':
      if (n === 1) {
        const segDesc = segmentDurations.length === 2
          ? `segments of ${segmentDurations[0]} and ${segmentDurations[1]} minutes`
          : `${segments.length} segments`;
        return label
          ? `${label} at ${time} breaks your judgment window into ${segDesc}.`
          : `A commitment at ${time} breaks your judgment window into ${segDesc}.`;
      }
      return `${n} commitments break your judgment window into ${segments.length} segments. The shortest is ${shortestSegment} minutes — not enough to reach reliable assessment depth.`;

    case 'FRAMING':
      if (n === 1) {
        return label
          ? `${label} at ${time} interrupts problem definition — you may restart with different assumptions and not notice.`
          : `A block at ${time} interrupts problem definition — you may restart with different assumptions and not notice.`;
      }
      return `${n} interruptions prevent sustained problem definition. Each restart risks reframing without realizing it.`;

    case 'SYNTHESIS':
      if (n === 1) {
        return label
          ? `${label} at ${time} splits your integration window. You'll need to rebuild context — some threads may not reconnect.`
          : `A block at ${time} splits your integration window. You'll need to rebuild context — some threads may not reconnect.`;
      }
      return `${n} interruptions break integration into ${segments.length} pieces. Each context switch drops threads that feel connected but aren't.`;

    case 'EXECUTION':
      return `${n} interruption${n !== 1 ? 's' : ''} reduce your execution window to ${Math.round(fragmentation.percentageAvailable * 100)}% availability.`;

    case 'REFLECTION':
      return 'Your reflection window is too fragmented for sustained review.';

    default:
      return '';
  }
}

// "What to do" templates
function getWhatToDo(mode: Mode, fragmentation: ModeWindow['fragmentation']): string {
  const conflicts = fragmentation.conflicts;
  const segments = fragmentation.availablePortions;
  const n = conflicts.length;
  const isSingle = n === 1;

  // Find longest segment
  let longestSegment = segments[0];
  let longestDuration = 0;
  for (const seg of segments) {
    const duration = timeToMinutes(seg.end) - timeToMinutes(seg.start);
    if (duration > longestDuration) {
      longestDuration = duration;
      longestSegment = seg;
    }
  }

  switch (mode) {
    case 'EVALUATION':
      return isSingle
        ? 'If you evaluate during this window, plan to revisit the decision tomorrow with fresh eyes.'
        : 'Defer critical evaluation to a cleaner day, or block-protect one segment before your first interruption.';

    case 'FRAMING':
      return isSingle
        ? 'Write down your assumptions before the interruption and check them after.'
        : `Keep framing to the longest unbroken segment (${longestDuration} min starting at ${longestSegment?.start || ''}), or defer to a cleaner window.`;

    case 'SYNTHESIS':
      return isSingle
        ? 'Draft during the longer segment and review tomorrow to catch gaps.'
        : `Use the longest unbroken segment (${longestDuration} min) for your core draft. Treat everything else as notes to integrate later.`;

    case 'EXECUTION':
      return `Front-load the most important tasks into the longest segment (${longestDuration} min starting at ${longestSegment?.start || ''}).`;

    case 'REFLECTION':
      return 'Save reflection for a quieter block, or keep it to quick notes.';

    default:
      return '';
  }
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
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [examplesExpanded, setExamplesExpanded] = useState(false);

  const { mode, state, window, failureSignature, fragmentation } = modeWindow;
  const stateColor = STATE_COLORS[state];
  const modeColors = getModeColors(mode);
  const hasWarning = isWarningState(state);
  const hasFragmentation = fragmentation.hasFragmentation;

  const modeBaselineWindows = baselineWindows.filter(b => b.mode === mode);
  const hasSplitWindows = modeBaselineWindows.length > 1;

  const modeTimeWindows = modeBaselineWindows.length > 0
    ? modeBaselineWindows.map(bw => ({ start: isoToHHMM(bw.start), end: isoToHHMM(bw.end) }))
    : [fragmentation.baselineWindow];
  const temporalStatus = getTemporalStatus(modeTimeWindows, selectedDate);
  const temporalColor = TEMPORAL_STATUS_COLORS[temporalStatus.status];
  const temporalLabel = temporalStatus.nextAt
    ? `Next at ${temporalStatus.nextAt}`
    : TEMPORAL_STATUS_LABELS[temporalStatus.status];

  const baselineDisplay = (() => {
    if (modeBaselineWindows.length > 0) {
      return modeBaselineWindows.map(bw => `${isoToHHMM(bw.start)} – ${isoToHHMM(bw.end)}`).join(' + ');
    }
    if (fragmentation.baselineWindow.start && fragmentation.baselineWindow.end) {
      return `${fragmentation.baselineWindow.start} – ${fragmentation.baselineWindow.end}`;
    }
    if (window.start && window.end) return `${window.start} – ${window.end}`;
    return '';
  })();

  // Get headline from spec
  const headline = HEADLINES[mode]?.[state] || failureSignature.consequence;

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
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: modeColors.primary,
          flexShrink: 0,
        }} />
        <span style={{
          fontWeight: 600,
          fontSize: '0.875rem',
          color: colors.text.primary,
          minWidth: '85px',
        }}>
          {mode}
        </span>
        <span style={{
          fontFamily: "'SF Mono', 'Monaco', monospace",
          fontSize: '0.75rem',
          color: colors.text.muted,
        }}>
          {baselineDisplay}
        </span>
        <span style={{
          marginLeft: 'auto',
          padding: '2px 8px',
          background: temporalColor.bg,
          border: `1px solid ${temporalColor.border}`,
          borderRadius: '9999px',
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: temporalColor.text,
        }}>
          {temporalLabel}
        </span>
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
      tabIndex={0}
    >
      {/* Header: Mode name + badges */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
      }}>
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

        {hasWarning && (
          <span style={{
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

        <span style={{
          marginLeft: 'auto',
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
      </div>

      {/* Baseline time */}
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

      {/* Energy dip warning */}
      {(() => {
        if (!postLunchDip) return null;
        const modeBaseWindows = modeBaselineWindows.length > 0
          ? modeBaselineWindows.map(bw => ({ start: isoToHHMM(bw.start), end: isoToHHMM(bw.end) }))
          : [fragmentation.baselineWindow];
        const dipOverlap = checkDipOverlap(modeBaseWindows, postLunchDip);
        if (!dipOverlap) return null;
        return (
          <div style={{ marginBottom: spacing.xs }}>
            <span style={{
              ...typography.label,
              color: '#92400e',
              fontSize: '0.6875rem',
            }}>
              {dipOverlap === 'inside'
                ? `Energy dip expected ${postLunchDip.start}–${postLunchDip.end}. Front-load demanding work before ${postLunchDip.start}.`
                : `Energy dip nearby (${postLunchDip.start}–${postLunchDip.end})`}
            </span>
          </div>
        );
      })()}

      {/* HEADLINE - most prominent text */}
      <p style={{
        ...typography.bodySmall,
        color: hasWarning ? '#92400e' : colors.text.tertiary,
        fontWeight: hasWarning ? 600 : 400,
        fontSize: hasWarning ? '0.9375rem' : '0.8125rem',
        margin: 0,
        marginTop: spacing.sm,
        lineHeight: 1.5,
      }}>
        {headline}
      </p>

      {/* "More" section - collapsed by default */}
      {hasWarning && hasFragmentation && (
        <div style={{ marginTop: spacing.md }}>
          <button
            onClick={() => setMoreExpanded(!moreExpanded)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              ...typography.label,
              color: colors.text.secondary,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: moreExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${transitions.normal}`,
              fontSize: '0.5rem',
            }}>
              ▼
            </span>
            More
          </button>

          {moreExpanded && (
            <div style={{
              marginTop: spacing.sm,
              padding: spacing.md,
              background: '#fef3c7',
              borderRadius: radius.sm,
            }}>
              {/* What's happening */}
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
                {getWhatsHappening(mode, fragmentation)}
              </p>

              {/* Available segments */}
              {fragmentation.totalAvailableMinutes > 0 && (
                <p style={{
                  ...typography.label,
                  fontFamily: "'SF Mono', 'Monaco', monospace",
                  color: '#92400e',
                  fontSize: '0.75rem',
                  margin: 0,
                  marginBottom: spacing.sm,
                }}>
                  Available: {fragmentation.availablePortions.map(p => `${p.start}–${p.end}`).join(', ')} ({fragmentation.totalAvailableMinutes} min total)
                </p>
              )}

              {/* What to do */}
              <p style={{
                ...typography.label,
                color: '#92400e',
                marginBottom: spacing.xs,
                fontWeight: 600,
              }}>
                What to do:
              </p>
              <p style={{
                ...typography.bodySmall,
                color: '#92400e',
                margin: 0,
                lineHeight: 1.6,
              }}>
                {getWhatToDo(mode, fragmentation)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* "Examples" section - collapsed by default */}
      {failureSignature.applicationExamples && failureSignature.applicationExamples.length > 0 && (
        <div style={{ marginTop: spacing.md }}>
          <button
            onClick={() => setExamplesExpanded(!examplesExpanded)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              ...typography.label,
              color: colors.text.secondary,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: examplesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${transitions.normal}`,
              fontSize: '0.5rem',
            }}>
              ▼
            </span>
            Examples
          </button>

          {examplesExpanded && (
            <div style={{
              marginTop: spacing.sm,
              padding: spacing.sm,
              background: colors.bg.subtle,
              borderRadius: radius.sm,
            }}>
              <p style={{
                ...typography.caption,
                color: colors.text.muted,
                margin: 0,
              }}>
                <span style={{ fontWeight: 500 }}>Use this window for:</span>{' '}
                {failureSignature.applicationExamples.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
