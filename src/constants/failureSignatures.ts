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
      consequence: "You might make a decision that feels right but isn't—and not realize until later",
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
      overrideAdvice: 'If you decide now, plan to explicitly revisit tomorrow with fresh conditions and reconsider the decision',
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        if (fragmentation.percentageAvailable === 0) {
          const conflictList = fragmentation.conflicts.map(c => `${c.start}–${c.end}`).join(', ');
          return `Unavailable blocks (${conflictList}) completely eliminate this window. No time available for high-stakes judgment.`;
        }
        if (fragmentation.conflicts.length >= 3) {
          return `${fragmentation.conflicts.length} interruptions fragment this window into ${fragmentation.availablePortions.length} disconnected pieces. Error monitoring requires sustained, uninterrupted attention—not possible with this many context switches.`;
        }
        if (fragmentation.percentageAvailable < 0.3) {
          return `Only ${Math.round(fragmentation.percentageAvailable * 100)}% of the window is available (${fragmentation.totalAvailableMinutes} min). Error monitoring degrades rapidly under time pressure.`;
        }
        return `${fragmentation.conflicts.length} interruption${fragmentation.conflicts.length > 1 ? 's' : ''} fragment the continuous attention required for reliable judgment.`;
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
      consequence: 'Starting mid-stream or with interruptions might lead to incomplete problem definition',
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
      overrideAdvice: 'If starting late or with interruptions, explicitly note what context you might be missing',
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        const baselineStart = fragmentation.baselineWindow.start;
        // Check if conflicts cut off the start of the window
        const blocksStart = fragmentation.conflicts.some(c => {
          const conflictEnd = c.end;
          // Conflict ends within first 30 min of baseline
          const baselineStartMins = parseInt(baselineStart.split(':')[0]) * 60 + parseInt(baselineStart.split(':')[1]);
          const conflictEndMins = parseInt(conflictEnd.split(':')[0]) * 60 + parseInt(conflictEnd.split(':')[1]);
          return conflictEndMins <= baselineStartMins + 30 && conflictEndMins > baselineStartMins;
        });

        if (blocksStart) {
          return 'Unavailable block(s) cut off the context-building phase at the start of this window.';
        }
        if (fragmentation.conflicts.length >= 2) {
          return `${fragmentation.conflicts.length} interruptions fragment the continuous thinking required for problem definition.`;
        }
        return 'Unavailable block(s) fragment this window—problem framing requires uninterrupted thought.';
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
      consequence: "This might feel complete but need rework when you review it tomorrow",
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
      overrideAdvice: 'Draft now if you can review it tomorrow to catch gaps in coherence',
      structuralCause: (fragmentation: FragmentationAnalysis) => {
        if (fragmentation.conflicts.length >= 2) {
          return `${fragmentation.conflicts.length} unavailable blocks fragment this window into ${fragmentation.availablePortions.length} disconnected pieces. Each context switch costs working memory—by the time you rebuild context, you're interrupted again.`;
        }
        const conflict = fragmentation.conflicts[0];
        if (conflict) {
          return `Unavailable block ${conflict.start}–${conflict.end} interrupts the sustained attention required for integration. You'll lose thread between segments.`;
        }
        return 'Unavailable block(s) interrupt the sustained attention required for integration.';
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
        const contextSwitchCost = fragmentation.conflicts.length * 15;
        if (fragmentation.conflicts.length === 1) {
          return `Unavailable block ${fragmentation.conflicts[0].start}–${fragmentation.conflicts[0].end} splits this window into ${fragmentation.availablePortions.length} segments. Context switching costs ~15 min per interruption, reducing throughput.`;
        }
        return `${fragmentation.conflicts.length} interruptions reduce throughput by ~${contextSwitchCost} minutes of context switching, but error feedback loops remain intact.`;
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
      consequence: "Rare protected window—good time to step back",
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
