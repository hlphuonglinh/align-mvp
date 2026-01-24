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
        expect(decision.reason).toBe('Confidence insufficient.');
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
        expect(decision.reason).toBe('Confidence insufficient.');
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
        expect(decision.reason).toBe('No reliable window available.');
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
      expect(framingDecision?.reason).toBe('No reliable window available.');
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
      // These exact strings are part of the contract
      const expectedReasons = {
        confidenceInsufficient: 'Confidence insufficient.',
        noReliableWindow: 'No reliable window available.',
        conflictWithBusy: 'Conflicts with a busy block.',
        windowReliableUnconflicted: 'Window is structurally reliable and unconflicted.',
      };

      // Test confidence insufficient
      const nullProfileDecisions = evaluateDay({
        profile: null,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });
      expect(nullProfileDecisions[0].reason).toBe(expectedReasons.confidenceInsufficient);

      // Test no reliable window
      const noWindowsDecisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows: [],
        dayISODate: '2024-01-15',
      });
      expect(noWindowsDecisions[0].reason).toBe(expectedReasons.noReliableWindow);

      // Test conflict with busy
      const baselineWindows: BaselineWindow[] = [
        {
          start: '2024-01-15T09:00:00.000Z',
          end: '2024-01-15T11:00:00.000Z',
          mode: 'FRAMING',
          reliability: 'RELIABLE',
          source: 'baseline',
        },
      ];
      const conflictDecisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [{
          start: new Date('2024-01-15T09:00:00.000Z'),
          end: new Date('2024-01-15T10:00:00.000Z'),
          allDay: false,
          source: 'manual',
        }],
        baselineWindows,
        dayISODate: '2024-01-15',
      });
      const framingConflict = conflictDecisions.find(d => d.mode === 'FRAMING');
      expect(framingConflict?.reason).toBe(expectedReasons.conflictWithBusy);

      // Test window reliable and unconflicted
      const permitDecisions = evaluateDay({
        profile: mockProfile,
        busyBlocks: [],
        baselineWindows,
        dayISODate: '2024-01-15',
      });
      const framingPermit = permitDecisions.find(d => d.mode === 'FRAMING');
      expect(framingPermit?.reason).toBe(expectedReasons.windowReliableUnconflicted);
    });
  });
});
