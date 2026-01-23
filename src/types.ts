/**
 * Chronotype identifiers.
 */
export type Chronotype = 'AURORA' | 'DAYBREAK' | 'MERIDIAN' | 'TWILIGHT' | 'NOCTURNE';

/**
 * Confidence level for chronotype determination.
 */
export type ChronotypeConfidence = 'HIGH' | 'MED' | 'LOW';

/**
 * Chronotype profile derived from quiz answers.
 * Deterministic: same answers always produce same profile.
 */
export interface ChronotypeProfile {
  chronotype: Chronotype;
  confidence: ChronotypeConfidence;
  computedAt: string; // ISO string
}

/**
 * Legacy ChronotypeProfile for pipeline compatibility.
 * @deprecated Use ChronotypeProfile instead
 */
export interface LegacyChronotypeProfile {
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
 * BusyBlock with ID for storage/UI operations.
 * Extends BusyBlock with an identifier for editing/deleting.
 */
export interface StoredBusyBlock extends BusyBlock {
  id: string;
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
 * Cognitive modes for baseline windows.
 */
export type BaselineMode = 'FRAMING' | 'SYNTHESIS' | 'EVALUATION' | 'EXECUTION' | 'REFLECTION';

/**
 * Reliability level for baseline windows.
 */
export type BaselineReliability = 'RELIABLE' | 'FRAGILE';

/**
 * Baseline window generated from chronotype profile.
 */
export interface BaselineWindow {
  start: string; // ISO string
  end: string;   // ISO string
  mode: BaselineMode;
  reliability: BaselineReliability;
  source: 'baseline';
}

/**
 * Quiz answers object.
 */
export interface QuizAnswers {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  q5?: number;
}

/**
 * Governance decision for a specific mode.
 */
export interface ModeGovernanceDecision {
  mode: BaselineMode;
  decision: GovernanceVerdict;
  /** Structural reason (neutral, no motivational language) */
  reason: string;
  /** Candidate window (only present for PERMIT/WARN) */
  window?: {
    start: string; // ISO string
    end: string;   // ISO string
  };
  computedAt: string; // ISO string
}

/**
 * Input for governor evaluation.
 */
export interface GovernorInput {
  profile: ChronotypeProfile | null;
  busyBlocks: BusyBlock[];
  baselineWindows: BaselineWindow[];
  dayISODate: string;
}

/**
 * Inputs to the computation pipeline.
 */
export interface PlanInputs {
  chronotype?: LegacyChronotypeProfile;
  /** New-style chronotype profile */
  profile?: ChronotypeProfile;
  constraints?: Constraint[];
  busyBlocks?: BusyBlock[];
  /** Baseline windows (for governor) */
  baselineWindows?: BaselineWindow[];
  /** Target date for planning */
  date?: Date;
  /** Target date as ISO string */
  dayISODate?: string;
}

/**
 * Outputs from the computation pipeline.
 */
export interface PlanOutputs {
  reliabilityWindows: ReliabilityWindow[];
  decisions: GovernanceDecision[];
  /** Mode-specific governance decisions from the Governor */
  modeDecisions?: ModeGovernanceDecision[];
}
