import { useState, useEffect } from 'react';
import type { ChronotypeProfile, ModeGovernanceDecision, DailyLog, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { loadChronotypeProfile, loadConstraints, loadDailyLogs, saveDailyLogs, getLogForDay, upsertDailyLog } from '../storage/index.js';
import { generateBaselineWindows } from '../baseline/index.js';
import { evaluateDay } from '../governor/index.js';
import { constraintsToBusyBlocks, getConstraintsForDay, isFixedBlockPayload } from '../constraints/index.js';
import { MODES_COPY } from '../canon/modes_copy.js';
import { PortalPopover } from './PortalPopover.js';
import { HeatmapClock } from './HeatmapClock.js';
import { colors, glass, radius, spacing, typography, transitions } from './tokens.js';

// Storage keys for user name
const STORAGE_KEY_USER_NAME = 'align_user_name';

/**
 * Flattened display item for rendering.
 * Expands FRAGMENTED decisions into individual segment rows.
 */
interface DisplayItem {
  mode: BaselineMode;
  decision: 'PERMIT' | 'FRAGMENTED' | 'SILENCE' | 'WARN';
  window: { start: string; end: string };
  reason: string;
  /** Index within fragmented segments (for key uniqueness) */
  segmentIndex?: number;
  /** Total segments (for context in reason) */
  totalSegments?: number;
}

/**
 * Flatten governor decisions for display.
 * FRAGMENTED decisions with multiple segments become multiple rows.
 */
function flattenDecisions(decisions: ModeGovernanceDecision[]): DisplayItem[] {
  const items: DisplayItem[] = [];

  for (const decision of decisions) {
    if (decision.decision === 'FRAGMENTED' && decision.segments && decision.segments.length > 0) {
      // Expand each segment into its own row
      decision.segments.forEach((seg, i) => {
        items.push({
          mode: decision.mode,
          decision: 'FRAGMENTED',
          window: { start: seg.start, end: seg.end },
          reason: decision.reason,
          segmentIndex: i,
          totalSegments: decision.segments!.length,
        });
      });
    } else if (decision.decision === 'PERMIT' && decision.window) {
      items.push({
        mode: decision.mode,
        decision: 'PERMIT',
        window: decision.window,
        reason: decision.reason,
      });
    } else {
      // SILENCE or other - no time range
      items.push({
        mode: decision.mode,
        decision: decision.decision as DisplayItem['decision'],
        window: { start: '', end: '' },
        reason: decision.reason,
      });
    }
  }

  // Sort by start time (items with time first, then silent ones)
  items.sort((a, b) => {
    if (!a.window.start && !b.window.start) return 0;
    if (!a.window.start) return 1;
    if (!b.window.start) return -1;
    return new Date(a.window.start).getTime() - new Date(b.window.start).getTime();
  });

  return items;
}

export function DailyView() {
  const [profile, setProfile] = useState<ChronotypeProfile | null>(null);
  const [constraints, setConstraints] = useState<V1Constraint[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [checkInRating, setCheckInRating] = useState<number | null>(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [userName, setUserName] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'pending'>('idle');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

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

  // Determine silence state
  const isSilenceState = !profile || profile.confidence === 'LOW';

  // Check if ALL modes are silent (for global banner)
  const allModesSilent = governorDecisions.every(d => d.decision === 'SILENCE');

  return (
    <div>
      <h1 style={{
        ...typography.h1,
        marginBottom: spacing.xs,
      }}>
        Today
      </h1>
      <p style={{
        ...typography.bodySmall,
        color: colors.text.tertiary,
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

      {/* Daily Check-in Section */}
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.sm,
      }}>
        Daily Check-in
      </h2>
      <div style={{
        marginBottom: spacing.xl,
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

      {/* Heatmap Clock */}
      <HeatmapClock
        decisions={governorDecisions}
        constraints={constraints}
        selectedDate={selectedDate}
      />

      {/* Governor Section */}
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.sm,
      }}>
        Governor
      </h2>
      <p style={{
        ...typography.label,
        color: colors.text.muted,
        marginBottom: spacing.md,
      }}>
        Hover or focus a mode to learn more.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.xl }}>
        {flattenDecisions(governorDecisions).map((item, index) => (
          <GovernorDecisionItem
            key={`${item.mode}-${item.segmentIndex ?? 0}-${index}`}
            item={item}
          />
        ))}
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
            if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
              if (constraint.payload.allDay) {
                description = 'All day';
              } else {
                description = `${constraint.payload.startLocal} - ${constraint.payload.endLocal}`;
              }
            }

            return (
              <div
                key={constraint.id}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  background: colors.bg.subtle,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radius.md,
                  ...typography.bodySmall,
                  color: colors.text.secondary,
                }}
              >
                {description}
              </div>
            );
          })}
        </div>
      )}

      {/* Baseline Windows Section */}
      <h2 style={{
        ...typography.h2,
        marginBottom: spacing.sm,
      }}>
        Baseline Windows
      </h2>
      <p style={{
        ...typography.label,
        color: colors.text.muted,
        marginBottom: spacing.md,
      }}>
        Reference schedule from your chronotype.
      </p>
      {isSilenceState ? (
        <p style={{
          ...typography.bodySmall,
          color: colors.text.muted,
          marginBottom: spacing.xl,
        }}>
          {!profile
            ? 'No chronotype profile available.'
            : 'Confidence insufficient. Baseline windows silenced.'}
        </p>
      ) : baselineWindows.length === 0 ? (
        <p style={{
          ...typography.bodySmall,
          color: colors.text.muted,
          marginBottom: spacing.xl,
        }}>
          No baseline windows for this profile.
        </p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          marginBottom: spacing.xl,
        }}>
          {baselineWindows.map((window, index) => {
            const start = new Date(window.start);
            const end = new Date(window.end);
            const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
            const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

            return (
              <div
                key={`${window.mode}-${index}`}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  background: colors.bg.subtle,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radius.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  ...typography.bodySmall,
                }}
              >
                <span style={{ color: colors.text.tertiary }}>{startStr} - {endStr}</span>
                <span style={{ color: colors.text.secondary, fontWeight: 500 }}>
                  {window.mode}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
  const endStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  return `${startStr} - ${endStr}`;
}

/**
 * State pill component with liquid glass styling.
 */
function StatePill({ decision }: { decision: 'PERMIT' | 'FRAGMENTED' | 'WARN' | 'SILENCE' }) {
  const statusConfig =
    decision === 'PERMIT'
      ? colors.status.permit
      : decision === 'FRAGMENTED'
      ? colors.status.fragmented
      : decision === 'WARN'
      ? colors.status.caution
      : colors.status.silence;

  const label =
    decision === 'PERMIT'
      ? 'Reliable'
      : decision === 'FRAGMENTED'
      ? 'Fragmented'
      : decision === 'WARN'
      ? 'Caution'
      : 'Silent';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        background: statusConfig.pill,
        border: `1px solid ${statusConfig.pillBorder}`,
        borderRadius: '9999px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 1px 2px rgba(45, 42, 38, 0.04)',
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: statusConfig.dot,
      }} />
      <span style={{
        ...typography.label,
        color: statusConfig.text,
        fontWeight: 500,
      }}>
        {label}
      </span>
    </span>
  );
}

