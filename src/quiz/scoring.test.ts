import { describe, it, expect } from 'vitest';
import { scoreChronotype, isQuizComplete } from './scoring.js';
import { QUIZ_QUESTIONS } from './questions.js';
import type { QuizAnswers } from '../types.js';

describe('scoreChronotype', () => {
  describe('determinism', () => {
    it('should produce same result for same answers', () => {
      const answers: QuizAnswers = { q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A' };
      const result1 = scoreChronotype(answers);
      const result2 = scoreChronotype(answers);

      expect(result1.chronotype).toBe(result2.chronotype);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('should produce DAYBREAK for extreme early answers (A,A,A,A,A)', () => {
      // MSFsc ~2.75 falls in DAYBREAK range (2.5-3.5)
      const answers: QuizAnswers = { q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A' };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('should produce DAYBREAK for middle answers (C,C,C,C,C)', () => {
      // MSFsc ~3.25 falls in DAYBREAK range (2.5-3.5)
      const answers: QuizAnswers = { q1: 'C', q2: 'C', q3: 'C', q4: 'C', q5: 'C' };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('should produce NOCTURNE for extreme late answers (E,E,E,E,E)', () => {
      // MSFsc ~6.5 falls in NOCTURNE range (>=5.5)
      const answers: QuizAnswers = { q1: 'E', q2: 'E', q3: 'E', q4: 'E', q5: 'E' };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('NOCTURNE');
    });

    it('should produce TWILIGHT for mixed late answers (B,D,B,C,C)', () => {
      // MSFsc ~4.75 falls in TWILIGHT range (4.5-5.5)
      const answers: QuizAnswers = { q1: 'B', q2: 'D', q3: 'B', q4: 'C', q5: 'C' };
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('TWILIGHT');
    });
  });

  describe('confidence levels', () => {
    it('should return LOW confidence for missing answers', () => {
      const answers: QuizAnswers = { q1: 'C', q2: 'C' }; // missing q3, q4, q5
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('LOW');
    });

    it('should return LOW confidence for empty answers', () => {
      const answers: QuizAnswers = {};
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('LOW');
    });

    it('should return HIGH confidence for complete answers without Q3=E', () => {
      const answers: QuizAnswers = { q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'B' };
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('HIGH');
    });

    it('should return LOW confidence when Q3=E (alarm on free days)', () => {
      // Per canon: Q3='E' → Lower confidence
      const answers: QuizAnswers = { q1: 'C', q2: 'C', q3: 'E', q4: 'C', q5: 'C' };
      const result = scoreChronotype(answers);
      expect(result.confidence).toBe('LOW');
    });

    it('should return MERIDIAN when confidence is LOW (default)', () => {
      const answers: QuizAnswers = { q1: 'A' }; // very incomplete
      const result = scoreChronotype(answers);
      expect(result.chronotype).toBe('MERIDIAN');
      expect(result.confidence).toBe('LOW');
    });
  });

  describe('computedAt field', () => {
    it('should include ISO timestamp', () => {
      const answers: QuizAnswers = { q1: 'C', q2: 'C', q3: 'C', q4: 'C', q5: 'C' };
      const result = scoreChronotype(answers);
      expect(result.computedAt).toBeDefined();
      expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
    });
  });
});

describe('isQuizComplete', () => {
  it('should return true when all questions answered with valid keys', () => {
    const answers: QuizAnswers = { q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'E' };
    expect(isQuizComplete(answers)).toBe(true);
  });

  it('should return false when any question missing', () => {
    const answers: QuizAnswers = { q1: 'A', q2: 'B', q3: 'C', q4: 'D' };
    expect(isQuizComplete(answers)).toBe(false);
  });

  it('should return false for empty answers', () => {
    const answers: QuizAnswers = {};
    expect(isQuizComplete(answers)).toBe(false);
  });

  it('should return false for invalid answer keys', () => {
    const answers = { q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'F' } as QuizAnswers;
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

  it('should have options with keys A-E', () => {
    for (const q of QUIZ_QUESTIONS) {
      const keys = q.options.map(o => o.key).sort();
      expect(keys).toEqual(['A', 'B', 'C', 'D', 'E']);
    }
  });
});
