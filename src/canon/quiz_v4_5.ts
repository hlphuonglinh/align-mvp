/**
 * CANON: Quiz v4.5
 * Source of truth: QUIZ v4.5.pdf
 *
 * DO NOT MODIFY without updating the canonical PDF.
 * Tests will fail if these values drift.
 */

// ============================================================================
// EXACT QUESTION TEXT (verbatim from PDF)
// ============================================================================

export const CANON_QUESTIONS = {
  Q1: {
    id: 'q1',
    text: 'On workdays, when do you usually wake up?',
    options: [
      { key: 'A', label: '≤ 06:00' },
      { key: 'B', label: '06:01–07:00' },
      { key: 'C', label: '07:01–08:00' },
      { key: 'D', label: '08:01–09:00' },
      { key: 'E', label: '≥ 09:01' },
    ],
  },
  Q2: {
    id: 'q2',
    text: 'On free days with no alarm, when do you naturally wake up?',
    options: [
      { key: 'A', label: '≤ 06:30' },
      { key: 'B', label: '06:31–07:30' },
      { key: 'C', label: '07:31–08:30' },
      { key: 'D', label: '08:31–09:30' },
      { key: 'E', label: '≥ 09:31' },
    ],
  },
  Q3: {
    id: 'q3',
    text: 'How much longer do you sleep on free days than on workdays?',
    options: [
      { key: 'A', label: 'Same or ≤ 30 min' },
      { key: 'B', label: '30–60 min' },
      { key: 'C', label: '60–90 min' },
      { key: 'D', label: '> 90 min' },
      { key: 'E', label: 'I use an alarm on free days' },
    ],
  },
  Q4: {
    id: 'q4',
    text: 'On long or demanding days (6+ hours of cognitively demanding work), what tends to happen first?',
    options: [
      { key: 'A', label: 'I stay sharp most of the day' },
      { key: 'B', label: 'I slow down, but accuracy holds' },
      { key: 'C', label: 'It depends on the type of work' },
      { key: 'D', label: 'Small mistakes start appearing' },
      { key: 'E', label: 'I feel mentally spent early' },
    ],
  },
  Q5: {
    id: 'q5',
    text: "When you're interrupted during focused work (messages, meetings, context switches), what usually happens?",
    options: [
      { key: 'A', label: 'I resume at the same depth' },
      { key: 'B', label: 'I need a short ramp-up' },
      { key: 'C', label: 'It depends on the interruption' },
      { key: 'D', label: 'Depth drops noticeably' },
      { key: 'E', label: "I can't recover full focus" },
    ],
  },
} as const;

// ============================================================================
// NUMERIC ANCHORS (exact values from PDF)
// ============================================================================

/** Q1 — workday wake midpoint (wakeW_mid) */
export const Q1_ANCHORS: Record<string, number> = {
  A: 6.0,
  B: 6.5,
  C: 7.5,
  D: 8.5,
  E: 9.5,
};

/** Q2 — free-day wake midpoint (wakeF_mid) */
export const Q2_ANCHORS: Record<string, number> = {
  A: 6.5,
  B: 7.0,
  C: 8.0,
  D: 9.0,
  E: 10.0,
};

/** Q3 — extra sleep on free days (extra_h) */
export const Q3_ANCHORS: Record<string, number> = {
  A: 0.25,
  B: 0.75,
  C: 1.25,
  D: 1.75,
  E: 0.0, // flag lower confidence
};

/** Q4 — fatigue sensitivity (fatigue_h) */
export const Q4_ANCHORS: Record<string, number> = {
  A: -0.25,
  B: -0.10,
  C: 0.00,
  D: +0.10,
  E: +0.25,
};

/** Q5 — interruption sensitivity (interrupt_h) */
export const Q5_ANCHORS: Record<string, number> = {
  A: -0.25,
  B: -0.10,
  C: 0.00,
  D: +0.10,
  E: +0.25,
};

// ============================================================================
// CONSTANTS (from PDF)
// ============================================================================

/** Assumed workday sleep (population mean) */
export const SDW_DEFAULT = 7.0;

