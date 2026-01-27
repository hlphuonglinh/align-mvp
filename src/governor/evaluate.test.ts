import { describe, it, expect } from 'vitest';
import { evaluateDay, _windowsOverlap, _subtractBusyBlocks } from './evaluate.js';
import type { ChronotypeProfile, BaselineWindow, BusyBlock, GovernorInput } from '../types.js';

const TEST_DATE = '2024-01-15';

function createProfile(confidence: 'HIGH' | 'MED' | 'LOW' = 'HIGH'): ChronotypeProfile {
  return {
    chronotype: 'MERIDIAN',
    confidence,
    computedAt: new Date().toISOString(),
  };
}

function createBaselineWindow(
  mode: 'FRAMING' | 'SYNTHESIS' | 'EVALUATION' | 'EXECUTION' | 'REFLECTION',
  startHour: number,
  endHour: number,
  startMinute = 0,
  endMinute = 0
): BaselineWindow {
  const start = new Date(TEST_DATE);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(TEST_DATE);
  end.setHours(endHour, endMinute, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    mode,
    reliability: 'RELIABLE',
    source: 'baseline',
  };
}

function createBusyBlock(startHour: number, endHour: number, startMinute = 0, endMinute = 0): BusyBlock {
  const start = new Date(TEST_DATE);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(TEST_DATE);
  end.setHours(endHour, endMinute, 0, 0);

  return {
    start,
    end,
    allDay: false,
    source: 'manual',
  };
}

