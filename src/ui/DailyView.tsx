import { useState, useEffect } from 'react';
import type { StoredBusyBlock, ChronotypeProfile } from '../types.js';
import { loadBusyBlocks, loadChronotypeProfile } from '../storage/index.js';
import {
  getBlocksForDate,
  calculateTotalBusyTime,
  formatDuration,
} from '../calendar/busyBlocks.js';
import { generateBaselineWindows } from '../baseline/index.js';

export function DailyView() {
  const [blocks, setBlocks] = useState<StoredBusyBlock[]>([]);
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    setBlocks(loadBusyBlocks());
    setProfile(loadChronotypeProfile());
  }, []);

  // Reload data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      setBlocks(loadBusyBlocks());
      setProfile(loadChronotypeProfile());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const blocksForSelectedDate = getBlocksForDate(blocks, new Date(selectedDate));
  const totalBusyMinutes = calculateTotalBusyTime(blocksForSelectedDate);
  const baselineWindows = generateBaselineWindows(profile, selectedDate);

  // Determine silence state
  const isSilenceState = !profile || profile.confidence === 'LOW';

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

      {/* Baseline Windows Section */}
      <h2>Baseline Windows</h2>
      {isSilenceState ? (
        <p style={{ color: '#666' }}>
          {!profile
            ? 'No chronotype profile. Take the quiz to see baseline windows.'
            : 'Low confidence profile. Baseline windows silenced.'}
        </p>
      ) : baselineWindows.length === 0 ? (
        <p>No baseline windows for this profile.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {baselineWindows.map((window, index) => {
            const start = new Date(window.start);
            const end = new Date(window.end);
            const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
            const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

            return (
              <li
                key={`${window.mode}-${index}`}
                style={{
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #9cf',
                  backgroundColor: '#f0f8ff',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{startStr} - {endStr}</span>
                <span>
                  {window.mode} ({window.reliability})
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Busy Blocks Section */}
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