// ============================================================================
// CHRONOTYPE THRESHOLDS (Based on MSFsc only, from PDF)
// ============================================================================

export const CHRONOTYPE_THRESHOLDS = {
  AURORA: { max: 2.5 },      // < 2.5
  DAYBREAK: { min: 2.5, max: 3.5 },  // 2.5–<3.5
  MERIDIAN: { min: 3.5, max: 4.5 },  // 3.5–<4.5
  TWILIGHT: { min: 4.5, max: 5.5 },  // 4.5–<5.5
  NOCTURNE: { min: 5.5 },    // ≥ 5.5
} as const;

export type CanonChronotype = 'AURORA' | 'DAYBREAK' | 'MERIDIAN' | 'TWILIGHT' | 'NOCTURNE';
export type CanonConfidence = 'Normal' | 'Lower';
export type FragilityLevel = 'Low' | 'Medium' | 'High';

// ============================================================================
// QUIZ ANSWERS TYPE
// ============================================================================

export interface CanonQuizAnswers {
  q1: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  q2: string;
  q3: string;
  q4: string;
  q5: string;
}

// ============================================================================
// SCORING RESULT TYPE
// ============================================================================

export interface CanonScoringResult {
  // Phase proxies
  wakeW_mid: number;
  wakeF_mid: number;
  extra_h: number;
  fatigue_h: number;
  interrupt_h: number;

  // Computed values
  SDw: number;
  SDf: number;
  MSW: number;
  MSF: number;
  Debt: number;
  MSFsc: number;

  // Derived outputs
  chronotype: CanonChronotype;
  confidence: CanonConfidence;
  fragility: number;        // Raw value: clamp((fatigue_h + interrupt_h)/2, -0.25, +0.25)
  fragilityLevel: FragilityLevel;
  sjl_hours: number;        // Social jetlag

  // Metadata
  computedAt: string;
}

// ============================================================================
// HELPER FUNCTIONS (exact algorithms from PDF)
// ============================================================================

/**
 * wrap24(x) keeps values in [0, 24).
 * Notation from PDF: hours in 24h decimal (07:30 → 7.5)
 */
export function wrap24(x: number): number {
  let result = x % 24;
  if (result < 0) {
    result += 24;
  }
  return result;
}

/**
 * Clamp value to [min, max] range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// MSFsc CALCULATION (exact algorithm from PDF)
// ============================================================================

/**
 * Compute phase proxies and MSFsc exactly per QUIZ v4.5.pdf
 */
export function computeMSFsc(answers: CanonQuizAnswers): {
  wakeW_mid: number;
  wakeF_mid: number;
  extra_h: number;
  fatigue_h: number;
  interrupt_h: number;
  SDw: number;
  SDf: number;
  MSW: number;
  MSF: number;
  Debt: number;
  MSFsc: number;
} {
  const wakeW_mid = Q1_ANCHORS[answers.q1];
  const wakeF_mid = Q2_ANCHORS[answers.q2];
  const extra_h = Q3_ANCHORS[answers.q3];
  const fatigue_h = Q4_ANCHORS[answers.q4];
  const interrupt_h = Q5_ANCHORS[answers.q5];

  // SDw = 7.0 (assumed workday sleep, population mean)
  const SDw = SDW_DEFAULT;

  // SDf = SDw + extra_h (free-day sleep reflects debt)
  const SDf = SDw + extra_h;

  // MSW = wrap24(wakeW_mid - SDw/2)
  const MSW = wrap24(wakeW_mid - SDw / 2);

  // MSF = wrap24(wakeF_mid - SDf/2)
  const MSF = wrap24(wakeF_mid - SDf / 2);

  // Sleep-debt correction (MCTQ convention)
  // Debt = SDf - SDw
  const Debt = SDf - SDw;

  // MSFsc = wrap24(Debt > 0 ? (MSF - 0.5*Debt) : MSF)
  const MSFsc = wrap24(Debt > 0 ? (MSF - 0.5 * Debt) : MSF);

  return {
    wakeW_mid,
    wakeF_mid,
    extra_h,
    fatigue_h,
    interrupt_h,
    SDw,
    SDf,
    MSW,
    MSF,
    Debt,
    MSFsc,
  };
}

