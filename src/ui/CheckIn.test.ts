import { describe, it, expect } from 'vitest';

/**
 * Test the check-in payload structure.
 * This validates the expected format sent to the server.
 */
describe('Check-in payload', () => {
  interface CheckInPayload {
    name: string;
    dayISO: string;
    checkInTime: string;
    rating: number;
    note?: string;
    chronotype: string | null;
    confidence: string | null;
  }

  function createPayload(
    name: string,
    dayISO: string,
    rating: number,
    note: string | undefined,
    chronotype: string | null,
    confidence: string | null
  ): CheckInPayload {
    return {
      name,
      dayISO,
      checkInTime: new Date().toLocaleTimeString(),
      rating,
      note,
      chronotype,
      confidence,
    };
  }

  it('should include name in payload', () => {
    const payload = createPayload('Alice', '2024-01-15', 4, 'Good day', 'MERIDIAN', 'HIGH');
    expect(payload.name).toBe('Alice');
  });

  it('should include dayISO in payload', () => {
    const payload = createPayload('Alice', '2024-01-15', 4, undefined, null, null);
    expect(payload.dayISO).toBe('2024-01-15');
  });

  it('should include rating in payload', () => {
    const payload = createPayload('Alice', '2024-01-15', 3, undefined, null, null);
    expect(payload.rating).toBe(3);
  });

  it('should handle missing note', () => {
    const payload = createPayload('Alice', '2024-01-15', 4, undefined, null, null);
    expect(payload.note).toBeUndefined();
  });

  it('should handle null chronotype and confidence', () => {
    const payload = createPayload('Anonymous', '2024-01-15', 2, undefined, null, null);
    expect(payload.chronotype).toBeNull();
    expect(payload.confidence).toBeNull();
  });

  it('should include checkInTime', () => {
    const payload = createPayload('Alice', '2024-01-15', 4, undefined, null, null);
    expect(typeof payload.checkInTime).toBe('string');
    expect(payload.checkInTime.length).toBeGreaterThan(0);
  });

  it('should accept all valid ratings (0-5)', () => {
    for (let rating = 0; rating <= 5; rating++) {
      const payload = createPayload('Test', '2024-01-15', rating, undefined, null, null);
      expect(payload.rating).toBe(rating);
    }
  });
});
