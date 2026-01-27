import type {
  ModeGovernanceDecision,
  GovernorInput,
  BaselineWindow,
  BaselineMode,
  BusyBlock,
  TimeSegment,
} from '../types.js';

/**
 * All cognitive modes to evaluate.
 */
const ALL_MODES: BaselineMode[] = ['FRAMING', 'SYNTHESIS', 'EVALUATION', 'EXECUTION', 'REFLECTION'];

/**
 * Minimum segment duration thresholds in minutes.
 * Segments shorter than these are discarded.
 */
const MIN_SEGMENT_MINUTES: Record<BaselineMode, number> = {
  FRAMING: 30,
  EVALUATION: 30,
  SYNTHESIS: 30,
  EXECUTION: 45,
  REFLECTION: 20,
};

/**
 * Structural reasons (neutral, no motivational language).
 * Per UX spec: exact strings for each decision state.
 */
const REASONS = {
  // Silence reasons
  CONFIDENCE_INSUFFICIENT: 'Conditions are not structurally reliable right now.',
  NO_RELIABLE_WINDOW: 'Conditions are not structurally reliable right now.',
  // Fragmented reason (window split by unavailable times)
  FRAGMENTED: 'Window is split by an unavailable time.',
  // Permit reason
  STRUCTURALLY_RELIABLE: 'Conditions support this mode of thinking.',
} as const;

/**
 * Evaluates governance decisions for a day.
 *
 * Rules v2:
 * 1) SILENCE if profile missing OR confidence LOW OR no baseline windows
 * 2) For each mode, find RELIABLE windows, pick earliest as candidate
 * 3) Subtract all BusyBlocks/Unavailable times from candidate window
 * 4) Apply minimum duration threshold to remaining segments
 * 5) Decision based on remaining segments:
 *    - 0 segments => SILENCE
 *    - 1 segment => PERMIT
 *    - 2+ segments => FRAGMENTED
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
 * Evaluates a single mode with window subtraction.
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

  // Subtract all busy blocks from candidate window
  const segments = subtractBusyBlocks(candidate, busyBlocks);

  // Apply minimum duration threshold
  const minMinutes = MIN_SEGMENT_MINUTES[mode];
  const validSegments = segments.filter(seg => {
    const durationMs = new Date(seg.end).getTime() - new Date(seg.start).getTime();
    const durationMinutes = durationMs / (1000 * 60);
    return durationMinutes >= minMinutes;
  });

  // Decision based on remaining segments
  if (validSegments.length === 0) {
    return {
      mode,
      decision: 'SILENCE',
      reason: REASONS.NO_RELIABLE_WINDOW,
      computedAt,
    };
  }

  if (validSegments.length === 1) {
    return {
      mode,
      decision: 'PERMIT',
      reason: REASONS.STRUCTURALLY_RELIABLE,
      window: validSegments[0],
      computedAt,
    };
  }

  // Multiple segments => FRAGMENTED
  return {
    mode,
    decision: 'FRAGMENTED',
    reason: REASONS.FRAGMENTED,
    segments: validSegments,
    computedAt,
  };
}

/**
 * Subtracts all busy blocks from a baseline window.
 * Returns an array of remaining segments (0 to N).
 */
function subtractBusyBlocks(
  baseline: BaselineWindow,
  busyBlocks: BusyBlock[]
): TimeSegment[] {
  const baselineStart = new Date(baseline.start).getTime();
  const baselineEnd = new Date(baseline.end).getTime();

  // Collect all busy block intervals that overlap with baseline
  const overlappingBlocks = busyBlocks
    .map(block => ({
      start: new Date(block.start).getTime(),
      end: new Date(block.end).getTime(),
    }))
    .filter(block => block.start < baselineEnd && block.end > baselineStart);

  // If no overlapping blocks, return the full window as single segment
  if (overlappingBlocks.length === 0) {
    return [{
      start: baseline.start,
      end: baseline.end,
    }];
  }

  // Sort blocks by start time
  overlappingBlocks.sort((a, b) => a.start - b.start);

  // Merge overlapping busy blocks
  const mergedBlocks: Array<{ start: number; end: number }> = [];
  for (const block of overlappingBlocks) {
    if (mergedBlocks.length === 0) {
      mergedBlocks.push({ ...block });
    } else {
      const last = mergedBlocks[mergedBlocks.length - 1];
      if (block.start <= last.end) {
        // Overlapping or adjacent, extend
        last.end = Math.max(last.end, block.end);
      } else {
        mergedBlocks.push({ ...block });
      }
    }
  }

  // Subtract merged blocks from baseline window
  const segments: TimeSegment[] = [];
  let currentStart = baselineStart;

  for (const block of mergedBlocks) {
    // Clamp block to baseline window
    const blockStart = Math.max(block.start, baselineStart);
    const blockEnd = Math.min(block.end, baselineEnd);

    if (currentStart < blockStart) {
      // There's a gap before this block
      segments.push({
        start: new Date(currentStart).toISOString(),
        end: new Date(blockStart).toISOString(),
      });
    }

    // Move past this block
    currentStart = Math.max(currentStart, blockEnd);
  }

  // Add remaining segment after last block
  if (currentStart < baselineEnd) {
    segments.push({
      start: new Date(currentStart).toISOString(),
      end: new Date(baselineEnd).toISOString(),
    });
  }

  return segments;
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
export { windowsOverlap as _windowsOverlap, subtractBusyBlocks as _subtractBusyBlocks };