// ============================================================================
// CHRONOTYPE MAPPING (exact thresholds from PDF)
// ============================================================================

/**
 * Map MSFsc to chronotype (exact thresholds from PDF)
 */
export function mapChronotype(MSFsc: number): CanonChronotype {
  if (MSFsc < 2.5) return 'AURORA';
  if (MSFsc < 3.5) return 'DAYBREAK';
  if (MSFsc < 4.5) return 'MERIDIAN';
  if (MSFsc < 5.5) return 'TWILIGHT';
  return 'NOCTURNE';
}

// ============================================================================
// FRAGILITY CALCULATION (exact algorithm from PDF)
// ============================================================================

/**
 * Focus fragility (separate from chronotype typing)
 * Fragility = clamp((fatigue_h + interrupt_h)/2, -0.25, +0.25)
 */
export function computeFragility(fatigue_h: number, interrupt_h: number): number {
  return clamp((fatigue_h + interrupt_h) / 2, -0.25, +0.25);
}

/**
 * Map raw fragility value to level.
 * This is a design choice for UI display.
 */
export function mapFragilityLevel(fragility: number): FragilityLevel {
  if (fragility <= -0.10) return 'Low';
  if (fragility >= 0.10) return 'High';
  return 'Medium';
}

// ============================================================================
// SOCIAL JETLAG (exact algorithm from PDF)
// ============================================================================

/**
 * Social jetlag (feedback only)
 * Δ = abs(MSF - MSW)
 * SJL_hours = (Δ > 12) ? (24 - Δ) : Δ
 */
export function computeSocialJetlag(MSF: number, MSW: number): number {
  const delta = Math.abs(MSF - MSW);
  return delta > 12 ? (24 - delta) : delta;
}

// ============================================================================
// CONFIDENCE FLAG (exact rule from PDF)
// ============================================================================

/**
 * Confidence flag
 * confidence = (Q3 == 'E') ? 'Lower' : 'Normal'
 */
export function computeConfidence(q3: string): CanonConfidence {
  return q3 === 'E' ? 'Lower' : 'Normal';
}

// ============================================================================
// FULL SCORING FUNCTION
// ============================================================================

/**
 * Score quiz answers exactly per QUIZ v4.5.pdf
 */
export function scoreCanonQuiz(answers: CanonQuizAnswers): CanonScoringResult {
  const phase = computeMSFsc(answers);
  const chronotype = mapChronotype(phase.MSFsc);
  const confidence = computeConfidence(answers.q3);
  const fragility = computeFragility(phase.fatigue_h, phase.interrupt_h);
  const fragilityLevel = mapFragilityLevel(fragility);
  const sjl_hours = computeSocialJetlag(phase.MSF, phase.MSW);

  return {
    ...phase,
    chronotype,
    confidence,
    fragility,
    fragilityLevel,
    sjl_hours,
    computedAt: new Date().toISOString(),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if all answers are provided and valid.
 */
export function isCanonQuizComplete(answers: Partial<CanonQuizAnswers>): answers is CanonQuizAnswers {
  const validKeys = ['A', 'B', 'C', 'D', 'E'];
  return (
    typeof answers.q1 === 'string' && validKeys.includes(answers.q1) &&
    typeof answers.q2 === 'string' && validKeys.includes(answers.q2) &&
    typeof answers.q3 === 'string' && validKeys.includes(answers.q3) &&
    typeof answers.q4 === 'string' && validKeys.includes(answers.q4) &&
    typeof answers.q5 === 'string' && validKeys.includes(answers.q5)
  );
}

// ============================================================================
// EXPORT QUESTIONS AS ARRAY (for UI iteration)
// ============================================================================

export const CANON_QUESTIONS_ARRAY = [
  CANON_QUESTIONS.Q1,
  CANON_QUESTIONS.Q2,
  CANON_QUESTIONS.Q3,
  CANON_QUESTIONS.Q4,
  CANON_QUESTIONS.Q5,
] as const;
