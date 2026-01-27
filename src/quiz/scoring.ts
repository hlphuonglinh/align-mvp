/**
 * Quiz scoring for chronotype determination.
 * CANON: All scoring logic imported from src/canon/quiz_v4_5.ts
 */

import type { ChronotypeProfile } from '../types.js';
import {
  scoreCanonQuiz,
  isCanonQuizComplete,
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
