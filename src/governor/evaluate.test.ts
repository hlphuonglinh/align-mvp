import { describe, it, expect } from 'vitest';
import { evaluateDay, _windowsOverlap } from './evaluate.js';
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
  endHour: number
): BaselineWindow {
  const start = new Date(TEST_DATE);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(TEST_DATE);
  end.setHours(endHour, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    mode,
    reliability: 'RELIABLE',
    source: 'baseline',
  };
}

function createBusyBlock(startHour: number, endHour: number): BusyBlock {
  const start = new Date(TEST_DATE);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(TEST_DATE);
  end.setHours(endHour, 0, 0, 0);

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
        expect(decision.reason).toBe('Confidence insufficient.');
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
        expect(decision.reason).toBe('Confidence insufficient.');
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
        expect(decision.reason).toBe('No reliable window available.');
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
      expect(synthesisDecision?.reason).toBe('No reliable window available.');
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
      expect(framingDecision?.reason).toBe('Window is structurally reliable and unconflicted.');
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

  describe('WARN conditions', () => {
    it('should return WARN when busy block overlaps candidate window', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(11, 13)], // Overlaps with 10-12 window
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('WARN');
      expect(framingDecision?.reason).toBe('Conflicts with a busy block.');
      expect(framingDecision?.window).toBeDefined();
    });

    it('should return WARN when busy block is fully contained in window', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(10, 11)], // Fully inside 9-12
        baselineWindows: [createBaselineWindow('FRAMING', 9, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('WARN');
    });

    it('should return WARN when window is fully contained in busy block', () => {
      const input: GovernorInput = {
        profile: createProfile('HIGH'),
        busyBlocks: [createBusyBlock(8, 14)], // Window 10-12 fully inside
        baselineWindows: [createBaselineWindow('FRAMING', 10, 12)],
        dayISODate: TEST_DATE,
      };

      const decisions = evaluateDay(input);
      const framingDecision = decisions.find(d => d.mode === 'FRAMING');

      expect(framingDecision?.decision).toBe('WARN');
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
