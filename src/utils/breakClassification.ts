/**
 * Break classification engine.
 *
 * Distinguishes restorative breaks from disruptive interruptions using
 * structural properties only (duration, position, cumulative cost, user-declared type).
 *
 * Classification rules with evidence levels:
 * - RULE 0: Commitments always fragment (Strong: Monsell 2003, Rogers & Monsell 1995)
 * - RULE 1: Rest breaks > 30 min fragment (Moderate: context decay research)
 * - RULE 2: Segment viability < 30 min fragments (Moderate-High: WM loading ~15-25 min)
 * - RULE 3: Unclassified blocks > 20 min fragment (Low: design choice, nudge to classify)
 * - RULE 4: Cumulative ramp-up > 30% of window fragments (Moderate: Mark et al. 2005)
 */

import type {
  BreakType,
  ClassifiedBreak,
  AvailableSegment,
  BreakAssessment,
  WindowStatus,
  TimeWindowHHMM,
  Mode,
} from '../types/modeStates.js';

// ============================================================================
// CONSTANTS — with evidence level comments
// ============================================================================

/** Minimum segment duration (minutes) for a segment to be viable.
 * EVIDENCE: Moderate-High. Working memory loading takes ~15-25 min (Baddeley, Cowan).
 * 30 min = ramp-up + minimal productive time. */
const MIN_SEGMENT_MINUTES = 30;

/** Maximum duration (minutes) for a rest-declared break to be restorative.
 * EVIDENCE: Moderate. Context decay research suggests complex task context
 * degrades significantly after ~30 min disengagement. */
const MAX_REST_DURATION_MINUTES = 30;

/** Maximum duration (minutes) for an unclassified break to be restorative.
 * EVIDENCE: Low — design choice. Acts as nudge to classify.
 * Without classification, system can't distinguish a dog walk from a call. */
const MAX_UNCLASSIFIED_DURATION = 20;

/** Estimated ramp-up cost per context switch (minutes).
 * EVIDENCE: Moderate. Mark et al. 2005 interruption studies. */
const RAMPUP_COST_MINUTES = 20;

/** Maximum ratio of total ramp-up time to window duration before fragmenting.
 * EVIDENCE: Moderate. Logical derivation from switch costs — if >30% of window
 * is spent re-ramping, net productive time is too low. */
const MAX_RAMPUP_RATIO = 0.30;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert HH:mm time string to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:mm format.
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get duration in minutes between two times.
 */
function getDurationMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

/**
 * Check if two time windows overlap.
 */
function windowsOverlap(a: TimeWindowHHMM, b: TimeWindowHHMM): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Get the intersection of a break with a mode window.
 * Returns null if no intersection.
 */
function getIntersection(
  breakBlock: { start: string; end: string },
  modeWindow: TimeWindowHHMM
): TimeWindowHHMM | null {
  const breakStart = timeToMinutes(breakBlock.start);
  const breakEnd = timeToMinutes(breakBlock.end);
  const windowStart = timeToMinutes(modeWindow.start);
  const windowEnd = timeToMinutes(modeWindow.end);

  const intersectStart = Math.max(breakStart, windowStart);
  const intersectEnd = Math.min(breakEnd, windowEnd);

  if (intersectStart >= intersectEnd) {
    return null;
  }

  return {
    start: minutesToTime(intersectStart),
    end: minutesToTime(intersectEnd),
  };
}

// ============================================================================
// SEGMENT CALCULATION
// ============================================================================

/**
 * Calculate available segments within a mode window after removing breaks.
 */
