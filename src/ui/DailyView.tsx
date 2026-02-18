import { useState, useEffect } from 'react';
import type { ChronotypeProfile, DailyLog, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { loadChronotypeProfile, loadConstraints, loadDailyLogs, saveDailyLogs, saveConstraints, getLogForDay, upsertDailyLog } from '../storage/index.js';
import { generateBaselineWindows, getPostLunchDip } from '../baseline/index.js';
import { evaluateDay } from '../governor/index.js';
import { constraintsToBusyBlocks, getConstraintsForDay, isFixedBlockPayload } from '../constraints/index.js';
import { computeModeWindows, extractUnavailableTimes } from '../utils/computeModeWindows.js';
import { assessModeWindow } from '../utils/breakClassification.js';
import { ModeRingSimplified } from './ModeRingSimplified.js';
import { PeakBar } from './PeakBar.js';
import { ModeLegend } from './ModeLegend.js';
import { GovernorDisplay } from './GovernorDisplay.js';
import { UnavailableTimeModal } from './UnavailableTimeModal.js';
import { DevTools } from './DevTools.js';
import type { Mode } from '../types/modeStates.js';
import { colors, glass, radius, spacing, typography, transitions, breakpoints } from './tokens.js';
import { useMinWidth } from './useMediaQuery.js';

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
  const [deletingConstraintId, setDeletingConstraintId] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);

  // Responsive layout
  const isWideScreen = useMinWidth(breakpoints.lg);

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
  const handleSaveConstraint = (constraintId: string, startLocal: string, endLocal: string, label?: string, breakType?: 'commitment' | 'rest' | 'unclassified') => {
    const updatedConstraints = constraints.map((c) => {
      if (c.id === constraintId && isFixedBlockPayload(c.payload)) {
        return {
          ...c,
          payload: {
            ...c.payload,
            startLocal,
            endLocal,
            allDay: false,
            label: label || c.payload.label,
            breakType: breakType ?? c.payload.breakType,
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
      payload: c.payload as { dateISO?: string; allDay?: boolean; startLocal?: string; endLocal?: string; label?: string; breakType?: 'commitment' | 'rest' | 'unclassified' },
    })),
    selectedDate
  );
  const modeWindows = computeModeWindows(governorDecisions, unavailableTimes);

  // Compute fragmenting breaks for ring/peak bar visualization
  // Only fragmenting breaks should create visual gaps
  const fragmentingBreakIds = new Set<string>();
  for (const mw of modeWindows) {
    const assessment = assessModeWindow(mw.mode, mw.window, unavailableTimes);
    for (const brk of assessment.breaks) {
      if (brk.classification === 'fragmenting') {
        fragmentingBreakIds.add(brk.id);
      }
    }
  }
  const fragmentingUnavailableTimes = unavailableTimes.filter(ut => fragmentingBreakIds.has(ut.id));

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

      {/* Two-column layout: Visualization + Mode Cards (stacks on mobile) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isWideScreen ? 'minmax(300px, 1fr) minmax(300px, 1.2fr)' : '1fr',
        gap: spacing.xl,
        marginBottom: spacing.xl,
      }}>
        {/* Left column: Ring + Peak Bar + Mode List + Schedule Conflicts */}
        <div>
          {/* Zone-based 24h Ring Visualization */}
          <ModeRingSimplified
            modeWindows={modeWindows}
            baselineWindows={baselineWindows}
            unavailableTimes={fragmentingUnavailableTimes}
          />

          {/* Linear Peak Bar - zoom into peak modes */}
          <PeakBar
            baselineWindows={baselineWindows}
            modeWindows={modeWindows}
            unavailableTimes={fragmentingUnavailableTimes}
          />

          {/* Cognitive Modes List */}
          <ModeLegend
            modeWindows={modeWindows}
            hoveredMode={hoveredMode}
            onModeHover={setHoveredMode}
            onModeClick={(mode: Mode) => {
              const element = document.querySelector(`[data-testid="mode-state-${mode.toLowerCase()}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            baselineWindows={baselineWindows}
          />

          {/* Schedule Conflicts (break-aware: only shows fragmenting breaks) */}
          <div style={{ marginTop: spacing.lg }}>
            <div style={{
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: colors.text.muted,
              fontWeight: 600,
              marginBottom: spacing.sm,
            }}>
              Schedule Conflicts
            </div>
            {(() => {
              // Classify breaks for each mode window using break-aware logic
              const breakAssessments = modeWindows.map(mw => ({
                mode: mw.mode,
                assessment: assessModeWindow(mw.mode, mw.window, unavailableTimes),
              }));

              // Collect constraint IDs that are fragmenting in at least one mode
              const fragmentingConstraintIds = new Set<string>();

              for (const { assessment } of breakAssessments) {
                for (const brk of assessment.breaks) {
                  if (brk.classification === 'fragmenting') {
                    fragmentingConstraintIds.add(brk.id);
                  }
                }
              }

              // Filter constraints to only show fragmenting ones
              // Restorative breaks are invisible - they don't appear here at all
              const fragmentingConstraints = constraintsForDay.filter(c =>
                fragmentingConstraintIds.has(c.id)
              );

              // No fragmenting conflicts (includes case with only restorative breaks)
              if (fragmentingConstraints.length === 0) {
                return (
                  <p style={{
                    ...typography.caption,
                    color: colors.text.muted,
                    margin: 0,
                  }}>
                    No conflicts today.
                  </p>
                );
              }

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                }}>
                  {fragmentingConstraints.map((constraint) => {
                    let label = '';
                    let timeRange = '';
                    if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
                      label = constraint.payload.label || '';
                      if (constraint.payload.allDay) {
                        timeRange = 'All day';
                      } else {
                        timeRange = `${constraint.payload.startLocal}–${constraint.payload.endLocal}`;
                      }
                    }

                    // Find which modes this constraint fragments
                    const fragmentedModes: string[] = [];
                    for (const { mode, assessment } of breakAssessments) {
                      const brk = assessment.breaks.find(b => b.id === constraint.id);
                      if (brk && brk.classification === 'fragmenting') {
                        fragmentedModes.push(mode);
                      }
                    }

                    const isDeleting = deletingConstraintId === constraint.id;
                    const displayTitle = label ? `${label} · ${timeRange}` : timeRange;

                    return (
                      <div
                        key={constraint.id}
                        style={{
                          padding: `${spacing.sm} ${spacing.md}`,
                          background: 'rgba(251, 191, 36, 0.08)',
                          border: '1px solid #fbbf24',
                          borderRadius: radius.sm,
                          fontSize: '0.75rem',
                          color: colors.text.secondary,
                        }}
                      >
                        {isDeleting ? (
                          // Delete confirmation
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.text.primary }}>
                              Remove {label ? `'${label}'` : ''} {timeRange}?
                            </span>
                            <span style={{ display: 'flex', gap: spacing.xs }}>
                              <button
                                onClick={() => {
                                  handleDeleteConstraint(constraint.id);
                                  setDeletingConstraintId(null);
                                }}
                                style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: radius.sm,
                                  padding: `2px 8px`,
                                  fontSize: '0.6875rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setDeletingConstraintId(null)}
                                style={{
                                  background: colors.bg.hover,
                                  color: colors.text.secondary,
                                  border: 'none',
                                  borderRadius: radius.sm,
                                  padding: `2px 8px`,
                                  fontSize: '0.6875rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </span>
                          </div>
                        ) : (
                          // Normal display
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: "'SF Mono', 'Monaco', monospace", fontWeight: 500 }}>
                                {displayTitle}
                              </span>
                              <span style={{ display: 'flex', gap: spacing.xs }}>
                                <button
                                  onClick={() => handleEditUnavailable(constraint.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6366f1',
                                    cursor: 'pointer',
                                    fontSize: '0.6875rem',
                                    fontWeight: 500,
                                    padding: '2px 4px',
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeletingConstraintId(constraint.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    padding: '2px 4px',
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            </div>
                            {fragmentedModes.length > 0 && (
                              <div style={{
                                marginTop: '4px',
                                fontSize: '0.625rem',
                                color: '#b45309',
                                fontWeight: 500,
                              }}>
                                Fragments: {fragmentedModes.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right column: Mode Cards */}
        <div>
          <GovernorDisplay
            decisions={governorDecisions}
            constraints={constraints}
            selectedDate={selectedDate}
            hoveredMode={hoveredMode}
            onModeHover={setHoveredMode}
            baselineWindows={baselineWindows}
            postLunchDip={profile?.chronotype ? getPostLunchDip(profile.chronotype) : null}
          />
        </div>
      </div>

      {/* Testing Only: Daily Check-in (collapsible) */}
      <div style={{
        marginTop: spacing.xl,
        borderTop: `1px solid ${colors.border.subtle}`,
        paddingTop: spacing.lg,
      }}>
        <button
          onClick={() => setShowCheckIn(!showCheckIn)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            ...typography.caption,
            color: colors.text.muted,
          }}
        >
          <span style={{
            display: 'inline-block',
            transform: showCheckIn ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: `transform ${transitions.fast}`,
            fontSize: '0.625rem',
          }}>
            ▶
          </span>
          Testing Only: Daily Check-in
        </button>

        {showCheckIn && (
          <div style={{
            marginTop: spacing.md,
            padding: spacing.lg,
            background: colors.bg.subtle,
            borderRadius: radius.md,
            border: `1px dashed ${colors.border.subtle}`,
          }}>
            {!localStorage.getItem(STORAGE_KEY_USER_NAME) && (
              <div style={{ marginBottom: spacing.md }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{ ...typography.caption, color: colors.text.secondary }}>Name</span>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      flex: 1,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: radius.sm,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      ...typography.caption,
                      background: colors.bg.elevated,
                      color: colors.text.primary,
                    }}
                  />
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <span style={{ ...typography.caption, color: colors.text.secondary }}>Rating</span>
                <select
                  value={checkInRating ?? ''}
                  onChange={(e) => setCheckInRating(e.target.value === '' ? null : Number(e.target.value))}
                  style={{
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: radius.sm,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    ...typography.caption,
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
              <input
                type="text"
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder="Note (optional)"
                style={{
                  flex: 1,
                  minWidth: '150px',
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: radius.sm,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  ...typography.caption,
                  background: colors.bg.elevated,
                  color: colors.text.primary,
                }}
              />
              <button
                onClick={handleSaveCheckIn}
                disabled={checkInRating === null}
                style={{
                  ...typography.caption,
                  background: checkInRating !== null ? colors.text.primary : colors.bg.hover,
                  color: checkInRating !== null ? colors.bg.page : colors.text.muted,
                  border: 'none',
                  borderRadius: radius.sm,
                  padding: `${spacing.xs} ${spacing.md}`,
                  fontWeight: 500,
                  cursor: checkInRating !== null ? 'pointer' : 'not-allowed',
                }}
              >
                Save
              </button>
              {getLogForDay(dailyLogs, selectedDate) && (
                <span style={{ ...typography.caption, color: colors.status.permit.dot }}>
                  {syncStatus === 'syncing' ? 'Syncing...' :
                   syncStatus === 'pending' ? 'Pending' :
                   syncStatus === 'synced' ? 'Synced' : 'Saved'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

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
