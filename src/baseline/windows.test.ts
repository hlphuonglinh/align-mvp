import { describe, it, expect } from 'vitest';
import { generateBaselineWindows, getBaselineTemplates } from './windows.js';
import type { ChronotypeProfile, Chronotype } from '../types.js';

const TEST_DATE = '2024-01-15';

function createProfile(chronotype: Chronotype, confidence: 'HIGH' | 'MED' | 'LOW' = 'HIGH'): ChronotypeProfile {
  return {
    chronotype,
    confidence,
    computedAt: new Date().toISOString(),
  };
}

describe('generateBaselineWindows', () => {
  describe('silence-first behavior', () => {
    it('should return empty array when profile is null', () => {
      const result = generateBaselineWindows(null, TEST_DATE);
      expect(result).toEqual([]);
    });

    it('should return empty array when profile is undefined', () => {
      const result = generateBaselineWindows(undefined, TEST_DATE);
      expect(result).toEqual([]);
    });

    it('should return empty array when confidence is LOW', () => {
      const profile = createProfile('MERIDIAN', 'LOW');
      const result = generateBaselineWindows(profile, TEST_DATE);
      expect(result).toEqual([]);
    });
  });

  describe('AURORA chronotype', () => {
    it('should generate correct windows', () => {
      const profile = createProfile('AURORA');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('FRAMING');
      expect(result[1].mode).toBe('EVALUATION');
      expect(result[2].mode).toBe('SYNTHESIS');

      // Check times
      expect(new Date(result[0].start).getHours()).toBe(5);
      expect(new Date(result[0].start).getMinutes()).toBe(30);
      expect(new Date(result[0].end).getHours()).toBe(7);
      expect(new Date(result[0].end).getMinutes()).toBe(30);
    });
  });

  describe('DAYBREAK chronotype', () => {
    it('should generate correct windows (including duplicate time range)', () => {
      const profile = createProfile('DAYBREAK');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(4);
      expect(result[0].mode).toBe('FRAMING');
      expect(result[1].mode).toBe('SYNTHESIS');
      expect(result[2].mode).toBe('EVALUATION');
      expect(result[3].mode).toBe('SYNTHESIS');

      // Verify overlapping windows (08:30-10:30)
      expect(result[1].start).toBe(result[2].start);
      expect(result[1].end).toBe(result[2].end);
    });
  });

  describe('MERIDIAN chronotype', () => {
    it('should generate correct windows', () => {
      const profile = createProfile('MERIDIAN');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('SYNTHESIS');
      expect(result[1].mode).toBe('EVALUATION');
      expect(result[2].mode).toBe('FRAMING');

      expect(new Date(result[0].start).getHours()).toBe(10);
    });
  });

  describe('TWILIGHT chronotype', () => {
    it('should generate correct windows', () => {
      const profile = createProfile('TWILIGHT');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('SYNTHESIS');
      expect(result[1].mode).toBe('EVALUATION');
      expect(result[2].mode).toBe('FRAMING');

      expect(new Date(result[0].start).getHours()).toBe(13);
    });
  });

  describe('NOCTURNE chronotype', () => {
    it('should generate correct windows', () => {
      const profile = createProfile('NOCTURNE');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(3);
      expect(result[0].mode).toBe('SYNTHESIS');
      expect(result[1].mode).toBe('EVALUATION');
      expect(result[2].mode).toBe('FRAMING');

      expect(new Date(result[0].start).getHours()).toBe(18);
      expect(new Date(result[2].end).getHours()).toBe(22);
      expect(new Date(result[2].end).getMinutes()).toBe(30);
    });
  });

  describe('window properties', () => {
    it('should have ISO string timestamps', () => {
      const profile = createProfile('MERIDIAN');
      const result = generateBaselineWindows(profile, TEST_DATE);

      for (const window of result) {
        expect(new Date(window.start).toISOString()).toBe(window.start);
        expect(new Date(window.end).toISOString()).toBe(window.end);
      }
    });

    it('should have source set to baseline', () => {
      const profile = createProfile('MERIDIAN');
      const result = generateBaselineWindows(profile, TEST_DATE);

      for (const window of result) {
        expect(window.source).toBe('baseline');
      }
    });

    it('should have reliability set to RELIABLE', () => {
      const profile = createProfile('MERIDIAN');
      const result = generateBaselineWindows(profile, TEST_DATE);

      for (const window of result) {
        expect(window.reliability).toBe('RELIABLE');
      }
    });
  });

  describe('MED confidence', () => {
    it('should generate windows when confidence is MED', () => {
      const profile = createProfile('TWILIGHT', 'MED');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('determinism', () => {
    it('should produce same windows for same inputs', () => {
      const profile = createProfile('AURORA', 'HIGH');
      const result1 = generateBaselineWindows(profile, TEST_DATE);
      const result2 = generateBaselineWindows(profile, TEST_DATE);

      expect(result1).toEqual(result2);
    });
  });
});

describe('getBaselineTemplates', () => {
  it('should return templates for each chronotype', () => {
    const chronotypes: Chronotype[] = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];

    for (const ct of chronotypes) {
      const templates = getBaselineTemplates(ct);
      expect(templates.length).toBeGreaterThan(0);
    }
  });
});
