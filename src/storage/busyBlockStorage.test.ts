import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadBusyBlocks,
  saveBusyBlocks,
  clearBusyBlocks,
  getStorageKey,
} from './busyBlockStorage.js';
import type { StoredBusyBlock } from '../types.js';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('busyBlockStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getStorageKey', () => {
    it('should return the namespaced key', () => {
      expect(getStorageKey()).toBe('align.v1.busyBlocks');
    });
  });

  describe('loadBusyBlocks', () => {
    it('should return empty array when no data exists', () => {
      const blocks = loadBusyBlocks();
      expect(blocks).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      localStorageMock.setItem('align.v1.busyBlocks', 'not json');
      const blocks = loadBusyBlocks();
      expect(blocks).toEqual([]);
    });

    it('should return empty array for non-array data', () => {
      localStorageMock.setItem('align.v1.busyBlocks', '{"foo": "bar"}');
      const blocks = loadBusyBlocks();
      expect(blocks).toEqual([]);
    });

    it('should load and normalize valid blocks', () => {
      const data = [
        {
          id: 'block_1',
          start: '2024-01-15T09:00:00Z',
          end: '2024-01-15T10:00:00Z',
          allDay: false,
          source: 'manual',
        },
      ];
      localStorageMock.setItem('align.v1.busyBlocks', JSON.stringify(data));

      const blocks = loadBusyBlocks();
      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('block_1');
      expect(blocks[0].start).toBeInstanceOf(Date);
      expect(blocks[0].end).toBeInstanceOf(Date);
    });

    it('should filter out invalid blocks', () => {
      const data = [
        {
          id: 'block_1',
          start: '2024-01-15T09:00:00Z',
          end: '2024-01-15T10:00:00Z',
          allDay: false,
          source: 'manual',
        },
        {
          // Missing id
          start: '2024-01-15T11:00:00Z',
          end: '2024-01-15T12:00:00Z',
          allDay: false,
          source: 'manual',
        },
        {
          id: 'block_2',
          // Invalid: end before start
          start: '2024-01-15T14:00:00Z',
          end: '2024-01-15T13:00:00Z',
          allDay: false,
          source: 'manual',
        },
      ];
      localStorageMock.setItem('align.v1.busyBlocks', JSON.stringify(data));

      const blocks = loadBusyBlocks();
      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('block_1');
    });
  });

  describe('saveBusyBlocks', () => {
    it('should save blocks to localStorage', () => {
      const blocks: StoredBusyBlock[] = [
        {
          id: 'block_1',
          start: new Date('2024-01-15T09:00:00Z'),
          end: new Date('2024-01-15T10:00:00Z'),
          allDay: false,
          source: 'manual',
        },
      ];

      saveBusyBlocks(blocks);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'align.v1.busyBlocks',
        expect.any(String)
      );

      const saved = JSON.parse(localStorageMock.getItem('align.v1.busyBlocks')!);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('block_1');
      expect(typeof saved[0].start).toBe('string'); // ISO string
    });

    it('should save empty array', () => {
      saveBusyBlocks([]);
      const saved = JSON.parse(localStorageMock.getItem('align.v1.busyBlocks')!);
      expect(saved).toEqual([]);
    });
  });

  describe('clearBusyBlocks', () => {
    it('should remove data from localStorage', () => {
      localStorageMock.setItem('align.v1.busyBlocks', '[]');
      clearBusyBlocks();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('align.v1.busyBlocks');
    });
  });

  describe('roundtrip persistence', () => {
    it('should save and load blocks correctly', () => {
      const original: StoredBusyBlock[] = [
        {
          id: 'block_1',
          start: new Date('2024-01-15T09:00:00Z'),
          end: new Date('2024-01-15T10:00:00Z'),
          allDay: false,
          source: 'manual',
        },
        {
          id: 'block_2',
          start: new Date('2024-01-15T14:00:00Z'),
          end: new Date('2024-01-15T15:30:00Z'),
          allDay: true,
          source: 'google',
        },
      ];

      saveBusyBlocks(original);
      const loaded = loadBusyBlocks();

      expect(loaded).toHaveLength(2);

      expect(loaded[0].id).toBe('block_1');
      expect(loaded[0].start.toISOString()).toBe('2024-01-15T09:00:00.000Z');
      expect(loaded[0].end.toISOString()).toBe('2024-01-15T10:00:00.000Z');
      expect(loaded[0].allDay).toBe(false);
      expect(loaded[0].source).toBe('manual');

      expect(loaded[1].id).toBe('block_2');
      expect(loaded[1].start.toISOString()).toBe('2024-01-15T14:00:00.000Z');
      expect(loaded[1].end.toISOString()).toBe('2024-01-15T15:30:00.000Z');
      expect(loaded[1].allDay).toBe(true);
      expect(loaded[1].source).toBe('google');
    });

    it('should handle multiple save/load cycles', () => {
      const blocks: StoredBusyBlock[] = [
        {
          id: 'block_1',
          start: new Date('2024-01-15T09:00:00Z'),
          end: new Date('2024-01-15T10:00:00Z'),
          allDay: false,
          source: 'manual',
        },
      ];

      // First cycle
      saveBusyBlocks(blocks);
      let loaded = loadBusyBlocks();
      expect(loaded).toHaveLength(1);

      // Add a block
      loaded.push({
        id: 'block_2',
        start: new Date('2024-01-15T11:00:00Z'),
        end: new Date('2024-01-15T12:00:00Z'),
        allDay: false,
        source: 'manual',
      });

      // Second cycle
      saveBusyBlocks(loaded);
      loaded = loadBusyBlocks();
      expect(loaded).toHaveLength(2);

      // Remove a block
      loaded = loaded.filter(b => b.id !== 'block_1');

      // Third cycle
      saveBusyBlocks(loaded);
      loaded = loadBusyBlocks();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('block_2');
    });
  });
});
