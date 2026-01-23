import type { DailyLog } from '../types.js';

const STORAGE_KEY = 'align.v1.dailyLogs';

/**
 * Loads daily logs from localStorage.
 */
export function loadDailyLogs(): DailyLog[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Basic validation
    return parsed.filter(isValidDailyLog);
  } catch {
    return [];
  }
}

/**
 * Saves daily logs to localStorage.
 */
export function saveDailyLogs(logs: DailyLog[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

/**
 * Gets a log for a specific day.
 */
export function getLogForDay(logs: DailyLog[], dayISO: string): DailyLog | null {
  return logs.find(log => log.dayISO === dayISO) ?? null;
}

/**
 * Updates or creates a log for a specific day.
 */
export function upsertDailyLog(
  logs: DailyLog[],
  dayISO: string,
  rating: number,
  note?: string
): DailyLog[] {
  const existing = logs.findIndex(log => log.dayISO === dayISO);
  const newLog: DailyLog = {
    dayISO,
    rating: Math.max(0, Math.min(5, Math.round(rating))), // Clamp to 0-5
    note: note?.trim() || undefined,
    createdAtISO: new Date().toISOString(),
  };

  if (existing >= 0) {
    return logs.map((log, i) => (i === existing ? newLog : log));
  }
  return [...logs, newLog];
}

/**
 * Validates a daily log object.
 */
function isValidDailyLog(obj: unknown): obj is DailyLog {
  if (!obj || typeof obj !== 'object') return false;

  const log = obj as Record<string, unknown>;

  if (typeof log.dayISO !== 'string') return false;
  if (typeof log.rating !== 'number' || log.rating < 0 || log.rating > 5) return false;
  if (log.note !== undefined && typeof log.note !== 'string') return false;
  if (typeof log.createdAtISO !== 'string') return false;

  return true;
}

/**
 * Clears all daily logs from storage.
 */
export function clearDailyLogs(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Gets the storage key (for testing purposes).
 */
export function getDailyLogStorageKey(): string {
  return STORAGE_KEY;
}
