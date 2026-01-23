import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDailyLogs,
  saveDailyLogs,
  getLogForDay,
  upsertDailyLog,
  clearDailyLogs,
  getDailyLogStorageKey,
} from './dailyLogStorage.js';
import type { DailyLog } from '../types.js';

describe('dailyLogStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadDailyLogs', () => {
    it('should return empty array when no data exists', () => {
      const logs = loadDailyLogs();
      expect(logs).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      localStorage.setItem(getDailyLogStorageKey(), 'not-json');
      const logs = loadDailyLogs();
      expect(logs).toEqual([]);
    });

    it('should return empty array for non-array data', () => {
      localStorage.setItem(getDailyLogStorageKey(), JSON.stringify({ foo: 'bar' }));
      const logs = loadDailyLogs();
      expect(logs).toEqual([]);
    });

    it('should filter out invalid logs', () => {
      const data = [
        { dayISO: '2024-01-15', rating: 3, createdAtISO: '2024-01-15T12:00:00Z' },
        { dayISO: 'invalid' }, // missing rating
        { dayISO: '2024-01-16', rating: 4, createdAtISO: '2024-01-16T12:00:00Z' },
      ];
      localStorage.setItem(getDailyLogStorageKey(), JSON.stringify(data));
      const logs = loadDailyLogs();
      expect(logs).toHaveLength(2);
    });

    it('should reject logs with rating out of range', () => {
      const data = [
        { dayISO: '2024-01-15', rating: -1, createdAtISO: '2024-01-15T12:00:00Z' },
        { dayISO: '2024-01-16', rating: 6, createdAtISO: '2024-01-16T12:00:00Z' },
        { dayISO: '2024-01-17', rating: 3, createdAtISO: '2024-01-17T12:00:00Z' },
      ];
      localStorage.setItem(getDailyLogStorageKey(), JSON.stringify(data));
      const logs = loadDailyLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].dayISO).toBe('2024-01-17');
    });
  });

  describe('saveDailyLogs', () => {
    it('should save logs to localStorage', () => {
      const logs: DailyLog[] = [
        { dayISO: '2024-01-15', rating: 4, createdAtISO: '2024-01-15T12:00:00Z' },
      ];
      saveDailyLogs(logs);

      const raw = localStorage.getItem(getDailyLogStorageKey());
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].dayISO).toBe('2024-01-15');
    });
  });

  describe('getLogForDay', () => {
    it('should return null when no log exists for day', () => {
      const logs: DailyLog[] = [
        { dayISO: '2024-01-15', rating: 4, createdAtISO: '2024-01-15T12:00:00Z' },
      ];
      const result = getLogForDay(logs, '2024-01-16');
      expect(result).toBeNull();
    });

    it('should return the log when it exists', () => {
      const logs: DailyLog[] = [
        { dayISO: '2024-01-15', rating: 4, createdAtISO: '2024-01-15T12:00:00Z' },
        { dayISO: '2024-01-16', rating: 3, note: 'Good day', createdAtISO: '2024-01-16T12:00:00Z' },
      ];
      const result = getLogForDay(logs, '2024-01-16');
      expect(result).not.toBeNull();
      expect(result!.rating).toBe(3);
      expect(result!.note).toBe('Good day');
    });
  });

  describe('upsertDailyLog', () => {
    it('should create a new log when none exists', () => {
      const logs: DailyLog[] = [];
      const updated = upsertDailyLog(logs, '2024-01-15', 4, 'Test note');

      expect(updated).toHaveLength(1);
      expect(updated[0].dayISO).toBe('2024-01-15');
      expect(updated[0].rating).toBe(4);
      expect(updated[0].note).toBe('Test note');
      expect(updated[0].createdAtISO).toBeDefined();
    });

    it('should update existing log', () => {
      const logs: DailyLog[] = [
        { dayISO: '2024-01-15', rating: 3, createdAtISO: '2024-01-15T12:00:00Z' },
      ];
      const updated = upsertDailyLog(logs, '2024-01-15', 5, 'Updated');

      expect(updated).toHaveLength(1);
      expect(updated[0].rating).toBe(5);
      expect(updated[0].note).toBe('Updated');
    });

    it('should clamp rating to 0-5 range', () => {
      const logs: DailyLog[] = [];

      const updated1 = upsertDailyLog(logs, '2024-01-15', -2);
      expect(updated1[0].rating).toBe(0);

      const updated2 = upsertDailyLog(logs, '2024-01-16', 10);
      expect(updated2[0].rating).toBe(5);
    });

    it('should round rating to integer', () => {
      const logs: DailyLog[] = [];
      const updated = upsertDailyLog(logs, '2024-01-15', 3.7);
      expect(updated[0].rating).toBe(4);
    });

    it('should handle empty note as undefined', () => {
      const logs: DailyLog[] = [];
      const updated = upsertDailyLog(logs, '2024-01-15', 3, '   ');
      expect(updated[0].note).toBeUndefined();
    });

    it('should trim note whitespace', () => {
      const logs: DailyLog[] = [];
      const updated = upsertDailyLog(logs, '2024-01-15', 3, '  Hello  ');
      expect(updated[0].note).toBe('Hello');
    });
  });

  describe('clearDailyLogs', () => {
    it('should remove all logs from storage', () => {
      const logs: DailyLog[] = [
        { dayISO: '2024-01-15', rating: 4, createdAtISO: '2024-01-15T12:00:00Z' },
      ];
      saveDailyLogs(logs);
      expect(loadDailyLogs()).toHaveLength(1);

      clearDailyLogs();
      expect(loadDailyLogs()).toHaveLength(0);
    });
  });
});
