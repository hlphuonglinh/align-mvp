/**
 * Quiz questions for chronotype determination.
 * CANON: All values imported from src/canon/quiz_v4_5.ts
 */

import {
  CANON_QUESTIONS,
  CANON_QUESTIONS_ARRAY,
} from '../canon/index.js';

// Re-export canon questions
export { CANON_QUESTIONS, CANON_QUESTIONS_ARRAY };

// Legacy interface for compatibility
export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

export interface QuizOption {
  key: string;
  label: string;
}

/**
 * Quiz questions array for UI iteration.
 * Uses canon values exactly.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = CANON_QUESTIONS_ARRAY.map(q => ({
  id: q.id,
  text: q.text,
  options: q.options.map(o => ({
    key: o.key,
    label: o.label,
  })),
}));
