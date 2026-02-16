/**
 * Mode state types for risk-signaling mechanism.
 *
 * Each mode has different failure characteristics:
 * - EVALUATION: Binary only (high-stakes, silent failures)
 * - FRAMING: Can be deferred (structural misdirection risk)
 * - SYNTHESIS: Can be fragmented (fragile coherence)
 * - EXECUTION: Almost always permitted (visible, correctable errors)
 * - REFLECTION: Opportunistic only (no acute failure)
 */

import type { BaselineMode } from '../types.js';

// Re-export Mode as alias for clarity
export type Mode = BaselineMode;

/**
 * Mode-specific states with asymmetric state sets.
 * Each mode has qualitatively different failure modes.
 */
export type EvaluationState = 'INTACT' | 'WITHHELD';
export type FramingState = 'INTACT' | 'DEFERRED' | 'WITHHELD';
export type SynthesisState = 'INTACT' | 'FRAGMENTED' | 'WITHHELD';
export type ExecutionState = 'INTACT' | 'STRAINED' | 'WITHHELD';
export type ReflectionState = 'AVAILABLE' | 'SILENCE';

/**
 * Union type for all mode states.
 */
export type ModeStateValue =
  | EvaluationState
  | FramingState
  | SynthesisState
  | ExecutionState
  | ReflectionState;

/**
 * Discriminated union for mode states.
 * Ensures type safety when working with mode-specific states.
 */
export type ModeState =
  | { mode: 'EVALUATION'; state: EvaluationState }
  | { mode: 'FRAMING'; state: FramingState }
  | { mode: 'SYNTHESIS'; state: SynthesisState }
  | { mode: 'EXECUTION'; state: ExecutionState }
  | { mode: 'REFLECTION'; state: ReflectionState };

/**
 * Discovery window indicates when you'll find out if something went wrong.
 */
export type DiscoveryWindow = 'IMMEDIATE' | 'TOMORROW' | 'TOO_LATE';

/**
 * Failure signature describes what goes wrong and when you'll know.
 */
export interface FailureSignature {
  /** What will go wrong (concrete, non-technical) */
  consequence: string;
  /** When you'll discover the mistake */
  discoveryWindow: DiscoveryWindow;
  /** Concrete examples of affected work types (for warning states) */
  examples?: string[];
  /** What you'd use this mode for (shown for all states) */
  applicationExamples?: string[];
  /** Guidance if user proceeds anyway (informational, not prescriptive) */
  overrideAdvice?: string;
  /** Explains WHY the mode is degraded based on fragmentation analysis */
  structuralCause?: (fragmentation: FragmentationAnalysis) => string;
}

/**
 * Time window in HH:mm format.
 */
export interface TimeWindowHHMM {
  start: string; // HH:mm
  end: string;   // HH:mm
}

/**
 * Fragmentation severity levels.
 */
export type FragmentationSeverity = 'LIGHT' | 'MODERATE' | 'SEVERE';

/**
 * Detailed analysis of how a mode window is fragmented by unavailable times.
 */
export interface FragmentationAnalysis {
  /** Whether any unavailable times intersect the baseline */
  hasFragmentation: boolean;
  /** Severity based on number of interruptions and percentage available */
  fragmentationSeverity: FragmentationSeverity;
  /** Continuous available portions after removing unavailable times */
  availablePortions: TimeWindowHHMM[];
  /** Total minutes available across all portions */
  totalAvailableMinutes: number;
  /** Percentage of baseline window that is available (0-1) */
  percentageAvailable: number;
  /** Unavailable times that conflict with this window */
  conflicts: Array<{ id: string; start: string; end: string; label?: string }>;
  /** Original baseline window before fragmentation */
  baselineWindow: TimeWindowHHMM;
}

/**
 * Mode window with state and failure signature.
 */
export interface ModeWindow {
  mode: Mode;
  state: ModeStateValue;
  window: TimeWindowHHMM;
  failureSignature: FailureSignature;
  /** Detailed fragmentation analysis for this window */
  fragmentation: FragmentationAnalysis;
}

/**
 * Valid states for each mode.
 * Used for type checking and runtime validation.
 */
export const VALID_STATES: Record<Mode, readonly ModeStateValue[]> = {
  EVALUATION: ['INTACT', 'WITHHELD'] as const,
  FRAMING: ['INTACT', 'DEFERRED', 'WITHHELD'] as const,
  SYNTHESIS: ['INTACT', 'FRAGMENTED', 'WITHHELD'] as const,
  EXECUTION: ['INTACT', 'STRAINED', 'WITHHELD'] as const,
  REFLECTION: ['AVAILABLE', 'SILENCE'] as const,
};

/**
 * Check if a state is valid for a given mode.
 */
export function isValidStateForMode(mode: Mode, state: ModeStateValue): boolean {
  return VALID_STATES[mode].includes(state);
}
