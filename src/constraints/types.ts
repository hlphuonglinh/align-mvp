/**
 * Constraint kinds supported in v1.
 * V1 only supports FIXED_BLOCK (one-off unavailable times).
 */
export type ConstraintKind = 'FIXED_BLOCK';

/**
 * FIXED_BLOCK payload: one-time unavailable period for a specific date.
 * Example: unavailable on 2024-01-15 from 08:00-09:00
 */
export interface FixedBlockPayload {
  /** Date in YYYY-MM-DD format */
  dateISO: string;
  /** Start time in local HH:MM format */
  startLocal: string;
  /** End time in local HH:MM format */
  endLocal: string;
  /** If true, the entire day is unavailable (startLocal/endLocal ignored) */
  allDay?: boolean;
}

/**
 * Union type for constraint payloads.
 * V1 only has FIXED_BLOCK.
 */
export type ConstraintPayload = FixedBlockPayload;

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
 * Type guard for FIXED_BLOCK payload.
 */
export function isFixedBlockPayload(payload: ConstraintPayload): payload is FixedBlockPayload {
  return 'dateISO' in payload;
}

/**
 * Legacy type guard for FIXED_HOURS (always returns false).
 * Kept for migration safety - old code that checks this won't crash.
 * @deprecated FIXED_HOURS is no longer supported
 */
export function isFixedHoursPayload(_payload: unknown): boolean {
  return false;
}