describe('evaluateDay', () => {
  describe('SILENCE conditions', () => {
    it('should return SILENCE for all modes when profile is null', () => {
      const input: GovernorInput = {
        profile: null,
        busyBlocks: [],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);

      expect(decisions).toHaveLength(5);
      for (const decision of decisions) {
        expect(decision.decision).toBe('SILENCE');
        expect(decision.reason).toBe('Conditions are not structurally reliable right now.');
        expect(decision.window).toBeUndefined();
      }
    });

    it('should return SILENCE for all modes when confidence is LOW', () => {
      const input: GovernorInput = {
        profile: createProfile('LOW'),
        busyBlocks: [],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);

      expect(decisions).toHaveLength(5);
      for (const decision of decisions) {
        expect(decision.decision).toBe('SILENCE');
        expect(decision.reason).toBe('Conditions are not structurally reliable right now.');
      }
    });

    it('should return SILENCE for all modes when no baseline windows exist', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);

      expect(decisions).toHaveLength(5);
      for (const decision of decisions) {
        expect(decision.decision).toBe('SILENCE');
        expect(decision.reason).toBe('Conditions are not structurally reliable right now.');
      }
    });

    it('should return SILENCE for a mode with no reliable windows', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [
          createBaselineWindow('FRAMING', 10, 12),
          // No SYNTHESIS, EVALUATION, EXECUTION, or REFLECTION windows
        ],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);

      const framingDecision = decisions.find(d => d.mode === 'FRAMING');
      const synthesisDecision = decisions.find(d => d.mode === 'SYNTHESIS');

      expect(framingDecision?.decision).toBe('PERMIT');
      expect(synthesisDecision?.decision).toBe('SILENCE');
      expect(synthesisDecision?.reason).toBe('Conditions are not structurally reliable right now.');
    });
  });

  describe('PERMIT conditions', () => {
    it('should return PERMIT when reliable window exists and no conflicts', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('PERMIT');
      expect(framingDecision?.reason).toBe('Conditions support this mode of thinking.');
      expect(framingDecision?.window).toBeDefined();
    });

    it('should include window times for PERMIT', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [createBaselineWindow('SYNTHESIS', 14, 16)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const synthesisDecision = decisions.find(d => d.mode === 'SYNTHESIS');

      expect(synthesisDecision?.window).toBeDefined();
      expect(new Date(synthesisDecision!.window!.start).getHours()).toBe(14);
      expect(new Date(synthesisDecision!.window!.end).getHours()).toBe(16);
    });

    it('should work with MED confidence', () => {
      const input: GovernorInput = {
        profile: createProfile('MED'),
        busyBlocks: [],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('PERMIT');
    });

    it('should pick earliest window when multiple exist for a mode', () => {
      const earlyWindow = createBaselineWindow('FRAMING', 8, 10);
      const lateWindow = createBaselineWindow('FRAMING', 14, 16);

      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [lateWindow, earlyWindow], // Out of order
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(new Date(framingDecision!.window!.start).getHours()).toBe(8);
    });
  });

  describe('FRAGMENTED conditions (window subtraction)', () => {
    it('should return FRAGMENTED when busy block splits window into two segments', () => {
      // Window: 8-12 (4 hours), Block: 9:30-10:30 (1 hour)
      // Segments: 8-9:30 (90 min) and 10:30-12 (90 min)
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(9, 10, 30, 30)], // 9:30-10:30
        baselineWindows: [createBaselineWindow('FRAMING', 8, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('FRAGMENTED');
      expect(framingDecision?.reason).toBe('Window is split by an unavailable time.');
      expect(framingDecision?.segments).toHaveLength(2);
    });

    it('should NOT show "Proceed with caution" for unavailability overlaps', () => {
      // Window: 8-12, Block: 9:30-10:30 splits it
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(9, 10, 30, 30)],
        baselineWindows: [createBaselineWindow('FRAMING', 8, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).not.toBe('WARN');
      expect(framingDecision?.reason).not.toContain('Proceed with caution');
    });

    it('should return PERMIT when busy block leaves single segment above threshold', () => {
      // Window: 8-12 (4 hours), Block: 8-9 (1 hour)
      // Remaining: 9-12 (3 hours, well above 30 min threshold)
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(8, 9)],
        baselineWindows: [createBaselineWindow('FRAMING', 8, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('PERMIT');
      expect(new Date(framingDecision!.window!.start).getHours()).toBe(9);
      expect(new Date(framingDecision!.window!.end).getHours()).toBe(12);
    });

    it('should return SILENCE when entire window is covered by busy block', () => {
      // Window: 10-12 (2 hours), Block: 8-14 (covers entirely)
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(8, 14)],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('SILENCE');
    });
  });

  describe('minimum segment duration thresholds', () => {
    it('should discard FRAMING segments shorter than 30 minutes', () => {
      // Window: 10-11 (1 hour), Block: 10:15-10:50 (35 min)
      // Segments: 10:00-10:15 (15 min) and 10:50-11:00 (10 min) - both too short
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(10, 10, 15, 50)],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 11)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('SILENCE');
    });

    it('should keep REFLECTION segments of 20+ minutes', () => {
      // Window: 20-21 (1 hour), Block: 20:00-20:35 (35 min)
      // Remaining: 20:35-21:00 (25 min) - above 20 min threshold
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(20, 20, 0, 35)],
        baselineWindows: [createBaselineWindow('REFLECTION', 20, 21)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const reflectionDecision = decisions.find(d => d.mode === 'REFLECTION');

      expect(reflectionDecision?.decision).toBe('PERMIT');
    });

    it('should require EXECUTION segments of 45+ minutes', () => {
      // Window: 14-16 (2 hours), Block: 14:00-15:20 (80 min)
      // Remaining: 15:20-16:00 (40 min) - below 45 min threshold
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(14, 15, 0, 20)],
        baselineWindows: [createBaselineWindow('EXECUTION', 14, 16)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const executionDecision = decisions.find(d => d.mode === 'EXECUTION');

      expect(executionDecision?.decision).toBe('SILENCE');
    });

    it('should keep EXECUTION segments of 45+ minutes', () => {
      // Window: 14-16 (2 hours), Block: 14:00-15:10 (70 min)
      // Remaining: 15:10-16:00 (50 min) - above 45 min threshold
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(14, 15, 0, 10)],
        baselineWindows: [createBaselineWindow('EXECUTION', 14, 16)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const executionDecision = decisions.find(d => d.mode === 'EXECUTION');

      expect(executionDecision?.decision).toBe('PERMIT');
    });
  });

  describe('computedAt field', () => {
    it('should include ISO timestamp in all decisions', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);

      for (const decision of decisions) {
        expect(decision.computedAt).toBeDefined();
        expect(new Date(decision.computedAt).toISOString()).toBe(decision.computedAt);
      }
    });
  });

  describe('all modes covered', () => {
    it('should return decisions for all 5 modes', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const modes = decisions.map(d => d.mode);

      expect(modes).toContain('FRAMING');
      expect(modes).toContain('SYNTHESIS');
      expect(modes).toContain('EVALUATION');
      expect(modes).toContain('EXECUTION');
      expect(modes).toContain('REFLECTION');
    });
  });
});

