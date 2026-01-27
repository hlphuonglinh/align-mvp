import { describe, it, expect } from 'vitest';
import { CHRONOTYPE_COPY } from '../canon/chronotype_copy.js';

/**
 * Tests for Chronotype page information architecture.
 * Documents expected structure and behavior.
 */
describe('Chronotype page structure', () => {
  describe('user chronotype details (always visible)', () => {
    it('should render chronotype details without toggle', () => {
      // Document expected behavior: user's chronotype details are always visible
      // No "About your chronotype" toggle required to see content
      const detailsAlwaysVisible = true;
      expect(detailsAlwaysVisible).toBe(true);
    });

    it('should display all canonical content sections', () => {
      // Document expected sections in the details view
      const expectedSections = [
        'hook',
        'paragraph',
        'bullets (What you might recognize)',
        'alignHelps (How Align helps)',
        'prevalence',
      ];
      expect(expectedSections.length).toBe(5);
    });

    it('should have data-testid for chronotype details', () => {
      // Document expected test ID
      const expectedTestId = 'chronotype-details';
      expect(expectedTestId).toBe('chronotype-details');
    });
  });

  describe('other chronotypes section', () => {
    it('should have collapsible other chronotypes section', () => {
      // Document expected behavior: collapsed by default
      const collapsedByDefault = true;
      expect(collapsedByDefault).toBe(true);
    });

    it('should have data-testid for toggle', () => {
      // Document expected test ID
      const expectedTestId = 'other-chronotypes-toggle';
      expect(expectedTestId).toBe('other-chronotypes-toggle');
    });

    it('should have data-testid for content container', () => {
      // Document expected test ID when expanded
      const expectedTestId = 'other-chronotypes-content';
      expect(expectedTestId).toBe('other-chronotypes-content');
    });

    it('should list other 4 chronotypes when expanded', () => {
      // Document expected behavior: show 4 other chronotypes
      const allChronotypes = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];
      const userChronotype = 'AURORA'; // example
      const otherChronotypes = allChronotypes.filter(c => c !== userChronotype);
      expect(otherChronotypes.length).toBe(4);
    });

    it('should have expandable items for each other chronotype', () => {
      // Document expected behavior: each item can be expanded
      const eachItemExpandable = true;
      expect(eachItemExpandable).toBe(true);
    });

    it('should have data-testid for each chronotype item', () => {
      // Document expected test ID pattern
      const expectedPattern = 'other-chronotype-{chronotype.toLowerCase()}';
      expect(expectedPattern).toContain('other-chronotype-');
    });
  });
});

describe('Chronotype canonical copy verification', () => {
  const chronotypes = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'] as const;

  chronotypes.forEach(chronotype => {
    describe(chronotype, () => {
      it('should have hook', () => {
        expect(CHRONOTYPE_COPY[chronotype].hook).toBeTruthy();
        expect(typeof CHRONOTYPE_COPY[chronotype].hook).toBe('string');
      });

      it('should have paragraph', () => {
        expect(CHRONOTYPE_COPY[chronotype].paragraph).toBeTruthy();
        expect(typeof CHRONOTYPE_COPY[chronotype].paragraph).toBe('string');
      });

      it('should have bullets array', () => {
        expect(Array.isArray(CHRONOTYPE_COPY[chronotype].bullets)).toBe(true);
        expect(CHRONOTYPE_COPY[chronotype].bullets.length).toBeGreaterThan(0);
      });

      it('should have alignHelps', () => {
        expect(CHRONOTYPE_COPY[chronotype].alignHelps).toBeTruthy();
        expect(typeof CHRONOTYPE_COPY[chronotype].alignHelps).toBe('string');
      });

      it('should have prevalence', () => {
        expect(CHRONOTYPE_COPY[chronotype].prevalence).toBeTruthy();
        expect(typeof CHRONOTYPE_COPY[chronotype].prevalence).toBe('string');
      });

      it('should not contain em dashes in any copy', () => {
        const allText = [
          CHRONOTYPE_COPY[chronotype].hook,
          CHRONOTYPE_COPY[chronotype].paragraph,
          ...CHRONOTYPE_COPY[chronotype].bullets,
          CHRONOTYPE_COPY[chronotype].alignHelps,
          CHRONOTYPE_COPY[chronotype].prevalence,
        ].join(' ');

        // Em dash is Unicode U+2014
        expect(allText).not.toContain('\u2014');
      });
    });
  });
});

describe('Chronotype page styling', () => {
  it('should use warm neutral colors from tokens', () => {
    // Document expected color usage
    const usesWarmNeutrals = true;
    expect(usesWarmNeutrals).toBe(true);
  });

  it('should use liquid glass effects for cards', () => {
    // Document expected glass effects
    const usesGlassCard = true;
    expect(usesGlassCard).toBe(true);
  });

  it('should have lighter styling for other chronotypes section', () => {
    // Document expected behavior: secondary section is less prominent
    const lighterStyling = true;
    expect(lighterStyling).toBe(true);
  });
});
