import type {
  ChronotypeProfile,
  ExtendedChronotypeProfile,
  Chronotype,
  ChronotypeConfidence,
  FragilityLevel,
  ChronotypeSource,
} from '../types.js';

const STORAGE_KEY = 'align.v1.chronotypeProfile';

/**
 * Loads ChronotypeProfile from localStorage.
 * Returns null if no data exists or data is invalid.
 */
export function loadChronotypeProfile(): ChronotypeProfile | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!isValidChronotypeProfile(parsed)) {
      return null;
    }

    return parsed as ChronotypeProfile;
  } catch {
    return null;
  }
}

/**
 * Saves ChronotypeProfile to localStorage.
 */
export function saveChronotypeProfile(profile: ChronotypeProfile): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/**
 * Clears ChronotypeProfile from storage.
 */
export function clearChronotypeProfile(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Validates that an object is a valid ChronotypeProfile or ExtendedChronotypeProfile.
 */
function isValidChronotypeProfile(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const profile = obj as Record<string, unknown>;

  const validChronotypes: Chronotype[] = ['AURORA', 'DAYBREAK', 'MERIDIAN', 'TWILIGHT', 'NOCTURNE'];
  const validConfidences: ChronotypeConfidence[] = ['HIGH', 'MED', 'LOW'];

  if (!validChronotypes.includes(profile.chronotype as Chronotype)) {
    return false;
  }

  if (!validConfidences.includes(profile.confidence as ChronotypeConfidence)) {
    return false;
  }

  if (typeof profile.computedAt !== 'string') {
    return false;
  }

  // Validate computedAt is a valid ISO date
  const date = new Date(profile.computedAt);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Validate extended profile fields if present
  if ('msfsc' in profile) {
    if (typeof profile.msfsc !== 'number' || profile.msfsc < 0 || profile.msfsc >= 24) {
      return false;
    }
  }

  if ('sjl_hours' in profile) {
    if (profile.sjl_hours !== null && (typeof profile.sjl_hours !== 'number' || profile.sjl_hours < 0)) {
      return false;
    }
  }

  if ('fragility' in profile) {
    const validFragilityLevels: FragilityLevel[] = ['Low', 'Medium', 'High'];
    if (!validFragilityLevels.includes(profile.fragility as FragilityLevel)) {
      return false;
    }
  }

  if ('fragility_score' in profile) {
    if (typeof profile.fragility_score !== 'number' || profile.fragility_score < -0.25 || profile.fragility_score > 0.25) {
      return false;
    }
  }

  if ('source' in profile) {
    const validSources: ChronotypeSource[] = ['quiz', 'oura'];
    if (!validSources.includes(profile.source as ChronotypeSource)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a profile is an ExtendedChronotypeProfile.
 */
export function isExtendedProfile(profile: ChronotypeProfile): profile is ExtendedChronotypeProfile {
  return 'msfsc' in profile && 'source' in profile;
}

/**
 * Gets the storage key (for testing purposes).
 */
export function getChronotypeStorageKey(): string {
  return STORAGE_KEY;
}
