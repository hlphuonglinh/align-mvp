import { describe, it, expect } from 'vitest';
import { generateBaselineWindows, getBaselineTemplates, hasSplitWindows } from './windows.js';
import type { ChronotypeProfile, Chronotype } from '../types.js';
import { ALL_CANON_MODES, CANON_WINDOW_TEMPLATES } from '../canon/index.js';

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
    it('should generate all 5 canon mode windows', () => {
      const profile = createProfile('AURORA');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(5);
      const modes = result.map(w => w.mode);
      expect(modes).toEqual(['FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'REFLECTION']);
    });

    it('should use canon window times', () => {
      const profile = createProfile('AURORA');
      const result = generateBaselineWindows(profile, TEST_DATE);
      const framing = result.find(w => w.mode === 'FRAMING')!;

      // AURORA FRAMING: 07:00–09:00 (v5.0 biologically honest windows)
      expect(new Date(framing.start).getHours()).toBe(7);
      expect(new Date(framing.end).getHours()).toBe(9);
    });
  });

  describe('DAYBREAK chronotype', () => {
    it('should generate all 5 canon mode windows', () => {
      const profile = createProfile('DAYBREAK');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(5);
      const modes = result.map(w => w.mode);
      expect(modes).toEqual(['FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'REFLECTION']);
    });
  });

  describe('MERIDIAN chronotype', () => {
    it('should generate all 5 canon mode windows', () => {
      const profile = createProfile('MERIDIAN');
      const result = generateBaselineWindows(profile, TEST_DATE);

      expect(result).toHaveLength(5);
      const modes = result.map(w => w.mode);
      expect(modes).toEqual(['FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'REFLECTION']);
    });
  });

  describe('TWILIGHT chronotype', () => {
    it('should generate 6 windows (EXECUTION is split)', () => {
      const profile = createProfile('TWILIGHT');
      const result = generateBaselineWindows(profile, TEST_DATE);

      // TWILIGHT has split EXECUTION (morning + evening) = 6 windows total
      expect(result).toHaveLength(6);
      const modes = result.map(w => w.mode);
      expect(modes).toEqual(['FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'EXECUTION', 'REFLECTION']);
    });

    it('should have split EXECUTION windows', () => {
      expect(hasSplitWindows('TWILIGHT', 'EXECUTION')).toBe(true);
      expect(hasSplitWindows('TWILIGHT', 'FRAMING')).toBe(false);
    });
  });

  describe('NOCTURNE chronotype', () => {
    it('should generate 6 windows (EXECUTION is split)', () => {
      const profile = createProfile('NOCTURNE');
      const result = generateBaselineWindows(profile, TEST_DATE);

      // NOCTURNE has split EXECUTION (afternoon + late night) = 6 windows total
      expect(result).toHaveLength(6);
      const modes = result.map(w => w.mode);
      expect(modes).toEqual(['FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'EXECUTION', 'REFLECTION']);
    });

    it('should have split EXECUTION windows', () => {
      expect(hasSplitWindows('NOCTURNE', 'EXECUTION')).toBe(true);
      expect(hasSplitWindows('NOCTURNE', 'FRAMING')).toBe(false);
    });

    it('should handle midnight wraparound for REFLECTION', () => {
      const profile = createProfile('NOCTURNE');
      const result = generateBaselineWindows(profile, TEST_DATE);
      const reflection = result.find(w => w.mode === 'REFLECTION')!;

      // NOCTURNE REFLECTION: 25:00–27:00 = 01:00–03:00 next day
      const startDate = new Date(reflection.start);
      const endDate = new Date(reflection.end);

      expect(startDate.getHours()).toBe(1);
      expect(endDate.getHours()).toBe(3);
      // Should be on the next day (2024-01-16)
      expect(startDate.getDate()).toBe(16);
      expect(endDate.getDate()).toBe(16);
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

      // TWILIGHT has split EXECUTION = 6 windows
      expect(result).toHaveLength(6);
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
      expect(templates).toBeDefined();
      expect(Object.keys(templates)).toHaveLength(5);
    }
  });

  it('should return all 5 modes for each chronotype', () => {
    const chronotypes: Chronotype[] = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];

    for (const ct of chronotypes) {
      const templates = getBaselineTemplates(ct);
      for (const mode of ALL_CANON_MODES) {
        expect(templates[mode]).toBeDefined();
        expect(templates[mode].start).toBeDefined();
        expect(templates[mode].end).toBeDefined();
      }
    }
  });

  it('should match canon window templates', () => {
    const chronotypes: Chronotype[] = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];

    for (const ct of chronotypes) {
      const templates = getBaselineTemplates(ct);
      expect(templates).toEqual(CANON_WINDOW_TEMPLATES[ct]);
    }
  });
});
