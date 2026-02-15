/**
 * CANON DRIFT TESTS
 * These tests will fail if quiz text, anchors, scoring, or window templates
 * drift from the canonical definitions in QUIZ v4.5.pdf.
 */

import { describe, it, expect } from 'vitest';
import {
  // Questions
  CANON_QUESTIONS,
  CANON_QUESTIONS_ARRAY,
  // Anchors
  Q1_ANCHORS,
  Q2_ANCHORS,
  Q3_ANCHORS,
  Q4_ANCHORS,
  Q5_ANCHORS,
  SDW_DEFAULT,
  // Thresholds
  CHRONOTYPE_THRESHOLDS,
  // Scoring functions
  wrap24,
  clamp,
  computeMSFsc,
  mapChronotype,
  computeFragility,
  computeConfidence,
  computeSocialJetlag,
  scoreCanonQuiz,
  isCanonQuizComplete,
  // Windows
  AURORA_WINDOWS,
  DAYBREAK_WINDOWS,
  MERIDIAN_WINDOWS,
  TWILIGHT_WINDOWS,
  NOCTURNE_WINDOWS,
  CANON_WINDOW_TEMPLATES,
  ALL_CANON_MODES,
  FOCUS_ENVELOPES,
} from './index.js';

// ============================================================================
// QUIZ TEXT DRIFT TESTS
// ============================================================================

describe('Canon Quiz Text', () => {
  it('should have exactly 5 questions', () => {
    expect(CANON_QUESTIONS_ARRAY).toHaveLength(5);
  });

  it('Q1 text matches canon', () => {
    expect(CANON_QUESTIONS.Q1.text).toBe('On workdays, when do you usually wake up?');
  });

  it('Q2 text matches canon', () => {
    expect(CANON_QUESTIONS.Q2.text).toBe('On free days with no alarm, when do you naturally wake up?');
  });

  it('Q3 text matches canon', () => {
    expect(CANON_QUESTIONS.Q3.text).toBe('How much longer do you sleep on free days than on workdays?');
  });

  it('Q4 text matches canon', () => {
    expect(CANON_QUESTIONS.Q4.text).toBe('On long or demanding days (6+ hours of cognitively demanding work), what tends to happen first?');
  });

  it('Q5 text matches canon', () => {
    expect(CANON_QUESTIONS.Q5.text).toBe("When you're interrupted during focused work (messages, meetings, context switches), what usually happens?");
  });

  it('each question has exactly 5 options A-E', () => {
    for (const q of CANON_QUESTIONS_ARRAY) {
      expect(q.options).toHaveLength(5);
      expect(q.options.map(o => o.key)).toEqual(['A', 'B', 'C', 'D', 'E']);
    }
  });

  it('Q1 option labels match canon', () => {
    const labels = CANON_QUESTIONS.Q1.options.map(o => o.label);
    expect(labels).toEqual([
      '≤ 06:00',
      '06:01–07:00',
      '07:01–08:00',
      '08:01–09:00',
      '≥ 09:01',
    ]);
  });

  it('Q2 option labels match canon', () => {
    const labels = CANON_QUESTIONS.Q2.options.map(o => o.label);
    expect(labels).toEqual([
      '≤ 06:30',
      '06:31–07:30',
      '07:31–08:30',
      '08:31–09:30',
      '≥ 09:31',
    ]);
  });

  it('Q3 option labels match canon', () => {
    const labels = CANON_QUESTIONS.Q3.options.map(o => o.label);
    expect(labels).toEqual([
      'Same or ≤ 30 min',
      '30–60 min',
      '60–90 min',
      '> 90 min',
      'I use an alarm on free days',
    ]);
  });

  it('Q4 option labels match canon', () => {
    const labels = CANON_QUESTIONS.Q4.options.map(o => o.label);
    expect(labels).toEqual([
      'I stay sharp most of the day',
      'I slow down, but accuracy holds',
      'It depends on the type of work',
      'Small mistakes start appearing',
      'I feel mentally spent early',
    ]);
  });

  it('Q5 option labels match canon', () => {
    const labels = CANON_QUESTIONS.Q5.options.map(o => o.label);
    expect(labels).toEqual([
      'I resume at the same depth',
      'I need a short ramp-up',
      'It depends on the interruption',
      'Depth drops noticeably',
      "I can't recover full focus",
    ]);
  });
});

