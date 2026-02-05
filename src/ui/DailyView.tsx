import { useState, useEffect } from 'react';
import type { ChronotypeProfile, DailyLog, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { loadChronotypeProfile, loadConstraints, loadDailyLogs, saveDailyLogs, saveConstraints, getLogForDay, upsertDailyLog } from '../storage/index.js';
import { generateBaselineWindows } from '../baseline/index.js';
import { evaluateDay } from '../governor/index.js';
import { constraintsToBusyBlocks, getConstraintsForDay, isFixedBlockPayload } from '../constraints/index.js';
import { computeModeWindows, extractUnavailableTimes } from '../utils/computeModeWindows.js';
import { ModeRingSimplified } from './ModeRingSimplified.js';
import { ModeLegend } from './ModeLegend.js';
import { GovernorDisplay } from './GovernorDisplay.js';
import { UnavailableTimeModal } from './UnavailableTimeModal.js';
import { DevTools } from './DevTools.js';
import type { Mode } from '../types/modeStates.js';
import { colors, glass, radius, spacing, typography, transitions } from './tokens.js';

// Storage keys for user name
const STORAGE_KEY_USER_NAME = 'align_user_name';

export function DailyView() {
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [constraints, setConstraints] = useState<V1Constraint[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [checkInRating, setCheckInRating] = useState<number | null>(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [userName, setUserName] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'pending'>('idle');
  const [hoveredMode, setHoveredMode] = useState<BaselineMode | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);

  useEffect(() => {
    setProfile(loadChronotypeProfile());
    setConstraints(loadConstraints());
    setDailyLogs(loadDailyLogs());
    // Load saved user name
    const savedName = localStorage.getItem(STORAGE_KEY_USER_NAME);
    if (savedName) setUserName(savedName);
  }, []);

  // Reload data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
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

  // Update current time every 60 seconds for the clock
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveCheckIn = async () => {
    if (checkInRating === null) return;

    // Save name if provided
    if (userName.trim()) {
      localStorage.setItem(STORAGE_KEY_USER_NAME, userName.trim());
    }

    // Save locally first
    const updatedLogs = upsertDailyLog(dailyLogs, selectedDate, checkInRating, checkInNote);
    saveDailyLogs(updatedLogs);
    setDailyLogs(updatedLogs);

    // Try to sync to server
    setSyncStatus('syncing');
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName.trim() || 'Anonymous',
          dayISO: selectedDate,
          checkInTime: new Date().toLocaleTimeString(),
          rating: checkInRating,
          note: checkInNote || undefined,
          chronotype: profile?.chronotype || null,
          confidence: profile?.confidence || null,
        }),
      });

      if (response.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('pending');
      }
    } catch {
      // Network error - mark as pending
      setSyncStatus('pending');
    }
  };

  // Handler for editing unavailable times
  const handleEditUnavailable = (constraintId: string) => {
    setEditingConstraintId(constraintId);
  };

  // Handler for saving unavailable time changes
  const handleSaveConstraint = (constraintId: string, startLocal: string, endLocal: string) => {
    const updatedConstraints = constraints.map((c) => {
      if (c.id === constraintId && isFixedBlockPayload(c.payload)) {
        return {
          ...c,
          payload: {
            ...c.payload,
            startLocal,
            endLocal,
            allDay: false,
          },
        };
      }
      return c;
    });
    saveConstraints(updatedConstraints);
    setConstraints(updatedConstraints);
  };

  // Handler for deleting unavailable time
  const handleDeleteConstraint = (constraintId: string) => {
    const updatedConstraints = constraints.filter((c) => c.id !== constraintId);
    saveConstraints(updatedConstraints);
    setConstraints(updatedConstraints);
  };

  // Handlers for DevTools
  const handleProfileChange = () => {
    setProfile(loadChronotypeProfile());
  };

  const handleConstraintsChange = () => {
    setConstraints(loadConstraints());
  };

  // Get the constraint being edited
  const editingConstraint = editingConstraintId
    ? constraints.find((c) => c.id === editingConstraintId) || null
    : null;

  const constraintsForDay = getConstraintsForDay(constraints, selectedDate);
  const unavailableBlocks = constraintsToBusyBlocks(constraints, selectedDate);
  const baselineWindows = generateBaselineWindows(profile, selectedDate);

  // Evaluate governance decisions
  const governorDecisions = evaluateDay({
    profile,
    busyBlocks: unavailableBlocks,
    baselineWindows,
    dayISODate: selectedDate,
  });

  // Extract unavailable times and compute mode windows with fragmentation analysis
  const unavailableTimes = extractUnavailableTimes(
    constraints.map(c => ({
      id: c.id,
      kind: c.kind,
      payload: c.payload as { dateISO?: string; allDay?: boolean; startLocal?: string; endLocal?: string },
    })),
    selectedDate
  );
  const modeWindows = computeModeWindows(governorDecisions, unavailableTimes);

  // Check if ALL modes are silent (for global banner)
  const allModesSilent = governorDecisions.every(d => d.decision === 'SILENCE');

  // Format today's date
  const dateDisplay = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Header */}
      <h1 style={{
        ...typography.h1,
        marginBottom: spacing.xs,
      }}>
        Today
      </h1>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.tertiary,
        marginBottom: spacing.sm,
      }}>
        {dateDisplay}
      </p>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.muted,
        marginBottom: spacing.xl,
      }}>
        Structural reliability by mode of thinking.
      </p>

      {/* Global silence banner */}
      {allModesSilent && (
        <div style={{
          padding: spacing.lg,
          marginBottom: spacing.xl,
          background: colors.bg.subtle,
          borderRadius: radius.md,
          ...typography.bodySmall,
          color: colors.text.tertiary,
        }}>
          Align is quiet because conditions are not reliable right now.
        </div>
      )}

      {/* Date selector */}
      <div style={{
        marginBottom: spacing.xl,
        ...glass.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ ...typography.bodySmall, color: colors.text.secondary }}>Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: `1px solid ${colors.border.light}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              ...typography.bodySmall,
              background: colors.bg.elevated,
              color: colors.text.primary,
            }}
          />
        </label>
      </div>

      {/* Two-column layout: Visualization + Governor */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)',
        gap: spacing.xl,
        marginBottom: spacing.xl,
      }}>
        {/* Left column: Ring + Legend + Check-in */}
        <div>
          {/* Simplified 24h Ring Visualization */}
          <ModeRingSimplified
            modeWindows={modeWindows}
            hoveredMode={hoveredMode}
            onModeHover={setHoveredMode}
            onHourClick={(_hour, mode) => {
              if (mode) {
                // Scroll to mode card (handled by hover for now)
                setHoveredMode(mode);
              }
            }}
          />

          {/* Interactive Legend */}
          <ModeLegend
            modeWindows={modeWindows}
            hoveredMode={hoveredMode}
            onModeHover={setHoveredMode}
            onModeClick={(mode: Mode) => {
              // Scroll to Governor card for this mode
              const element = document.querySelector(`[data-testid="mode-state-${mode.toLowerCase()}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            baselineWindows={baselineWindows}
          />

          {/* Daily Check-in Section */}
          <h2 style={{
            ...typography.h2,
            marginBottom: spacing.sm,
          }}>
            Daily Check-in
          </h2>
          <div style={{
            padding: spacing.lg,
            ...glass.card,
            borderRadius: radius.lg,
          }}>
            {/* Name field - only show if not saved */}
            {!localStorage.getItem(STORAGE_KEY_USER_NAME) && (
              <div style={{ marginBottom: spacing.md }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{ ...typography.bodySmall, color: colors.text.secondary }}>Name (for this test)</span>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      flex: 1,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: radius.sm,
                      padding: `${spacing.sm} ${spacing.md}`,
                      ...typography.bodySmall,
                      background: colors.bg.elevated,
                      color: colors.text.primary,
                    }}
                  />
                </label>
              </div>
            )}
            <div style={{ marginBottom: spacing.md }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ ...typography.bodySmall, color: colors.text.secondary }}>Rating (0-5)</span>
                <select
                  value={checkInRating ?? ''}
                  onChange={(e) => setCheckInRating(e.target.value === '' ? null : Number(e.target.value))}
                  style={{
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: radius.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                    ...typography.bodySmall,
                    background: colors.bg.elevated,
                    color: colors.text.primary,
                  }}
                >
                  <option value="">--</option>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginBottom: spacing.md }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ ...typography.bodySmall, color: colors.text.secondary }}>Note (optional)</span>
                <input
                  type="text"
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  style={{
                    flex: 1,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: radius.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                    ...typography.bodySmall,
                    background: colors.bg.elevated,
                    color: colors.text.primary,
                  }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
              <button
                onClick={handleSaveCheckIn}
                disabled={checkInRating === null}
                style={{
                  ...typography.bodySmall,
                  background: checkInRating !== null
                    ? colors.text.primary
                    : colors.bg.hover,
                  color: checkInRating !== null ? colors.bg.page : colors.text.muted,
                  border: 'none',
                  borderRadius: radius.sm,
                  padding: `${spacing.sm} ${spacing.lg}`,
                  fontWeight: 500,
                  cursor: checkInRating !== null ? 'pointer' : 'not-allowed',
                  transition: `opacity ${transitions.normal}`,
                }}
              >
                Save Check-in
              </button>
              {getLogForDay(dailyLogs, selectedDate) && (
                <span style={{ ...typography.label, color: colors.status.permit.dot }}>
                  {syncStatus === 'syncing' ? 'Syncing...' :
                   syncStatus === 'pending' ? 'Saved locally. Sync pending.' :
                   syncStatus === 'synced' ? 'Synced' : 'Saved'}
                </span>
              )}
            </div>
            <p style={{
              ...typography.caption,
              color: colors.text.muted,
              margin: 0,
            }}>
              During this test, check-ins are sent to the study log.
            </p>
          </div>
        </div>

        {/* Right column: Governor Display */}
        <div>
          <GovernorDisplay
            decisions={governorDecisions}
            constraints={constraints}
            selectedDate={selectedDate}
            hoveredMode={hoveredMode}
            onModeHover={setHoveredMode}
            onEditConflict={handleEditUnavailable}
            baselineWindows={baselineWindows}
          />
        </div>
      </div>

      {/* Unavailable Times Section */}
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.sm,
      }}>
        Unavailable times
      </h2>
      {constraintsForDay.length === 0 ? (
        <p style={{
          ...typography.bodySmall,
          color: colors.text.muted,
          marginBottom: spacing.xl,
        }}>
          No unavailable times for this day.
        </p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          marginBottom: spacing.xl,
        }}>
          {constraintsForDay.map((constraint) => {
            let description = '';
            let constraintStart = '';
            let constraintEnd = '';
            if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
              if (constraint.payload.allDay) {
                description = 'All day';
                constraintStart = '00:00';
                constraintEnd = '24:00';
              } else {
                description = `${constraint.payload.startLocal} - ${constraint.payload.endLocal}`;
                constraintStart = constraint.payload.startLocal || '';
                constraintEnd = constraint.payload.endLocal || '';
              }
            }

            // Helper to check if two time windows overlap
            const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
              if (!aStart || !aEnd || !bStart || !bEnd) return false;
              const toMin = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
              };
              return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd);
            };

            // Helper to convert ISO to HH:mm
            const isoToHHMM = (iso: string): string => {
              const date = new Date(iso);
              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            };

            // Find which modes this unavailable time affects
            // Check both modeWindows conflicts AND baseline window overlap
            const affectedModeSet = new Set<string>();

            // 1. Check modeWindows conflicts (existing logic)
            modeWindows
              .filter(mw => mw.fragmentation.conflicts.some(c => c.id === constraint.id))
              .forEach(mw => affectedModeSet.add(mw.mode));

            // 2. Also check baselineWindows for modes that might be SILENCE/WITHHELD
            baselineWindows.forEach(bw => {
              const bwStart = isoToHHMM(bw.start);
              const bwEnd = isoToHHMM(bw.end);
              if (timesOverlap(constraintStart, constraintEnd, bwStart, bwEnd)) {
                affectedModeSet.add(bw.mode);
              }
            });

            const affectedModes = Array.from(affectedModeSet);

            return (
              <div
                key={constraint.id}
                onClick={() => handleEditUnavailable(constraint.id)}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  background: affectedModes.length > 0 ? 'rgba(251, 191, 36, 0.05)' : colors.bg.subtle,
                  border: `1px solid ${affectedModes.length > 0 ? '#fbbf24' : colors.border.subtle}`,
                  borderRadius: radius.md,
                  ...typography.bodySmall,
                  color: colors.text.secondary,
                  cursor: 'pointer',
                  transition: `background ${transitions.normal}, border-color ${transitions.normal}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}>{description}</span>
                  {affectedModes.length > 0 && (
                    <span style={{
                      ...typography.label,
                      color: '#d97706',
                      fontWeight: 500,
                    }}>
                      Affects: {affectedModes.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Edit Modal for Unavailable Times */}
      <UnavailableTimeModal
        constraint={editingConstraint}
        isOpen={editingConstraintId !== null}
        onClose={() => setEditingConstraintId(null)}
        onSave={handleSaveConstraint}
        onDelete={handleDeleteConstraint}
      />

      {/* DevTools (development only) */}
      <DevTools
        currentProfile={profile}
        currentConstraints={constraints}
        selectedDate={selectedDate}
        onProfileChange={handleProfileChange}
        onConstraintsChange={handleConstraintsChange}
      />
    </div>
  );
}