interface GovernorDecisionItemProps {
  item: DisplayItem;
}

function GovernorDecisionItem({ item }: GovernorDecisionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get canonical copy for this mode
  const modeCopy = MODES_COPY[item.mode as BaselineMode];

  // Status styling from tokens
  const statusConfig =
    item.decision === 'PERMIT'
      ? colors.status.permit
      : item.decision === 'FRAGMENTED'
      ? colors.status.fragmented
      : item.decision === 'WARN'
      ? colors.status.caution
      : colors.status.silence;

  // Build time range string
  const timeRangeStr = item.window.start ? formatTimeRange(item.window.start, item.window.end) : '';

  // Build structural reason sentence
  let reasonSentence = '';
  if (item.decision === 'PERMIT') {
    reasonSentence = 'Uninterrupted and structurally reliable.';
  } else if (item.decision === 'FRAGMENTED') {
    // Show segment position if multiple segments
    if (item.totalSegments && item.totalSegments > 1) {
      reasonSentence = `Segment ${(item.segmentIndex ?? 0) + 1} of ${item.totalSegments}. Interrupted by unavailable time.`;
    } else {
      reasonSentence = 'Interrupted by unavailable time.';
    }
  } else if (item.decision === 'WARN') {
    reasonSentence = 'Proceed with caution.';
  } else {
    // SILENCE
    if (item.reason.includes('Confidence') || item.reason.includes('confidence')) {
      reasonSentence = 'Confidence insufficient for reliable judgment.';
    } else {
      reasonSentence = 'No reliable window available.';
    }
  }

  // Tooltip content - concise bullet examples only
  const tooltipContent = modeCopy ? (
    <>
      <p style={{
        ...typography.h2,
        marginBottom: spacing.sm,
      }}>
        {item.mode}
      </p>
      <ul style={{
        margin: 0,
        paddingLeft: spacing.lg,
        ...typography.bodySmall,
        color: colors.text.secondary,
        lineHeight: 1.6,
      }}>
        {modeCopy.examples.slice(0, 4).map((ex, i) => (
          <li key={i} style={{ marginBottom: spacing.xs }}>{ex}</li>
        ))}
      </ul>
    </>
  ) : null;

  // Hover ring with status-aware subtle tint
  const activeHoverRing = {
    boxShadow: `0 0 0 2px ${statusConfig.border || colors.accent.subtle}`,
  };

  // For silence, grey out text
  const isSilent = item.decision === 'SILENCE';

  return (
    <PortalPopover
      content={tooltipContent}
      data-testid={`mode-tooltip-${item.mode.toLowerCase()}`}
      tooltipId={`tooltip-${item.mode.toLowerCase()}-${item.segmentIndex ?? 0}`}
      onOpenChange={setIsHovered}
    >
      <div
        data-testid={`mode-card-${item.mode.toLowerCase()}`}
        tabIndex={0}
        style={{
          padding: spacing.lg,
          background: statusConfig.bg,
          border: `1px solid ${statusConfig.border || colors.border.subtle}`,
          borderRadius: radius.md,
          cursor: 'default',
          outline: 'none',
          transition: `box-shadow ${transitions.normal}, border-color ${transitions.normal}`,
          ...(isHovered ? activeHoverRing : {}),
        }}
      >
        {/* Top line: Mode name + State pill (left) + Time chip (right) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{
              ...typography.h2,
              fontSize: '0.9375rem',
              color: isSilent ? colors.text.muted : colors.text.primary,
            }}>
              {item.mode}
            </span>
            <StatePill decision={item.decision} />
          </div>

          {/* Time chip on right */}
          {timeRangeStr && (
            <span style={{
              ...typography.label,
              fontWeight: 600,
              color: isSilent ? colors.text.muted : colors.text.primary,
              padding: `${spacing.xs} ${spacing.sm}`,
              background: colors.bg.subtle,
              borderRadius: radius.sm,
              fontSize: '0.8125rem',
            }}>
              {timeRangeStr}
            </span>
          )}
        </div>

        {/* Reason line */}
        <div style={{
          ...typography.bodySmall,
          color: isSilent ? colors.text.muted : colors.text.tertiary,
          marginTop: spacing.sm,
        }}>
          {reasonSentence}
        </div>
      </div>
    </PortalPopover>
  );
}
