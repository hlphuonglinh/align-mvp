import { describe, it, expect } from 'vitest';
import { scoreChronotype, isQuizComplete } from './scoring.js';
import { QUIZ_QUESTIONS } from './questions.js';
import type { QuizAnswers } from '../types.js';

describe('scoreChronotype', () => {
  describe('determinism', () => {
    it('should produce same result for same answers', () => {
      const answers: QuizAnswers = { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 };
      const result1 = scoreChronotype(answers);
      const result2 = scoreChronotype(answers);

      expect(result1.chronotype).toBe(result2.chronotype);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('should produce AURORA for all early answers (sum=5)', () => {
      const answers: QuizAnswers = { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('AURORA');
    });

    it('should produce DAYBREAK for early-leaning answers (sum=10)', () => {
      const answers: QuizAnswers = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('should produce MERIDIAN for middle answers (sum=15)', () => {
      const answers: QuizAnswers = { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('MERIDIAN');
    });

    it('should produce TWILIGHT for late-leaning answers (sum=20)', () => {
      const answers: QuizAnswers = { q1: 4, q2: 4, q3: 4, q4: 4, q5: 4 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('TWILIGHT');
    });

    it('should produce NOCTURNE for all late answers (sum=25)', () => {
      const answers: QuizAnswers = { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('NOCTURNE');
    });
  });

  describe('confidence levels', () => {
    it('should return LOW confidence for missing answers', () => {
      const answers: QuizAnswers = { q1: 3, q2: 3 }; // missing q3, q4, q5
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('LOW');
    });

    it('should return LOW confidence for empty answers', () => {
      const answers: QuizAnswers = {};
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('LOW');
    });

    it('should return HIGH confidence for consistent answers', () => {
      const answers: QuizAnswers = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2 };
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('HIGH');
    });

    it('should return MED confidence for varied answers', () => {
      const answers: QuizAnswers = { q1: 1, q2: 3, q3: 5, q4: 2, q5: 4 };
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('MED');
    });

    it('should return MERIDIAN when confidence is LOW (default)', () => {
      const answers: QuizAnswers = { q1: 1 }; // very incomplete
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('MERIDIAN');
      expect(result.confidence).toBe('LOW');
    });
  });

  describe('boundary cases', () => {
    it('should produce AURORA at boundary (sum=8)', () => {
      const answers: QuizAnswers = { q1: 1, q2: 1, q3: 2, q4: 2, q5: 2 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('AURORA');
    });

    it('should produce DAYBREAK at boundary (sum=9)', () => {
      const answers: QuizAnswers = { q1: 1, q2: 2, q3: 2, q4: 2, q5: 2 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('should produce DAYBREAK at boundary (sum=12)', () => {
      const answers: QuizAnswers = { q1: 2, q2: 2, q3: 2, q4: 3, q5: 3 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('should produce MERIDIAN at boundary (sum=13)', () => {
      const answers: QuizAnswers = { q1: 2, q2: 3, q3: 2, q4: 3, q5: 3 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('MERIDIAN');
    });

    it('should produce TWILIGHT at boundary (sum=18)', () => {
      const answers: QuizAnswers = { q1: 3, q2: 4, q3: 4, q4: 4, q5: 3 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('TWILIGHT');
    });

    it('should produce NOCTURNE at boundary (sum=22)', () => {
      const answers: QuizAnswers = { q1: 4, q2: 5, q3: 4, q4: 5, q5: 4 };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('NOCTURNE');
    });
  });

  describe('computedAt field', () => {
    it('should include ISO timestamp', () => {
      const answers: QuizAnswers = { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3 };
      const result = scoreChronotype(answers);
      expect(result.computedAt).toBeDefined();
      expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
    });
  });
});

describe('isQuizComplete', () => {
  it('should return true when all questions answered', () => {
    const answers: QuizAnswers = { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5 };
    expect(isQuizComplete(answers)).toBe(true);
  });

  it('should return false when any question missing', () => {
    const answers: QuizAnswers = { q1: 1, q2: 2, q3: 3, q4: 4 };
    expect(isQuizComplete(answers)).toBe(false);
  });

  it('should return false for empty answers', () => {
    const answers: QuizAnswers = {};
    expect(isQuizComplete(answers)).toBe(false);
  });
});

describe('QUIZ_QUESTIONS', () => {
  it('should have exactly 5 questions', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5);
  });

  it('should have unique question ids', () => {
    const ids = QUIZ_QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('should have options with values 1-5', () => {
    for (const q of QUIZ_QUESTIONS) {
      const values = q.options.map(o => o.value).sort((a, b) => a - b);
      expect(values).toEqual([1, 2, 3, 4, 5]);
    }
  });
});
