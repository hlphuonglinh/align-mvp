import { useState, useEffect } from 'react';
import type { StoredBusyBlock } from '../types.js';
import { loadBusyBlocks } from '../storage/busyBlockStorage.js';
import {
  getBlocksForDate,
  calculateTotalBusyTime,
  formatDuration,
} from '../calendar/busyBlocks.js';

export function DailyView() {
  const [blocks, setBlocks] = useState<StoredBusyBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    setBlocks(loadBusyBlocks());
  }, []);

  // Reload blocks when returning to this page (in case they were edited)
  useEffect(() => {
    const handleFocus = () => setBlocks(loadBusyBlocks());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const blocksForSelectedDate = getBlocksForDate(blocks, new Date(selectedDate));
  const totalBusyMinutes = calculateTotalBusyTime(blocksForSelectedDate);

  return (
    <div>
      <h1>Daily Structure</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Date:{' '}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Total busy time: {formatDuration(totalBusyMinutes)}</strong>
      </div>

      <h2>Busy Blocks</h2>
      {blocksForSelectedDate.length === 0 ? (
        <p>No busy blocks for this day.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {blocksForSelectedDate.map((block) => {
            const start = new Date(block.start);
            const end = new Date(block.end);
            const durationMinutes = Math.floor(
              (end.getTime() - start.getTime()) / (1000 * 60)
            );

            let timeStr: string;
            if (block.allDay) {
              timeStr = 'All day';
            } else {
              const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
              const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
              timeStr = `${startStr} - ${endStr}`;
            }

            return (
              <li
                key={block.id}
                style={{
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #ccc',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{timeStr}</span>
                <span style={{ color: '#666' }}>
                  {formatDuration(durationMinutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
