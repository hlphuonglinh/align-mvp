import { useState, useEffect } from 'react';
import type { StoredBusyBlock } from '../types.js';
import { loadBusyBlocks, saveBusyBlocks } from '../storage/busyBlockStorage.js';
import {
  generateBlockId,
  getBlocksForDate,
  validateBusyBlock,
} from '../calendar/busyBlocks.js';

export function TimeStructure() {
  const [blocks, setBlocks] = useState<StoredBusyBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [editingBlock, setEditingBlock] = useState<StoredBusyBlock | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formAllDay, setFormAllDay] = useState(false);

  useEffect(() => {
    setBlocks(loadBusyBlocks());
  }, []);

  const blocksForSelectedDate = getBlocksForDate(blocks, new Date(selectedDate));

  const resetForm = () => {
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormAllDay(false);
    setEditingBlock(null);
    setError(null);
  };

  const handleEdit = (block: StoredBusyBlock) => {
    setEditingBlock(block);
    const startDate = new Date(block.start);
    const endDate = new Date(block.end);
    setFormStartTime(
      `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`
    );
    setFormEndTime(
      `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    );
    setFormAllDay(block.allDay);
    setError(null);
  };

  const handleDelete = (blockId: string) => {
    const updated = blocks.filter((b) => b.id !== blockId);
    setBlocks(updated);
    saveBusyBlocks(updated);
    if (editingBlock?.id === blockId) {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const [startHour, startMin] = formStartTime.split(':').map(Number);
    const [endHour, endMin] = formEndTime.split(':').map(Number);

    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    if (formAllDay) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(startHour, startMin, 0, 0);
      endDate.setHours(endHour, endMin, 0, 0);
    }

    const newBlock = {
      id: editingBlock?.id ?? generateBlockId(),
      start: startDate,
      end: endDate,
      allDay: formAllDay,
      source: 'manual' as const,
    };

    const validation = validateBusyBlock(newBlock);
    if (!validation.ok) {
      setError(validation.error ?? 'Invalid block');
      return;
    }

    let updated: StoredBusyBlock[];
    if (editingBlock) {
      updated = blocks.map((b) => (b.id === editingBlock.id ? newBlock : b));
    } else {
      updated = [...blocks, newBlock];
    }

    setBlocks(updated);
    saveBusyBlocks(updated);
    resetForm();
  };

  return (
    <div>
      <h1>Time Structure</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Date:{' '}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              resetForm();
            }}
          />
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
        <h2>{editingBlock ? 'Edit Busy Block' : 'Add Busy Block'}</h2>

        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            <input
              type="checkbox"
              checked={formAllDay}
              onChange={(e) => setFormAllDay(e.target.checked)}
            />{' '}
            All day
          </label>
        </div>

        {!formAllDay && (
          <>
            <div style={{ marginBottom: '0.5rem' }}>
              <label>
                Start time:{' '}
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </label>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label>
                End time:{' '}
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </label>
            </div>
          </>
        )}

        {error && (
          <div style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</div>
        )}

        <div>
          <button type="submit">
            {editingBlock ? 'Update' : 'Add'}
          </button>
          {editingBlock && (
            <button
              type="button"
              onClick={resetForm}
              style={{ marginLeft: '0.5rem' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2>Busy Blocks for {selectedDate}</h2>
      {blocksForSelectedDate.length === 0 ? (
        <p>No busy blocks for this day.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {blocksForSelectedDate.map((block) => {
            const start = new Date(block.start);
            const end = new Date(block.end);
            const timeStr = block.allDay
              ? 'All day'
              : `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

            return (
              <li
                key={block.id}
                style={{
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #ccc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  Busy block: {timeStr}
                </span>
                <span>
                  <button onClick={() => handleEdit(block)}>Edit</button>
                  <button
                    onClick={() => handleDelete(block.id)}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
