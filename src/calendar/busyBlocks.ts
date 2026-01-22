import type { BusyBlock, StoredBusyBlock } from '../types.js';

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates a BusyBlock for correctness.
 * Checks: valid dates, end > start, valid source, boolean allDay.
 */
export function validateBusyBlock(block: unknown): ValidationResult {
  if (!block || typeof block !== 'object') {
    return { ok: false, error: 'Block must be an object' };
  }

  const b = block as Record<string, unknown>;

  // Check start
  if (b.start === undefined || b.start === null) {
    return { ok: false, error: 'Missing start' };
  }
  const startDate = toDate(b.start);
  if (!startDate || isNaN(startDate.getTime())) {
    return { ok: false, error: 'Invalid start date' };
  }

  // Check end
  if (b.end === undefined || b.end === null) {
    return { ok: false, error: 'Missing end' };
  }
  const endDate = toDate(b.end);
  if (!endDate || isNaN(endDate.getTime())) {
    return { ok: false, error: 'Invalid end date' };
  }

  // Check end > start
  if (endDate.getTime() <= startDate.getTime()) {
    return { ok: false, error: 'End must be after start' };
  }

  // Check allDay
  if (typeof b.allDay !== 'boolean') {
    return { ok: false, error: 'allDay must be a boolean' };
  }

  // Check source
  const validSources = ['manual', 'google', 'microsoft'];
  if (!validSources.includes(b.source as string)) {
    return { ok: false, error: 'Invalid source (must be manual, google, or microsoft)' };
  }

  // Check no extra fields that violate spec (no title, description, attendees, location)
  const allowedKeys = ['start', 'end', 'allDay', 'source', 'id'];
  const blockKeys = Object.keys(b);
  for (const key of blockKeys) {
    if (!allowedKeys.includes(key)) {
      return { ok: false, error: `Unexpected field: ${key}` };
    }
  }

  return { ok: true };
}

/**
 * Normalizes a BusyBlock: converts to Date objects, ensures ISO strings work.
 * Returns null if the block cannot be normalized.
 */
export function normalizeBusyBlock(block: unknown): BusyBlock | null {
  const validation = validateBusyBlock(block);
  if (!validation.ok) {
    return null;
  }

  const b = block as Record<string, unknown>;
  const start = toDate(b.start)!;
  const end = toDate(b.end)!;

  return {
    start,
    end,
    allDay: b.allDay as boolean,
    source: b.source as BusyBlock['source'],
  };
}

/**
 * Normalizes a StoredBusyBlock (with id).
 */
export function normalizeStoredBusyBlock(block: unknown): StoredBusyBlock | null {
  if (!block || typeof block !== 'object') {
    return null;
  }

  const b = block as Record<string, unknown>;
  if (typeof b.id !== 'string' || !b.id) {
    return null;
  }

  const normalized = normalizeBusyBlock(block);
  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    id: b.id,
  };
}

/**
 * Converts various date representations to a Date object.
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Generates a unique ID for a BusyBlock.
 */
export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Gets blocks for a specific date.
 */
export function getBlocksForDate(blocks: StoredBusyBlock[], date: Date): StoredBusyBlock[] {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  return blocks.filter(block => {
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    // Block overlaps with the target date
    return blockStart < nextDate && blockEnd > targetDate;
  }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Calculates total busy duration for a list of blocks in minutes.
 */
export function calculateTotalBusyTime(blocks: BusyBlock[]): number {
  let totalMinutes = 0;
  for (const block of blocks) {
    const start = new Date(block.start);
    const end = new Date(block.end);
    const durationMs = end.getTime() - start.getTime();
    totalMinutes += Math.floor(durationMs / (1000 * 60));
  }
  return totalMinutes;
}

/**
 * Formats minutes as human-readable duration (e.g., "3h 30m").
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) {
    return '0m';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}
