import { describe, it, expect } from 'vitest';
import { generateICS } from './ics.js';
import type { ModeGovernanceDecision, TimeSegment } from '../types.js';

const TEST_DATE = '2024-01-15';

function createPermitDecision(
  mode: 'FRAMING' | 'SYNTHESIS' | 'EVALUATION' | 'EXECUTION' | 'REFLECTION',
  windowStart: string,
  windowEnd: string
): ModeGovernanceDecision {
  return {
    mode,
    decision: 'PERMIT',
    reason: 'Conditions support this mode of thinking.',
    window: { start: windowStart, end: windowEnd },
    computedAt: new Date().toISOString(),
  };
}

function createFragmentedDecision(
  mode: 'FRAMING' | 'SYNTHESIS' | 'EVALUATION' | 'EXECUTION' | 'REFLECTION',
  segments: TimeSegment[]
): ModeGovernanceDecision {
  return {
    mode,
    decision: 'FRAGMENTED',
    reason: 'Window is split by an unavailable time.',
    segments,
    computedAt: new Date().toISOString(),
  };
}

function createSilenceDecision(
  mode: 'FRAMING' | 'SYNTHESIS' | 'EVALUATION' | 'EXECUTION' | 'REFLECTION'
): ModeGovernanceDecision {
  return {
    mode,
    decision: 'SILENCE',
    reason: 'Conditions are not structurally reliable right now.',
    computedAt: new Date().toISOString(),
  };
}

describe('generateICS', () => {
  describe('VCALENDAR structure', () => {
    it('should generate valid VCALENDAR header and footer', () => {
      const decisions: ModeGovernanceDecision[] = [];
      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//Align//Align MVP//EN');
      expect(ics).toContain('CALSCALE:GREGORIAN');
      expect(ics).toContain('METHOD:PUBLISH');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should include calendar name with date', () => {
      const ics = generateICS([], TEST_DATE);
      expect(ics).toContain(`X-WR-CALNAME:Align ${TEST_DATE}`);
    });

    it('should use CRLF line endings', () => {
      const ics = generateICS([], TEST_DATE);
      expect(ics).toContain('\r\n');
      // Should not have bare LF without CR
      const lines = ics.split('\r\n');
      for (const line of lines) {
        expect(line).not.toContain('\n');
      }
    });
  });

  describe('PERMIT events', () => {
    it('should include one VEVENT per PERMIT decision', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
        createPermitDecision('SYNTHESIS', '2024-01-15T14:00:00', '2024-01-15T16:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      const eventMatches = ics.match(/BEGIN:VEVENT/g);
      expect(eventMatches).toHaveLength(2);
    });

    it('should format PERMIT title as "Align — <MODE>"', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('SUMMARY:Align — FRAMING');
    });

    it('should skip SILENCE decisions', () => {
      const decisions: ModeGovernanceDecision[] = [
        createSilenceDecision('FRAMING'),
        createPermitDecision('SYNTHESIS', '2024-01-15T14:00:00', '2024-01-15T16:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      const eventMatches = ics.match(/BEGIN:VEVENT/g);
      expect(eventMatches).toHaveLength(1);
    });
  });

  describe('FRAGMENTED events (segments)', () => {
    it('should create one VEVENT per segment for FRAGMENTED decisions', () => {
      const segments: TimeSegment[] = [
        { start: '2024-01-15T08:00:00', end: '2024-01-15T09:30:00' },
        { start: '2024-01-15T10:30:00', end: '2024-01-15T12:00:00' },
      ];
      const decisions: ModeGovernanceDecision[] = [
        createFragmentedDecision('FRAMING', segments),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      const eventMatches = ics.match(/BEGIN:VEVENT/g);
      expect(eventMatches).toHaveLength(2);
    });

    it('should format FRAGMENTED segment title as "Align — <MODE> (Segment)"', () => {
      const segments: TimeSegment[] = [
        { start: '2024-01-15T08:00:00', end: '2024-01-15T09:30:00' },
        { start: '2024-01-15T10:30:00', end: '2024-01-15T12:00:00' },
      ];
      const decisions: ModeGovernanceDecision[] = [
        createFragmentedDecision('EVALUATION', segments),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('SUMMARY:Align — EVALUATION (Segment)');
    });

    it('should include segment note in FRAGMENTED description', () => {
      const segments: TimeSegment[] = [
        { start: '2024-01-15T08:00:00', end: '2024-01-15T09:30:00' },
      ];
      const decisions: ModeGovernanceDecision[] = [
        createFragmentedDecision('FRAMING', segments),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      // Check the title indicates segment (this won't be line-folded)
      expect(ics).toContain('SUMMARY:Align — FRAMING (Segment)');
      // Check description contains segment-related content (baseline window text is short enough)
      expect(ics).toContain('baseline window');
    });
  });

  describe('event description', () => {
    it('should include mode definition in description', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('Defining the problem and the decision space');
    });

    it('should include at least one example in description', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      // Check for "Examples:" label (ICS line folding may split text)
      expect(ics).toContain('Examples:');
      // Check for a short unique substring from an example
      expect(ics).toContain('strategy discussion');
    });

    it('should include status line for PERMIT', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      // Check for shorter substrings due to ICS line folding
      expect(ics).toContain('Status:');
      expect(ics).toContain('reliable');
    });

    it('should include disclaimer line', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      // Check for unique substring (ICS line folding may split long text)
      expect(ics).toContain('not schedule for you');
    });
  });

  describe('event times', () => {
    it('should include DTSTART and DTEND', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('DTSTART:');
      expect(ics).toContain('DTEND:');
    });

    it('should include UID and DTSTAMP', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('UID:');
      expect(ics).toContain('DTSTAMP:');
    });
  });

  describe('all modes', () => {
    it('should handle all five modes', () => {
      const decisions: ModeGovernanceDecision[] = [
        createPermitDecision('FRAMING', '2024-01-15T06:00:00', '2024-01-15T08:00:00'),
        createPermitDecision('SYNTHESIS', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
        createFragmentedDecision('EVALUATION', [
          { start: '2024-01-15T12:00:00', end: '2024-01-15T13:00:00' },
          { start: '2024-01-15T13:30:00', end: '2024-01-15T14:30:00' },
        ]),
        createPermitDecision('EXECUTION', '2024-01-15T15:00:00', '2024-01-15T17:00:00'),
        createPermitDecision('REFLECTION', '2024-01-15T18:00:00', '2024-01-15T20:00:00'),
      ];

      const ics = generateICS(decisions, TEST_DATE);

      expect(ics).toContain('SUMMARY:Align — FRAMING');
      expect(ics).toContain('SUMMARY:Align — SYNTHESIS');
      expect(ics).toContain('SUMMARY:Align — EVALUATION (Segment)');
      expect(ics).toContain('SUMMARY:Align — EXECUTION');
      expect(ics).toContain('SUMMARY:Align — REFLECTION');

      // 4 PERMIT + 2 FRAGMENTED segments = 6 events
      const eventMatches = ics.match(/BEGIN:VEVENT/g);
      expect(eventMatches).toHaveLength(6);
    });
  });
});

describe('ICS export smoke test', () => {
  it('should produce content that can be used with text/calendar mime type', () => {
    const decisions: ModeGovernanceDecision[] = [
      createPermitDecision('FRAMING', '2024-01-15T09:00:00', '2024-01-15T11:00:00'),
    ];

    const icsContent = generateICS(decisions, TEST_DATE);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(blob.size).toBeGreaterThan(0);
  });
});
