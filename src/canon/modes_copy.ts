import type { BaselineMode } from '../types.js';

/**
 * Canonical mode copy for tooltips.
 * Concise: definition + max 4 examples.
 */
export interface ModeCopy {
  definition: string;
  examples: string[];
}

export const MODES_COPY: Record<BaselineMode, ModeCopy> = {
  FRAMING: {
    definition: 'Defining the problem and the decision space.',
    examples: [
      'Defining the question for a strategy discussion',
      'Deciding what problem to solve before jumping to solutions',
      'Writing a brief or decision memo outline',
      'Asking "what are we actually deciding here?"',
    ],
  },
  EVALUATION: {
    definition: 'Comparing options and making tradeoffs.',
    examples: [
      'Comparing vendors or tools',
      'Deciding between two job offers',
      'Reviewing pros and cons',
      'Investment decisions',
    ],
  },
  SYNTHESIS: {
    definition: 'Integrating information into a coherent view.',
    examples: [
      'Making sense of user research',
      'Pulling insights from multiple meetings',
      'Connecting dots across data, feedback, and intuition',
      'Preparing a recommendation',
    ],
  },
  EXECUTION: {
    definition: 'Acting on an already-made decision.',
    examples: [
      'Writing emails based on a decided approach',
      'Implementing a plan',
      'Shipping work',
      'Doing tasks that require focus but not judgment',
    ],
  },
  REFLECTION: {
    definition: 'Looking back, not deciding forward.',
    examples: [
      'Post-mortems',
      'Journaling',
      'Reviewing a day or week',
      'Asking "what worked / what didn\'t?"',
    ],
  },
};

/**
 * Footer line for mode tooltips.
 */
export const MODES_FOOTER = 'Modes describe how you\'re thinking. Unavailable times describe whether you can think at all.';
