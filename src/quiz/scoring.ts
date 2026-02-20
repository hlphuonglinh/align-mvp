/**
 * Quiz scoring for chronotype determination.
 * CANON: All scoring logic imported from src/canon/quiz_v4_5.ts
 */

import type {
  ChronotypeProfile,
  ExtendedChronotypeProfile,
  Chronotype,
  OuraChronotypeSelection,
} from '../types.js';
import {
  scoreCanonQuiz,
  isCanonQuizComplete,
  computeFragility,
  mapFragilityLevel,
  Q4_ANCHORS,
  Q5_ANCHORS,
  type CanonQuizAnswers,
  type CanonScoringResult,
} from '../canon/index.js';

// Re-export canon types and functions
export {
  scoreCanonQuiz,
  isCanonQuizComplete,
  type CanonQuizAnswers,
  type CanonScoringResult,
};

/**
 * New quiz answers type using letter keys.
 */
export interface QuizAnswers {
  q1?: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
}

/**
 * Scores quiz answers to determine chronotype.
 * Uses canon MSFsc calculation.
 */
export function scoreChronotype(answers: QuizAnswers): ChronotypeProfile {
  // Validate completeness
  if (!isQuizComplete(answers)) {
    // Return a LOW confidence profile with MERIDIAN default
    return {
      chronotype: 'MERIDIAN',
      confidence: 'LOW',
      computedAt: new Date().toISOString(),
    };
  }

  // Convert to canon format and score
  const canonAnswers: CanonQuizAnswers = {
    q1: answers.q1!,
    q2: answers.q2!,
    q3: answers.q3!,
    q4: answers.q4!,
    q5: answers.q5!,
  };

  const result = scoreCanonQuiz(canonAnswers);

  // Map canon confidence to existing type
  // Canon uses 'Normal' | 'Lower', we use 'HIGH' | 'MED' | 'LOW'
  const confidence = result.confidence === 'Lower' ? 'LOW' : 'HIGH';

  return {
    chronotype: result.chronotype,
    confidence,
    computedAt: result.computedAt,
    // Store full canon result for extended profile
    _canonResult: result,
  } as ChronotypeProfile;
}

/**
 * Validates that all questions are answered.
 */
export function isQuizComplete(answers: QuizAnswers): boolean {
  const validKeys = ['A', 'B', 'C', 'D', 'E'];
  return (
    typeof answers.q1 === 'string' && validKeys.includes(answers.q1) &&
    typeof answers.q2 === 'string' && validKeys.includes(answers.q2) &&
    typeof answers.q3 === 'string' && validKeys.includes(answers.q3) &&
    typeof answers.q4 === 'string' && validKeys.includes(answers.q4) &&
    typeof answers.q5 === 'string' && validKeys.includes(answers.q5)
  );
}

/**
 * Get full canon scoring result (for extended profile display).
 */
export function getFullScoringResult(answers: QuizAnswers): CanonScoringResult | null {
  if (!isQuizComplete(answers)) {
    return null;
  }

  const canonAnswers: CanonQuizAnswers = {
    q1: answers.q1!,
    q2: answers.q2!,
    q3: answers.q3!,
    q4: answers.q4!,
    q5: answers.q5!,
  };

  return scoreCanonQuiz(canonAnswers);
}

// ============================================================================
// OURA FLOW SCORING
// ============================================================================

/**
 * Canonical MSFsc midpoints for each chronotype.
 * Used when Oura provides the chronotype directly.
 */
export const CHRONOTYPE_MSFSC_MIDPOINTS: Record<Chronotype, number> = {
  AURORA: 2.0,
  DAYBREAK: 3.0,
  MERIDIAN: 4.0,
  TWILIGHT: 5.0,
  NOCTURNE: 6.0,
};

/**
 * Direct Oura type to Align chronotype mappings (no disambiguation needed).
 */
const OURA_DIRECT_MAPPINGS: Partial<Record<OuraChronotypeSelection, Chronotype>> = {
  'Early morning type': 'AURORA',
  'Morning type': 'DAYBREAK',
  'Evening type': 'TWILIGHT',
  'Late evening type': 'NOCTURNE',
};

/**
 * Get canonical MSFsc midpoint for a chronotype.
 */
export function getChronotypeMSFscMidpoint(chronotype: Chronotype): number {
  return CHRONOTYPE_MSFSC_MIDPOINTS[chronotype];
}

/**
 * Format decimal hours to HH:MM display string.
 * @param msfsc - Mid-sleep corrected in decimal hours (e.g., 3.5)
 * @returns Formatted time string (e.g., "03:30")
 */
