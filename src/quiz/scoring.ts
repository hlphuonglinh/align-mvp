import type { QuizAnswers, ChronotypeProfile, Chronotype, ChronotypeConfidence } from '../types.js';
import { QUIZ_QUESTIONS } from './questions.js';

/**
 * Scores quiz answers to determine chronotype.
 * Deterministic: same answers always produce same profile.
 */
export function scoreChronotype(answers: QuizAnswers): ChronotypeProfile {
  const confidence = calculateConfidence(answers);
  const chronotype = calculateChronotype(answers, confidence);

  return {
    chronotype,
    confidence,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Calculates confidence based on answer completeness.
 */
function calculateConfidence(answers: QuizAnswers): ChronotypeConfidence {
  const questionIds = QUIZ_QUESTIONS.map(q => q.id);
  let answered = 0;

  for (const id of questionIds) {
    const key = id as keyof QuizAnswers;
    if (answers[key] !== undefined && answers[key] !== null) {
      answered++;
    }
  }

  if (answered < questionIds.length) {
    return 'LOW';
  }

  // Check for consistency (all early or all late answers indicate HIGH confidence)
  const values = getAnswerValues(answers);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

  // Low variance = consistent answers = HIGH confidence
  // High variance = inconsistent = MED confidence
  if (variance <= 1.0) {
    return 'HIGH';
  }
  return 'MED';
}

/**
 * Calculates chronotype from answers.
 * Uses sum of answer values to determine type.
 */
function calculateChronotype(answers: QuizAnswers, confidence: ChronotypeConfidence): Chronotype {
  // If confidence is LOW, default to MERIDIAN (middle of the spectrum)
  if (confidence === 'LOW') {
    return 'MERIDIAN';
  }

  const values = getAnswerValues(answers);
  const sum = values.reduce((a, b) => a + b, 0);

  // Score ranges (5 questions, each 1-5):
  // Min: 5, Max: 25
  // AURORA:    5-8   (very early)
  // DAYBREAK:  9-12  (early)
  // MERIDIAN:  13-17 (middle)
  // TWILIGHT:  18-21 (late)
  // NOCTURNE:  22-25 (very late)

  if (sum <= 8) {
    return 'AURORA';
  }
  if (sum <= 12) {
    return 'DAYBREAK';
  }
  if (sum <= 17) {
    return 'MERIDIAN';
  }
  if (sum <= 21) {
    return 'TWILIGHT';
  }
  return 'NOCTURNE';
}

/**
 * Extracts answer values as an array.
 */
function getAnswerValues(answers: QuizAnswers): number[] {
  const values: number[] = [];
  for (const q of QUIZ_QUESTIONS) {
    const key = q.id as keyof QuizAnswers;
    const value = answers[key];
    if (value !== undefined && value !== null) {
      values.push(value);
    }
  }
  return values;
}

/**
 * Validates that all questions are answered.
 */
export function isQuizComplete(answers: QuizAnswers): boolean {
  for (const q of QUIZ_QUESTIONS) {
    const key = q.id as keyof QuizAnswers;
    if (answers[key] === undefined || answers[key] === null) {
      return false;
    }
  }
  return true;
}