// ============================================================================
// ANCHOR DRIFT TESTS
// ============================================================================

describe('Canon Anchors', () => {
  describe('Q1 anchors (wakeW_mid)', () => {
    it('A = 6.0', () => expect(Q1_ANCHORS.A).toBe(6.0));
    it('B = 6.5', () => expect(Q1_ANCHORS.B).toBe(6.5));
    it('C = 7.5', () => expect(Q1_ANCHORS.C).toBe(7.5));
    it('D = 8.5', () => expect(Q1_ANCHORS.D).toBe(8.5));
    it('E = 9.5', () => expect(Q1_ANCHORS.E).toBe(9.5));
  });

  describe('Q2 anchors (wakeF_mid)', () => {
    it('A = 6.5', () => expect(Q2_ANCHORS.A).toBe(6.5));
    it('B = 7.0', () => expect(Q2_ANCHORS.B).toBe(7.0));
    it('C = 8.0', () => expect(Q2_ANCHORS.C).toBe(8.0));
    it('D = 9.0', () => expect(Q2_ANCHORS.D).toBe(9.0));
    it('E = 10.0', () => expect(Q2_ANCHORS.E).toBe(10.0));
  });

  describe('Q3 anchors (extra_h)', () => {
    it('A = 0.25', () => expect(Q3_ANCHORS.A).toBe(0.25));
    it('B = 0.75', () => expect(Q3_ANCHORS.B).toBe(0.75));
    it('C = 1.25', () => expect(Q3_ANCHORS.C).toBe(1.25));
    it('D = 1.75', () => expect(Q3_ANCHORS.D).toBe(1.75));
    it('E = 0.0 (lower confidence flag)', () => expect(Q3_ANCHORS.E).toBe(0.0));
  });

  describe('Q4 anchors (fatigue_h)', () => {
    it('A = -0.25', () => expect(Q4_ANCHORS.A).toBe(-0.25));
    it('B = -0.10', () => expect(Q4_ANCHORS.B).toBe(-0.10));
    it('C = 0.00', () => expect(Q4_ANCHORS.C).toBe(0.00));
    it('D = +0.10', () => expect(Q4_ANCHORS.D).toBe(+0.10));
    it('E = +0.25', () => expect(Q4_ANCHORS.E).toBe(+0.25));
  });

  describe('Q5 anchors (interrupt_h)', () => {
    it('A = -0.25', () => expect(Q5_ANCHORS.A).toBe(-0.25));
    it('B = -0.10', () => expect(Q5_ANCHORS.B).toBe(-0.10));
    it('C = 0.00', () => expect(Q5_ANCHORS.C).toBe(0.00));
    it('D = +0.10', () => expect(Q5_ANCHORS.D).toBe(+0.10));
    it('E = +0.25', () => expect(Q5_ANCHORS.E).toBe(+0.25));
  });

  it('SDw default = 7.0', () => {
    expect(SDW_DEFAULT).toBe(7.0);
  });
});

// ============================================================================
// CHRONOTYPE THRESHOLD DRIFT TESTS
// ============================================================================