export function formatMidSleep(msfsc: number): string {
  // Handle wrap-around for values >= 24 or < 0
  let normalizedHours = msfsc % 24;
  if (normalizedHours < 0) normalizedHours += 24;

  const hours = Math.floor(normalizedHours);
  const minutes = Math.round((normalizedHours - hours) * 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Determines if an Oura type requires disambiguation.
 */
export function ouraTypeNeedsDisambiguation(ouraType: OuraChronotypeSelection): boolean {
  return ouraType === 'Late morning type' || ouraType === 'Early evening type';
}

/**
 * Resolves boundary Oura types using Q2 answer for disambiguation.
 *
 * Late morning type:
 *   - Q2 answer A or B → DAYBREAK
 *   - Q2 answer C, D, or E → MERIDIAN
 *
 * Early evening type:
 *   - Q2 answer A, B, or C → MERIDIAN
 *   - Q2 answer D or E → TWILIGHT
 */
export function resolveOuraBoundaryType(
  ouraType: 'Late morning type' | 'Early evening type',
  q2Answer: string
): Chronotype {
  if (ouraType === 'Late morning type') {
    if (q2Answer === 'A' || q2Answer === 'B') {
      return 'DAYBREAK';
    }
    return 'MERIDIAN';
  }

  // Early evening type
  if (q2Answer === 'A' || q2Answer === 'B' || q2Answer === 'C') {
    return 'MERIDIAN';
  }
  return 'TWILIGHT';
}

/**
 * Maps Oura chronotype selection to Align chronotype.
 * For boundary types (Late morning, Early evening), requires disambiguation answer.
 */
export function mapOuraToChronotype(
  ouraType: OuraChronotypeSelection,
  disambigAnswer?: string
): Chronotype {
  // Check direct mappings first
  const directMapping = OURA_DIRECT_MAPPINGS[ouraType];
  if (directMapping) {
    return directMapping;
  }

  // Boundary types require disambiguation
  if (ouraType === 'Late morning type' || ouraType === 'Early evening type') {
    if (!disambigAnswer) {
      // Default to middle if no answer provided (shouldn't happen in normal flow)
      return ouraType === 'Late morning type' ? 'MERIDIAN' : 'TWILIGHT';
    }
    return resolveOuraBoundaryType(ouraType, disambigAnswer);
  }

  // Fallback (shouldn't reach here)
  return 'MERIDIAN';
}

/**
 * Scores Oura flow to produce an ExtendedChronotypeProfile.
 *
 * @param ouraType - The Oura chronotype selection
 * @param disambigAnswer - Q2 answer for boundary disambiguation (optional)
 * @param q4 - Fatigue sensitivity answer (A-E)
 * @param q5 - Interruption sensitivity answer (A-E)
 */
export function scoreOuraChronotype(
  ouraType: OuraChronotypeSelection,
  disambigAnswer: string | undefined,
  q4: string,
  q5: string
): ExtendedChronotypeProfile {
  const chronotype = mapOuraToChronotype(ouraType, disambigAnswer);
  const msfsc = getChronotypeMSFscMidpoint(chronotype);

  // Compute fragility from Q4/Q5
  const fatigue_h = Q4_ANCHORS[q4] ?? 0;
  const interrupt_h = Q5_ANCHORS[q5] ?? 0;
  const rawFragility = computeFragility(fatigue_h, interrupt_h);
  const fragilityLevel = mapFragilityLevel(rawFragility);

  return {
    chronotype,
    confidence: 'HIGH', // Oura-informed is considered high confidence
    computedAt: new Date().toISOString(),
    msfsc,
    sjl_hours: null, // Cannot compute social jetlag from Oura flow
    fragility: fragilityLevel,
    fragility_score: rawFragility,
    source: 'oura',
  };
}

/**
 * Scores full quiz flow to produce an ExtendedChronotypeProfile.
 */
export function scoreQuizExtended(answers: QuizAnswers): ExtendedChronotypeProfile {
  if (!isQuizComplete(answers)) {
    // Return default profile for incomplete quiz
    return {
      chronotype: 'MERIDIAN',
      confidence: 'LOW',
      computedAt: new Date().toISOString(),
      msfsc: CHRONOTYPE_MSFSC_MIDPOINTS.MERIDIAN,
      sjl_hours: null,
      fragility: 'Medium',
      fragility_score: 0,
      source: 'quiz',
    };
  }

  const canonResult = scoreCanonQuiz({
    q1: answers.q1!,
    q2: answers.q2!,
    q3: answers.q3!,
    q4: answers.q4!,
    q5: answers.q5!,
  });

  // Map canon confidence to our type
  const confidence = canonResult.confidence === 'Lower' ? 'LOW' : 'HIGH';

  return {
    chronotype: canonResult.chronotype,
    confidence,
    computedAt: canonResult.computedAt,
    msfsc: canonResult.MSFsc,
    sjl_hours: canonResult.sjl_hours,
    fragility: canonResult.fragilityLevel,
    fragility_score: canonResult.fragility,
    source: 'quiz',
  };
}
