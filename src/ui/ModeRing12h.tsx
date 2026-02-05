/**
 * 12-hour dual-ring visualization.
 *
 * Inner ring: AM (0-12)
 * Outer ring: PM (12-24, displayed as 0-12)
 *
 * Replaces the 24h wheel with an intuitive clock layout.
 */

import { useMemo } from 'react';
import type { ModeGovernanceDecision, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { isFixedBlockPayload } from '../constraints/types.js';
import { colors, spacing, typography, transitions } from './tokens.js';
import type { Mode, ModeWindow } from '../types/modeStates.js';

interface ModeRing12hProps {
  decisions: ModeGovernanceDecision[];
  constraints: V1Constraint[];
  selectedDate: string;
  hoveredMode?: BaselineMode | null;
  onModeHover?: (mode: BaselineMode | null) => void;
  onEditUnavailable?: (constraintId: string) => void;
  /** Mode windows with fragmentation analysis for mode-colored overlays */
  modeWindows?: ModeWindow[];
}

interface RingSegment {
  startAngle: number;
  endAngle: number;
  color: string;
  mode?: BaselineMode;
  ring: 'am' | 'pm';
}

interface UnavailableSegment {
  startAngle: number;
  endAngle: number;
  ring: 'am' | 'pm';
  constraintId: string;
}

interface ModeConflictSegment {
  startAngle: number;
  endAngle: number;
  ring: 'am' | 'pm';
  constraintId: string;
  mode: BaselineMode;
  modeColor: string;
}

// Visual specifications
const CLOCK_SIZE = 400;
const CENTER = CLOCK_SIZE / 2;

// Ring dimensions
const AM_INNER_RADIUS = 80;
const AM_OUTER_RADIUS = 140;
const PM_INNER_RADIUS = 150;
const PM_OUTER_RADIUS = 190;

// Background ring color
const RING_BG_COLOR = 'rgba(229, 231, 235, 0.3)'; // #e5e7eb at 30%

// Current time indicator
const TIME_INDICATOR_COLOR = '#ef4444'; // red
const TIME_INDICATOR_LINE_WIDTH = 2;
const TIME_INDICATOR_DOT_SIZE = 6;

/**
 * Get color for a mode segment using mode-specific colors.
 * Falls back to status colors for non-mode segments.
 */
function getModeColor(mode: BaselineMode | undefined): string {
  if (!mode) return colors.status.silence.clock;

  const modeColors = colors.modes[mode as Mode];
  if (modeColors) {
    return modeColors.clock;
  }

  return colors.status.permit.clock;
}

/**
 * Convert hour (0-12) to angle in degrees for 12h clock.
 * 12 o'clock (noon/midnight) = top = -90 degrees
 */
function hour12ToAngle(hour: number): number {
  // Normalize to 0-12 range
  const h = hour % 12;
  return (h / 12) * 360 - 90;
}

/**
 * Convert 24h hour to 12h display and ring.
 */
function hour24To12AndRing(hour24: number): { hour12: number; ring: 'am' | 'pm' } {
  const ring = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12;
  return { hour12, ring };
}

/**
 * Convert ISO time string to hour decimal (0-24).
 */
function isoToHour24(iso: string): number {
  const date = new Date(iso);
  return date.getHours() + date.getMinutes() / 60;
}

/**
 * Convert local time string (HH:MM) to hour decimal (0-24).
 */
function localTimeToHour24(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

/**
 * Split a time window (in 24h format) into AM and PM segments.
 */
function splitTimeWindow(
  startHour24: number,
  endHour24: number
): { am?: { start: number; end: number }; pm?: { start: number; end: number } } {
  const result: { am?: { start: number; end: number }; pm?: { start: number; end: number } } = {};

  // Handle edge cases
  if (startHour24 >= endHour24) return result;

  // AM portion (0-12)
  if (startHour24 < 12) {
    result.am = {
      start: startHour24,
      end: Math.min(endHour24, 12),
    };
  }

  // PM portion (12-24)
  if (endHour24 > 12) {
    result.pm = {
      start: Math.max(startHour24, 12) - 12, // Convert to 0-12 range for PM
      end: endHour24 - 12,
    };
  }

  return result;
}

/**
 * Create SVG arc path for a segment.
 */
function createArcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1Outer = cx + outerR * Math.cos(startRad);
  const y1Outer = cy + outerR * Math.sin(startRad);
  const x2Outer = cx + outerR * Math.cos(endRad);
  const y2Outer = cy + outerR * Math.sin(endRad);

  const x1Inner = cx + innerR * Math.cos(endRad);
  const y1Inner = cy + innerR * Math.sin(endRad);
  const x2Inner = cx + innerR * Math.cos(startRad);
  const y2Inner = cy + innerR * Math.sin(startRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `
    M ${x1Outer} ${y1Outer}
    A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}
    L ${x1Inner} ${y1Inner}
    A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}
    Z
  `;
}

/**
 * Create SVG arc stroke path (no fill, just the arc outline).
 * Used for the red dashed unavailable time overlay.
 */
function createArcStrokePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
}

/**
 * 12-hour dual-ring clock visualization.
 */
export function ModeRing12h({
  decisions,
  constraints,
  selectedDate,
  hoveredMode,
  onModeHover,
  onEditUnavailable,
  modeWindows = [],
}: ModeRing12hProps) {
  // Current time for indicator
  const now = new Date();
  const currentHour24 = now.getHours() + now.getMinutes() / 60;
  const { hour12: currentHour12, ring: currentRing } = hour24To12AndRing(currentHour24);
  const currentAngle = hour12ToAngle(currentHour12);

  // Compute mode-colored conflict segments from modeWindows
  const modeConflictSegments = useMemo(() => {
    const result: ModeConflictSegment[] = [];

    for (const modeWindow of modeWindows) {
      if (!modeWindow.fragmentation.hasFragmentation) continue;

      const modeColor = colors.modes[modeWindow.mode as Mode]?.clock || colors.status.permit.clock;

      for (const conflict of modeWindow.fragmentation.conflicts) {
        const startHour24 = localTimeToHour24(conflict.start);
        const endHour24 = localTimeToHour24(conflict.end);
        const split = splitTimeWindow(startHour24, endHour24);

        if (split.am) {
          result.push({
            startAngle: hour12ToAngle(split.am.start),
            endAngle: hour12ToAngle(split.am.end),
            ring: 'am',
            constraintId: conflict.id,
            mode: modeWindow.mode,
            modeColor,
          });
        }

        if (split.pm) {
          result.push({
            startAngle: hour12ToAngle(split.pm.start),
            endAngle: hour12ToAngle(split.pm.end),
            ring: 'pm',
            constraintId: conflict.id,
            mode: modeWindow.mode,
            modeColor,
          });
        }
      }
    }

    return result;
  }, [modeWindows]);

  // Track unavailable segments separately for red dashed overlay (fallback when no modeWindows)
  const unavailableSegments = useMemo(() => {
    const result: UnavailableSegment[] = [];

    for (const constraint of constraints) {
      if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
        const payload = constraint.payload;
        if (payload.dateISO === selectedDate) {
          let startHour24: number;
          let endHour24: number;

          if (payload.allDay) {
            startHour24 = 0;
            endHour24 = 24;
          } else {
            startHour24 = localTimeToHour24(payload.startLocal);
            endHour24 = localTimeToHour24(payload.endLocal);
          }

          const split = splitTimeWindow(startHour24, endHour24);

          if (split.am) {
            result.push({
              startAngle: hour12ToAngle(split.am.start),
              endAngle: hour12ToAngle(split.am.end),
              ring: 'am',
              constraintId: constraint.id,
            });
          }

          if (split.pm) {
            result.push({
              startAngle: hour12ToAngle(split.pm.start),
              endAngle: hour12ToAngle(split.pm.end),
              ring: 'pm',
              constraintId: constraint.id,
            });
          }
        }
      }
    }

    return result;
  }, [constraints, selectedDate]);

  // Build segments from decisions
  const segments = useMemo(() => {
    const result: RingSegment[] = [];

    // Add unavailable time segments (filled background)
    for (const constraint of constraints) {
      if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
        const payload = constraint.payload;
        if (payload.dateISO === selectedDate) {
          let startHour24: number;
          let endHour24: number;

          if (payload.allDay) {
            startHour24 = 0;
            endHour24 = 24;
          } else {
            startHour24 = localTimeToHour24(payload.startLocal);
            endHour24 = localTimeToHour24(payload.endLocal);
          }

          // Split into AM/PM segments
          const split = splitTimeWindow(startHour24, endHour24);

          if (split.am) {
            result.push({
              startAngle: hour12ToAngle(split.am.start),
              endAngle: hour12ToAngle(split.am.end),
              color: colors.status.unavailable.clock,
              ring: 'am',
            });
          }

          if (split.pm) {
            result.push({
              startAngle: hour12ToAngle(split.pm.start),
              endAngle: hour12ToAngle(split.pm.end),
              color: colors.status.unavailable.clock,
              ring: 'pm',
            });
          }
        }
      }
    }

    // Add decision segments
    for (const decision of decisions) {
      if (decision.decision === 'SILENCE') continue;

      const addSegment = (startHour24: number, endHour24: number, mode: BaselineMode) => {
        const split = splitTimeWindow(startHour24, endHour24);

        if (split.am) {
          result.push({
            startAngle: hour12ToAngle(split.am.start),
            endAngle: hour12ToAngle(split.am.end),
            color: getModeColor(mode),
            mode,
            ring: 'am',
          });
        }

        if (split.pm) {
          result.push({
            startAngle: hour12ToAngle(split.pm.start),
            endAngle: hour12ToAngle(split.pm.end),
            color: getModeColor(mode),
            mode,
            ring: 'pm',
          });
        }
      };

      if (decision.decision === 'FRAGMENTED' && decision.segments) {
        for (const segment of decision.segments) {
          const startHour24 = isoToHour24(segment.start);
          const endHour24 = isoToHour24(segment.end);
          addSegment(startHour24, endHour24, decision.mode);
        }
      } else if (decision.window) {
        const startHour24 = isoToHour24(decision.window.start);
        const endHour24 = isoToHour24(decision.window.end);
        addSegment(startHour24, endHour24, decision.mode);
      }
    }

    return result;
  }, [decisions, constraints, selectedDate]);

  // Hour markers (12 positions for each ring)
  const hourMarkers = useMemo(() => {
    const markers: Array<{
      x: number;
      y: number;
      label: string;
      ring: 'am' | 'pm';
    }> = [];

    // AM ring markers (inside)
    [12, 3, 6, 9].forEach((displayHour) => {
      const hour12 = displayHour % 12;
      const angle = (hour12ToAngle(hour12) * Math.PI) / 180;
      const radius = AM_INNER_RADIUS - 15;
      markers.push({
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        label: `${displayHour}a`,
        ring: 'am',
      });
    });

    // PM ring markers (outside)
    [12, 3, 6, 9].forEach((displayHour) => {
      const hour12 = displayHour % 12;
      const angle = (hour12ToAngle(hour12) * Math.PI) / 180;
      const radius = PM_OUTER_RADIUS + 15;
      markers.push({
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        label: `${displayHour}p`,
        ring: 'pm',
      });
    });

    return markers;
  }, []);

  // Small hour dots (every hour)
  const hourDots = useMemo(() => {
    const dots: Array<{ x: number; y: number; ring: 'am' | 'pm' }> = [];

    // AM ring dots
    for (let h = 0; h < 12; h++) {
      const angle = (hour12ToAngle(h) * Math.PI) / 180;
      const radius = (AM_INNER_RADIUS + AM_OUTER_RADIUS) / 2;
      dots.push({
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        ring: 'am',
      });
    }

    // PM ring dots
    for (let h = 0; h < 12; h++) {
      const angle = (hour12ToAngle(h) * Math.PI) / 180;
      const radius = (PM_INNER_RADIUS + PM_OUTER_RADIUS) / 2;
      dots.push({
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        ring: 'pm',
      });
    }

    return dots;
  }, []);

  // Mode labels positioned on segments
  const modeLabels = useMemo(() => {
    const labels: Array<{
      x: number;
      y: number;
      text: string;
      mode: BaselineMode;
      ring: 'am' | 'pm';
    }> = [];
    const seen = new Set<string>();

    for (const segment of segments) {
      if (!segment.mode) continue;

      const key = `${segment.mode}-${segment.ring}`;
      if (seen.has(key)) continue;

      const midAngle = ((segment.startAngle + segment.endAngle) / 2 * Math.PI) / 180;
      const radius = segment.ring === 'am'
        ? (AM_INNER_RADIUS + AM_OUTER_RADIUS) / 2
        : (PM_INNER_RADIUS + PM_OUTER_RADIUS) / 2;

      labels.push({
        x: CENTER + radius * Math.cos(midAngle),
        y: CENTER + radius * Math.sin(midAngle),
        text: segment.mode.slice(0, 3),
        mode: segment.mode,
        ring: segment.ring,
      });

      seen.add(key);
    }

    return labels;
  }, [segments]);

  // Current time indicator position
  const timeIndicatorAngleRad = (currentAngle * Math.PI) / 180;
  const indicatorInnerRadius = currentRing === 'am' ? AM_INNER_RADIUS : PM_INNER_RADIUS;
  const indicatorOuterRadius = currentRing === 'am' ? AM_OUTER_RADIUS : PM_OUTER_RADIUS;

  const indicatorX1 = CENTER + indicatorInnerRadius * Math.cos(timeIndicatorAngleRad);
  const indicatorY1 = CENTER + indicatorInnerRadius * Math.sin(timeIndicatorAngleRad);
  const indicatorX2 = CENTER + indicatorOuterRadius * Math.cos(timeIndicatorAngleRad);
  const indicatorY2 = CENTER + indicatorOuterRadius * Math.sin(timeIndicatorAngleRad);

  // Current time string
  const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: spacing.xl,
      }}
      data-testid="mode-ring-12h"
    >
      <svg
        width={CLOCK_SIZE}
        height={CLOCK_SIZE}
        viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
        style={{ transition: `opacity ${transitions.slow}` }}
      >
        {/* Background rings */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={(AM_INNER_RADIUS + AM_OUTER_RADIUS) / 2}
          fill="none"
          stroke={RING_BG_COLOR}
          strokeWidth={AM_OUTER_RADIUS - AM_INNER_RADIUS}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={(PM_INNER_RADIUS + PM_OUTER_RADIUS) / 2}
          fill="none"
          stroke={RING_BG_COLOR}
          strokeWidth={PM_OUTER_RADIUS - PM_INNER_RADIUS}
        />

        {/* Segments */}
        {segments.map((segment, i) => {
          const innerR = segment.ring === 'am' ? AM_INNER_RADIUS : PM_INNER_RADIUS;
          const outerR = segment.ring === 'am' ? AM_OUTER_RADIUS : PM_OUTER_RADIUS;
          const isDimmed = hoveredMode && segment.mode && segment.mode !== hoveredMode;

          return (
            <path
              key={i}
              d={createArcPath(CENTER, CENTER, innerR, outerR, segment.startAngle, segment.endAngle)}
              fill={segment.color}
              style={{
                transition: `fill ${transitions.normal}, opacity ${transitions.normal}`,
                opacity: isDimmed ? 0.4 : 1,
                cursor: segment.mode ? 'pointer' : 'default',
              }}
              onMouseEnter={() => segment.mode && onModeHover?.(segment.mode)}
              onMouseLeave={() => onModeHover?.(null)}
              onFocus={() => segment.mode && onModeHover?.(segment.mode)}
              onBlur={() => onModeHover?.(null)}
              tabIndex={segment.mode ? 0 : -1}
              role={segment.mode ? 'button' : undefined}
              aria-label={segment.mode ? `${segment.mode} mode` : undefined}
            />
          );
        })}

        {/* Mode-colored dashed conflict overlays (when modeWindows provided) */}
        {modeConflictSegments.map((segment, i) => {
          const innerR = segment.ring === 'am' ? AM_INNER_RADIUS - 5 : PM_INNER_RADIUS - 5;
          const outerR = segment.ring === 'am' ? AM_OUTER_RADIUS + 5 : PM_OUTER_RADIUS + 5;

          return (
            <g key={`mode-conflict-${segment.mode}-${i}`}>
              <path
                d={createArcStrokePath(CENTER, CENTER, innerR, segment.startAngle, segment.endAngle)}
                fill="none"
                stroke={segment.modeColor}
                strokeWidth={4}
                strokeDasharray="6 3"
                strokeLinecap="round"
                opacity={0.8}
                style={{
                  cursor: onEditUnavailable ? 'pointer' : 'default',
                  filter: 'drop-shadow(0 0 4px rgba(220, 38, 38, 0.5))',
                }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              >
                <title>{segment.mode} conflict: {segment.constraintId}</title>
              </path>
              <path
                d={createArcStrokePath(CENTER, CENTER, outerR, segment.startAngle, segment.endAngle)}
                fill="none"
                stroke={segment.modeColor}
                strokeWidth={4}
                strokeDasharray="6 3"
                strokeLinecap="round"
                opacity={0.8}
                style={{
                  cursor: onEditUnavailable ? 'pointer' : 'default',
                  filter: 'drop-shadow(0 0 4px rgba(220, 38, 38, 0.5))',
                }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              >
                <title>{segment.mode} conflict: {segment.constraintId}</title>
              </path>
              <line
                x1={CENTER + innerR * Math.cos((segment.startAngle * Math.PI) / 180)}
                y1={CENTER + innerR * Math.sin((segment.startAngle * Math.PI) / 180)}
                x2={CENTER + outerR * Math.cos((segment.startAngle * Math.PI) / 180)}
                y2={CENTER + outerR * Math.sin((segment.startAngle * Math.PI) / 180)}
                stroke={segment.modeColor}
                strokeWidth={4}
                strokeDasharray="6 3"
                strokeLinecap="round"
                opacity={0.8}
                style={{ cursor: onEditUnavailable ? 'pointer' : 'default' }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              />
              <line
                x1={CENTER + innerR * Math.cos((segment.endAngle * Math.PI) / 180)}
                y1={CENTER + innerR * Math.sin((segment.endAngle * Math.PI) / 180)}
                x2={CENTER + outerR * Math.cos((segment.endAngle * Math.PI) / 180)}
                y2={CENTER + outerR * Math.sin((segment.endAngle * Math.PI) / 180)}
                stroke={segment.modeColor}
                strokeWidth={4}
                strokeDasharray="6 3"
                strokeLinecap="round"
                opacity={0.8}
                style={{ cursor: onEditUnavailable ? 'pointer' : 'default' }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              />
            </g>
          );
        })}

        {/* Fallback: Red dashed unavailable time overlay (when no modeWindows) */}
        {modeConflictSegments.length === 0 && unavailableSegments.map((segment, i) => {
          const innerR = segment.ring === 'am' ? AM_INNER_RADIUS - 5 : PM_INNER_RADIUS - 5;
          const outerR = segment.ring === 'am' ? AM_OUTER_RADIUS + 5 : PM_OUTER_RADIUS + 5;

          return (
            <g key={`unavail-${i}`}>
              <path
                d={createArcStrokePath(CENTER, CENTER, innerR, segment.startAngle, segment.endAngle)}
                fill="none"
                stroke="#ef4444"
                strokeWidth={3}
                strokeDasharray="4 2"
                strokeLinecap="round"
                style={{ cursor: onEditUnavailable ? 'pointer' : 'default' }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              />
              <path
                d={createArcStrokePath(CENTER, CENTER, outerR, segment.startAngle, segment.endAngle)}
                fill="none"
                stroke="#ef4444"
                strokeWidth={3}
                strokeDasharray="4 2"
                strokeLinecap="round"
                style={{ cursor: onEditUnavailable ? 'pointer' : 'default' }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              />
              <line
                x1={CENTER + innerR * Math.cos((segment.startAngle * Math.PI) / 180)}
                y1={CENTER + innerR * Math.sin((segment.startAngle * Math.PI) / 180)}
                x2={CENTER + outerR * Math.cos((segment.startAngle * Math.PI) / 180)}
                y2={CENTER + outerR * Math.sin((segment.startAngle * Math.PI) / 180)}
                stroke="#ef4444"
                strokeWidth={3}
                strokeDasharray="4 2"
                strokeLinecap="round"
                style={{ cursor: onEditUnavailable ? 'pointer' : 'default' }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              />
              <line
                x1={CENTER + innerR * Math.cos((segment.endAngle * Math.PI) / 180)}
                y1={CENTER + innerR * Math.sin((segment.endAngle * Math.PI) / 180)}
                x2={CENTER + outerR * Math.cos((segment.endAngle * Math.PI) / 180)}
                y2={CENTER + outerR * Math.sin((segment.endAngle * Math.PI) / 180)}
                stroke="#ef4444"
                strokeWidth={3}
                strokeDasharray="4 2"
                strokeLinecap="round"
                style={{ cursor: onEditUnavailable ? 'pointer' : 'default' }}
                onClick={() => onEditUnavailable?.(segment.constraintId)}
              />
            </g>
          );
        })}

        {/* Hour dots */}
        {hourDots.map((dot, i) => (
          <circle
            key={`dot-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={2}
            fill={colors.border.light}
          />
        ))}

        {/* Hour labels */}
        {hourMarkers.map(({ x, y, label }, i) => (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              ...typography.caption,
              fill: colors.text.muted,
              fontSize: '0.625rem',
            }}
          >
            {label}
          </text>
        ))}

        {/* Mode labels on segments */}
        {modeLabels.map(({ x, y, text, mode }) => {
          const isHovered = mode === hoveredMode;
          const isDimmed = hoveredMode && mode !== hoveredMode;

          return (
            <text
              key={`mode-${mode}-${x}-${y}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                ...typography.label,
                fill: isHovered ? colors.text.primary : colors.text.secondary,
                fontSize: '0.5625rem',
                fontWeight: 600,
                opacity: isDimmed ? 0.4 : 1,
                transition: `opacity ${transitions.normal}, fill ${transitions.normal}`,
              }}
            >
              {text}
            </text>
          );
        })}

        {/* Current time indicator */}
        <line
          x1={indicatorX1}
          y1={indicatorY1}
          x2={indicatorX2}
          y2={indicatorY2}
          stroke={TIME_INDICATOR_COLOR}
          strokeWidth={TIME_INDICATOR_LINE_WIDTH}
          strokeLinecap="round"
        />
        <circle
          cx={indicatorX2}
          cy={indicatorY2}
          r={TIME_INDICATOR_DOT_SIZE / 2}
          fill={TIME_INDICATOR_COLOR}
        />

        {/* Center content */}
        <text
          x={CENTER}
          y={CENTER - 12}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.h2,
            fill: colors.text.primary,
            fontSize: '1rem',
          }}
        >
          {currentTimeStr}
        </text>
        <text
          x={CENTER}
          y={CENTER + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.caption,
            fill: colors.text.muted,
            fontSize: '0.5625rem',
          }}
        >
          AM (inner)
        </text>
        <text
          x={CENTER}
          y={CENTER + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.caption,
            fill: colors.text.muted,
            fontSize: '0.5625rem',
          }}
        >
          PM (outer)
        </text>
      </svg>
    </div>
  );
}
