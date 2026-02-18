/**
 * Mode window computation utility.
 *
 * Converts existing governor decisions to mode-specific states
 * with failure signatures. Includes detailed fragmentation analysis
 * to explain WHY modes are degraded.
 */

import type { ModeGovernanceDecision, BaselineMode } from '../types.js';
import type { ModeWindow, ModeStateValue, Mode, TimeWindowHHMM, FragmentationAnalysis, FragmentationSeverity } from '../types/modeStates.js';
import { FAILURE_SIGNATURES } from '../constants/failureSignatures.js';
import { assessModeWindow } from './breakClassification.js';

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
 * Check if two time windows intersect.
 */
function timeWindowsIntersect(a: TimeWindowHHMM, b: TimeWindowHHMM): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Calculate the continuous available portions of a baseline window
 * after removing unavailable times.
 */
function calculateAvailablePortions(
  baseline: TimeWindowHHMM,
  unavailableTimes: Array<{ start: string; end: string }>
): TimeWindowHHMM[] {
  if (unavailableTimes.length === 0) {
    return [baseline];
  }

  // Sort unavailable times by start
  const sorted = [...unavailableTimes].sort((a, b) =>
    timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  const portions: TimeWindowHHMM[] = [];
  let currentStart = timeToMinutes(baseline.start);
  const baselineEnd = timeToMinutes(baseline.end);

  for (const unavailable of sorted) {
    const unavailStart = Math.max(timeToMinutes(unavailable.start), timeToMinutes(baseline.start));
    const unavailEnd = Math.min(timeToMinutes(unavailable.end), baselineEnd);

    // If there's a gap before this unavailable block, add it
    if (currentStart < unavailStart) {
      portions.push({
        start: minutesToTime(currentStart),
        end: minutesToTime(unavailStart),
      });
    }
    // Move current start to after this unavailable block
    currentStart = Math.max(currentStart, unavailEnd);
  }

  // Add final portion if there's time left
  if (currentStart < baselineEnd) {
    portions.push({
      start: minutesToTime(currentStart),
      end: minutesToTime(baselineEnd),
    });
  }

  return portions;
}

/**
 * Get duration in minutes of a time window.
 */
function getMinutesDuration(window: TimeWindowHHMM): number {
  return timeToMinutes(window.end) - timeToMinutes(window.start);
}

/**
 * Analyze fragmentation of a mode window based on unavailable times.
 */
export function analyzeFragmentation(
  baselineWindow: TimeWindowHHMM,
  unavailableTimes: Array<{ id: string; start: string; end: string; label?: string; breakType?: 'commitment' | 'rest' | 'unclassified' }>
): FragmentationAnalysis {
  // Find all unavailable times that intersect this baseline
  const conflicts = unavailableTimes.filter(ut =>
    timeWindowsIntersect(baselineWindow, { start: ut.start, end: ut.end })
  );

  const baselineMinutes = getMinutesDuration(baselineWindow);

  if (conflicts.length === 0) {
    return {
      hasFragmentation: false,
      fragmentationSeverity: 'LIGHT',
      availablePortions: [baselineWindow],
      totalAvailableMinutes: baselineMinutes,
      percentageAvailable: 1.0,
      conflicts: [],
      baselineWindow,
    };
  }

  // Calculate available portions (gaps between unavailable blocks)
  const availablePortions = calculateAvailablePortions(baselineWindow, conflicts);
  const totalAvailableMinutes = availablePortions.reduce(
    (sum, portion) => sum + getMinutesDuration(portion),
    0
  );

  const percentageAvailable = baselineMinutes > 0
    ? totalAvailableMinutes / baselineMinutes
    : 0;

  // PROPORTIONAL severity based on window length
  // Short windows need stricter thresholds (Aurora SYNTHESIS is only 30 min!)
  let fragmentationSeverity: FragmentationSeverity;

  // SHORT windows (≤60 min): Stricter thresholds
  // Examples: Aurora SYNTHESIS (30min), Nocturne REFLECTION (60min)
  if (baselineMinutes <= 60) {
    if (percentageAvailable < 0.5 || conflicts.length >= 2) {
      fragmentationSeverity = 'SEVERE';
    } else if (percentageAvailable < 0.75) {
      fragmentationSeverity = 'MODERATE';
    } else {
      fragmentationSeverity = 'LIGHT';
    }
  }
  // MEDIUM windows (60-120 min): Standard thresholds
  // Examples: Most FRAMING/EVALUATION windows
  else if (baselineMinutes <= 120) {
    if (percentageAvailable < 0.3 || conflicts.length >= 3) {
      fragmentationSeverity = 'SEVERE';
    } else if (percentageAvailable < 0.6 || conflicts.length >= 2) {
      fragmentationSeverity = 'MODERATE';
    } else {
      fragmentationSeverity = 'LIGHT';
    }
  }
  // LONG windows (>120 min): Relaxed thresholds
  // Examples: EXECUTION windows (3-4 hours)
  else {
    if (percentageAvailable < 0.25 || conflicts.length >= 4) {
      fragmentationSeverity = 'SEVERE';
    } else if (percentageAvailable < 0.5 || conflicts.length >= 3) {
      fragmentationSeverity = 'MODERATE';
    } else {
      fragmentationSeverity = 'LIGHT';
    }
  }

  return {
    hasFragmentation: true,
    fragmentationSeverity,
    availablePortions,
    totalAvailableMinutes,
    percentageAvailable,
    conflicts,
    baselineWindow,
  };
}

/**
 * Maps governor verdict + mode + fragmentation severity to the appropriate mode-specific state.
 *
 * State mapping per mode:
 * - EVALUATION: PERMIT→INTACT, any fragmentation→WITHHELD (binary only)
 * - FRAMING: PERMIT→INTACT, FRAGMENTED→DEFERRED, SILENCE→WITHHELD
 * - SYNTHESIS: PERMIT→INTACT, LIGHT/MODERATE→FRAGMENTED, SEVERE→WITHHELD
 * - EXECUTION: PERMIT→INTACT, LIGHT/MODERATE→STRAINED, SEVERE→WITHHELD
 * - REFLECTION: PERMIT→AVAILABLE, FRAGMENTED/SILENCE→SILENCE
 */
function mapVerdictToState(
  mode: BaselineMode,
  verdict: 'PERMIT' | 'WARN' | 'SILENCE' | 'FRAGMENTED',
  fragmentationSeverity: FragmentationSeverity = 'LIGHT'
): ModeStateValue {
  switch (mode) {
    case 'EVALUATION':
      // Binary only: any degradation means withheld
      return verdict === 'PERMIT' ? 'INTACT' : 'WITHHELD';

    case 'FRAMING':
      if (verdict === 'PERMIT') return 'INTACT';
      if (verdict === 'FRAGMENTED') return 'DEFERRED';
      return 'WITHHELD';

    case 'SYNTHESIS':
      if (verdict === 'PERMIT') return 'INTACT';
      if (verdict === 'FRAGMENTED') {
        // Severe fragmentation → too fragmented to attempt
        return fragmentationSeverity === 'SEVERE' ? 'WITHHELD' : 'FRAGMENTED';
      }
      return 'WITHHELD';

    case 'EXECUTION':
      if (verdict === 'PERMIT') return 'INTACT';
      if (verdict === 'FRAGMENTED') {
        // Severe fragmentation → too fragmented even for execution
        return fragmentationSeverity === 'SEVERE' ? 'WITHHELD' : 'STRAINED';
      }
      return 'WITHHELD';

    case 'REFLECTION':
      return verdict === 'PERMIT' ? 'AVAILABLE' : 'SILENCE';

    default:
      return 'WITHHELD';
  }
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
 * Compute mode windows from governor decisions.
 *
 * Returns an array of ModeWindow objects with:
 * - Mode-specific states (not generic PERMIT/SILENCE)
 * - Failure signatures with concrete consequences
 * - Discovery windows
 * - Detailed fragmentation analysis
 *
 * @param decisions - Governor decisions for the day
 * @param unavailableTimes - Optional unavailable time blocks for fragmentation analysis
 */
export function computeModeWindows(
  decisions: ModeGovernanceDecision[],
  unavailableTimes: Array<{ id: string; start: string; end: string; label?: string; breakType?: 'commitment' | 'rest' | 'unclassified' }> = []
): ModeWindow[] {
  const modeWindows: ModeWindow[] = [];

  for (const decision of decisions) {
    const mode = decision.mode as Mode;

    // Build baseline time window (always the full window, never shrunken)
    let baselineWindow: TimeWindowHHMM;

    if (decision.window) {
      baselineWindow = {
        start: isoToHHMM(decision.window.start),
        end: isoToHHMM(decision.window.end),
      };
    } else if (decision.decision === 'FRAGMENTED' && decision.segments && decision.segments.length > 0) {
      // Even for fragmented, use the FULL baseline span
      const firstSeg = decision.segments[0];
      const lastSeg = decision.segments[decision.segments.length - 1];
      baselineWindow = {
        start: isoToHHMM(firstSeg.start),
        end: isoToHHMM(lastSeg.end),
      };
    } else {
      // No window available (silence state)
      baselineWindow = { start: '', end: '' };
    }

    // Analyze fragmentation based on unavailable times
    const fragmentation = baselineWindow.start && baselineWindow.end
      ? analyzeFragmentation(baselineWindow, unavailableTimes)
      : {
          hasFragmentation: false,
          fragmentationSeverity: 'LIGHT' as FragmentationSeverity,
          availablePortions: [],
          totalAvailableMinutes: 0,
          percentageAvailable: 0,
          conflicts: [],
          baselineWindow,
        };

    // Use break classification engine to determine if window is actually fragmented
    // This distinguishes restorative breaks (no impact) from fragmenting breaks
    let effectiveVerdict = decision.decision;
    let classificationSeverity: FragmentationSeverity = 'LIGHT';

    if (baselineWindow.start && baselineWindow.end && unavailableTimes.length > 0) {
      const breakAssessment = assessModeWindow(mode, baselineWindow, unavailableTimes);

      // Only treat as FRAGMENTED if classification engine says so
      // 'clear' means all breaks are restorative - no warnings needed
      if (breakAssessment.overallStatus !== 'clear' && decision.decision === 'PERMIT') {
        effectiveVerdict = 'FRAGMENTED';

        // Map classification status to severity for state mapping
        if (breakAssessment.overallStatus === 'withheld') {
          classificationSeverity = 'SEVERE';
        } else if (breakAssessment.overallStatus === 'disrupted' || breakAssessment.overallStatus === 'fragmented') {
          // Use availability percent to determine severity
          if (breakAssessment.availabilityPercent < 0.5) {
            classificationSeverity = 'SEVERE';
          } else if (breakAssessment.availabilityPercent < 0.75) {
            classificationSeverity = 'MODERATE';
          } else {
            classificationSeverity = 'LIGHT';
          }
        }
      }
    }

    // Map verdict to state, considering classification severity
    const state = mapVerdictToState(mode, effectiveVerdict, classificationSeverity);

    // Skip SILENCE state for REFLECTION (per spec: "shows nothing")
    if (mode === 'REFLECTION' && state === 'SILENCE') {
      continue;
    }

    // Get failure signature for this mode/state
    const failureSignature = FAILURE_SIGNATURES[mode][state];
    if (!failureSignature) continue;

    modeWindows.push({
      mode,
      state,
      window: baselineWindow, // Always show full baseline
      failureSignature,
      fragmentation,
    });
  }

  return modeWindows;
}

/**
 * Get modes sorted by discovery risk (TOO_LATE first, then TOMORROW, then IMMEDIATE).
 * This prioritizes showing the most time-sensitive warnings first.
 */
export function sortByDiscoveryRisk(modeWindows: ModeWindow[]): ModeWindow[] {
  const priority: Record<string, number> = {
    TOO_LATE: 3,
    TOMORROW: 2,
    IMMEDIATE: 1,
  };

  return [...modeWindows].sort((a, b) => {
    const aPriority = priority[a.failureSignature.discoveryWindow] || 0;
    const bPriority = priority[b.failureSignature.discoveryWindow] || 0;
    return bPriority - aPriority;
  });
}

/**
 * Count flagged modes (non-intact/non-available states).
 */
export function countFlaggedModes(modeWindows: ModeWindow[]): number {
  return modeWindows.filter(mw => {
    const state = mw.state;
    return state !== 'INTACT' && state !== 'AVAILABLE';
  }).length;
}

/**
 * Check if a mode state indicates a warning (non-ideal conditions).
 */
export function isWarningState(state: ModeStateValue): boolean {
  return !['INTACT', 'AVAILABLE'].includes(state);
}

/**
 * Conflicting time slot with its constraint ID for editing.
 */
export interface ConflictingTime {
  id: string;
  start: string;
  end: string;
}

/**
 * Get conflicting unavailable times for a mode window.
 * Now uses the fragmentation analysis embedded in the ModeWindow.
 *
 * @deprecated Use modeWindow.fragmentation.conflicts directly instead.
 * This function is kept for backward compatibility.
 */
export function getConflictingTimes(
  modeWindow: ModeWindow,
  _constraints: Array<{
    id: string;
    kind: string;
    payload: {
      dateISO?: string;
      allDay?: boolean;
      startLocal?: string;
      endLocal?: string;
    };
  }>,
  _selectedDate: string
): ConflictingTime[] {
  // Use the embedded fragmentation analysis
  if (!modeWindow.fragmentation.hasFragmentation) {
    return [];
  }

  return modeWindow.fragmentation.conflicts;
}

/**
 * Extract unavailable times from constraints for a given date.
 * Returns array suitable for analyzeFragmentation.
 */
export function extractUnavailableTimes(
  constraints: Array<{
    id: string;
    kind: string;
    payload: {
      dateISO?: string;
      allDay?: boolean;
      startLocal?: string;
      endLocal?: string;
      label?: string;
      breakType?: 'commitment' | 'rest' | 'unclassified';
    };
  }>,
  selectedDate: string
): Array<{ id: string; start: string; end: string; label?: string; breakType?: 'commitment' | 'rest' | 'unclassified' }> {
  const unavailableTimes: Array<{ id: string; start: string; end: string; label?: string; breakType?: 'commitment' | 'rest' | 'unclassified' }> = [];

  for (const constraint of constraints) {
    if (constraint.kind !== 'FIXED_BLOCK') continue;

    const payload = constraint.payload;
    if (!payload || payload.dateISO !== selectedDate) continue;

    let start: string;
    let end: string;

    if (payload.allDay) {
      start = '00:00';
      end = '24:00';
    } else {
      start = payload.startLocal || '';
      end = payload.endLocal || '';
    }

    if (!start || !end) continue;

    unavailableTimes.push({
      id: constraint.id,
      start,
      end,
      label: payload.label,
      breakType: payload.breakType,
    });
  }

  return unavailableTimes;
}
