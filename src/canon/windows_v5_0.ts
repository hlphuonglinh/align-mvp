/**
 * CANON: Window Templates v5.0 (Biologically Honest Reliability Windows)
 *
 * Key changes from v4.5:
 * - Updated time windows based on MSFsc research
 * - Split window support (Twilight/Nocturne Execution have 2 windows)
 * - Midnight wraparound (times > 24:00 for next-day windows)
 * - Post-lunch dip markers (fragile periods)
 * - Fragility modulation support (applied in Phase 2)
 *
 * MIDNIGHT WRAPAROUND:
 * Windows crossing midnight use end times > 24:00
 * Example: 22:00–00:30 stored as {start: '22:00', end: '24:30'}
 * Display logic converts '24:30' to '00:30 (next day)'
 *
 * SPLIT WINDOWS:
 * Some modes have multiple reliable windows (stored as arrays)
 * Execution for Twilight/Nocturne has morning + evening windows
 */

import type { CanonChronotype } from './quiz_v4_5.js';

// ============================================================================
// TYPES
// ============================================================================

export type CanonMode = 'FRAMING' | 'EVALUATION' | 'SYNTHESIS' | 'EXECUTION' | 'REFLECTION';

export interface CanonTimeWindow {
  start: string; // HH:MM format (can exceed 24:00 for next-day)
  end: string;   // HH:MM format (can exceed 24:00 for next-day)
}

export interface CanonModeWindow extends CanonTimeWindow {
  mode: CanonMode;
  reliability: 'RELIABLE' | 'FRAGILE';
}

/**
 * v5.0 mode template with support for:
 * - Single or split windows (array)
 * - Post-lunch dip markers
 */
export interface V5ModeTemplate {
  windows: CanonTimeWindow[];  // Array to support split windows
  postLunchDip?: CanonTimeWindow;  // Fragile period if applicable
}

export interface V5ChronotypeTemplate {
  chronotype: CanonChronotype;
  typicalWake: string;
  sleepInertiaEnds: string;
  modes: Record<CanonMode, V5ModeTemplate>;
  postLunchDip: CanonTimeWindow;
}

// ============================================================================
// v5.0 BIOLOGICALLY HONEST RELIABILITY WINDOWS
// ============================================================================

/**
 * AURORA (MSFsc <2.5)
 * Typical wake: 05:30, Sleep inertia ends: 07:00
 */
export const AURORA_V5: V5ChronotypeTemplate = {
  chronotype: 'AURORA',
  typicalWake: '05:30',
  sleepInertiaEnds: '07:00',
  postLunchDip: { start: '13:00', end: '14:00' },
  modes: {
    FRAMING: { windows: [{ start: '07:00', end: '09:00' }] },
    EVALUATION: { windows: [{ start: '08:00', end: '10:30' }] },
    SYNTHESIS: { windows: [{ start: '07:30', end: '11:00' }] },
    EXECUTION: { windows: [{ start: '11:00', end: '15:00' }] },
    REFLECTION: { windows: [{ start: '19:00', end: '21:00' }] },
  },
};

/**
 * DAYBREAK (MSFsc 2.5–<3.5)
 * Typical wake: 07:00, Sleep inertia ends: 08:30
 */
export const DAYBREAK_V5: V5ChronotypeTemplate = {
  chronotype: 'DAYBREAK',
  typicalWake: '07:00',
  sleepInertiaEnds: '08:30',
  postLunchDip: { start: '13:30', end: '14:30' },
  modes: {
    FRAMING: { windows: [{ start: '09:00', end: '11:00' }] },
    EVALUATION: { windows: [{ start: '10:00', end: '12:30' }] },
    SYNTHESIS: { windows: [{ start: '09:30', end: '13:00' }] },
    EXECUTION: { windows: [{ start: '13:00', end: '17:00' }] },
    REFLECTION: { windows: [{ start: '20:00', end: '22:00' }] },
  },
};

