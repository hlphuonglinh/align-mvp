/**
 * Failure signature definitions for each mode state.
 *
 * Language rules (from directive):
 * - Always concrete consequences, never jargon
 * - Descriptive, not prescriptive
 * - Zero-friction override (informational only)
 *
 * applicationExamples: What you'd use this mode for (shown for ALL states)
 * examples: Work types affected by degradation (shown for WARNING states only)
 * structuralCause: Explains WHY the mode is degraded (based on fragmentation)
 */

import type { Mode, FailureSignature, FragmentationAnalysis } from '../types/modeStates.js';

/**
 * Failure signatures indexed by mode and state.
 */
export const FAILURE_SIGNATURES: Record<Mode, Record<string, FailureSignature>> = {
  EVALUATION: {
    INTACT: {
      consequence: 'Conditions support clear judgment',
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Hiring decisions',
        'Major pivots',
        'Pricing strategy',
        'Partnership terms',
        'Investment decisions',
      ],
    },
    WITHHELD: {
      consequence: "Judgment gaps are harder to catch in this window",
      discoveryWindow: 'TOO_LATE',
      examples: [
        'Hiring decisions',
        'Major pivots',
        'Pricing strategy',
        'Partnership terms',
      ],
      applicationExamples: [
        'Hiring decisions',
        'Major pivots',
        'Pricing strategy',
        'Partnership terms',
        'Investment decisions',
      ],
      overrideAdvice: 'If you decide now, plan to explicitly revisit tomorrow with fresh conditions',
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        if (fragmentation.percentageAvailable === 0) {
          return `Schedule conflicts completely block this window.`;
        }
        if (fragmentation.conflicts.length >= 3) {
          return `Multiple blocks split this into ${fragmentation.availablePortions.length} disconnected pieces. Heavy fragmentation makes blind spots very likely.`;
        }
        if (fragmentation.percentageAvailable < 0.3) {
          return `Only ${Math.round(fragmentation.percentageAvailable * 100)}% of the window is available. Decisions may feel solid but miss what fell through the gaps.`;
        }
        const n = fragmentation.conflicts.length;
        return `${n} conflict${n > 1 ? 's' : ''} ${n === 1 ? 'breaks' : 'break'} this window. Decisions may feel solid but miss what fell through the gaps.`;
      },
    },
  },

  FRAMING: {
    INTACT: {
      consequence: 'Good time to define the problem',
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Strategic planning sessions',
        'Product direction decisions',
        'Problem decomposition',
        'Scope definition',
        'Prioritization frameworks',
      ],
    },
    DEFERRED: {
      consequence: 'Interruptions can cause you to frame the wrong problem',
      discoveryWindow: 'TOO_LATE',
      examples: [
        'Strategic planning',
        'Product direction',
        'Problem decomposition',
      ],
      applicationExamples: [
        'Strategic planning sessions',
        'Product direction decisions',
        'Problem decomposition',
        'Scope definition',
        'Prioritization frameworks',
      ],
      overrideAdvice: 'If starting late or with interruptions, note what context you might be missing',
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        const n = fragmentation.conflicts.length;
        if (n >= 2) {
          return `${n} blocks split this window. Each break costs focus — rebuilding gets harder each time.`;
        }
        const conflict = fragmentation.conflicts[0];
        if (conflict) {
          return `A block at ${conflict.start}–${conflict.end} splits this window. You may solve the wrong problem without realizing it.`;
        }
        return 'A scheduling conflict breaks this window into disconnected segments.';
      },
    },
    WITHHELD: {
      consequence: 'Problem definition is not supported right now',
      discoveryWindow: 'TOO_LATE',
      applicationExamples: [
        'Strategic planning sessions',
        'Product direction decisions',
        'Problem decomposition',
        'Scope definition',
        'Prioritization frameworks',
      ],
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        if (fragmentation.percentageAvailable === 0) {
          return `Unavailable blocks completely eliminate this window. No time available for problem framing.`;
        }
        return `Only ${Math.round(fragmentation.percentageAvailable * 100)}% available across ${fragmentation.availablePortions.length} disconnected pieces—too fragmented to build a coherent mental model.`;
      },
    },
  },

  SYNTHESIS: {
    INTACT: {
      consequence: 'Good window to integrate ideas',
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Document drafts',
        'Presentation outlines',
        'Strategy memos',
        'Research summaries',
        'Meeting synthesis notes',
      ],
    },
    FRAGMENTED: {
      consequence: "Work done here may have hidden gaps",
      discoveryWindow: 'TOMORROW',
      examples: [
        'Document drafts',
        'Presentation outlines',
        'Strategy memos',
      ],
      applicationExamples: [
        'Document drafts',
        'Presentation outlines',
        'Strategy memos',
        'Research summaries',
        'Meeting synthesis notes',
      ],
      overrideAdvice: 'Draft now if you can review it tomorrow to catch gaps',
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        const n = fragmentation.conflicts.length;
        if (n >= 2) {
          return `${n} blocks split this into ${fragmentation.availablePortions.length} disconnected pieces. Each break costs focus — rebuilding gets harder each time.`;
        }
        const conflict = fragmentation.conflicts[0];
        if (conflict) {
          return `A block at ${conflict.start}–${conflict.end} splits this window. You'll lose thread and need to rebuild context.`;
        }
        return 'A scheduling conflict breaks this window into disconnected segments.';
      },
    },
    WITHHELD: {
      consequence: 'Integration is not supported right now',
      discoveryWindow: 'TOMORROW',
      applicationExamples: [
        'Document drafts',
        'Presentation outlines',
        'Strategy memos',
        'Research summaries',
        'Meeting synthesis notes',
      ],
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        return `Only ${Math.round(fragmentation.percentageAvailable * 100)}% of the window is available across ${fragmentation.availablePortions.length} disconnected fragments—too fragmented to attempt synthesis.`;
      },
    },
  },

  EXECUTION: {
    INTACT: {
      consequence: 'Flow conditions',
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Writing code',
        'Processing emails',
        'Administrative tasks',
        'Data entry',
        'Routine operations',
      ],
    },
    STRAINED: {
      consequence: "You'll make more mistakes but catch them immediately",
      discoveryWindow: 'IMMEDIATE',
      examples: [
        'Coding (tests catch bugs)',
        'Ops work',
        'Email triage',
      ],
      applicationExamples: [
        'Writing code',
        'Processing emails',
        'Administrative tasks',
        'Data entry',
        'Routine operations',
      ],
      overrideAdvice: "Errors are obvious and correctable—fine to continue for work with fast feedback (coding with tests, email triage, ops work)",
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        const n = fragmentation.conflicts.length;
        if (n === 1) {
          return `A block at ${fragmentation.conflicts[0].start}–${fragmentation.conflicts[0].end} splits this window. Throughput drops but errors stay visible.`;
        }
        return `${n} blocks split this window. Throughput drops but errors stay visible.`;
      },
    },
    WITHHELD: {
      consequence: 'Execution is severely degraded',
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Writing code',
        'Processing emails',
        'Administrative tasks',
        'Data entry',
        'Routine operations',
      ],
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        return `Window is too fragmented (${Math.round(fragmentation.percentageAvailable * 100)}% available across ${fragmentation.availablePortions.length} pieces) even for execution tasks.`;
      },
    },
  },

  REFLECTION: {
    AVAILABLE: {
      consequence: "Protected low-pressure window—good time to step back",
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Post-mortems',
        'Journaling',
        'Weekly reviews',
        'Personal planning',
        'Learning from mistakes',
      ],
    },
    SILENCE: {
      consequence: '',
      discoveryWindow: 'IMMEDIATE',
      applicationExamples: [
        'Post-mortems',
        'Journaling',
        'Weekly reviews',
        'Personal planning',
        'Learning from mistakes',
      ],
    },
  },
};

/**
 * Get failure signature for a mode and state.
 * Returns undefined if state is not valid for the mode.
 */
export function getFailureSignature(mode: Mode, state: string): FailureSignature | undefined {
  return FAILURE_SIGNATURES[mode]?.[state];
}

/**
 * Discovery window labels for display.
 */
export const DISCOVERY_WINDOW_LABELS: Record<string, string> = {
  IMMEDIATE: 'Immediate',
  TOMORROW: 'Tomorrow',
  TOO_LATE: 'Too late',
};

/**
 * Sort priority for discovery windows (higher = more urgent = shown first).
 */
export const DISCOVERY_PRIORITY: Record<string, number> = {
  TOO_LATE: 3,
  TOMORROW: 2,
  IMMEDIATE: 1,
};
