import { google } from 'googleapis';

// The spreadsheet ID from the URL
const SPREADSHEET_ID = '1ZRGZcv9rbloyY286c9ZrygKx2G2Bdia5-TciGSEUyME';
const SHEET_NAME = 'Check-ins';

interface CheckInRow {
  name: string;
  dayISO: string;
  checkInTime: string;
  rating: number;
  note: string;
  chronotype: string;
  confidence: string;
  appVersion: string;
}

/**
 * Get Google Sheets auth from environment.
 * Expects GOOGLE_SERVICE_ACCOUNT_JSON env var containing the JSON key,
 * or GOOGLE_SERVICE_ACCOUNT_PATH pointing to a file.
 */
async function getAuth() {
  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const fs = await import('fs');
    const content = fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf-8');
    credentials = JSON.parse(content);
  } else {
    throw new Error('No Google service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_PATH');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

/**
 * Append a check-in row to the Google Sheet.
 */
export async function appendToSheet(row: CheckInRow): Promise<void> {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
      [
        row.name,
        row.dayISO,
        row.checkInTime,
        row.rating,
        row.note,
        row.chronotype,
        row.confidence,
        row.appVersion,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    console.log('Successfully appended to sheet');
  } catch (error) {
    console.error('Failed to append to sheet:', error);
    throw error;
  }
}
