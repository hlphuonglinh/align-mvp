/**
 * CANON: Single source of truth for quiz, scoring, and window templates.
 * All system components MUST import from here.
 *
 * v5.0: Updated to biologically honest reliability windows
 * - Split window support (Twilight/Nocturne Execution)
 * - Midnight wraparound handling
 * - Post-lunch dip markers
 */

export * from './quiz_v4_5.js';
export * from './windows_v5_0.js';
