import { describe, it, expect } from 'vitest';
import { evaluateDay } from './evaluate.js';
import type { ChronotypeProfile, BaselineWindow } from '../types.js';

/**
 * Tests for SILENCE behavior and message stability.
 * Verifies that SILENCE states use consistent, structural language.
 */
describe('SILENCE messages', () => {
  const mockProfile: ChronotypeProfile = {
    chronotype: 'MERIDIAN',
    confidence: 'HIGH',
    computedAt: new Date().toISOString(),
  };

  describe('confidence insufficient', () => {
    it('should return SILENCE for all modes when profile is null', () => {
      const decisions = evaluateDay({
        profile: null,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });

      expect(decisions).toHaveLength(5);
      decisions.forEach(decision => {
        expect(decision.decision).toBe('SILENCE');
        expect(decision.reason).toBe('Conditions are not structurally reliable right now.');
      });
    });

    it('should return SILENCE for all modes when confidence is LOW', () => {
      const lowConfidenceProfile: ChronotypeProfile = {
        chronotype: 'MERIDIAN',
        confidence: 'LOW',
        computedAt: new Date().toISOString(),
      };

      const decisions = evaluateDay({
        profile: lowConfidenceProfile,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });

      expect(decisions).toHaveLength(5);
      decisions.forEach(decision => {
        expect(decision.decision).toBe('SILENCE');
        expect(decision.reason).toBe('Conditions are not structurally reliable right now.');
      });
    });
  });

  describe('no reliable window available', () => {
    it('should return SILENCE when no baseline windows exist', () => {
      const decisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });

      expect(decisions).toHaveLength(5);
      decisions.forEach(decision => {
        expect(decision.decision).toBe('SILENCE');
        expect(decision.reason).toBe('Conditions are not structurally reliable right now.');
      });
    });

    it('should return SILENCE for mode without reliable windows', () => {
      const baselineWindows: BaselineWindow[] = [
        {
          start: '2024-01-15T09:00:00.000Z',
          end: '2024-01-15T11:00:00.000Z',
          mode: 'FRAMING',
          reliability: 'FRAGILE', // Not RELIABLE
          source: 'baseline',
        },
      ];

      const decisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows,
        dayISODate: '2024-01-15',
      });

      const framingDecision = decisions.find(d => d.mode === 'FRAMING');
      expect(framingDecision?.decision).toBe('SILENCE');
      expect(framingDecision?.reason).toBe('Conditions are not structurally reliable right now.');
    });
  });

  describe('all modes silent detection', () => {
    it('should have all modes silent when profile is null', () => {
      const decisions = evaluateDay({
        profile: null,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });

      const allSilent = decisions.every(d => d.decision === 'SILENCE');
      expect(allSilent).toBe(true);
    });

    it('should not have all modes silent when some modes have reliable windows', () => {
      const baselineWindows: BaselineWindow[] = [
        {
          start: '2024-01-15T09:00:00.000Z',
          end: '2024-01-15T11:00:00.000Z',
          mode: 'FRAMING',
          reliability: 'RELIABLE',
          source: 'baseline',
        },
      ];

      const decisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows,
        dayISODate: '2024-01-15',
      });

      const allSilent = decisions.every(d => d.decision === 'SILENCE');
      expect(allSilent).toBe(false);

      const framingDecision = decisions.find(d => d.mode === 'FRAMING');
      expect(framingDecision?.decision).toBe('PERMIT');
    });
  });

  describe('reason string stability', () => {
    it('should use exact stable strings for all reasons', () => {
      // These exact strings are part of the contract (UX spec)
      const expectedReasons = {
        silence: 'Conditions are not structurally reliable right now.',
        fragmented: 'Window is split by an unavailable time.',
        permit: 'Conditions support this mode of thinking.',
      };

      // Test confidence insufficient
      const nullProfileDecisions = evaluateDay({
        profile: null,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });
      expect(nullProfileDecisions[0].reason).toBe(expectedReasons.silence);

      // Test no reliable window
      const noWindowsDecisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });
      expect(noWindowsDecisions[0].reason).toBe(expectedReasons.silence);

      // Test fragmented (busy block splits window into segments)
      const baselineWindows: BaselineWindow[] = [
        {
          start: '2024-01-15T08:00:00.000Z',
          end: '2024-01-15T12:00:00.000Z', // 4 hour window
          mode: 'FRAMING',
          reliability: 'RELIABLE',
          source: 'baseline',
        },
      ];
      const fragmentedDecisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [{
          start: new Date('2024-01-15T09:30:00.000Z'),
          end: new Date('2024-01-15T10:30:00.000Z'), // splits into two 90-min segments
          allDay: false,
          source: 'manual',
        }],
        baselineWindows,
        dayISODate: '2024-01-15',
      });
      const framingFragmented = fragmentedDecisions.find(d => d.mode === 'FRAMING');
      expect(framingFragmented?.decision).toBe('FRAGMENTED');
      expect(framingFragmented?.reason).toBe(expectedReasons.fragmented);

      // Test window reliable and unconflicted
      const permitDecisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows,
        dayISODate: '2024-01-15',
      });
      const framingPermit = permitDecisions.find(d => d.mode === 'FRAMING');
      expect(framingPermit?.reason).toBe(expectedReasons.permit);
    });
  });
});
