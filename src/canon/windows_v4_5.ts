/**
 * CANON: Window Templates v4.5 (Appendix A)
 * Source of truth: QUIZ v4.5.pdf, Section 5 "Concrete deterministic window templates"
 *
 * DO NOT MODIFY without updating the canonical PDF.
 * Tests will fail if these values drift.
 *
 * PHASE CONSTRAINT (from PDF):
 * In Phase 1 (Deterministic Governance MVP), Align MUST emit canonical
 * chronotype reliability windows verbatim, without widening or narrowing.
 * Fragility is computed and stored, but it does NOT alter window geometry
 * until Phase 2.
 */

import type { CanonChronotype } from './quiz_v4_5.js';

// ============================================================================
// TYPES
// ============================================================================

export type CanonMode = 'FRAMING' | 'EVALUATION' | 'SYNTHESIS' | 'EXECUTION' | 'REFLECTION';

export interface CanonTimeWindow {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface CanonModeWindow extends CanonTimeWindow {
  mode: CanonMode;
  reliability: 'RELIABLE' | 'FRAGILE';
}

// ============================================================================
// CANONICAL WINDOW TEMPLATES (exact values from Appendix A)
// ============================================================================

/**
 * Aurora (focus envelope 05:30–09:30)
 * - Framing: 06:00–08:00
 * - Evaluation: 07:00–09:00
 * - Synthesis: 06:30–09:00
 * - Execution: 09:00–12:30
 * - Reflection: 18:00–20:00 (low-pressure)
 */
export const AURORA_WINDOWS: Record<CanonMode, CanonTimeWindow> = {
  FRAMING: { start: '06:00', end: '08:00' },
  EVALUATION: { start: '07:00', end: '09:00' },
  SYNTHESIS: { start: '06:30', end: '09:00' },
  EXECUTION: { start: '09:00', end: '12:30' },
  REFLECTION: { start: '18:00', end: '20:00' },
};

/**
 * Daybreak (07:00–11:00)
 * - Framing: 08:00–10:00
 * - Evaluation: 09:00–11:00
 * - Synthesis: 08:30–11:00
 * - Execution: 11:00–15:00
 * - Reflection: 20:00–21:30
 */
export const DAYBREAK_WINDOWS: Record<CanonMode, CanonTimeWindow> = {
  FRAMING: { start: '08:00', end: '10:00' },
  EVALUATION: { start: '09:00', end: '11:00' },
  SYNTHESIS: { start: '08:30', end: '11:00' },
  EXECUTION: { start: '11:00', end: '15:00' },
  REFLECTION: { start: '20:00', end: '21:30' },
};

/**
 * Meridian (10:00–14:00)
 * - Framing: 10:00–12:00
 * - Evaluation: 11:00–13:30
 * - Synthesis: 10:30–13:30
 * - Execution: 14:00–17:00
 * - Reflection: 18:00–20:00
 */
export const MERIDIAN_WINDOWS: Record<CanonMode, CanonTimeWindow> = {
  FRAMING: { start: '10:00', end: '12:00' },
  EVALUATION: { start: '11:00', end: '13:30' },
  SYNTHESIS: { start: '10:30', end: '13:30' },
  EXECUTION: { start: '14:00', end: '17:00' },
  REFLECTION: { start: '18:00', end: '20:00' },
};

/**
 * Twilight (13:00–17:00)
 * - Framing: 13:00–15:00
 * - Evaluation: 15:00–17:00
 * - Synthesis: 14:00–17:00
 * - Execution: 17:00–20:00
 * - Reflection: 21:00–22:30
 */
export const TWILIGHT_WINDOWS: Record<CanonMode, CanonTimeWindow> = {
  FRAMING: { start: '13:00', end: '15:00' },
  EVALUATION: { start: '15:00', end: '17:00' },
  SYNTHESIS: { start: '14:00', end: '17:00' },
  EXECUTION: { start: '17:00', end: '20:00' },
  REFLECTION: { start: '21:00', end: '22:30' },
};

/**
 * Nocturne (18:00–22:30)
 * - Framing: 18:30–20:30
 * - Evaluation: 20:00–22:00
 * - Synthesis: 19:00–22:00
 * - Execution: 14:00–18:00
 * - Reflection: 22:00–23:00
 */
export const NOCTURNE_WINDOWS: Record<CanonMode, CanonTimeWindow> = {
  FRAMING: { start: '18:30', end: '20:30' },
  EVALUATION: { start: '20:00', end: '22:00' },
  SYNTHESIS: { start: '19:00', end: '22:00' },
  EXECUTION: { start: '14:00', end: '18:00' },
  REFLECTION: { start: '22:00', end: '23:00' },
};

// ============================================================================
// LOOKUP BY CHRONOTYPE
// ============================================================================

export const CANON_WINDOW_TEMPLATES: Record<CanonChronotype, Record<CanonMode, CanonTimeWindow>> = {
  AURORA: AURORA_WINDOWS,
  DAYBREAK: DAYBREAK_WINDOWS,
  MERIDIAN: MERIDIAN_WINDOWS,
  TWILIGHT: TWILIGHT_WINDOWS,
  NOCTURNE: NOCTURNE_WINDOWS,
};

// ============================================================================
// ALL MODES (for iteration)
// ============================================================================

export const ALL_CANON_MODES: CanonMode[] = [
  'FRAMING',
  'EVALUATION',
  'SYNTHESIS',
  'EXECUTION',
  'REFLECTION',
];

// ============================================================================
// HELPER: Parse HH:MM to decimal hours
// ============================================================================

export function parseTimeToDecimal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

// ============================================================================
// HELPER: Convert decimal hours to HH:MM
// ============================================================================

export function decimalToTime(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// ============================================================================
// GENERATE BASELINE WINDOWS FOR A DAY
// ============================================================================

/**
 * Generate baseline windows for a specific day based on chronotype.
 * Returns windows with ISO datetime strings for the given day.
 *
 * All windows are marked RELIABLE per Phase 1 constraint
 * (fragility does not alter geometry in Phase 1).
 */
export function generateCanonBaselineWindows(
  chronotype: CanonChronotype,
  dayISODate: string // YYYY-MM-DD
): CanonModeWindow[] {
  const templates = CANON_WINDOW_TEMPLATES[chronotype];

  return ALL_CANON_MODES.map(mode => {
    const template = templates[mode];
    return {
      mode,
      start: `${dayISODate}T${template.start}:00`,
      end: `${dayISODate}T${template.end}:00`,
      reliability: 'RELIABLE' as const,
    };
  });
}

// ============================================================================
// FOCUS ENVELOPE (for reference/display)
// ============================================================================

export const FOCUS_ENVELOPES: Record<CanonChronotype, CanonTimeWindow> = {
  AURORA: { start: '05:30', end: '09:30' },
  DAYBREAK: { start: '07:00', end: '11:00' },
  MERIDIAN: { start: '10:00', end: '14:00' },
  TWILIGHT: { start: '13:00', end: '17:00' },
  NOCTURNE: { start: '18:00', end: '22:30' },
};
