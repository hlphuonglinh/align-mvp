import type { V1Constraint } from '../constraints/types.js';
import { validateConstraint } from '../constraints/validation.js';

const STORAGE_KEY = 'align.v1.constraints';

/**
 * Loads constraints from localStorage.
 * Returns an empty array if no data exists or data is invalid.
 */
export function loadConstraints(): V1Constraint[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate each constraint, filtering out invalid ones
    const constraints: V1Constraint[] = [];
    for (const item of parsed) {
      const validation = validateConstraint(item);
      if (validation.ok) {
        constraints.push(item as V1Constraint);
      }
    }

    return constraints;
  } catch {
    return [];
  }
}

/**
 * Saves constraints to localStorage.
 */
export function saveConstraints(constraints: V1Constraint[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(constraints));
}

/**
 * Clears all constraints from storage.
 */
export function clearConstraints(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Gets the storage key (for testing purposes).
 */
export function getConstraintStorageKey(): string {
  return STORAGE_KEY;
}