/**
 * MERIDIAN (MSFsc 3.5–<4.5)
 * Typical wake: 08:30, Sleep inertia ends: 10:00
 */
export const MERIDIAN_V5: V5ChronotypeTemplate = {
  chronotype: 'MERIDIAN',
  typicalWake: '08:30',
  sleepInertiaEnds: '10:00',
  postLunchDip: { start: '14:00', end: '15:00' },
  modes: {
    FRAMING: { windows: [{ start: '10:30', end: '12:30' }] },
    EVALUATION: { windows: [{ start: '11:30', end: '14:30' }] },
    SYNTHESIS: { windows: [{ start: '11:00', end: '15:00' }] },
    EXECUTION: { windows: [{ start: '15:00', end: '19:00' }] },
    REFLECTION: { windows: [{ start: '21:00', end: '23:00' }] },
  },
};

/**
 * TWILIGHT (MSFsc 4.5–<5.5)
 * Typical wake: 09:30, Sleep inertia ends: 11:00
 *
 * NOTE: Execution has SPLIT WINDOW (morning + evening)
 * NOTE: Reflection crosses midnight (22:00–00:00)
 */
export const TWILIGHT_V5: V5ChronotypeTemplate = {
  chronotype: 'TWILIGHT',
  typicalWake: '09:30',
  sleepInertiaEnds: '11:00',
  postLunchDip: { start: '14:30', end: '15:30' },
  modes: {
    FRAMING: { windows: [{ start: '13:00', end: '15:30' }] },
    EVALUATION: { windows: [{ start: '14:30', end: '17:30' }] },
    SYNTHESIS: { windows: [{ start: '13:30', end: '18:00' }] },
    // SPLIT WINDOW: Morning + Evening
    EXECUTION: {
      windows: [
        { start: '11:00', end: '13:00' },
        { start: '18:00', end: '21:00' },
      ]
    },
    // Crosses midnight: 22:00–00:00 stored as 22:00–24:00
    REFLECTION: { windows: [{ start: '22:00', end: '24:00' }] },
  },
};

/**
 * NOCTURNE (MSFsc ≥5.5)
 * Typical wake: 10:00, Sleep inertia ends: 11:30
 *
 * NOTE: Multiple modes cross midnight
 * NOTE: Execution has SPLIT WINDOW (afternoon + late night)
 */
export const NOCTURNE_V5: V5ChronotypeTemplate = {
  chronotype: 'NOCTURNE',
  typicalWake: '10:00',
  sleepInertiaEnds: '11:30',
  postLunchDip: { start: '15:00', end: '16:00' },
  modes: {
    // Crosses midnight: 21:00–23:30
    FRAMING: { windows: [{ start: '21:00', end: '23:30' }] },
    // Crosses midnight: 22:00–00:30 stored as 22:00–24:30
    EVALUATION: { windows: [{ start: '22:00', end: '24:30' }] },
    // 19:00–23:30 (does not cross midnight)
    SYNTHESIS: { windows: [{ start: '19:00', end: '23:30' }] },
    // SPLIT WINDOW: Afternoon + Late night (crosses midnight)
    EXECUTION: {
      windows: [
        { start: '14:00', end: '19:00' },
        { start: '24:30', end: '26:00' },  // 00:30–02:00 next day
      ]
    },
    // Crosses midnight: 01:00–03:00 stored as 25:00–27:00
    REFLECTION: { windows: [{ start: '25:00', end: '27:00' }] },
  },
};

// ============================================================================
// v5.0 LOOKUP BY CHRONOTYPE
// ============================================================================

