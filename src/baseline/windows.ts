/**
 * Baseline window generation (v5.0)
 *
 * Generates baseline windows from chronotype profile using v5.0 spec.
 * Handles:
 * - Split windows (Twilight/Nocturne Execution have 2 windows)
 * - Midnight wraparound (windows crossing midnight)
 * - Post-lunch dip markers
 *
 * MIDNIGHT WRAPAROUND:
 * Times > 24:00 indicate next-day times.
 * Example: 25:00 = 01:00 next day
 * These are converted to proper ISO timestamps on the next calendar day.
 */

import type { ChronotypeProfile, BaselineWindow, Chronotype, BaselineMode } from '../types.js';
import {
  V5_WINDOW_TEMPLATES,
  ALL_CANON_MODES,
  parseTimeToDecimal,
  CANON_WINDOW_TEMPLATES as V5_CANON_WINDOW_TEMPLATES,
  type CanonMode,
  type CanonTimeWindow,
} from '../canon/windows_v5_0.js';

// Re-export for backward compatibility
export { CANON_WINDOW_TEMPLATES, ALL_CANON_MODES } from '../canon/windows_v5_0.js';

/**
 * Generates baseline windows for a chronotype profile on a specific day.
 * Uses v5.0 window templates with support for split windows and midnight wraparound.
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

  const template = V5_WINDOW_TEMPLATES[profile.chronotype];
  if (!template) {
    return [];
  }

  const windows: BaselineWindow[] = [];

  // Generate windows for all canon modes
  for (const mode of ALL_CANON_MODES) {
    const modeTemplate = template.modes[mode as CanonMode];

    // Handle split windows (e.g., Twilight/Nocturne Execution)
    for (const timeWindow of modeTemplate.windows) {
      const { start, end, startDate, endDate } = resolveWindowDates(dayISODate, timeWindow);

      windows.push({
        start: toISODateTime(startDate, start),
        end: toISODateTime(endDate, end),
        mode: mode as BaselineMode,
        reliability: 'RELIABLE' as const, // Phase 1: all windows are RELIABLE
        source: 'baseline' as const,
      });
    }
  }

  return windows;
}

/**
 * Resolves window dates handling midnight wraparound.
 *
 * Times >= 24:00 indicate the next day.
 * Example:
 * - 22:00–24:30 on 2024-01-15 becomes:
 *   start: 22:00 on 2024-01-15
 *   end: 00:30 on 2024-01-16
 *
 * - 25:00–27:00 on 2024-01-15 becomes:
 *   start: 01:00 on 2024-01-16
 *   end: 03:00 on 2024-01-16
 */
function resolveWindowDates(
  baseDate: string,
  window: CanonTimeWindow
): {
  start: string;
  end: string;
  startDate: string;
  endDate: string;
} {
  const startDecimal = parseTimeToDecimal(window.start);
  const endDecimal = parseTimeToDecimal(window.end);

  // Calculate day offsets
  const startDayOffset = Math.floor(startDecimal / 24);
  const endDayOffset = Math.floor(endDecimal / 24);

  // Normalize times to 0-24 range
  const normalizedStart = startDecimal % 24;
  const normalizedEnd = endDecimal % 24;

  // Format normalized times
  const startTime = decimalToTimeStr(normalizedStart);
  const endTime = decimalToTimeStr(normalizedEnd);

  // Calculate actual dates
  const startDate = addDays(baseDate, startDayOffset);
  const endDate = addDays(baseDate, endDayOffset);

  return {
    start: startTime,
    end: endTime,
    startDate,
    endDate,
  };
}

/**
 * Convert decimal hours to HH:MM string.
 */
function decimalToTimeStr(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Add days to a date string.
 */
function addDays(dateStr: string, days: number): string {
  if (days === 0) return dateStr;
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
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
 * Returns backward-compatible single-window format.
 */
export function getBaselineTemplates(chronotype: Chronotype) {
  return V5_CANON_WINDOW_TEMPLATES[chronotype];
}

/**
 * Gets all windows for a mode (handles split windows).
 * Returns array of time windows.
 */
export function getModeWindows(chronotype: Chronotype, mode: BaselineMode): CanonTimeWindow[] {
  const template = V5_WINDOW_TEMPLATES[chronotype];
  if (!template) return [];
  return template.modes[mode as CanonMode]?.windows || [];
}

/**
 * Check if a mode has split windows for a chronotype.
 */
export function hasSplitWindows(chronotype: Chronotype, mode: BaselineMode): boolean {
  const windows = getModeWindows(chronotype, mode);
  return windows.length > 1;
}

/**
 * Get the post-lunch dip window for a chronotype.
 */
export function getPostLunchDip(chronotype: Chronotype): CanonTimeWindow | null {
  const template = V5_WINDOW_TEMPLATES[chronotype];
  return template?.postLunchDip || null;
}