describe('Canon Chronotype Thresholds', () => {
  it('AURORA: < 2.5', () => {
    expect(CHRONOTYPE_THRESHOLDS.AURORA.max).toBe(2.5);
  });

  it('DAYBREAK: 2.5–<3.5', () => {
    expect(CHRONOTYPE_THRESHOLDS.DAYBREAK.min).toBe(2.5);
    expect(CHRONOTYPE_THRESHOLDS.DAYBREAK.max).toBe(3.5);
  });

  it('MERIDIAN: 3.5–<4.5', () => {
    expect(CHRONOTYPE_THRESHOLDS.MERIDIAN.min).toBe(3.5);
    expect(CHRONOTYPE_THRESHOLDS.MERIDIAN.max).toBe(4.5);
  });

  it('TWILIGHT: 4.5–<5.5', () => {
    expect(CHRONOTYPE_THRESHOLDS.TWILIGHT.min).toBe(4.5);
    expect(CHRONOTYPE_THRESHOLDS.TWILIGHT.max).toBe(5.5);
  });

  it('NOCTURNE: >= 5.5', () => {
    expect(CHRONOTYPE_THRESHOLDS.NOCTURNE.min).toBe(5.5);
  });
});

// ============================================================================
// MSFsc GOLDEN TESTS
// ============================================================================

