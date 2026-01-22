/**
 * Chronotype profile derived from quiz answers.
 * Deterministic: same answers always produce same profile.
 */
export interface ChronotypeProfile {
  /** Unique identifier for this profile type */
  type: string;
  /** Peak hours for different cognitive modes */
  peakWindows: {
    focus: TimeWindow[];
    creative: TimeWindow[];
    administrative: TimeWindow[];
  };
  /** Natural energy curve throughout the day */
  energyCurve: EnergyLevel[];
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export type EnergyLevel = 'high' | 'medium' | 'low';

/**
 * Hard constraint (non-negotiable).
 * User-defined rules that must always be respected.
 */
export interface Constraint {
  id: string;
  /** Type of constraint */
  type: 'block' | 'require' | 'prefer';
  /** Days of week this applies to (0=Sunday, 6=Saturday) */
  days: number[];
  /** Time window for the constraint */
  window: TimeWindow;
  /** Human-readable label */
  label: string;
}

/**
 * Calendar busy block - structure only.
 * IMPORTANT: No titles, descriptions, attendees, or locations per spec.
 */
export interface BusyBlock {
  start: Date;
  end: Date;
  allDay: boolean;
  source: 'manual' | 'google' | 'microsoft';
}

/**
 * Governance decision for a time slot.
 */
export type GovernanceVerdict = 'PERMIT' | 'WARN' | 'SILENCE';

export interface GovernanceDecision {
  verdict: GovernanceVerdict;
  /** Structural reason for the decision (no coaching language) */
  reason: string;
  /** Time window this decision applies to */
  window: TimeWindow;
}

/**
 * Reliability window indicating expected reliability for a mode.
 */
export interface ReliabilityWindow {
  window: TimeWindow;
  mode: 'focus' | 'creative' | 'administrative';
  reliability: 'high' | 'medium' | 'low';
}

/**
 * Inputs to the computation pipeline.
 */
export interface PlanInputs {
  chronotype?: ChronotypeProfile;
  constraints?: Constraint[];
  busyBlocks?: BusyBlock[];
  /** Target date for planning */
  date?: Date;
}

/**
 * Outputs from the computation pipeline.
 */
export interface PlanOutputs {
  reliabilityWindows: ReliabilityWindow[];
  decisions: GovernanceDecision[];
}
