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
        kind: 'FIXED_HOURS',
        payload: { daysOfWeek: [1], startLocal: '09:00', endLocal: '17:00' },
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
      expect(result.error).toBe('Invalid kind (must be FIXED_HOURS or FIXED_BLOCK)');
    });

    it('should reject missing payload', () => {
      const constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Missing or invalid payload');
    });

    it('should reject missing createdAtISO', () => {
      const constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        payload: { daysOfWeek: [1], startLocal: '09:00', endLocal: '17:00' },
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Missing or invalid createdAtISO');
    });
  });

  describe('FIXED_HOURS validation', () => {
    it('should accept valid FIXED_HOURS constraint', () => {
      const constraint: V1Constraint = {
        id: 'work-hours',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(true);
    });

    it('should reject empty daysOfWeek', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [],
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('daysOfWeek must not be empty');
    });

    it('should reject invalid day values (negative)', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [-1, 1],
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('daysOfWeek values must be integers 0-6');
    });

    it('should reject invalid day values (> 6)', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1, 7],
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('daysOfWeek values must be integers 0-6');
    });

    it('should reject end before start', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1],
          startLocal: '17:00',
          endLocal: '09:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('endLocal must be after startLocal');
    });

    it('should reject end equal to start', () => {
      const constraint: V1Constraint = {
        id: 'test',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1],
          startLocal: '09:00',
          endLocal: '09:00',
        },
        createdAtISO: new Date().toISOString(),
      };
      const result = validateConstraint(constraint);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('endLocal must be after startLocal');
    });
  });

  describe('FIXED_BLOCK validation', () => {
    it('should accept valid FIXED_BLOCK constraint', () => {
      const constraint: V1Constraint = {
        id: 'commute',
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
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1],
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
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1],
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
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1],
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
