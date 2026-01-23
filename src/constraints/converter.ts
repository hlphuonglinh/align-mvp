import type { BusyBlock } from '../types.js';
import type { V1Constraint, FixedHoursPayload, FixedBlockPayload } from './types.js';
import { isFixedHoursPayload, isFixedBlockPayload } from './types.js';

/**
 * Converts constraints to BusyBlocks for a specific day.
 *
 * Approach:
 * - FIXED_HOURS: Creates a BusyBlock for the constrained hours on matching days.
 *   This represents immovable time (e.g., work hours that cannot be used for other activities).
 * - FIXED_BLOCK: Directly converts to a BusyBlock for the specified date.
 *
 * @param constraints - Array of V1Constraints
 * @param dayISODate - Target date in YYYY-MM-DD format
 * @returns Array of BusyBlocks derived from constraints
 */
export function constraintsToBusyBlocks(
  constraints: V1Constraint[],
  dayISODate: string
): BusyBlock[] {
  const blocks: BusyBlock[] = [];
  const targetDate = new Date(dayISODate);
  const dayOfWeek = targetDate.getDay();

  for (const constraint of constraints) {
    if (constraint.kind === 'FIXED_HOURS' && isFixedHoursPayload(constraint.payload)) {
      const block = fixedHoursToBusyBlock(constraint.payload, dayISODate, dayOfWeek);
      if (block) {
        blocks.push(block);
      }
    } else if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
      const block = fixedBlockToBusyBlock(constraint.payload, dayISODate);
      if (block) {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

/**
 * Converts FIXED_HOURS to a BusyBlock if the day matches.
 */
function fixedHoursToBusyBlock(
  payload: FixedHoursPayload,
  dayISODate: string,
  dayOfWeek: number
): BusyBlock | null {
  // Only create block if this day of week is in the constraint
  if (!payload.daysOfWeek.includes(dayOfWeek)) {
    return null;
  }

  const [startHours, startMinutes] = payload.startLocal.split(':').map(Number);
  const [endHours, endMinutes] = payload.endLocal.split(':').map(Number);

  const start = new Date(dayISODate);
  start.setHours(startHours, startMinutes, 0, 0);

  const end = new Date(dayISODate);
  end.setHours(endHours, endMinutes, 0, 0);

  return {
    start,
    end,
    allDay: false,
    source: 'manual', // Constraints are treated as manual blocks
  };
}

/**
 * Converts FIXED_BLOCK to a BusyBlock if the date matches.
 */
function fixedBlockToBusyBlock(
  payload: FixedBlockPayload,
  dayISODate: string
): BusyBlock | null {
  // Only create block if this is the constraint's date
  if (payload.dateISO !== dayISODate) {
    return null;
  }

  const [startHours, startMinutes] = payload.startLocal.split(':').map(Number);
  const [endHours, endMinutes] = payload.endLocal.split(':').map(Number);

  const start = new Date(dayISODate);
  start.setHours(startHours, startMinutes, 0, 0);

  const end = new Date(dayISODate);
  end.setHours(endHours, endMinutes, 0, 0);

  return {
    start,
    end,
    allDay: false,
    source: 'manual',
  };
}

/**
 * Gets constraints that apply to a specific day (for display purposes).
 */
export function getConstraintsForDay(
  constraints: V1Constraint[],
  dayISODate: string
): V1Constraint[] {
  const targetDate = new Date(dayISODate);
  const dayOfWeek = targetDate.getDay();

  return constraints.filter(constraint => {
    if (constraint.kind === 'FIXED_HOURS' && isFixedHoursPayload(constraint.payload)) {
      return constraint.payload.daysOfWeek.includes(dayOfWeek);
    } else if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
      return constraint.payload.dateISO === dayISODate;
    }
    return false;
  });
}
