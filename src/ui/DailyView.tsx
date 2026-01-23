import { useState, useEffect } from 'react';
import type { StoredBusyBlock, ChronotypeProfile, ModeGovernanceDecision, BusyBlock, DailyLog, ExportData, BaselineWindow } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { loadBusyBlocks, loadChronotypeProfile, loadConstraints, loadDailyLogs, saveDailyLogs, getLogForDay, upsertDailyLog } from '../storage/index.js';
import {
  getBlocksForDate,
  calculateTotalBusyTime,
  formatDuration,
} from '../calendar/busyBlocks.js';
import { generateBaselineWindows } from '../baseline/index.js';
import { evaluateDay } from '../governor/index.js';
import { constraintsToBusyBlocks, getConstraintsForDay, isFixedHoursPayload, isFixedBlockPayload } from '../constraints/index.js';

export function DailyView() {
  const [blocks, setBlocks] = useState<StoredBusyBlock[]>([]);
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [constraints, setConstraints] = useState<V1Constraint[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [checkInRating, setCheckInRating] = useState<number | null>(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    setBlocks(loadBusyBlocks());
    setProfile(loadChronotypeProfile());
    setConstraints(loadConstraints());
    setDailyLogs(loadDailyLogs());
  }, []);

  // Reload data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      setBlocks(loadBusyBlocks());
      setProfile(loadChronotypeProfile());
      setConstraints(loadConstraints());
      setDailyLogs(loadDailyLogs());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Load check-in data when date changes
  useEffect(() => {
    const existingLog = getLogForDay(dailyLogs, selectedDate);
    if (existingLog) {
      setCheckInRating(existingLog.rating);
      setCheckInNote(existingLog.note || '');
    } else {
      setCheckInRating(null);
      setCheckInNote('');
    }
  }, [selectedDate, dailyLogs]);

  const handleSaveCheckIn = () => {
    if (checkInRating === null) return;
    const updatedLogs = upsertDailyLog(dailyLogs, selectedDate, checkInRating, checkInNote);
    saveDailyLogs(updatedLogs);
    setDailyLogs(updatedLogs);
  };

  const handleExport = () => {
    // Generate data for last 7 days
    const today = new Date();
    const baselineWindowsByDay: Record<string, BaselineWindow[]> = {};
    const governorDecisionsByDay: Record<string, ModeGovernanceDecision[]> = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayISO = date.toISOString().split('T')[0];

      const dayBaselineWindows = generateBaselineWindows(profile, dayISO);
      baselineWindowsByDay[dayISO] = dayBaselineWindows;

      const dayConstraintBlocks = constraintsToBusyBlocks(constraints, dayISO);
      const dayBusyBlocks = getBlocksForDate(blocks, date);
      const allDayBlocks: BusyBlock[] = [...dayBusyBlocks, ...dayConstraintBlocks];

      const dayDecisions = evaluateDay({
        profile,
        busyBlocks: allDayBlocks,
        baselineWindows: dayBaselineWindows,
        dayISODate: dayISO,
      });
      governorDecisionsByDay[dayISO] = dayDecisions;
    }

    const exportData: ExportData = {
      exportedAtISO: new Date().toISOString(),
      chronotypeProfile: profile,
      busyBlocks: blocks,
      constraints: constraints,
      baselineWindows: baselineWindowsByDay,
      governorDecisions: governorDecisionsByDay,
      dailyLogs: dailyLogs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `align-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const blocksForSelectedDate = getBlocksForDate(blocks, new Date(selectedDate));
  const constraintsForDay = getConstraintsForDay(constraints, selectedDate);
  const constraintDerivedBlocks = constraintsToBusyBlocks(constraints, selectedDate);

  // Combine manual BusyBlocks with constraint-derived blocks for Governor
  const allBusyBlocks: BusyBlock[] = [
    ...blocksForSelectedDate,
    ...constraintDerivedBlocks,
  ];

  const totalBusyMinutes = calculateTotalBusyTime(allBusyBlocks);
  const baselineWindows = generateBaselineWindows(profile, selectedDate);

  // Evaluate governance decisions with all busy blocks
  const governorDecisions = evaluateDay({
    profile,
    busyBlocks: allBusyBlocks,
    baselineWindows,
    dayISODate: selectedDate,
  });

  // Determine silence state
  const isSilenceState = !profile || profile.confidence === 'LOW';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

      {/* Daily Check-in Section */}
      <h2>Daily Check-in</h2>
      <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd', backgroundColor: '#fafafa' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Rating (0-5):{' '}
            <select
              value={checkInRating ?? ''}
              onChange={(e) => setCheckInRating(e.target.value === '' ? null : Number(e.target.value))}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="">--</option>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label>
            Note (optional):{' '}
            <input
              type="text"
              value={checkInNote}
              onChange={(e) => setCheckInNote(e.target.value)}
              style={{ width: '200px', marginLeft: '0.5rem' }}
            />
          </label>
        </div>
        <button onClick={handleSaveCheckIn} disabled={checkInRating === null}>
          Save Check-in
        </button>
        {getLogForDay(dailyLogs, selectedDate) && (
          <span style={{ marginLeft: '1rem', color: '#666', fontSize: '0.875rem' }}>
            (Saved)
          </span>
        )}
      </div>

      {/* Governor Section */}
      <h2>Governor</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {governorDecisions.map((decision) => (
          <GovernorDecisionItem key={decision.mode} decision={decision} />
        ))}
      </ul>

      {/* Constraints Section */}
      <h2>Constraints</h2>
      {constraintsForDay.length === 0 ? (
        <p style={{ color: '#666' }}>No constraints for this day.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {constraintsForDay.map((constraint) => {
            let description = '';
            if (constraint.kind === 'FIXED_HOURS' && isFixedHoursPayload(constraint.payload)) {
              const days = constraint.payload.daysOfWeek.map(d => dayNames[d]).join(', ');
              description = `Fixed Hours: ${days} ${constraint.payload.startLocal}-${constraint.payload.endLocal}`;
            } else if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
              description = `Fixed Block: ${constraint.payload.startLocal}-${constraint.payload.endLocal}`;
            }

            return (
              <li
                key={constraint.id}
                style={{
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #c9c',
                  backgroundColor: '#fcf0fc',
                }}
              >
                {description}
              </li>
            );
          })}
        </ul>
      )}

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

      {/* Export Section */}
      <h2>Export</h2>
      <button onClick={handleExport} style={{ padding: '0.5rem 1rem' }}>
        Export test data
      </button>
      <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
        Downloads JSON with chronotype profile, busy blocks, constraints, baseline windows (7 days), governor decisions (7 days), and daily logs.
      </p>
    </div>
  );
}

function GovernorDecisionItem({ decision }: { decision: ModeGovernanceDecision }) {
  const borderColor =
    decision.decision === 'PERMIT'
      ? '#4a4'
      : decision.decision === 'WARN'
      ? '#ca4'
      : '#999';

  const bgColor =
    decision.decision === 'PERMIT'
      ? '#f0fff0'
      : decision.decision === 'WARN'
      ? '#fffef0'
      : '#f5f5f5';

  let windowStr = '';
  if (decision.window) {
    const start = new Date(decision.window.start);
    const end = new Date(decision.window.end);
    const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
    const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    windowStr = `${startStr} - ${endStr}`;
  }

  return (
    <li
      style={{
        padding: '0.5rem',
        marginBottom: '0.5rem',
        border: `1px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <strong>{decision.mode}</strong>
        <span>{decision.decision}</span>
      </div>
      <div style={{ fontSize: '0.875rem', color: '#666' }}>
        {decision.reason}
        {windowStr && <span style={{ marginLeft: '0.5rem' }}>({windowStr})</span>}
      </div>
    </li>
  );
}
