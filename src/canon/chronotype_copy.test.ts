import { describe, it, expect } from 'vitest';
import { CHRONOTYPE_COPY } from './chronotype_copy.js';

/**
 * Tests for CHRONOTYPE_COPY canonical content.
 * Verifies verbatim copy from UX spec for chronotype explanations.
 */
describe('CHRONOTYPE_COPY', () => {
  it('should contain all five chronotypes', () => {
    expect(CHRONOTYPE_COPY).toHaveProperty('AURORA');
    expect(CHRONOTYPE_COPY).toHaveProperty('DAYBREAK');
    expect(CHRONOTYPE_COPY).toHaveProperty('MERIDIAN');
    expect(CHRONOTYPE_COPY).toHaveProperty('TWILIGHT');
    expect(CHRONOTYPE_COPY).toHaveProperty('NOCTURNE');
  });

  describe('each chronotype', () => {
    const chronotypes = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'] as const;

    chronotypes.forEach(chronotype => {
      describe(chronotype, () => {
        it('should have a hook', () => {
          expect(CHRONOTYPE_COPY[chronotype].hook).toBeTruthy();
          expect(typeof CHRONOTYPE_COPY[chronotype].hook).toBe('string');
        });

        it('should have a paragraph', () => {
          expect(CHRONOTYPE_COPY[chronotype].paragraph).toBeTruthy();
          expect(typeof CHRONOTYPE_COPY[chronotype].paragraph).toBe('string');
        });

        it('should have exactly 4 bullets', () => {
          expect(CHRONOTYPE_COPY[chronotype].bullets).toHaveLength(4);
        });

        it('should have alignHelps text', () => {
          expect(CHRONOTYPE_COPY[chronotype].alignHelps).toBeTruthy();
          expect(typeof CHRONOTYPE_COPY[chronotype].alignHelps).toBe('string');
        });

        it('should have prevalence text', () => {
          expect(CHRONOTYPE_COPY[chronotype].prevalence).toBeTruthy();
          expect(typeof CHRONOTYPE_COPY[chronotype].prevalence).toBe('string');
        });
      });
    });
  });

  describe('AURORA', () => {
    it('should have correct hook', () => {
      expect(CHRONOTYPE_COPY.AURORA.hook).toBe(
        'You are sharp in the morning, and decisions feel heavier as the day goes on.'
      );
    });

    it('should mention morning sharpness in paragraph', () => {
      expect(CHRONOTYPE_COPY.AURORA.paragraph).toContain('early in the day');
    });

    it('should have prevalence around 10-15 percent', () => {
      expect(CHRONOTYPE_COPY.AURORA.prevalence).toContain('10 to 15 percent');
    });
  });

  describe('DAYBREAK', () => {
    it('should have correct hook', () => {
      expect(CHRONOTYPE_COPY.DAYBREAK.hook).toBe(
        'You often start deciding before your thinking is fully there.'
      );
    });

    it('should have prevalence around 20-25 percent', () => {
      expect(CHRONOTYPE_COPY.DAYBREAK.prevalence).toContain('20 to 25 percent');
    });
  });

  describe('MERIDIAN', () => {
    it('should have correct hook', () => {
      expect(CHRONOTYPE_COPY.MERIDIAN.hook).toBe(
        'You don\'t feel when conditions are wrong, even though they still affect your decisions.'
      );
    });

    it('should have prevalence around 30-40 percent', () => {
      expect(CHRONOTYPE_COPY.MERIDIAN.prevalence).toContain('30 to 40 percent');
    });
  });

  describe('TWILIGHT', () => {
    it('should have correct hook', () => {
      expect(CHRONOTYPE_COPY.TWILIGHT.hook).toBe(
        'You don\'t feel when speed replaces depth early in the day.'
      );
    });

    it('should have prevalence around 15-20 percent', () => {
      expect(CHRONOTYPE_COPY.TWILIGHT.prevalence).toContain('15 to 20 percent');
    });
  });

  describe('NOCTURNE', () => {
    it('should have correct hook', () => {
      expect(CHRONOTYPE_COPY.NOCTURNE.hook).toBe(
        'You don\'t feel how much early decisions work against you.'
      );
    });

    it('should have prevalence around 5-10 percent', () => {
      expect(CHRONOTYPE_COPY.NOCTURNE.prevalence).toContain('5 to 10 percent');
    });
  });

  describe('content structure', () => {
    it('should not contain em dashes', () => {
      const chronotypes = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'] as const;

      chronotypes.forEach(chronotype => {
        const copy = CHRONOTYPE_COPY[chronotype];
        expect(copy.hook).not.toContain('—');
        expect(copy.paragraph).not.toContain('—');
        expect(copy.alignHelps).not.toContain('—');
        expect(copy.prevalence).not.toContain('—');
        copy.bullets.forEach(bullet => {
          expect(bullet).not.toContain('—');
        });
      });
    });

    it('should not contain emojis', () => {
      const chronotypes = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'] as const;
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u;

      chronotypes.forEach(chronotype => {
        const copy = CHRONOTYPE_COPY[chronotype];
        expect(copy.hook).not.toMatch(emojiRegex);
        expect(copy.paragraph).not.toMatch(emojiRegex);
        expect(copy.alignHelps).not.toMatch(emojiRegex);
        expect(copy.prevalence).not.toMatch(emojiRegex);
        copy.bullets.forEach(bullet => {
          expect(bullet).not.toMatch(emojiRegex);
        });
      });
    });
  });
});
