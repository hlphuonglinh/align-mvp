import type { BusyBlock } from '../types.js';
import type { V1Constraint, FixedBlockPayload } from './types.js';
import { isFixedBlockPayload } from './types.js';

/**
 * Converts constraints to BusyBlocks for a specific day.
 *
 * V1 only supports FIXED_BLOCK (unavailable times).
 * FIXED_HOURS is no longer supported and will be ignored.
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

  for (const constraint of constraints) {
    // Only process FIXED_BLOCK constraints
    if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
      const block = fixedBlockToBusyBlock(constraint.payload, dayISODate);
      if (block) {
        blocks.push(block);
      }
    }
    // FIXED_HOURS is silently ignored (migration safety)
  }

  return blocks;
}

/**
 * Converts FIXED_BLOCK to a BusyBlock if the date matches.
 * Supports allDay flag.
 */
function fixedBlockToBusyBlock(
  payload: FixedBlockPayload,
  dayISODate: string
): BusyBlock | null {
  // Only create block if this is the constraint's date
  if (payload.dateISO !== dayISODate) {
    return null;
  }

  // Handle allDay blocks
  if (payload.allDay) {
    const start = new Date(dayISODate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(dayISODate);
    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
      allDay: true,
      source: 'manual',
    };
  }

  // Handle timed blocks
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
 * V1 only supports FIXED_BLOCK.
 */
export function getConstraintsForDay(
  constraints: V1Constraint[],
  dayISODate: string
): V1Constraint[] {
  return constraints.filter(constraint => {
    if (constraint.kind === 'FIXED_BLOCK' && isFixedBlockPayload(constraint.payload)) {
      return constraint.payload.dateISO === dayISODate;
    }
    // FIXED_HOURS is no longer supported
    return false;
  });
}
