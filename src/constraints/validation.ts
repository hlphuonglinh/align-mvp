
export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates a V1Constraint.
 * Only FIXED_BLOCK is supported in v1.
 * Legacy FIXED_HOURS constraints are silently ignored (returns not ok).
 */
export function validateConstraint(constraint: unknown): ValidationResult {
  if (!constraint || typeof constraint !== 'object') {
    return { ok: false, error: 'Constraint must be an object' };
  }

  const c = constraint as Record<string, unknown>;

  // Check id
  if (typeof c.id !== 'string' || !c.id) {
    return { ok: false, error: 'Missing or invalid id' };
  }

  // Check kind - only FIXED_BLOCK is supported
  // FIXED_HOURS is silently ignored for migration safety
  if (c.kind === 'FIXED_HOURS') {
    return { ok: false }; // Silent migration: old FIXED_HOURS are ignored
  }

  if (c.kind !== 'FIXED_BLOCK') {
    return { ok: false, error: 'Invalid kind (must be FIXED_BLOCK)' };
  }

  // Check payload exists
  if (!c.payload || typeof c.payload !== 'object') {
    return { ok: false, error: 'Missing or invalid payload' };
  }

  // Check createdAtISO
  if (typeof c.createdAtISO !== 'string') {
    return { ok: false, error: 'Missing or invalid createdAtISO' };
  }

  // Validate FIXED_BLOCK payload
  return validateFixedBlockPayload(c.payload as Record<string, unknown>);
}

/**
 * Validates FIXED_BLOCK payload.
 * Supports allDay flag - when true, start/end times are not validated.
 */
export function validateFixedBlockPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Payload must be an object' };
  }

  const p = payload as Record<string, unknown>;

  // Check dateISO
  if (typeof p.dateISO !== 'string' || !isValidDateFormat(p.dateISO)) {
    return { ok: false, error: 'Invalid dateISO (must be YYYY-MM-DD format)' };
  }

  // If allDay is true, times are not required to be valid
  if (p.allDay === true) {
    return { ok: true };
  }

  // Check startLocal
  if (typeof p.startLocal !== 'string' || !isValidTimeFormat(p.startLocal)) {
    return { ok: false, error: 'Invalid startLocal (must be HH:MM format)' };
  }

  // Check endLocal
  if (typeof p.endLocal !== 'string' || !isValidTimeFormat(p.endLocal)) {
    return { ok: false, error: 'Invalid endLocal (must be HH:MM format)' };
  }

  // Check end > start
  if (!isEndAfterStart(p.startLocal, p.endLocal)) {
    return { ok: false, error: 'endLocal must be after startLocal' };
  }

  return { ok: true };
}

/**
 * Validates HH:MM time format.
 */
function isValidTimeFormat(time: string): boolean {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Validates YYYY-MM-DD date format.
 */
function isValidDateFormat(date: string): boolean {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Basic validation - could be more strict
  const testDate = new Date(year, month - 1, day);
  return testDate.getFullYear() === year &&
         testDate.getMonth() === month - 1 &&
         testDate.getDate() === day;
}

/**
 * Checks if end time is after start time.
 */
function isEndAfterStart(start: string, end: string): boolean {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  return endTotal > startTotal;
}

/**
 * Generates a unique constraint ID.
 */
export function generateConstraintId(): string {
  return `constraint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
