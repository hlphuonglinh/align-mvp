/**
 * Governor display component.
 *
 * Shows all mode states with failure signatures.
 * Sorts by discovery risk (TOO_LATE first).
 * Filters out SILENCE states (shows nothing for silent modes).
 */

import type { ModeGovernanceDecision, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { computeModeWindows, countFlaggedModes, extractUnavailableTimes } from '../utils/computeModeWindows.js';
import { ModeStateDisplay } from './ModeStateDisplay.js';
import { colors, spacing, typography } from './tokens.js';

interface GovernorDisplayProps {
  decisions: ModeGovernanceDecision[];
  constraints?: V1Constraint[];
  selectedDate?: string;
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  baselineWindows?: Array<{ mode: string; start: string; end: string }>;
  /** Post-lunch dip window from chronotype template */
  postLunchDip?: { start: string; end: string } | null;
}

export function GovernorDisplay({
  decisions,
  constraints = [],
  selectedDate = new Date().toISOString().slice(0, 10),
  hoveredMode,
  onModeHover,
  baselineWindows = [],
  postLunchDip = null,
}: GovernorDisplayProps) {
  // Extract unavailable times from constraints
  const unavailableTimes = extractUnavailableTimes(
    constraints.map(c => ({
      id: c.id,
      kind: c.kind,
      payload: c.payload as { dateISO?: string; allDay?: boolean; startLocal?: string; endLocal?: string; label?: string; breakType?: 'commitment' | 'rest' | 'unclassified' },
    })),
    selectedDate
  );

  // Compute mode windows with failure signatures and fragmentation analysis
  const modeWindows = computeModeWindows(decisions, unavailableTimes);

  // Filter out SILENCE states (per spec: "shows nothing")
  const visibleWindows = modeWindows.filter(mw => mw.state !== 'SILENCE');

  // Sort by priority: Flagged first (WITHHELD > DEFERRED > FRAGMENTED > STRAINED), then clean modes chronologically
  const statePriority: Record<string, number> = {
    WITHHELD: 4,
    DEFERRED: 3,
    FRAGMENTED: 2,
    STRAINED: 1,
    INTACT: 0,
    AVAILABLE: 0,
    SILENCE: -1,
  };

  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const sortedWindows = [...visibleWindows].sort((a, b) => {
    const aPriority = statePriority[a.state] ?? 0;
    const bPriority = statePriority[b.state] ?? 0;
    // Flagged modes first
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    // Same priority level: sort chronologically by window start time
    const aStart = timeToMinutes(a.fragmentation.baselineWindow.start);
    const bStart = timeToMinutes(b.fragmentation.baselineWindow.start);
    return aStart - bStart;
  });

  // Count flagged modes for header
  const flaggedCount = countFlaggedModes(visibleWindows);

  // Check if a mode is flagged (non-clean)
  const isFlagged = (state: string): boolean => {
    return !['INTACT', 'AVAILABLE'].includes(state);
  };

  // Find first upcoming mode for clean-day case (expand it instead of all collapsed)
  const getFirstUpcomingMode = (): string | null => {
    if (flaggedCount > 0) return null; // Don't apply this logic if there are flags

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const mw of sortedWindows) {
      const startTime = mw.fragmentation.baselineWindow.start;
      if (!startTime) continue;
      const startMinutes = timeToMinutes(startTime);
      if (startMinutes > currentMinutes) {
        return mw.mode; // First mode that hasn't started yet
      }
    }
    // If all modes have passed, return the first one
    return sortedWindows[0]?.mode || null;
  };

  const firstUpcomingMode = getFirstUpcomingMode();

  return (
    <div data-testid="governor-display">
      {/* Header */}
      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{
          ...typography.h2,
          marginBottom: spacing.xs,
        }}>
          Today's Windows
        </h2>
        <p style={{
          ...typography.bodySmall,
          color: colors.text.tertiary,
          margin: 0,
        }}>
          When each kind of thinking is most reliable.
          {flaggedCount > 0 && (
            <span style={{ color: colors.status.fragmented.text, fontWeight: 500 }}>
              {' '}{flaggedCount} mode{flaggedCount !== 1 ? 's' : ''} flagged.
            </span>
          )}
        </p>
      </div>

      {/* Mode cards */}
      {visibleWindows.length === 0 ? (
        <p style={{
          ...typography.bodySmall,
          color: colors.text.muted,
          padding: spacing.lg,
          textAlign: 'center',
        }}>
          No modes available right now.
        </p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}>
          {sortedWindows.map((modeWindow) => {
            // Determine if card should be collapsed
            // - Flagged modes: never collapsed
            // - Clean modes: collapsed unless it's the first upcoming on a clean day
            const shouldCollapse = !isFlagged(modeWindow.state) &&
              modeWindow.mode !== firstUpcomingMode;

            return (
              <ModeStateDisplay
                key={modeWindow.mode}
                modeWindow={modeWindow}
                isHovered={hoveredMode === modeWindow.mode}
                isDimmed={hoveredMode !== null && hoveredMode !== modeWindow.mode}
                onHover={(mode) => onModeHover?.(mode as BaselineMode | null)}
                baselineWindows={baselineWindows}
                postLunchDip={postLunchDip}
                selectedDate={selectedDate}
                defaultCollapsed={shouldCollapse}
              />
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: spacing.md,
        background: colors.bg.subtle,
        borderRadius: spacing.sm,
        ...typography.caption,
        color: colors.text.muted,
        lineHeight: 1.5,
      }}>
        <strong style={{ color: colors.text.tertiary }}>What this means:</strong>{' '}
        Align doesn't tell you what to do. It shows when the conditions are structurally
        reliable for each kind of thinking, and what might go wrong if they're not.
      </div>
    </div>
  );
}
