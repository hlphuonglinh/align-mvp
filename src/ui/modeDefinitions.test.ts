import { describe, it, expect } from 'vitest';
import { MODES_COPY, MODES_FOOTER } from '../canon/modes_copy.js';

/**
 * Tests for MODES_COPY canonical content.
 * Verifies mode definitions and examples used in tooltips.
 */
describe('MODES_COPY', () => {
  it('should contain all five modes', () => {
    expect(MODES_COPY).toHaveProperty('FRAMING');
    expect(MODES_COPY).toHaveProperty('EVALUATION');
    expect(MODES_COPY).toHaveProperty('SYNTHESIS');
    expect(MODES_COPY).toHaveProperty('EXECUTION');
    expect(MODES_COPY).toHaveProperty('REFLECTION');
  });

  describe('FRAMING', () => {
    it('should have correct definition', () => {
      expect(MODES_COPY.FRAMING.definition).toBe(
        'Defining the problem and the decision space.'
      );
    });

    it('should have max 4 examples', () => {
      expect(MODES_COPY.FRAMING.examples.length).toBeLessThanOrEqual(4);
    });

    it('should have required examples', () => {
      const { examples } = MODES_COPY.FRAMING;
      expect(examples).toContain('Defining the question for a strategy discussion');
      expect(examples).toContain('Deciding what problem to solve before jumping to solutions');
    });
  });

  describe('EVALUATION', () => {
    it('should have correct definition', () => {
      expect(MODES_COPY.EVALUATION.definition).toBe(
        'Comparing options and making tradeoffs.'
      );
    });

    it('should have max 4 examples', () => {
      expect(MODES_COPY.EVALUATION.examples.length).toBeLessThanOrEqual(4);
    });

    it('should have required examples', () => {
      const { examples } = MODES_COPY.EVALUATION;
      expect(examples).toContain('Comparing vendors or tools');
      expect(examples).toContain('Deciding between two job offers');
    });
  });

  describe('SYNTHESIS', () => {
    it('should have correct definition', () => {
      expect(MODES_COPY.SYNTHESIS.definition).toBe(
        'Integrating information into a coherent view.'
      );
    });

    it('should have max 4 examples', () => {
      expect(MODES_COPY.SYNTHESIS.examples.length).toBeLessThanOrEqual(4);
    });

    it('should have required examples', () => {
      const { examples } = MODES_COPY.SYNTHESIS;
      expect(examples).toContain('Making sense of user research');
      expect(examples).toContain('Pulling insights from multiple meetings');
    });
  });

  describe('EXECUTION', () => {
    it('should have correct definition', () => {
      expect(MODES_COPY.EXECUTION.definition).toBe(
        'Acting on an already-made decision.'
      );
    });

    it('should have max 4 examples', () => {
      expect(MODES_COPY.EXECUTION.examples.length).toBeLessThanOrEqual(4);
    });

    it('should have required examples', () => {
      const { examples } = MODES_COPY.EXECUTION;
      expect(examples).toContain('Writing emails based on a decided approach');
      expect(examples).toContain('Implementing a plan');
    });
  });

  describe('REFLECTION', () => {
    it('should have correct definition', () => {
      expect(MODES_COPY.REFLECTION.definition).toBe(
        'Looking back, not deciding forward.'
      );
    });

    it('should have max 4 examples', () => {
      expect(MODES_COPY.REFLECTION.examples.length).toBeLessThanOrEqual(4);
    });

    it('should have required examples', () => {
      const { examples } = MODES_COPY.REFLECTION;
      expect(examples).toContain('Post-mortems');
      expect(examples).toContain('Journaling');
    });
  });
});

describe('MODES_FOOTER', () => {
  it('should have correct footer text', () => {
    expect(MODES_FOOTER).toBe(
      'Modes describe how you\'re thinking. Unavailable times describe whether you can think at all.'
    );
  });
});