export const V5_WINDOW_TEMPLATES: Record<CanonChronotype, V5ChronotypeTemplate> = {
  AURORA: AURORA_V5,
  DAYBREAK: DAYBREAK_V5,
  MERIDIAN: MERIDIAN_V5,
  TWILIGHT: TWILIGHT_V5,
  NOCTURNE: NOCTURNE_V5,
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
// TIME UTILITIES
// ============================================================================

/**
 * Parse HH:MM to decimal hours.
 * Handles times > 24:00 for midnight wraparound.
 */
export function parseTimeToDecimal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

/**
 * Convert decimal hours to HH:MM.
 * Handles times > 24:00 for midnight wraparound.
 */
export function decimalToTime(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Normalize time for display (converts 24:30 to 00:30).
 * Returns both the normalized time and whether it's next day.
 */
export function normalizeTimeForDisplay(time: string): { time: string; isNextDay: boolean } {
  const decimal = parseTimeToDecimal(time);
  if (decimal >= 24) {
    const normalizedDecimal = decimal - 24;
    return {
      time: decimalToTime(normalizedDecimal),
      isNextDay: true,
    };
  }
  return { time, isNextDay: false };
}

/**
 * Format a time window for display, handling midnight wraparound.
 * Example: { start: '22:00', end: '24:30' } -> '22:00–00:30'
 */
export function formatWindowForDisplay(window: CanonTimeWindow): string {
  const startNorm = normalizeTimeForDisplay(window.start);
  const endNorm = normalizeTimeForDisplay(window.end);
  return `${startNorm.time}–${endNorm.time}`;
}

// ============================================================================
// FRAGILITY MODULATION (Phase 2)
// ============================================================================

// Use FragilityLevel from quiz_v4_5.ts
import type { FragilityLevel } from './quiz_v4_5.js';

/**
 * Apply fragility modulation to window edges.
 *
 * Low: Widen all by +30 min (±15 min each edge)
 * Medium: Use base windows as-is
 * High: Narrow all by -30 min; Evaluation/Framing/Synthesis additional -15 min
 */
export function applyFragilityModulation(
  window: CanonTimeWindow,
  mode: CanonMode,
  fragility: FragilityLevel
): CanonTimeWindow {
  const startDecimal = parseTimeToDecimal(window.start);
  const endDecimal = parseTimeToDecimal(window.end);

  let startAdjust = 0;
  let endAdjust = 0;

  switch (fragility) {
    case 'Low':
      // Widen: -15 min start, +15 min end
      startAdjust = -0.25; // -15 min
      endAdjust = 0.25;    // +15 min
      break;
    case 'Medium':
      // No adjustment
      break;
    case 'High':
      // Narrow: +15 min start, -15 min end (30 min total)
      startAdjust = 0.25;  // +15 min
      endAdjust = -0.25;   // -15 min
      // Additional narrowing for high-stakes modes
      if (['EVALUATION', 'FRAMING', 'SYNTHESIS'].includes(mode)) {
        startAdjust += 0.125;  // Additional +7.5 min
        endAdjust -= 0.125;    // Additional -7.5 min
      }
      break;
  }

  return {
    start: decimalToTime(startDecimal + startAdjust),
    end: decimalToTime(endDecimal + endAdjust),
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY: Single-window format for v4.5 consumers
// ============================================================================

/**
 * Get the primary (first) window for a mode.
 * For backward compatibility with code expecting single windows.
 */
export function getPrimaryWindow(
  chronotype: CanonChronotype,
  mode: CanonMode
): CanonTimeWindow {
  const template = V5_WINDOW_TEMPLATES[chronotype];
  return template.modes[mode].windows[0];
}

/**
 * Legacy format: single window per mode (uses primary window only).
 * For backward compatibility with CANON_WINDOW_TEMPLATES consumers.
 */
export const CANON_WINDOW_TEMPLATES: Record<CanonChronotype, Record<CanonMode, CanonTimeWindow>> = {
  AURORA: {
    FRAMING: AURORA_V5.modes.FRAMING.windows[0],
    EVALUATION: AURORA_V5.modes.EVALUATION.windows[0],
    SYNTHESIS: AURORA_V5.modes.SYNTHESIS.windows[0],
    EXECUTION: AURORA_V5.modes.EXECUTION.windows[0],
    REFLECTION: AURORA_V5.modes.REFLECTION.windows[0],
  },
  DAYBREAK: {
    FRAMING: DAYBREAK_V5.modes.FRAMING.windows[0],
    EVALUATION: DAYBREAK_V5.modes.EVALUATION.windows[0],
    SYNTHESIS: DAYBREAK_V5.modes.SYNTHESIS.windows[0],
    EXECUTION: DAYBREAK_V5.modes.EXECUTION.windows[0],
    REFLECTION: DAYBREAK_V5.modes.REFLECTION.windows[0],
  },
  MERIDIAN: {
    FRAMING: MERIDIAN_V5.modes.FRAMING.windows[0],
    EVALUATION: MERIDIAN_V5.modes.EVALUATION.windows[0],
    SYNTHESIS: MERIDIAN_V5.modes.SYNTHESIS.windows[0],
    EXECUTION: MERIDIAN_V5.modes.EXECUTION.windows[0],
    REFLECTION: MERIDIAN_V5.modes.REFLECTION.windows[0],
  },
  TWILIGHT: {
    FRAMING: TWILIGHT_V5.modes.FRAMING.windows[0],
    EVALUATION: TWILIGHT_V5.modes.EVALUATION.windows[0],
    SYNTHESIS: TWILIGHT_V5.modes.SYNTHESIS.windows[0],
    EXECUTION: TWILIGHT_V5.modes.EXECUTION.windows[0],
    REFLECTION: TWILIGHT_V5.modes.REFLECTION.windows[0],
  },
  NOCTURNE: {
    FRAMING: NOCTURNE_V5.modes.FRAMING.windows[0],
    EVALUATION: NOCTURNE_V5.modes.EVALUATION.windows[0],
    SYNTHESIS: NOCTURNE_V5.modes.SYNTHESIS.windows[0],
    EXECUTION: NOCTURNE_V5.modes.EXECUTION.windows[0],
    REFLECTION: NOCTURNE_V5.modes.REFLECTION.windows[0],
  },
};

// ============================================================================
// LEGACY EXPORTS (for backward compatibility with tests)
// ============================================================================

/**
 * @deprecated Use CANON_WINDOW_TEMPLATES['AURORA'] instead
 */
export const AURORA_WINDOWS = CANON_WINDOW_TEMPLATES.AURORA;

/**
 * @deprecated Use CANON_WINDOW_TEMPLATES['DAYBREAK'] instead
 */
export const DAYBREAK_WINDOWS = CANON_WINDOW_TEMPLATES.DAYBREAK;

/**
 * @deprecated Use CANON_WINDOW_TEMPLATES['MERIDIAN'] instead
 */
export const MERIDIAN_WINDOWS = CANON_WINDOW_TEMPLATES.MERIDIAN;

/**
 * @deprecated Use CANON_WINDOW_TEMPLATES['TWILIGHT'] instead
 */
export const TWILIGHT_WINDOWS = CANON_WINDOW_TEMPLATES.TWILIGHT;

/**
 * @deprecated Use CANON_WINDOW_TEMPLATES['NOCTURNE'] instead
 */
export const NOCTURNE_WINDOWS = CANON_WINDOW_TEMPLATES.NOCTURNE;

/**
 * Focus envelopes (updated for v5.0)
 */
export const FOCUS_ENVELOPES: Record<CanonChronotype, CanonTimeWindow> = {
  AURORA: { start: '07:00', end: '11:00' },
  DAYBREAK: { start: '09:00', end: '13:00' },
  MERIDIAN: { start: '10:30', end: '15:00' },
  TWILIGHT: { start: '13:00', end: '18:00' },
  NOCTURNE: { start: '19:00', end: '23:30' },
};

/**
 * Generate baseline windows for a specific day (legacy function).
 * @deprecated Use generateBaselineWindows from baseline/windows.ts instead
 */
export function generateCanonBaselineWindows(
  chronotype: CanonChronotype,
  dayISODate: string
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
