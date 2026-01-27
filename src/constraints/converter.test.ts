import { describe, it, expect } from 'vitest';
import { constraintsToBusyBlocks, getConstraintsForDay } from './converter.js';
import type { V1Constraint } from './types.js';

describe('constraintsToBusyBlocks', () => {
  describe('FIXED_BLOCK', () => {
    it('should create BusyBlock when date matches', () => {
      const constraint: V1Constraint = {
        id: 'appointment',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '14:00',
          endLocal: '15:30',
        },
        createdAtISO: new Date().toISOString(),
      };

      const blocks = constraintsToBusyBlocks([constraint], '2024-01-15');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].start.getHours()).toBe(14);
      expect(blocks[0].end.getHours()).toBe(15);
      expect(blocks[0].end.getMinutes()).toBe(30);
      expect(blocks[0].source).toBe('manual');
    });

    it('should not create BusyBlock when date does not match', () => {
      const constraint: V1Constraint = {
        id: 'appointment',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '14:00',
          endLocal: '15:30',
        },
        createdAtISO: new Date().toISOString(),
      };

      const blocks = constraintsToBusyBlocks([constraint], '2024-01-16');

      expect(blocks).toHaveLength(0);
    });

    it('should create all-day BusyBlock when allDay=true', () => {
      const constraint: V1Constraint = {
        id: 'unavailable-day',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '00:00',
          endLocal: '00:00',
          allDay: true,
        },
        createdAtISO: new Date().toISOString(),
      };

      const blocks = constraintsToBusyBlocks([constraint], '2024-01-15');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].allDay).toBe(true);
      expect(blocks[0].start.getHours()).toBe(0);
      expect(blocks[0].end.getHours()).toBe(23);
    });
  });

  describe('legacy FIXED_HOURS (migration)', () => {
    it('should silently ignore legacy FIXED_HOURS constraints', () => {
      // Simulate old data that may still be in localStorage
      const legacyConstraint = {
        id: 'work',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      } as unknown as V1Constraint;

      // Should not crash and should return empty array
      const blocks = constraintsToBusyBlocks([legacyConstraint], '2024-01-15');

      expect(blocks).toHaveLength(0);
    });
  });

  describe('multiple constraints', () => {
    it('should handle multiple FIXED_BLOCK constraints', () => {
      const constraints: V1Constraint[] = [
        {
          id: 'morning',
          kind: 'FIXED_BLOCK',
          payload: {
            dateISO: '2024-01-15',
            startLocal: '09:00',
            endLocal: '10:00',
          },
          createdAtISO: new Date().toISOString(),
        },
        {
          id: 'afternoon',
          kind: 'FIXED_BLOCK',
          payload: {
            dateISO: '2024-01-15',
            startLocal: '18:00',
            endLocal: '19:00',
          },
          createdAtISO: new Date().toISOString(),
        },
      ];

      const blocks = constraintsToBusyBlocks(constraints, '2024-01-15');

      expect(blocks).toHaveLength(2);
    });
  });
});

describe('getConstraintsForDay', () => {
  it('should return FIXED_BLOCK constraints for matching date', () => {
    const constraints: V1Constraint[] = [
      {
        id: 'appointment',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-15',
          startLocal: '14:00',
          endLocal: '15:00',
        },
        createdAtISO: new Date().toISOString(),
      },
    ];

    const result = getConstraintsForDay(constraints, '2024-01-15');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('appointment');
  });

  it('should filter out non-matching constraints', () => {
    const constraints: V1Constraint[] = [
      {
        id: 'appointment',
        kind: 'FIXED_BLOCK',
        payload: {
          dateISO: '2024-01-16', // Different date
          startLocal: '14:00',
          endLocal: '15:00',
        },
        createdAtISO: new Date().toISOString(),
      },
    ];

    const result = getConstraintsForDay(constraints, '2024-01-15');

    expect(result).toHaveLength(0);
  });

  it('should ignore legacy FIXED_HOURS constraints', () => {
    const legacyConstraint = {
      id: 'work',
      kind: 'FIXED_HOURS',
      payload: {
        daysOfWeek: [1], // Monday (2024-01-15)
        startLocal: '09:00',
        endLocal: '17:00',
      },
      createdAtISO: new Date().toISOString(),
    } as unknown as V1Constraint;

    const result = getConstraintsForDay([legacyConstraint], '2024-01-15');

    expect(result).toHaveLength(0);
  });
});
