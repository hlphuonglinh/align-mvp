import type { StoredBusyBlock } from '../types.js';
import { normalizeStoredBusyBlock } from '../calendar/busyBlocks.js';

const STORAGE_KEY = 'align.v1.busyBlocks';

/**
 * Loads BusyBlocks from localStorage.
 * Returns an empty array if no data exists or data is invalid.
 */
export function loadBusyBlocks(): StoredBusyBlock[] {
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

    // Normalize each block, filtering out invalid ones
    const blocks: StoredBusyBlock[] = [];
    for (const item of parsed) {
      const normalized = normalizeStoredBusyBlock(item);
      if (normalized) {
        blocks.push(normalized);
      }
    }

    return blocks;
  } catch {
    return [];
  }
}

/**
 * Saves BusyBlocks to localStorage.
 * Serializes dates as ISO strings for JSON storage.
 */
export function saveBusyBlocks(blocks: StoredBusyBlock[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const serializable = blocks.map(block => ({
    id: block.id,
    start: block.start instanceof Date ? block.start.toISOString() : block.start,
    end: block.end instanceof Date ? block.end.toISOString() : block.end,
    allDay: block.allDay,
    source: block.source,
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

/**
 * Clears all BusyBlocks from storage.
 */
export function clearBusyBlocks(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Gets the storage key (for testing purposes).
 */
export function getStorageKey(): string {
  return STORAGE_KEY;
}
