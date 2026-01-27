import { describe, it, expect } from 'vitest';
import type { ModeGovernanceDecision } from '../types.js';

/**
 * Flattened display item for rendering.
 * Mirrors the implementation in DailyView.tsx.
 */
interface DisplayItem {
  mode: string;
  decision: 'PERMIT' | 'FRAGMENTED' | 'SILENCE' | 'WARN';
  window: { start: string; end: string };
  reason: string;
  segmentIndex?: number;
  totalSegments?: number;
}

/**
 * Flatten governor decisions for display.
 * This mirrors the implementation in DailyView.tsx for testing.
 */
function flattenDecisions(decisions: ModeGovernanceDecision[]): DisplayItem[] {
  const items: DisplayItem[] = [];

  for (const decision of decisions) {
    if (decision.decision === 'FRAGMENTED' && decision.segments && decision.segments.length > 0) {
      decision.segments.forEach((seg, i) => {
        items.push({
          mode: decision.mode,
          decision: 'FRAGMENTED',
          window: { start: seg.start, end: seg.end },
          reason: decision.reason,
          segmentIndex: i,
          totalSegments: decision.segments!.length,
        });
      });
    } else if (decision.decision === 'PERMIT' && decision.window) {
      items.push({
        mode: decision.mode,
        decision: 'PERMIT',
        window: decision.window,
        reason: decision.reason,
      });
    } else {
      items.push({
        mode: decision.mode,
        decision: decision.decision as DisplayItem['decision'],
        window: { start: '', end: '' },
        reason: decision.reason,
      });
    }
  }

  items.sort((a, b) => {
    if (!a.window.start && !b.window.start) return 0;
    if (!a.window.start) return 1;
    if (!b.window.start) return -1;
    return new Date(a.window.start).getTime() - new Date(b.window.start).getTime();
  });

  return items;
}

