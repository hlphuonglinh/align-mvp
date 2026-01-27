/**
 * Baseline window generation.
 * CANON: All templates imported from src/canon/windows_v4_5.ts
 */

import type { ChronotypeProfile, BaselineWindow, Chronotype, BaselineMode } from '../types.js';
import {
  CANON_WINDOW_TEMPLATES,
  ALL_CANON_MODES,
  type CanonMode,
} from '../canon/index.js';

/**
 * Generates baseline windows for a chronotype profile on a specific day.
 * Uses canon window templates exactly per Appendix A.
 *
 * Silence-first behavior:
 * - Returns [] if profile is missing
 * - Returns [] if confidence is LOW
 *
 * @param profile - The chronotype profile (or null/undefined)
 * @param dayISODate - The target date in YYYY-MM-DD format
 * @returns Array of BaselineWindow with ISO timestamps
 */
export function generateBaselineWindows(
  profile: ChronotypeProfile | null | undefined,
  dayISODate: string
): BaselineWindow[] {
  // Silence-first: no profile = empty output
  if (!profile) {
    return [];
  }

  // Silence-first: LOW confidence = empty output
  if (profile.confidence === 'LOW') {
    return [];
  }

  const templates = CANON_WINDOW_TEMPLATES[profile.chronotype];
  if (!templates) {
    return [];
  }

  // Generate windows for all canon modes
  return ALL_CANON_MODES.map(mode => {
    const template = templates[mode as CanonMode];
    return {
      start: toISODateTime(dayISODate, template.start),
      end: toISODateTime(dayISODate, template.end),
      mode: mode as BaselineMode,
      reliability: 'RELIABLE' as const, // Phase 1: all windows are RELIABLE
      source: 'baseline' as const,
    };
  });
}

/**
 * Converts a date and time to an ISO datetime string.
 */
function toISODateTime(dateStr: string, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

/**
 * Gets the baseline templates for a chronotype (for testing).
 */
export function getBaselineTemplates(chronotype: Chronotype) {
  return CANON_WINDOW_TEMPLATES[chronotype];
}
