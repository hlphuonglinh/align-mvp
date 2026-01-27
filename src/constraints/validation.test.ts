import { describe, it, expect } from 'vitest';
import {
  validateConstraint,
  generateConstraintId,
} from './validation.js';
import type { V1Constraint } from './types.js';

describe('validateConstraint', () => {
  describe('basic validation', () => {
    it('should reject null input', () => {
      const result = validateConstraint(null);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Constraint must be an object');
    });

    it('should reject missing id', () => {
      const constraint = {
        kind: 'FIXED_BLOCK',
        payload: { dateISO: '2024-01-15', startLocal: '09:00', endLocal: '17:00' },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Missing or invalid id');
    });

    it('should reject invalid kind', () => {
      const constraint = {
        id: 'test',
        kind: 'INVALID',
        payload: {},
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid kind (must be FIXED_BLOCK)');
    });

    it('should reject missing payload', () => {
      const constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Missing or invalid payload');
    });

    it('should reject missing createdAtISO', () => {
      const constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: { dateISO: '2024-01-15', startLocal: '09:00', endLocal: '17:00' },
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Missing or invalid createdAtISO');
    });
  });

  describe('FIXED_HOURS migration (legacy support)', () => {
    it('should silently ignore legacy FIXED_HOURS constraints', () => {
      // This simulates old data that may still exist in localStorage
      const legacyConstraint = {
        id: 'work-hours',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(legacyConstraint);
      // Should return not ok but without error (silent migration)
      expect(result.ok).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('FIXED_BLOCK validation', () => {
    it('should accept valid FIXED_BLOCK constraint', () => {
      const constraint: V1Constraint = {
        id: 'unavailable',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '08:00',
          endLocal: '09:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(true);
    });

    it('should accept FIXED_BLOCK with allDay=true', () => {
      const constraint: V1Constraint = {
        id: 'unavailable-all-day',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '00:00',
          endLocal: '00:00',
          allDay: true,
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(true);
    });

    it('should not require valid times when allDay=true', () => {
      const constraint: V1Constraint = {
        id: 'unavailable-all-day',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: 'invalid',
          endLocal: 'invalid',
          allDay: true,
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(true);
    });

    it('should reject invalid date format', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '01-15-2024',
          startLocal: '08:00',
          endLocal: '09:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid dateISO (must be YYYY-MM-DD format)');
    });

    it('should reject invalid month in date', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-13-15',
          startLocal: '08:00',
          endLocal: '09:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid dateISO (must be YYYY-MM-DD format)');
    });

    it('should reject end before start', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '10:00',
          endLocal: '09:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('endLocal must be after startLocal');
    });
  });

  describe('time format validation', () => {
    it('should reject invalid time format (no colon)', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '0900',
          endLocal: '1700',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid startLocal (must be HH:MM format)');
    });

    it('should reject invalid hours (> 23)', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '24:00',
          endLocal: '25:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
    });

    it('should reject invalid minutes (> 59)', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '09:60',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
    });
  });
});

describe('generateConstraintId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateConstraintId());
    }
    expect(ids.size).toBe(100);
  });

  it('should start with constraint_ prefix', () => {
    const id = generateConstraintId();
    expect(id.startsWith('constraint_')).toBe(true);
  });
});
