import type {
  ModeGovernanceDecision,
  GovernorInput,
  BaselineWindow,
  BaselineMode,
  BusyBlock,
} from '../types.js';

/**
 * All cognitive modes to evaluate.
 */
const ALL_MODES: BaselineMode[] = ['FRAMING', 'SYNTHESIS', 'EVALUATION', 'EXECUTION', 'REFLECTION'];

/**
 * Structural reasons (neutral, no motivational language).
 */
const REASONS = {
  CONFIDENCE_INSUFFICIENT: 'Confidence insufficient.',
  NO_RELIABLE_WINDOW: 'No reliable window available.',
  CONFLICT_WITH_BUSY: 'Conflicts with a busy block.',
  WINDOW_RELIABLE_UNCONFLICTED: 'Window is structurally reliable and unconflicted.',
} as const;

/**
 * Evaluates governance decisions for a day.
 *
 * Rules v1:
 * 1) SILENCE if profile missing OR confidence LOW OR no baseline windows
 * 2) For each mode, find RELIABLE windows, pick earliest as candidate
 * 3) If candidate overlaps any BusyBlock => WARN, else => PERMIT
 */
export function evaluateDay(input: GovernorInput): ModeGovernanceDecision[] {
  const { profile, busyBlocks, baselineWindows } = input;
  const computedAt = new Date().toISOString();

  // Rule 1: SILENCE if profile missing or confidence LOW
  if (!profile || profile.confidence === 'LOW') {
    return ALL_MODES.map(mode => ({
      mode,
      decision: 'SILENCE' as const,
      reason: REASONS.CONFIDENCE_INSUFFICIENT,
      computedAt,
    }));
  }

  // Rule 1: SILENCE if no baseline windows for the day
  if (baselineWindows.length === 0) {
    return ALL_MODES.map(mode => ({
      mode,
      decision: 'SILENCE' as const,
      reason: REASONS.NO_RELIABLE_WINDOW,
      computedAt,
    }));
  }

  // Evaluate each mode
  return ALL_MODES.map(mode => evaluateMode(mode, baselineWindows, busyBlocks, computedAt));
}

/**
 * Evaluates a single mode.
 */
function evaluateMode(
  mode: BaselineMode,
  baselineWindows: BaselineWindow[],
  busyBlocks: BusyBlock[],
  computedAt: string
): ModeGovernanceDecision {
  // Find RELIABLE windows for this mode
  const reliableWindows = baselineWindows.filter(
    w => w.mode === mode && w.reliability === 'RELIABLE'
  );

  // Rule 2: No reliable windows => SILENCE
  if (reliableWindows.length === 0) {
    return {
      mode,
      decision: 'SILENCE',
      reason: REASONS.NO_RELIABLE_WINDOW,
      computedAt,
    };
  }

  // Pick earliest RELIABLE window as candidate
  const candidate = reliableWindows.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )[0];

  // Rule 3: Check for conflicts with BusyBlocks
  const hasConflict = busyBlocks.some(block => windowsOverlap(candidate, block));

  if (hasConflict) {
    return {
      mode,
      decision: 'WARN',
      reason: REASONS.CONFLICT_WITH_BUSY,
      window: {
        start: candidate.start,
        end: candidate.end,
      },
      computedAt,
    };
  }

  return {
    mode,
    decision: 'PERMIT',
    reason: REASONS.WINDOW_RELIABLE_UNCONFLICTED,
    window: {
      start: candidate.start,
      end: candidate.end,
    },
    computedAt,
  };
}

/**
 * Checks if a baseline window overlaps with a busy block.
 * Edge case: touching boundaries (end === start) do NOT count as overlap.
 */
function windowsOverlap(baseline: BaselineWindow, busy: BusyBlock): boolean {
  const baselineStart = new Date(baseline.start).getTime();
  const baselineEnd = new Date(baseline.end).getTime();
  const busyStart = new Date(busy.start).getTime();
  const busyEnd = new Date(busy.end).getTime();

  // No overlap if one ends before or exactly when the other starts
  // Overlap exists when: baselineStart < busyEnd AND busyStart < baselineEnd
  return baselineStart < busyEnd && busyStart < baselineEnd;
}

/**
 * Export for testing.
 */
export { windowsOverlap as _windowsOverlap };