describe('Canon MSFsc Calculation', () => {
  describe('wrap24', () => {
    it('keeps values in [0, 24)', () => {
      expect(wrap24(25)).toBe(1);
      expect(wrap24(24)).toBe(0);
      expect(wrap24(12)).toBe(12);
      expect(wrap24(-1)).toBe(23);
      expect(wrap24(-25)).toBe(23);
    });
  });

  describe('clamp', () => {
    it('clamps values to range', () => {
      expect(clamp(-0.5, -0.25, 0.25)).toBe(-0.25);
      expect(clamp(0.5, -0.25, 0.25)).toBe(0.25);
      expect(clamp(0.1, -0.25, 0.25)).toBe(0.1);
    });
  });

  describe('Golden test: extreme early (A,A,A,A,A)', () => {
    const answers = { q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A' };
    const result = computeMSFsc(answers);

    it('wakeW_mid = 6.0', () => expect(result.wakeW_mid).toBe(6.0));
    it('wakeF_mid = 6.5', () => expect(result.wakeF_mid).toBe(6.5));
    it('extra_h = 0.25', () => expect(result.extra_h).toBe(0.25));
    it('SDw = 7.0', () => expect(result.SDw).toBe(7.0));
    it('SDf = 7.25', () => expect(result.SDf).toBe(7.25));
    it('MSW = wrap24(6.0 - 3.5) = 2.5', () => expect(result.MSW).toBe(2.5));
    it('MSF = wrap24(6.5 - 3.625) = 2.875', () => expect(result.MSF).toBeCloseTo(2.875, 5));
    it('Debt = 0.25', () => expect(result.Debt).toBe(0.25));
    // MSFsc = wrap24(2.875 - 0.125) = 2.75
    it('MSFsc = 2.75', () => expect(result.MSFsc).toBeCloseTo(2.75, 5));
  });

  describe('Golden test: middle (C,C,C,C,C)', () => {
    const answers = { q1: 'C', q2: 'C', q3: 'C', q4: 'C', q5: 'C' };
    const result = computeMSFsc(answers);

    it('wakeW_mid = 7.5', () => expect(result.wakeW_mid).toBe(7.5));
    it('wakeF_mid = 8.0', () => expect(result.wakeF_mid).toBe(8.0));
    it('extra_h = 1.25', () => expect(result.extra_h).toBe(1.25));
    it('SDw = 7.0', () => expect(result.SDw).toBe(7.0));
    it('SDf = 8.25', () => expect(result.SDf).toBe(8.25));
    it('MSW = wrap24(7.5 - 3.5) = 4.0', () => expect(result.MSW).toBe(4.0));
    it('MSF = wrap24(8.0 - 4.125) = 3.875', () => expect(result.MSF).toBeCloseTo(3.875, 5));
    it('Debt = 1.25', () => expect(result.Debt).toBe(1.25));
    // MSFsc = wrap24(3.875 - 0.625) = 3.25
    it('MSFsc = 3.25', () => expect(result.MSFsc).toBeCloseTo(3.25, 5));
  });

  describe('Golden test: extreme late (E,E,E,E,E)', () => {
    const answers = { q1: 'E', q2: 'E', q3: 'E', q4: 'E', q5: 'E' };
    const result = computeMSFsc(answers);

    it('wakeW_mid = 9.5', () => expect(result.wakeW_mid).toBe(9.5));
    it('wakeF_mid = 10.0', () => expect(result.wakeF_mid).toBe(10.0));
    it('extra_h = 0.0 (Q3=E)', () => expect(result.extra_h).toBe(0.0));
    it('SDw = 7.0', () => expect(result.SDw).toBe(7.0));
    it('SDf = 7.0', () => expect(result.SDf).toBe(7.0));
    it('MSW = wrap24(9.5 - 3.5) = 6.0', () => expect(result.MSW).toBe(6.0));
    it('MSF = wrap24(10.0 - 3.5) = 6.5', () => expect(result.MSF).toBe(6.5));
    it('Debt = 0 (no correction)', () => expect(result.Debt).toBe(0));
    // MSFsc = MSF when Debt <= 0
    it('MSFsc = 6.5', () => expect(result.MSFsc).toBe(6.5));
  });

  describe('Golden test: mixed pattern (B,D,B,C,C)', () => {
    const answers = { q1: 'B', q2: 'D', q3: 'B', q4: 'C', q5: 'C' };
    const result = computeMSFsc(answers);

    it('wakeW_mid = 6.5', () => expect(result.wakeW_mid).toBe(6.5));
    it('wakeF_mid = 9.0', () => expect(result.wakeF_mid).toBe(9.0));
    it('extra_h = 0.75', () => expect(result.extra_h).toBe(0.75));
    it('SDw = 7.0', () => expect(result.SDw).toBe(7.0));
    it('SDf = 7.75', () => expect(result.SDf).toBe(7.75));
    it('MSW = wrap24(6.5 - 3.5) = 3.0', () => expect(result.MSW).toBe(3.0));
    // MSF = wrap24(9.0 - 3.875) = 5.125
    it('MSF = 5.125', () => expect(result.MSF).toBeCloseTo(5.125, 5));
    it('Debt = 0.75', () => expect(result.Debt).toBe(0.75));
    // MSFsc = wrap24(5.125 - 0.375) = 4.75
    it('MSFsc = 4.75', () => expect(result.MSFsc).toBeCloseTo(4.75, 5));
  });
});

// ============================================================================
// CHRONOTYPE MAPPING TESTS
// ============================================================================

describe('Canon Chronotype Mapping', () => {
  it('MSFsc < 2.5 → AURORA', () => {
    expect(mapChronotype(2.0)).toBe('AURORA');
    expect(mapChronotype(2.49)).toBe('AURORA');
  });

  it('MSFsc 2.5–<3.5 → DAYBREAK', () => {
    expect(mapChronotype(2.5)).toBe('DAYBREAK');
    expect(mapChronotype(3.0)).toBe('DAYBREAK');
    expect(mapChronotype(3.49)).toBe('DAYBREAK');
  });

  it('MSFsc 3.5–<4.5 → MERIDIAN', () => {
    expect(mapChronotype(3.5)).toBe('MERIDIAN');
    expect(mapChronotype(4.0)).toBe('MERIDIAN');
    expect(mapChronotype(4.49)).toBe('MERIDIAN');
  });

  it('MSFsc 4.5–<5.5 → TWILIGHT', () => {
    expect(mapChronotype(4.5)).toBe('TWILIGHT');
    expect(mapChronotype(5.0)).toBe('TWILIGHT');
    expect(mapChronotype(5.49)).toBe('TWILIGHT');
  });

  it('MSFsc >= 5.5 → NOCTURNE', () => {
    expect(mapChronotype(5.5)).toBe('NOCTURNE');
    expect(mapChronotype(6.0)).toBe('NOCTURNE');
    expect(mapChronotype(10.0)).toBe('NOCTURNE');
  });

  describe('Integration: answers → chronotype', () => {
    it('extreme early → DAYBREAK (MSFsc ~2.75)', () => {
      const result = scoreCanonQuiz({ q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A' });
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('middle answers → DAYBREAK (MSFsc ~3.25)', () => {
      const result = scoreCanonQuiz({ q1: 'C', q2: 'C', q3: 'C', q4: 'C', q5: 'C' });
      expect(result.chronotype).toBe('DAYBREAK');
    });

    it('extreme late → NOCTURNE (MSFsc ~6.5)', () => {
      const result = scoreCanonQuiz({ q1: 'E', q2: 'E', q3: 'E', q4: 'E', q5: 'E' });
      expect(result.chronotype).toBe('NOCTURNE');
    });

    it('mixed late → TWILIGHT', () => {
      const result = scoreCanonQuiz({ q1: 'B', q2: 'D', q3: 'B', q4: 'C', q5: 'C' });
      expect(result.chronotype).toBe('TWILIGHT');
    });
  });
});

// ============================================================================
// CONFIDENCE TESTS
// ============================================================================

describe('Canon Confidence', () => {
  it("Q3 = 'E' → Lower confidence", () => {
    expect(computeConfidence('E')).toBe('Lower');
  });

  it("Q3 != 'E' → Normal confidence", () => {
    expect(computeConfidence('A')).toBe('Normal');
    expect(computeConfidence('B')).toBe('Normal');
    expect(computeConfidence('C')).toBe('Normal');
    expect(computeConfidence('D')).toBe('Normal');
  });
});

// ============================================================================
// FRAGILITY TESTS
// ============================================================================

describe('Canon Fragility', () => {
  it('low fatigue + low interrupt → -0.25', () => {
    expect(computeFragility(-0.25, -0.25)).toBe(-0.25);
  });

  it('high fatigue + high interrupt → +0.25', () => {
    expect(computeFragility(0.25, 0.25)).toBe(0.25);
  });

  it('neutral → 0.0', () => {
    expect(computeFragility(0.0, 0.0)).toBe(0.0);
  });

  it('mixed → average clamped', () => {
    expect(computeFragility(-0.10, 0.10)).toBe(0.0);
    expect(computeFragility(0.25, 0.0)).toBeCloseTo(0.125, 5);
  });
});

// ============================================================================
// SOCIAL JETLAG TESTS
// ============================================================================

describe('Canon Social Jetlag', () => {
  it('same MSF and MSW → 0 hours', () => {
    expect(computeSocialJetlag(3.0, 3.0)).toBe(0);
  });

  it('MSF 2 hours later than MSW → 2 hours', () => {
    expect(computeSocialJetlag(5.0, 3.0)).toBe(2);
  });

  it('large difference wraps correctly', () => {
    // If MSF=23 and MSW=1, delta=22, should return 24-22=2
    expect(computeSocialJetlag(23, 1)).toBe(2);
  });
});

// ============================================================================
// QUIZ VALIDATION TESTS
// ============================================================================

describe('Canon Quiz Validation', () => {
  it('complete answers → true', () => {
    expect(isCanonQuizComplete({ q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'E' })).toBe(true);
  });

  it('missing answer → false', () => {
    expect(isCanonQuizComplete({ q1: 'A', q2: 'B', q3: 'C', q4: 'D' })).toBe(false);
  });

  it('invalid answer key → false', () => {
    expect(isCanonQuizComplete({ q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'F' })).toBe(false);
  });

  it('empty object → false', () => {
    expect(isCanonQuizComplete({})).toBe(false);
  });
});

// ============================================================================
// WINDOW TEMPLATE DRIFT TESTS (v5.0 Biologically Honest Reliability Windows)
// ============================================================================

describe('Canon Window Templates', () => {
  it('should have all 5 modes', () => {
    expect(ALL_CANON_MODES).toEqual(['FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'REFLECTION']);
  });

  // v5.0: Updated windows based on MSFsc research
  describe('AURORA windows (v5.0)', () => {
    it('FRAMING: 07:00–09:00', () => {
      expect(AURORA_WINDOWS.FRAMING).toEqual({ start: '07:00', end: '09:00' });
    });
    it('EVALUATION: 08:00–10:30', () => {
      expect(AURORA_WINDOWS.EVALUATION).toEqual({ start: '08:00', end: '10:30' });
    });
    it('SYNTHESIS: 07:30–11:00', () => {
      expect(AURORA_WINDOWS.SYNTHESIS).toEqual({ start: '07:30', end: '11:00' });
    });
    it('EXECUTION: 11:00–15:00', () => {
      expect(AURORA_WINDOWS.EXECUTION).toEqual({ start: '11:00', end: '15:00' });
    });
    it('REFLECTION: 19:00–21:00', () => {
      expect(AURORA_WINDOWS.REFLECTION).toEqual({ start: '19:00', end: '21:00' });
    });
  });

  describe('DAYBREAK windows (v5.0)', () => {
    it('FRAMING: 09:00–11:00', () => {
      expect(DAYBREAK_WINDOWS.FRAMING).toEqual({ start: '09:00', end: '11:00' });
    });
    it('EVALUATION: 10:00–12:30', () => {
      expect(DAYBREAK_WINDOWS.EVALUATION).toEqual({ start: '10:00', end: '12:30' });
    });
    it('SYNTHESIS: 09:30–13:00', () => {
      expect(DAYBREAK_WINDOWS.SYNTHESIS).toEqual({ start: '09:30', end: '13:00' });
    });
    it('EXECUTION: 13:00–17:00', () => {
      expect(DAYBREAK_WINDOWS.EXECUTION).toEqual({ start: '13:00', end: '17:00' });
    });
    it('REFLECTION: 20:00–22:00', () => {
      expect(DAYBREAK_WINDOWS.REFLECTION).toEqual({ start: '20:00', end: '22:00' });
    });
  });

  describe('MERIDIAN windows (v5.0)', () => {
    it('FRAMING: 10:30–12:30', () => {
      expect(MERIDIAN_WINDOWS.FRAMING).toEqual({ start: '10:30', end: '12:30' });
    });
    it('EVALUATION: 11:30–14:30', () => {
      expect(MERIDIAN_WINDOWS.EVALUATION).toEqual({ start: '11:30', end: '14:30' });
    });
    it('SYNTHESIS: 11:00–15:00', () => {
      expect(MERIDIAN_WINDOWS.SYNTHESIS).toEqual({ start: '11:00', end: '15:00' });
    });
    it('EXECUTION: 15:00–19:00', () => {
      expect(MERIDIAN_WINDOWS.EXECUTION).toEqual({ start: '15:00', end: '19:00' });
    });
    it('REFLECTION: 21:00–23:00', () => {
      expect(MERIDIAN_WINDOWS.REFLECTION).toEqual({ start: '21:00', end: '23:00' });
    });
  });

  // v5.0: Twilight has split Execution windows (11:00-13:00 + 18:00-21:00)
  // The primary window (first) is used for backward compatibility
  describe('TWILIGHT windows (v5.0)', () => {
    it('FRAMING: 13:00–15:30', () => {
      expect(TWILIGHT_WINDOWS.FRAMING).toEqual({ start: '13:00', end: '15:30' });
    });
    it('EVALUATION: 14:30–17:30', () => {
      expect(TWILIGHT_WINDOWS.EVALUATION).toEqual({ start: '14:30', end: '17:30' });
    });
    it('SYNTHESIS: 13:30–18:00', () => {
      expect(TWILIGHT_WINDOWS.SYNTHESIS).toEqual({ start: '13:30', end: '18:00' });
    });
    it('EXECUTION: 11:00–13:00 (primary of split)', () => {
      expect(TWILIGHT_WINDOWS.EXECUTION).toEqual({ start: '11:00', end: '13:00' });
    });
    it('REFLECTION: 22:00–24:00 (crosses midnight)', () => {
      expect(TWILIGHT_WINDOWS.REFLECTION).toEqual({ start: '22:00', end: '24:00' });
    });
  });

  // v5.0: Nocturne has split Execution and midnight-crossing windows
  describe('NOCTURNE windows (v5.0)', () => {
    it('FRAMING: 21:00–23:30', () => {
      expect(NOCTURNE_WINDOWS.FRAMING).toEqual({ start: '21:00', end: '23:30' });
    });
    it('EVALUATION: 22:00–24:30 (crosses midnight)', () => {
      expect(NOCTURNE_WINDOWS.EVALUATION).toEqual({ start: '22:00', end: '24:30' });
    });
    it('SYNTHESIS: 19:00–23:30', () => {
      expect(NOCTURNE_WINDOWS.SYNTHESIS).toEqual({ start: '19:00', end: '23:30' });
    });
    it('EXECUTION: 14:00–19:00 (primary of split)', () => {
      expect(NOCTURNE_WINDOWS.EXECUTION).toEqual({ start: '14:00', end: '19:00' });
    });
    it('REFLECTION: 25:00–27:00 (01:00-03:00 next day)', () => {
      expect(NOCTURNE_WINDOWS.REFLECTION).toEqual({ start: '25:00', end: '27:00' });
    });
  });

  // v5.0: Updated focus envelopes
  describe('Focus envelopes (v5.0)', () => {
    it('AURORA: 07:00–11:00', () => {
      expect(FOCUS_ENVELOPES.AURORA).toEqual({ start: '07:00', end: '11:00' });
    });
    it('DAYBREAK: 09:00–13:00', () => {
      expect(FOCUS_ENVELOPES.DAYBREAK).toEqual({ start: '09:00', end: '13:00' });
    });
    it('MERIDIAN: 10:30–15:00', () => {
      expect(FOCUS_ENVELOPES.MERIDIAN).toEqual({ start: '10:30', end: '15:00' });
    });
    it('TWILIGHT: 13:00–18:00', () => {
      expect(FOCUS_ENVELOPES.TWILIGHT).toEqual({ start: '13:00', end: '18:00' });
    });
    it('NOCTURNE: 19:00–23:30', () => {
      expect(FOCUS_ENVELOPES.NOCTURNE).toEqual({ start: '19:00', end: '23:30' });
    });
  });

  describe('CANON_WINDOW_TEMPLATES lookup', () => {
    it('contains all 5 chronotypes', () => {
      expect(Object.keys(CANON_WINDOW_TEMPLATES)).toEqual([
        'AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'
      ]);
    });

    it('each chronotype has all 5 modes', () => {
      for (const chronotype of ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'] as const) {
        expect(Object.keys(CANON_WINDOW_TEMPLATES[chronotype])).toEqual([
          'FRAMING', 'EVALUATION', 'SYNTHESIS', 'EXECUTION', 'REFLECTION'
        ]);
      }
    });
  });
});

// ============================================================================
// FULL SCORING INTEGRATION
// ============================================================================

describe('Canon Full Scoring', () => {
  it('includes all required fields', () => {
    const result = scoreCanonQuiz({ q1: 'C', q2: 'C', q3: 'C', q4: 'C', q5: 'C' });

    expect(result).toHaveProperty('wakeW_mid');
    expect(result).toHaveProperty('wakeF_mid');
    expect(result).toHaveProperty('extra_h');
    expect(result).toHaveProperty('fatigue_h');
    expect(result).toHaveProperty('interrupt_h');
    expect(result).toHaveProperty('SDw');
    expect(result).toHaveProperty('SDf');
    expect(result).toHaveProperty('MSW');
    expect(result).toHaveProperty('MSF');
    expect(result).toHaveProperty('Debt');
    expect(result).toHaveProperty('MSFsc');
    expect(result).toHaveProperty('chronotype');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('fragility');
    expect(result).toHaveProperty('fragilityLevel');
    expect(result).toHaveProperty('sjl_hours');
    expect(result).toHaveProperty('computedAt');
  });

  it('computedAt is valid ISO string', () => {
    const result = scoreCanonQuiz({ q1: 'C', q2: 'C', q3: 'C', q4: 'C', q5: 'C' });
    expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
  });
});