function calculateSegments(
  modeWindow: TimeWindowHHMM,
  breaks: Array<{ start: string; end: string }>
): AvailableSegment[] {
  if (breaks.length === 0) {
    const duration = getDurationMinutes(modeWindow.start, modeWindow.end);
    return [{
      start: modeWindow.start,
      end: modeWindow.end,
      durationMinutes: duration,
      viable: duration >= MIN_SEGMENT_MINUTES,
    }];
  }

  // Sort breaks by start time
  const sortedBreaks = [...breaks].sort((a, b) =>
    timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  // Merge overlapping breaks
  const mergedBreaks: Array<{ start: string; end: string }> = [];
  for (const brk of sortedBreaks) {
    // Clip break to mode window
    const intersection = getIntersection(brk, modeWindow);
    if (!intersection) continue;

    if (mergedBreaks.length === 0) {
      mergedBreaks.push(intersection);
    } else {
      const last = mergedBreaks[mergedBreaks.length - 1];
      if (timeToMinutes(intersection.start) <= timeToMinutes(last.end)) {
        // Overlapping or adjacent, merge
        last.end = minutesToTime(Math.max(
          timeToMinutes(last.end),
          timeToMinutes(intersection.end)
        ));
      } else {
        mergedBreaks.push(intersection);
      }
    }
  }

  // Build segments from gaps between breaks
  const segments: AvailableSegment[] = [];
  let currentStart = timeToMinutes(modeWindow.start);
  const windowEnd = timeToMinutes(modeWindow.end);

  for (const brk of mergedBreaks) {
    const breakStart = timeToMinutes(brk.start);
    const breakEnd = timeToMinutes(brk.end);

    // Add segment before this break if there's a gap
    if (currentStart < breakStart) {
      const duration = breakStart - currentStart;
      segments.push({
        start: minutesToTime(currentStart),
        end: minutesToTime(breakStart),
        durationMinutes: duration,
        viable: duration >= MIN_SEGMENT_MINUTES,
      });
    }
    currentStart = Math.max(currentStart, breakEnd);
  }

  // Add final segment after last break
  if (currentStart < windowEnd) {
    const duration = windowEnd - currentStart;
    segments.push({
      start: minutesToTime(currentStart),
      end: minutesToTime(windowEnd),
      durationMinutes: duration,
      viable: duration >= MIN_SEGMENT_MINUTES,
    });
  }

  return segments;
}

/**
 * Find the shortest adjacent segment (before or after) a break in the window.
 */
function getShortestAdjacentSegment(
  breakBlock: { start: string; end: string },
  modeWindow: TimeWindowHHMM,
  allBreaks: Array<{ start: string; end: string }>
): number {
  const segments = calculateSegments(modeWindow, allBreaks);
  const breakStart = timeToMinutes(breakBlock.start);
  const breakEnd = timeToMinutes(breakBlock.end);

  let shortestAdjacent = Infinity;

  for (const seg of segments) {
    const segStart = timeToMinutes(seg.start);
    const segEnd = timeToMinutes(seg.end);

    // Segment is adjacent if it ends where break starts or starts where break ends
    if (segEnd === breakStart || segStart === breakEnd) {
      shortestAdjacent = Math.min(shortestAdjacent, seg.durationMinutes);
    }
  }

  // If no adjacent segments found (break at window boundary), use window edge
  if (shortestAdjacent === Infinity) {
    // Check segment before break
    const segBeforeEnd = breakStart;
    const segBeforeStart = timeToMinutes(modeWindow.start);
    if (segBeforeEnd > segBeforeStart) {
      shortestAdjacent = Math.min(shortestAdjacent, segBeforeEnd - segBeforeStart);
    }
    // Check segment after break
    const segAfterStart = breakEnd;
    const segAfterEnd = timeToMinutes(modeWindow.end);
    if (segAfterEnd > segAfterStart) {
      shortestAdjacent = Math.min(shortestAdjacent, segAfterEnd - segAfterStart);
    }
  }

  return shortestAdjacent === Infinity ? 0 : shortestAdjacent;
}

// ============================================================================
// BREAK CLASSIFICATION
// ============================================================================

/**
 * Classify a single break within a mode window.
 *
 * Rules applied in order:
 * - RULE 0: Commitments always fragment (strong evidence: Monsell 2003)
 * - RULE 1: Rest breaks > 30 min fragment (moderate evidence: context decay)
 * - RULE 2: Segment viability < 30 min fragments (moderate-high: WM loading)
 * - RULE 3: Unclassified > 20 min fragments (low: design choice)
 * - RULE 4: Cumulative ramp-up checked at window level, not per-break
 */
function classifyBreak(
  breakBlock: {
    id: string;
    start: string;
    end: string;
    label?: string;
    breakType?: BreakType;
  },
  modeWindow: TimeWindowHHMM,
  allBreaksInWindow: Array<{ start: string; end: string }>
): ClassifiedBreak {
  const breakType = breakBlock.breakType || 'unclassified';

  // Get the portion of the break that's within the mode window
  const intersection = getIntersection(breakBlock, modeWindow);
  if (!intersection) {
    // Shouldn't happen if called correctly, but handle gracefully
    return {
      id: breakBlock.id,
      start: breakBlock.start,
      end: breakBlock.end,
      label: breakBlock.label,
      breakType,
      durationMinutes: getDurationMinutes(breakBlock.start, breakBlock.end),
      classification: 'fragmenting',
      reason: 'Break does not overlap with mode window',
    };
  }

  const durationMin = getDurationMinutes(intersection.start, intersection.end);

  // ── RULE 0: Commitments always fragment ──
  // EVIDENCE: Strong. Monsell 2003, Rogers & Monsell 1995.
  // Cognitive engagement imposes switch costs regardless of duration.
  if (breakType === 'commitment') {
    return {
      id: breakBlock.id,
      start: intersection.start,
      end: intersection.end,
      label: breakBlock.label,
      breakType,
      durationMinutes: durationMin,
      classification: 'fragmenting',
      reason: 'Commitment requires cognitive engagement — imposes switch cost',
    };
  }

  // ── RULE 1: Rest breaks with excessive duration ──
  // EVIDENCE: Moderate. Context decay research suggests complex
  // task context degrades significantly after ~30 min disengagement.
  if (breakType === 'rest' && durationMin > MAX_REST_DURATION_MINUTES) {
    return {
      id: breakBlock.id,
      start: intersection.start,
      end: intersection.end,
      label: breakBlock.label,
      breakType,
      durationMinutes: durationMin,
      classification: 'fragmenting',
      reason: `Break exceeds ${MAX_REST_DURATION_MINUTES} minutes — context degrades regardless of activity`,
    };
  }

  // ── RULE 2: Segment viability ──
  // EVIDENCE: Moderate-High. Working memory loading takes ~15-25 min
  // (Baddeley, Cowan). 30 min minimum = ramp-up + minimal productive time.
  const shortestAdjacent = getShortestAdjacentSegment(
    { start: intersection.start, end: intersection.end },
    modeWindow,
    allBreaksInWindow
  );

  if (shortestAdjacent < MIN_SEGMENT_MINUTES) {
    return {
      id: breakBlock.id,
      start: intersection.start,
      end: intersection.end,
      label: breakBlock.label,
      breakType,
      durationMinutes: durationMin,
      classification: 'fragmenting',
      reason: `Creates a segment of ${shortestAdjacent} minutes — insufficient for sustained depth`,
    };
  }

  // ── RULE 3: Unclassified blocks, conservative duration limit ──
  // EVIDENCE: Low — design choice. Acts as nudge to classify.
  // Without classification, system can't distinguish a dog walk from a call.
  if (breakType === 'unclassified' && durationMin > MAX_UNCLASSIFIED_DURATION) {
    return {
      id: breakBlock.id,
      start: intersection.start,
      end: intersection.end,
      label: breakBlock.label,
      breakType,
      durationMinutes: durationMin,
      classification: 'fragmenting',
      reason: `Block exceeds ${MAX_UNCLASSIFIED_DURATION} minutes — classify to get better assessment`,
    };
  }

  // All per-break rules passed: preliminarily restorative
  // (cumulative ramp-up rule checked at window level)
  const typeLabel = breakType === 'rest' ? 'Rest break' : 'Short break';
  return {
    id: breakBlock.id,
    start: intersection.start,
    end: intersection.end,
    label: breakBlock.label,
    breakType,
    durationMinutes: durationMin,
    classification: 'restorative',
    reason: `${typeLabel} with viable segments on both sides — restorative`,
  };
}

// ============================================================================
// CUMULATIVE RAMP-UP CHECK
// ============================================================================

/**
 * Check if cumulative ramp-up cost exceeds threshold.
 * EVIDENCE: Moderate. Each context rebuild costs ~20 min (Mark et al. 2005).
 * If total rebuilds exceed 30% of window, net productive time is too low.
 */
function checkCumulativeRampUp(
  nonCommitmentBreakCount: number,
  windowDurationMinutes: number
): { exceeded: boolean; ratio: number } {
  const estimatedRampUp = nonCommitmentBreakCount * RAMPUP_COST_MINUTES;
  const ratio = windowDurationMinutes > 0 ? estimatedRampUp / windowDurationMinutes : 0;
  return {
    exceeded: ratio > MAX_RAMPUP_RATIO,
    ratio,
  };
}

// ============================================================================
// MODE-SPECIFIC STATUS DETERMINATION
// ============================================================================

/**
 * Determine the overall window status based on mode sensitivity and break analysis.
 *
 * Status values:
 * - 'clear': No fragmenting breaks (includes windows with only restorative breaks)
 * - 'fragmented': Has fragmenting breaks (Synthesis, Execution, Reflection)
 * - 'disrupted': Has fragmenting breaks (Framing only)
 * - 'withheld': Too fragmented to attempt (Evaluation)
 */
function determineWindowStatus(
  mode: Mode,
  fragmentingCount: number,
  availabilityPercent: number
): WindowStatus {
  // No fragmenting breaks = clear (even if there are restorative breaks)
  if (fragmentingCount === 0) {
    return 'clear';
  }

  // Has fragmenting breaks - apply mode-specific sensitivity
  switch (mode) {
    case 'EVALUATION':
      // Maximum sensitivity - any fragmenting break means withheld
      return 'withheld';

    case 'FRAMING':
      // High sensitivity - fragmenting breaks cause disruption
      return 'disrupted';

    case 'SYNTHESIS':
      // High sensitivity - fragmenting breaks cause fragmentation
      return 'fragmented';

    case 'EXECUTION':
      // Moderate sensitivity - only fragment if availability < 60%
      return availabilityPercent < 0.6 ? 'fragmented' : 'clear';

    case 'REFLECTION':
      // Low sensitivity - only fragment if availability < 50%
      return availabilityPercent < 0.5 ? 'fragmented' : 'clear';

    default:
      return 'fragmented';
  }
}

// ============================================================================
// MAIN ASSESSMENT FUNCTION
// ============================================================================

/**
 * Assess all breaks within a mode window and determine overall status.
 */
export function assessModeWindow(
  mode: Mode,
  modeWindow: TimeWindowHHMM,
  unavailableBlocks: Array<{
    id: string;
    start: string;
    end: string;
    label?: string;
    breakType?: BreakType;
  }>
): BreakAssessment {
  // Filter to blocks that overlap with this mode's window
  const overlappingBlocks = unavailableBlocks.filter(block =>
    windowsOverlap(modeWindow, { start: block.start, end: block.end })
  );

  const windowDuration = getDurationMinutes(modeWindow.start, modeWindow.end);

  // No breaks - clear window
  if (overlappingBlocks.length === 0) {
    return {
      breaks: [],
      segments: [{
        start: modeWindow.start,
        end: modeWindow.end,
        durationMinutes: windowDuration,
        viable: windowDuration >= MIN_SEGMENT_MINUTES,
      }],
      overallStatus: 'clear',
      totalAvailableMinutes: windowDuration,
      availabilityPercent: 1.0,
      fragmentingBreakCount: 0,
      restorativeBreakCount: 0,
    };
  }

  // Get all break intersections for segment calculation
  const allBreakIntersections = overlappingBlocks
    .map(block => getIntersection(block, modeWindow))
    .filter((i): i is TimeWindowHHMM => i !== null);

  // Classify each break
  const classifiedBreaks = overlappingBlocks.map(block =>
    classifyBreak(block, modeWindow, allBreakIntersections)
  );

  // Count by classification (before cumulative check)
  let fragmentingCount = classifiedBreaks.filter(b => b.classification === 'fragmenting').length;
  let restorativeCount = classifiedBreaks.filter(b => b.classification === 'restorative').length;

  // ── RULE 4: Cumulative ramp-up cost ──
  // EVIDENCE: Moderate. Each context rebuild costs ~20 min (Mark et al. 2005).
  // If total rebuilds exceed 30% of window, net productive time is too low.
  const nonCommitmentBreaks = classifiedBreaks.filter(b => b.breakType !== 'commitment');
  const { exceeded: rampUpExceeded } = checkCumulativeRampUp(
    nonCommitmentBreaks.length,
    windowDuration
  );

  if (rampUpExceeded && restorativeCount > 0) {
    // Reclassify all restorative breaks as fragmenting
    classifiedBreaks.forEach(b => {
      if (b.classification === 'restorative') {
        b.classification = 'fragmenting';
        b.reason = 'Cumulative ramp-up cost exceeds 30% of window — too many context switches';
      }
    });
    fragmentingCount = classifiedBreaks.filter(b => b.classification === 'fragmenting').length;
    restorativeCount = 0;
  }

  // Calculate segments (for fragmenting breaks only - restorative don't create gaps)
  const fragmentingBreaks = classifiedBreaks
    .filter(b => b.classification === 'fragmenting')
    .map(b => ({ start: b.start, end: b.end }));

  const segments = calculateSegments(modeWindow, fragmentingBreaks);

  // Calculate availability
  const totalAvailableMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const availabilityPercent = windowDuration > 0 ? totalAvailableMinutes / windowDuration : 0;

  // Determine overall status
  const overallStatus = determineWindowStatus(
    mode,
    fragmentingCount,
    availabilityPercent
  );

  return {
    breaks: classifiedBreaks,
    segments,
    overallStatus,
    totalAvailableMinutes,
    availabilityPercent,
    fragmentingBreakCount: fragmentingCount,
    restorativeBreakCount: restorativeCount,
  };
}

/**
 * Get a human-readable summary of the break assessment for display.
 */
export function getBreakAssessmentSummary(assessment: BreakAssessment): string {
  const { overallStatus, fragmentingBreakCount } = assessment;

  switch (overallStatus) {
    case 'clear':
      return 'No interruptions';
    case 'fragmented':
      return `${fragmentingBreakCount} interruption${fragmentingBreakCount !== 1 ? 's' : ''} fragment this window`;
    case 'disrupted':
      return `${fragmentingBreakCount} interruption${fragmentingBreakCount !== 1 ? 's' : ''} disrupt this window`;
    case 'withheld':
      return 'Window too fragmented for reliable judgment';
    default:
      return '';
  }
}
