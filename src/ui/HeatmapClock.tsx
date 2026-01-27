import { useMemo } from 'react';
import type { ModeGovernanceDecision, BaselineMode } from '../types.js';
import type { V1Constraint } from '../constraints/types.js';
import { isFixedBlockPayload } from '../constraints/types.js';
import { colors, spacing, typography, transitions } from './tokens.js';

interface HeatmapClockProps {
  decisions: ModeGovernanceDecision[];
  constraints: V1Constraint[];
  selectedDate: string;
}

interface ClockSegment {
  startAngle: number;
  endAngle: number;
  color: string;
  label?: string;
  mode?: BaselineMode;
}

const CLOCK_SIZE = 280;
const OUTER_RADIUS = 130;
const INNER_RADIUS = 85;
const LABEL_RADIUS = 70;

/**
 * Convert hour (0-24) to angle in degrees.
 * 0 hours = top (270 degrees in standard coords, but we use 0 as top)
 */
function hourToAngle(hour: number): number {
  return (hour / 24) * 360 - 90; // -90 to start at top
}

/**
 * Convert ISO time string to hour decimal.
 */
function isoToHour(iso: string): number {
  const date = new Date(iso);
  return date.getHours() + date.getMinutes() / 60;
}

/**
 * Convert local time string (HH:MM) to hour decimal.
 */
