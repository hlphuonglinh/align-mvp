/**
 * Governor display component.
 *
 * Shows all mode states with failure signatures.
 * Sorts by discovery risk (TOO_LATE first).
 * Filters out SILENCE states (shows nothing for silent modes).
 */

import type { ModeGovernanceDecision, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { computeModeWindows, sortByDiscoveryRisk, countFlaggedModes, extractUnavailableTimes } from '../utils/computeModeWindows.js';
import { ModeStateDisplay } from './ModeStateDisplay.js';
import { colors, spacing, typography } from './tokens.js';

interface GovernorDisplayProps {
  decisions: ModeGovernanceDecision[];
  constraints?: V1Constraint[];
  selectedDate?: string;
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  onEditConflict?: (constraintId: string) => void;
  baselineWindows?: Array<{ mode: string; start: string; end: string }>;
}

export function GovernorDisplay({
  decisions,
  constraints = [],
  selectedDate = new Date().toISOString().slice(0, 10),
  hoveredMode,
  onModeHover,
  onEditConflict,
  baselineWindows = [],
}: GovernorDisplayProps) {
  // Extract unavailable times from constraints
  const unavailableTimes = extractUnavailableTimes(
    constraints.map(c => ({
      id: c.id,
      kind: c.kind,
      payload: c.payload as { dateISO?: string; allDay?: boolean; startLocal?: string; endLocal?: string },
    })),
    selectedDate
  );

  // Compute mode windows with failure signatures and fragmentation analysis
  const modeWindows = computeModeWindows(decisions, unavailableTimes);

  // Sort by discovery risk
  const sortedWindows = sortByDiscoveryRisk(modeWindows);

  // Filter out SILENCE states (per spec: "shows nothing")
  const visibleWindows = sortedWindows.filter(mw => mw.state !== 'SILENCE');

  // Count flagged modes for header
  const flaggedCount = countFlaggedModes(visibleWindows);

  return (
    <div data-testid="governor-display">
      {/* Header */}
      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{
          ...typography.h2,
          marginBottom: spacing.xs,
        }}>
          Governor
        </h2>
        <p style={{
          ...typography.bodySmall,
          color: colors.text.tertiary,
          margin: 0,
        }}>
          Current structural reliability by mode.
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
          {visibleWindows.map((modeWindow) => (
            <ModeStateDisplay
              key={modeWindow.mode}
              modeWindow={modeWindow}
              isHovered={hoveredMode === modeWindow.mode}
              isDimmed={hoveredMode !== null && hoveredMode !== modeWindow.mode}
              onHover={(mode) => onModeHover?.(mode as BaselineMode | null)}
              onEditConflict={onEditConflict}
              baselineWindows={baselineWindows}
            />
          ))}
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
