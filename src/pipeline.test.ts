import { describe, it, expect } from 'vitest';
import { computePlan } from './pipeline.js';
import type { BusyBlock, ChronotypeProfile, Constraint, GovernanceDecision } from './types.js';

describe('computePlan pipeline', () => {
  it('should exist and be a function', () => {
    expect(computePlan).toBeDefined();
    expect(typeof computePlan).toBe('function');
  });

  it('should not crash with empty inputs', () => {
    const result = computePlan({});
    expect(result).toBeDefined();
    expect(result.reliabilityWindows).toEqual([]);
    expect(result.decisions).toEqual([]);
  });

  it('should not crash with undefined optional fields', () => {
    const result = computePlan({
      chronotype: undefined,
      constraints: undefined,
      busyBlocks: undefined,
      date: undefined,
    });
    expect(result).toBeDefined();
    expect(result.reliabilityWindows).toBeDefined();
    expect(result.decisions).toBeDefined();
  });

  it('should return GovernanceDecision with SILENCE verdict for blocked constraints', () => {
    const chronotype: ChronotypeProfile = {
      type: 'morning',
      peakWindows: {
        focus: [{ start: '09:00', end: '12:00' }],
        creative: [],
        administrative: [],
      },
      energyCurve: ['high', 'medium', 'low'],
    };

    const constraints: Constraint[] = [
      {
        id: 'lunch',
        type: 'block',
        days: [1, 2, 3, 4, 5],
        window: { start: '12:00', end: '13:00' },
        label: 'Lunch break',
      },
    ];

    const result = computePlan({ chronotype, constraints });

    const silenceDecision = result.decisions.find(
      (d: GovernanceDecision) => d.verdict === 'SILENCE'
    );
    expect(silenceDecision).toBeDefined();
    expect(silenceDecision?.verdict).toBe('SILENCE');
  });

  it('should support all three governance verdicts: PERMIT, WARN, SILENCE', () => {
    // This test verifies the type system allows all three verdicts
    const permitDecision: GovernanceDecision = {
      verdict: 'PERMIT',
      reason: 'High reliability window',
      window: { start: '09:00', end: '12:00' },
    };
    const warnDecision: GovernanceDecision = {
      verdict: 'WARN',
      reason: 'Medium reliability window',
      window: { start: '14:00', end: '16:00' },
    };
    const silenceDecision: GovernanceDecision = {
      verdict: 'SILENCE',
      reason: 'Blocked by constraint',
      window: { start: '12:00', end: '13:00' },
    };

    expect(permitDecision.verdict).toBe('PERMIT');
    expect(warnDecision.verdict).toBe('WARN');
    expect(silenceDecision.verdict).toBe('SILENCE');
  });
});

describe('BusyBlock type constraints', () => {
  it('should have only start, end, allDay, and source properties', () => {
    const busyBlock: BusyBlock = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'manual',
    };

    // Verify the required properties exist
    expect(busyBlock.start).toBeInstanceOf(Date);
    expect(busyBlock.end).toBeInstanceOf(Date);
    expect(typeof busyBlock.allDay).toBe('boolean');
    expect(['manual', 'google', 'microsoft']).toContain(busyBlock.source);

    // Verify only these 4 keys exist (no title, description, attendees, location)
    const keys = Object.keys(busyBlock);
    expect(keys).toHaveLength(4);
    expect(keys.sort()).toEqual(['allDay', 'end', 'source', 'start']);
  });

  it('should support all valid source types', () => {
    const manualBlock: BusyBlock = {
      start: new Date(),
      end: new Date(),
      allDay: false,
      source: 'manual',
    };
    const googleBlock: BusyBlock = {
      start: new Date(),
      end: new Date(),
      allDay: true,
      source: 'google',
    };
    const microsoftBlock: BusyBlock = {
      start: new Date(),
      end: new Date(),
      allDay: false,
      source: 'microsoft',
    };

    expect(manualBlock.source).toBe('manual');
    expect(googleBlock.source).toBe('google');
    expect(microsoftBlock.source).toBe('microsoft');
  });
});

describe('Pipeline with full inputs', () => {
  it('should generate reliability windows from chronotype', () => {
    const chronotype: ChronotypeProfile = {
      type: 'morning',
      peakWindows: {
        focus: [{ start: '09:00', end: '12:00' }],
        creative: [{ start: '14:00', end: '16:00' }],
        administrative: [{ start: '16:00', end: '17:00' }],
      },
      energyCurve: ['high', 'medium', 'low'],
    };

    const result = computePlan({ chronotype });

    expect(result.reliabilityWindows.length).toBeGreaterThan(0);
    expect(result.reliabilityWindows.some(rw => rw.mode === 'focus')).toBe(true);
    expect(result.reliabilityWindows.some(rw => rw.mode === 'creative')).toBe(true);
    expect(result.reliabilityWindows.some(rw => rw.mode === 'administrative')).toBe(true);
  });
});
