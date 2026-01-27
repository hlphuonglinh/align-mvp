import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockImplementation(() => ({
      spreadsheets: {
        values: {
          append: vi.fn().mockResolvedValue({ data: {} }),
        },
      },
    })),
  },
}));

describe('sheets', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Set up mock credentials
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
      client_email: 'test@test.iam.gserviceaccount.com',
      client_id: '123456789',
    });
  });

  it('should export appendToSheet function', async () => {
    const { appendToSheet } = await import('./sheets.js');
    expect(typeof appendToSheet).toBe('function');
  });

  it('should call sheets API with correct row format', async () => {
    const { google } = await import('googleapis');
    const { appendToSheet } = await import('./sheets.js');

    const mockAppend = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(google.sheets).mockReturnValue({
      spreadsheets: {
        values: {
          append: mockAppend,
        },
      },
    } as never);

    const row = {
      name: 'Test User',
      dayISO: '2024-01-15',
      checkInTime: '10:30:00',
      rating: 4,
      note: 'Test note',
      chronotype: 'MERIDIAN',
      confidence: 'HIGH',
      appVersion: '0.1.0',
    };

    await appendToSheet(row);

    expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
      spreadsheetId: expect.any(String),
      range: expect.stringContaining('Check-ins'),
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'Test User',
          '2024-01-15',
          '10:30:00',
          4,
          'Test note',
          'MERIDIAN',
          'HIGH',
          '0.1.0',
        ]],
      },
    }));
  });

  it('should handle empty note', async () => {
    const { google } = await import('googleapis');
    const { appendToSheet } = await import('./sheets.js');

    const mockAppend = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(google.sheets).mockReturnValue({
      spreadsheets: {
        values: {
          append: mockAppend,
        },
      },
    } as never);

    const row = {
      name: 'Test User',
      dayISO: '2024-01-15',
      checkInTime: '10:30:00',
      rating: 3,
      note: '',
      chronotype: '',
      confidence: '',
      appVersion: '0.1.0',
    };

    await appendToSheet(row);

    expect(mockAppend).toHaveBeenCalled();
  });
});
