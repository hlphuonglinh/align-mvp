/**
 * Constraint kinds supported in v1.
 */
export type ConstraintKind = 'FIXED_HOURS' | 'FIXED_BLOCK';

/**
 * FIXED_HOURS payload: recurring constraint for specific days of week.
 * Example: work hours Mon-Fri 09:00-17:00
 */
export interface FixedHoursPayload {
  /** Days of week (0=Sunday, 6=Saturday) */
  daysOfWeek: number[];
  /** Start time in local HH:MM format */
  startLocal: string;
  /** End time in local HH:MM format */
  endLocal: string;
}

/**
 * FIXED_BLOCK payload: one-time constraint for a specific date.
 * Example: commute on 2024-01-15 from 08:00-09:00
 */
export interface FixedBlockPayload {
  /** Date in YYYY-MM-DD format */
  dateISO: string;
  /** Start time in local HH:MM format */
  startLocal: string;
  /** End time in local HH:MM format */
  endLocal: string;
}

/**
 * Union type for constraint payloads.
 */
export type ConstraintPayload = FixedHoursPayload | FixedBlockPayload;

/**
 * V1 Constraint structure.
 */
export interface V1Constraint {
  id: string;
  kind: ConstraintKind;
  payload: ConstraintPayload;
  createdAtISO: string;
}

/**
 * Type guard for FIXED_HOURS payload.
 */
export function isFixedHoursPayload(payload: ConstraintPayload): payload is FixedHoursPayload {
  return 'daysOfWeek' in payload;
}

/**
 * Type guard for FIXED_BLOCK payload.
 */
export function isFixedBlockPayload(payload: ConstraintPayload): payload is FixedBlockPayload {
  return 'dateISO' in payload;
}
