import type { ChronotypeProfile, BaselineWindow, Chronotype, BaselineMode, BaselineReliability } from '../types.js';

/**
 * Window template for a chronotype (time in HH:MM format).
 */
interface WindowTemplate {
  start: string;
  end: string;
  mode: BaselineMode;
  reliability: BaselineReliability;
}

/**
 * Canonical baseline windows for each chronotype.
 * Hardcoded for v1.
 */
const BASELINE_TEMPLATES: Record<Chronotype, WindowTemplate[]> = {
  AURORA: [
    { start: '05:30', end: '07:30', mode: 'FRAMING', reliability: 'RELIABLE' },
    { start: '07:30', end: '09:00', mode: 'EVALUATION', reliability: 'RELIABLE' },
    { start: '09:00', end: '09:30', mode: 'SYNTHESIS', reliability: 'RELIABLE' },
  ],
  DAYBREAK: [
    { start: '07:00', end: '08:30', mode: 'FRAMING', reliability: 'RELIABLE' },
    { start: '08:30', end: '10:30', mode: 'SYNTHESIS', reliability: 'RELIABLE' },
    { start: '08:30', end: '10:30', mode: 'EVALUATION', reliability: 'RELIABLE' },
    { start: '10:30', end: '11:00', mode: 'SYNTHESIS', reliability: 'RELIABLE' },
  ],
  MERIDIAN: [
    { start: '10:00', end: '11:30', mode: 'SYNTHESIS', reliability: 'RELIABLE' },
    { start: '11:30', end: '13:30', mode: 'EVALUATION', reliability: 'RELIABLE' },
    { start: '13:30', end: '14:00', mode: 'FRAMING', reliability: 'RELIABLE' },
  ],
  TWILIGHT: [
    { start: '13:00', end: '15:00', mode: 'SYNTHESIS', reliability: 'RELIABLE' },
    { start: '15:00', end: '16:30', mode: 'EVALUATION', reliability: 'RELIABLE' },
    { start: '16:30', end: '17:00', mode: 'FRAMING', reliability: 'RELIABLE' },
  ],
  NOCTURNE: [
    { start: '18:00', end: '20:00', mode: 'SYNTHESIS', reliability: 'RELIABLE' },
    { start: '20:00', end: '21:30', mode: 'EVALUATION', reliability: 'RELIABLE' },
    { start: '21:30', end: '22:30', mode: 'FRAMING', reliability: 'RELIABLE' },
  ],
};

/**
 * Generates baseline windows for a chronotype profile on a specific day.
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

  const templates = BASELINE_TEMPLATES[profile.chronotype];
  if (!templates) {
    return [];
  }

  return templates.map(template => ({
    start: toISODateTime(dayISODate, template.start),
    end: toISODateTime(dayISODate, template.end),
    mode: template.mode,
    reliability: template.reliability,
    source: 'baseline' as const,
  }));
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
export function getBaselineTemplates(chronotype: Chronotype): WindowTemplate[] {
  return BASELINE_TEMPLATES[chronotype] ?? [];
}