describe('flattenDecisions', () => {
  it('should pass through PERMIT decisions unchanged', () => {
    const decisions: ModeGovernanceDecision[] = [{
      mode: 'FRAMING',
      decision: 'PERMIT',
      reason: 'Conditions support this mode of thinking.',
      window: { start: '2024-01-15T10:00:00.000Z', end: '2024-01-15T12:00:00.000Z' },
      computedAt: '2024-01-15T00:00:00.000Z',
    }];

    const items = flattenDecisions(decisions);

    expect(items).toHaveLength(1);
    expect(items[0].mode).toBe('FRAMING');
    expect(items[0].decision).toBe('PERMIT');
    expect(items[0].window.start).toBe('2024-01-15T10:00:00.000Z');
    expect(items[0].segmentIndex).toBeUndefined();
  });

  it('should pass through SILENCE decisions unchanged', () => {
    const decisions: ModeGovernanceDecision[] = [{
      mode: 'SYNTHESIS',
      decision: 'SILENCE',
      reason: 'Conditions are not structurally reliable right now.',
      computedAt: '2024-01-15T00:00:00.000Z',
    }];

    const items = flattenDecisions(decisions);

    expect(items).toHaveLength(1);
    expect(items[0].mode).toBe('SYNTHESIS');
    expect(items[0].decision).toBe('SILENCE');
    expect(items[0].window.start).toBe('');
    expect(items[0].window.end).toBe('');
  });

  it('should expand FRAGMENTED decisions into multiple rows', () => {
    const decisions: ModeGovernanceDecision[] = [{
      mode: 'FRAMING',
      decision: 'FRAGMENTED',
      reason: 'Window is split by an unavailable time.',
      segments: [
        { start: '2024-01-15T10:00:00.000Z', end: '2024-01-15T11:00:00.000Z' },
        { start: '2024-01-15T12:00:00.000Z', end: '2024-01-15T14:00:00.000Z' },
      ],
      computedAt: '2024-01-15T00:00:00.000Z',
    }];

    const items = flattenDecisions(decisions);

    expect(items).toHaveLength(2);

    expect(items[0].mode).toBe('FRAMING');
    expect(items[0].decision).toBe('FRAGMENTED');
    expect(items[0].window.start).toBe('2024-01-15T10:00:00.000Z');
    expect(items[0].window.end).toBe('2024-01-15T11:00:00.000Z');
    expect(items[0].segmentIndex).toBe(0);
    expect(items[0].totalSegments).toBe(2);

    expect(items[1].mode).toBe('FRAMING');
    expect(items[1].decision).toBe('FRAGMENTED');
    expect(items[1].window.start).toBe('2024-01-15T12:00:00.000Z');
    expect(items[1].window.end).toBe('2024-01-15T14:00:00.000Z');
    expect(items[1].segmentIndex).toBe(1);
    expect(items[1].totalSegments).toBe(2);
  });

  it('should sort items by start time with SILENCE items last', () => {
    const decisions: ModeGovernanceDecision[] = [
      {
        mode: 'REFLECTION',
        decision: 'PERMIT',
        reason: 'Conditions support this mode of thinking.',
        window: { start: '2024-01-15T16:00:00.000Z', end: '2024-01-15T17:00:00.000Z' },
        computedAt: '2024-01-15T00:00:00.000Z',
      },
      {
        mode: 'SYNTHESIS',
        decision: 'SILENCE',
        reason: 'Conditions are not structurally reliable right now.',
        computedAt: '2024-01-15T00:00:00.000Z',
      },
      {
        mode: 'FRAMING',
        decision: 'PERMIT',
        reason: 'Conditions support this mode of thinking.',
        window: { start: '2024-01-15T10:00:00.000Z', end: '2024-01-15T12:00:00.000Z' },
        computedAt: '2024-01-15T00:00:00.000Z',
      },
    ];

    const items = flattenDecisions(decisions);

    expect(items).toHaveLength(3);
    expect(items[0].mode).toBe('FRAMING'); // 10:00 - first
    expect(items[1].mode).toBe('REFLECTION'); // 16:00 - second
    expect(items[2].mode).toBe('SYNTHESIS'); // SILENCE - last
  });

  it('should handle multiple FRAGMENTED modes correctly', () => {
    const decisions: ModeGovernanceDecision[] = [
      {
        mode: 'FRAMING',
        decision: 'FRAGMENTED',
        reason: 'Window is split by an unavailable time.',
        segments: [
          { start: '2024-01-15T10:00:00.000Z', end: '2024-01-15T11:00:00.000Z' },
          { start: '2024-01-15T12:00:00.000Z', end: '2024-01-15T13:00:00.000Z' },
        ],
        computedAt: '2024-01-15T00:00:00.000Z',
      },
      {
        mode: 'SYNTHESIS',
        decision: 'FRAGMENTED',
        reason: 'Window is split by an unavailable time.',
        segments: [
          { start: '2024-01-15T14:00:00.000Z', end: '2024-01-15T15:00:00.000Z' },
          { start: '2024-01-15T16:00:00.000Z', end: '2024-01-15T17:00:00.000Z' },
        ],
        computedAt: '2024-01-15T00:00:00.000Z',
      },
    ];

    const items = flattenDecisions(decisions);

    expect(items).toHaveLength(4);
    // Sorted by start time
    expect(items[0].mode).toBe('FRAMING');
    expect(items[0].window.start).toBe('2024-01-15T10:00:00.000Z');
    expect(items[1].mode).toBe('FRAMING');
    expect(items[1].window.start).toBe('2024-01-15T12:00:00.000Z');
    expect(items[2].mode).toBe('SYNTHESIS');
    expect(items[2].window.start).toBe('2024-01-15T14:00:00.000Z');
    expect(items[3].mode).toBe('SYNTHESIS');
    expect(items[3].window.start).toBe('2024-01-15T16:00:00.000Z');
  });
});