describe('_subtractBusyBlocks (window subtraction)', () => {
  it('should return full window when no busy blocks', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const segments = _subtractBusyBlocks(baseline, []);

    expect(segments).toHaveLength(1);
    expect(new Date(segments[0].start).getHours()).toBe(10);
    expect(new Date(segments[0].end).getHours()).toBe(12);
  });

  it('should produce two segments when block splits window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 14);
    const busy = createBusyBlock(11, 12);
    const segments = _subtractBusyBlocks(baseline, [busy]);

    expect(segments).toHaveLength(2);
    expect(new Date(segments[0].start).getHours()).toBe(10);
    expect(new Date(segments[0].end).getHours()).toBe(11);
    expect(new Date(segments[1].start).getHours()).toBe(12);
    expect(new Date(segments[1].end).getHours()).toBe(14);
  });

  it('should produce single segment when block covers start of window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 14);
    const busy = createBusyBlock(9, 12); // Covers 10-12
    const segments = _subtractBusyBlocks(baseline, [busy]);

    expect(segments).toHaveLength(1);
    expect(new Date(segments[0].start).getHours()).toBe(12);
    expect(new Date(segments[0].end).getHours()).toBe(14);
  });

  it('should produce single segment when block covers end of window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 14);
    const busy = createBusyBlock(12, 16); // Covers 12-14
    const segments = _subtractBusyBlocks(baseline, [busy]);

    expect(segments).toHaveLength(1);
    expect(new Date(segments[0].start).getHours()).toBe(10);
    expect(new Date(segments[0].end).getHours()).toBe(12);
  });

  it('should produce no segments when block covers entire window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(8, 14);
    const segments = _subtractBusyBlocks(baseline, [busy]);

    expect(segments).toHaveLength(0);
  });

  it('should merge adjacent busy blocks', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 16);
    // Two adjacent blocks: 11-12 and 12-13
    const blocks = [createBusyBlock(11, 12), createBusyBlock(12, 13)];
    const segments = _subtractBusyBlocks(baseline, blocks);

    expect(segments).toHaveLength(2);
    expect(new Date(segments[0].start).getHours()).toBe(10);
    expect(new Date(segments[0].end).getHours()).toBe(11);
    expect(new Date(segments[1].start).getHours()).toBe(13);
    expect(new Date(segments[1].end).getHours()).toBe(16);
  });

  it('should handle multiple non-adjacent blocks', () => {
    const baseline = createBaselineWindow('FRAMING', 8, 18);
    // Blocks at 9-10 and 14-15
    const blocks = [createBusyBlock(9, 10), createBusyBlock(14, 15)];
    const segments = _subtractBusyBlocks(baseline, blocks);

    expect(segments).toHaveLength(3);
    expect(new Date(segments[0].start).getHours()).toBe(8);
    expect(new Date(segments[0].end).getHours()).toBe(9);
    expect(new Date(segments[1].start).getHours()).toBe(10);
    expect(new Date(segments[1].end).getHours()).toBe(14);
    expect(new Date(segments[2].start).getHours()).toBe(15);
    expect(new Date(segments[2].end).getHours()).toBe(18);
  });
});

describe('_windowsOverlap (overlap logic)', () => {
  it('should detect overlap when busy block starts during window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(11, 13);

    expect(_windowsOverlap(baseline, busy)).toBe(true);
  });

  it('should detect overlap when busy block ends during window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(9, 11);

    expect(_windowsOverlap(baseline, busy)).toBe(true);
  });

  it('should detect overlap when busy block contains window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(8, 14);

    expect(_windowsOverlap(baseline, busy)).toBe(true);
  });

  it('should detect overlap when window contains busy block', () => {
    const baseline = createBaselineWindow('FRAMING', 8, 14);
    const busy = createBusyBlock(10, 12);

    expect(_windowsOverlap(baseline, busy)).toBe(true);
  });

  it('should NOT detect overlap when busy block ends exactly when window starts (touching)', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(8, 10); // Ends at 10, window starts at 10

    expect(_windowsOverlap(baseline, busy)).toBe(false);
  });

  it('should NOT detect overlap when busy block starts exactly when window ends (touching)', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(12, 14); // Starts at 12, window ends at 12

    expect(_windowsOverlap(baseline, busy)).toBe(false);
  });

  it('should NOT detect overlap when busy block is completely before window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(6, 8);

    expect(_windowsOverlap(baseline, busy)).toBe(false);
  });

  it('should NOT detect overlap when busy block is completely after window', () => {
    const baseline = createBaselineWindow('FRAMING', 10, 12);
    const busy = createBusyBlock(14, 16);

    expect(_windowsOverlap(baseline, busy)).toBe(false);
  });
});
