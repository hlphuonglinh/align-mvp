import { describe, it, expect } from 'vitest';
import {
  validateBusyBlock,
  normalizeBusyBlock,
  normalizeStoredBusyBlock,
  generateBlockId,
  getBlocksForDate,
  calculateTotalBusyTime,
  formatDuration,
} from './busyBlocks.js';
import type { StoredBusyBlock } from '../types.js';

describe('validateBusyBlock', () => {
  it('should accept a valid BusyBlock', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'manual',
    };
    expect(validateBusyBlock(block)).toEqual({ ok: true });
  });

  it('should accept ISO string dates', () => {
    const block = {
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z',
      allDay: false,
      source: 'manual',
    };
    expect(validateBusyBlock(block)).toEqual({ ok: true });
  });

  it('should reject null input', () => {
    const result = validateBusyBlock(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Block must be an object');
  });

  it('should reject missing start', () => {
    const block = {
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'manual',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Missing start');
  });

  it('should reject missing end', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      allDay: false,
      source: 'manual',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Missing end');
  });

  it('should reject end before start', () => {
    const block = {
      start: new Date('2024-01-15T10:00:00'),
      end: new Date('2024-01-15T09:00:00'),
      allDay: false,
      source: 'manual',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('End must be after start');
  });

  it('should reject end equal to start', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T09:00:00'),
      allDay: false,
      source: 'manual',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('End must be after start');
  });

  it('should reject non-boolean allDay', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: 'yes',
      source: 'manual',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('allDay must be a boolean');
  });

  it('should reject invalid source', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'outlook',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid source (must be manual, google, or microsoft)');
  });

  it('should reject blocks with title field (spec violation)', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'manual',
      title: 'Meeting',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Unexpected field: title');
  });

  it('should reject blocks with description field (spec violation)', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'manual',
      description: 'Important meeting',
    };
    const result = validateBusyBlock(block);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Unexpected field: description');
  });

  it('should accept all valid source types', () => {
    const sources = ['manual', 'google', 'microsoft'] as const;
    for (const source of sources) {
      const block = {
        start: new Date('2024-01-15T09:00:00'),
        end: new Date('2024-01-15T10:00:00'),
        allDay: false,
        source,
      };
      expect(validateBusyBlock(block)).toEqual({ ok: true });
    }
  });

  it('should accept allDay blocks', () => {
    const block = {
      start: new Date('2024-01-15T00:00:00'),
      end: new Date('2024-01-16T00:00:00'),
      allDay: true,
      source: 'manual',
    };
    expect(validateBusyBlock(block)).toEqual({ ok: true });
  });
});

describe('normalizeBusyBlock', () => {
  it('should normalize ISO strings to Date objects', () => {
    const block = {
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z',
      allDay: false,
      source: 'manual',
    };
    const normalized = normalizeBusyBlock(block);
    expect(normalized).not.toBeNull();
    expect(normalized!.start).toBeInstanceOf(Date);
    expect(normalized!.end).toBeInstanceOf(Date);
  });

  it('should return null for invalid blocks', () => {
    const block = {
      start: 'not a date',
      end: '2024-01-15T10:00:00Z',
      allDay: false,
      source: 'manual',
    };
    expect(normalizeBusyBlock(block)).toBeNull();
  });

  it('should preserve all fields correctly', () => {
    const block = {
      start: new Date('2024-01-15T09:00:00Z'),
      end: new Date('2024-01-15T10:00:00Z'),
      allDay: true,
      source: 'google' as const,
    };
    const normalized = normalizeBusyBlock(block);
    expect(normalized!.allDay).toBe(true);
    expect(normalized!.source).toBe('google');
  });
});

describe('normalizeStoredBusyBlock', () => {
  it('should normalize block with id', () => {
    const block = {
      id: 'block_123',
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z',
      allDay: false,
      source: 'manual',
    };
    const normalized = normalizeStoredBusyBlock(block);
    expect(normalized).not.toBeNull();
    expect(normalized!.id).toBe('block_123');
    expect(normalized!.start).toBeInstanceOf(Date);
  });

  it('should return null for missing id', () => {
    const block = {
      start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z',
      allDay: false,
      source: 'manual',
    };
    expect(normalizeStoredBusyBlock(block)).toBeNull();
  });
});

describe('generateBlockId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateBlockId());
    }
    expect(ids.size).toBe(100);
  });

  it('should start with block_ prefix', () => {
    const id = generateBlockId();
    expect(id.startsWith('block_')).toBe(true);
  });
});

describe('getBlocksForDate', () => {
  const blocks: StoredBusyBlock[] = [
    {
      id: '1',
      start: new Date('2024-01-15T09:00:00'),
      end: new Date('2024-01-15T10:00:00'),
      allDay: false,
      source: 'manual',
    },
    {
      id: '2',
      start: new Date('2024-01-15T14:00:00'),
      end: new Date('2024-01-15T15:00:00'),
      allDay: false,
      source: 'manual',
    },
    {
      id: '3',
      start: new Date('2024-01-16T09:00:00'),
      end: new Date('2024-01-16T10:00:00'),
      allDay: false,
      source: 'manual',
    },
  ];

  it('should return blocks for the specified date', () => {
    const result = getBlocksForDate(blocks, new Date('2024-01-15'));
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('should return sorted by start time', () => {
    const unsorted: StoredBusyBlock[] = [
      { id: 'b', start: new Date('2024-01-15T14:00:00'), end: new Date('2024-01-15T15:00:00'), allDay: false, source: 'manual' },
      { id: 'a', start: new Date('2024-01-15T09:00:00'), end: new Date('2024-01-15T10:00:00'), allDay: false, source: 'manual' },
    ];
    const result = getBlocksForDate(unsorted, new Date('2024-01-15'));
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('should return empty array for date with no blocks', () => {
    const result = getBlocksForDate(blocks, new Date('2024-01-20'));
    expect(result).toHaveLength(0);
  });
});

describe('calculateTotalBusyTime', () => {
  it('should calculate total duration in minutes', () => {
    const blocks = [
      { start: new Date('2024-01-15T09:00:00'), end: new Date('2024-01-15T10:00:00'), allDay: false, source: 'manual' as const },
      { start: new Date('2024-01-15T14:00:00'), end: new Date('2024-01-15T15:30:00'), allDay: false, source: 'manual' as const },
    ];
    expect(calculateTotalBusyTime(blocks)).toBe(150); // 60 + 90 minutes
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotalBusyTime([])).toBe(0);
  });
});

describe('formatDuration', () => {
  it('should format hours and minutes', () => {
    expect(formatDuration(210)).toBe('3h 30m');
  });

  it('should format hours only', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('should format minutes only', () => {
    expect(formatDuration(45)).toBe('45m');
  });

  it('should format zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });
});