function localTimeToHour(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

/**
 * Get color for a decision state.
 */
function getStateColor(decision: string): string {
  switch (decision) {
    case 'PERMIT':
      return colors.status.permit.clock;
    case 'FRAGMENTED':
      return colors.status.fragmented.clock;
    case 'WARN':
      return colors.status.caution.clock;
    case 'SILENCE':
      return colors.status.silence.clock;
    default:
      return colors.status.silence.clock;
  }
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
 * 24-hour heatmap clock showing governor states.
 */
export function HeatmapClock({ decisions, constraints, selectedDate }: HeatmapClockProps) {
  const cx = CLOCK_SIZE / 2;
  const cy = CLOCK_SIZE / 2;

  // Build segments from decisions
  const segments = useMemo(() => {
    const result: ClockSegment[] = [];

    // First, add unavailable time segments
    for (const constraint of constraints) {
      if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
        const payload = constraint.payload;
        if (payload.dateISO === selectedDate) {
          let startHour: number;
          let endHour: number;

          if (payload.allDay) {
            startHour = 0;
            endHour = 24;
          } else {
            startHour = localTimeToHour(payload.startLocal);
            endHour = localTimeToHour(payload.endLocal);
          }

          result.push({
            startAngle: hourToAngle(startHour),
            endAngle: hourToAngle(endHour),
            color: colors.status.unavailable.clock,
          });
        }
      }
    }

    // Add decision segments (these will be on top)
    for (const decision of decisions) {
      if (decision.decision === 'SILENCE') continue; // Skip silence, let background show

      if (decision.decision === 'FRAGMENTED' && decision.segments) {
        for (const segment of decision.segments) {
          const startHour = isoToHour(segment.start);
          const endHour = isoToHour(segment.end);
          result.push({
            startAngle: hourToAngle(startHour),
            endAngle: hourToAngle(endHour),
            color: getStateColor(decision.decision),
            label: decision.mode,
            mode: decision.mode,
          });
        }
      } else if (decision.window) {
        const startHour = isoToHour(decision.window.start);
        const endHour = isoToHour(decision.window.end);
        result.push({
          startAngle: hourToAngle(startHour),
          endAngle: hourToAngle(endHour),
          color: getStateColor(decision.decision),
          label: decision.mode,
          mode: decision.mode,
        });
      }
    }

    return result;
  }, [decisions, constraints, selectedDate]);

  // Mode labels positioned around the clock
  const modeLabels = useMemo(() => {
    const labels: Array<{ x: number; y: number; text: string; mode: BaselineMode }> = [];
    const seen = new Set<BaselineMode>();

    for (const decision of decisions) {
      if (seen.has(decision.mode)) continue;
      if (decision.decision === 'SILENCE') continue;

      let midHour: number | null = null;

      if (decision.decision === 'FRAGMENTED' && decision.segments && decision.segments.length > 0) {
        const firstSeg = decision.segments[0];
        const startHour = isoToHour(firstSeg.start);
        const endHour = isoToHour(firstSeg.end);
        midHour = (startHour + endHour) / 2;
      } else if (decision.window) {
        const startHour = isoToHour(decision.window.start);
        const endHour = isoToHour(decision.window.end);
        midHour = (startHour + endHour) / 2;
      }

      if (midHour !== null) {
        const angle = (hourToAngle(midHour) * Math.PI) / 180;
        labels.push({
          x: cx + LABEL_RADIUS * Math.cos(angle),
          y: cy + LABEL_RADIUS * Math.sin(angle),
          text: decision.mode.slice(0, 3), // Abbreviate: FRA, SYN, EVA, EXE, REF
          mode: decision.mode,
        });
        seen.add(decision.mode);
      }
    }

    return labels;
  }, [decisions, cx, cy]);

  // Hour markers
  const hourMarkers = [0, 6, 12, 18].map((hour) => {
    const angle = (hourToAngle(hour) * Math.PI) / 180;
    const x = cx + (OUTER_RADIUS + 12) * Math.cos(angle);
    const y = cy + (OUTER_RADIUS + 12) * Math.sin(angle);
    const label = hour === 0 ? '12a' : hour === 12 ? '12p' : `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'p' : 'a'}`;
    return { x, y, label, hour };
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: spacing.xl,
      }}
      data-testid="heatmap-clock"
    >
      <svg
        width={CLOCK_SIZE}
        height={CLOCK_SIZE}
        viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
        style={{
          transition: `opacity ${transitions.slow}`,
        }}
      >
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={OUTER_RADIUS}
          fill="none"
          stroke={colors.border.subtle}
          strokeWidth={OUTER_RADIUS - INNER_RADIUS}
          style={{
            transform: `scale(${(OUTER_RADIUS + INNER_RADIUS) / 2 / OUTER_RADIUS})`,
            transformOrigin: 'center',
          }}
        />

        {/* Default background fill (silence) */}
        <circle
          cx={cx}
          cy={cy}
          r={(OUTER_RADIUS + INNER_RADIUS) / 2}
          fill="none"
          stroke={colors.status.silence.clock}
          strokeWidth={OUTER_RADIUS - INNER_RADIUS}
        />

        {/* Segments */}
        {segments.map((segment, i) => (
          <path
            key={i}
            d={createArcPath(cx, cy, INNER_RADIUS, OUTER_RADIUS, segment.startAngle, segment.endAngle)}
            fill={segment.color}
            style={{
              transition: `fill ${transitions.normal}`,
            }}
          />
        ))}

        {/* Inner circle (creates the donut hole) */}
        <circle
          cx={cx}
          cy={cy}
          r={INNER_RADIUS - 1}
          fill={colors.bg.page}
        />

        {/* Hour markers */}
        {hourMarkers.map(({ x, y, label, hour }) => (
          <text
            key={hour}
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

        {/* Mode labels */}
        {modeLabels.map(({ x, y, text, mode }) => (
          <text
            key={mode}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              ...typography.label,
              fill: colors.text.secondary,
              fontSize: '0.5625rem',
              fontWeight: 600,
            }}
          >
            {text}
          </text>
        ))}

        {/* Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.label,
            fill: colors.text.tertiary,
            fontSize: '0.6875rem',
          }}
        >
          24h
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            ...typography.caption,
            fill: colors.text.muted,
            fontSize: '0.5625rem',
          }}
        >
          overview
        </text>
      </svg>
    </div>
  );
}
