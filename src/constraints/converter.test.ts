import { describe, it, expect } from 'vitest';
import { constraintsToBusyBlocks, getConstraintsForDay } from './converter.js';
import type { V1Constraint } from './types.js';

describe('constraintsToBusyBlocks', () => {
  describe('FIXED_HOURS', () => {
    it('should create BusyBlock when day matches', () => {
      // 2024-01-15 is a Monday (day 1)
      const constraint: V1Constraint = {
        id: 'work',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };

      const blocks = constraintsToBusyBlocks([constraint], '2024-01-15');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].start.getHours()).toBe(9);
      expect(blocks[0].end.getHours()).toBe(17);
      expect(blocks[0].source).toBe('manual');
    });

    it('should not create BusyBlock when day does not match', () => {
      // 2024-01-14 is a Sunday (day 0)
      const constraint: V1Constraint = {
        id: 'work',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      };

      const blocks = constraintsToBusyBlocks([constraint], '2024-01-14');

      expect(blocks).toHaveLength(0);
    });

    it('should create BusyBlock for Saturday when included', () => {
      // 2024-01-13 is a Saturday (day 6)
      const constraint: V1Constraint = {
        id: 'weekend-work',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [6], // Saturday only
          startLocal: '10:00',
          endLocal: '14:00',
        },
        createdAtISO: new Date().toISOString(),
      };

      const blocks = constraintsToBusyBlocks([constraint], '2024-01-13');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].start.getHours()).toBe(10);
      expect(blocks[0].end.getHours()).toBe(14);
    });
  });

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
  });

  describe('multiple constraints', () => {
    it('should handle multiple constraints', () => {
      const constraints: V1Constraint[] = [
        {
          id: 'work',
          kind: 'FIXED_HOURS',
          payload: {
            daysOfWeek: [1],
            startLocal: '09:00',
            endLocal: '17:00',
          },
          createdAtISO: new Date().toISOString(),
        },
        {
          id: 'appointment',
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
  it('should return FIXED_HOURS constraints for matching day', () => {
    const constraints: V1Constraint[] = [
      {
        id: 'work',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [1],
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      },
    ];

    const result = getConstraintsForDay(constraints, '2024-01-15'); // Monday

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('work');
  });

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
        id: 'work',
        kind: 'FIXED_HOURS',
        payload: {
          daysOfWeek: [2], // Tuesday
          startLocal: '09:00',
          endLocal: '17:00',
        },
        createdAtISO: new Date().toISOString(),
      },
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

    const result = getConstraintsForDay(constraints, '2024-01-15'); // Monday

    expect(result).toHaveLength(0);
  });
});
