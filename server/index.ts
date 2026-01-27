import express from 'express';
import { appendToSheet } from './sheets.js';
import { sendCheckInEmail } from './email.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read app version from package.json
let appVersion = '0.1.0';
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  appVersion = packageJson.version || '0.1.0';
} catch {
  console.warn('Could not read package.json version');
}

const app = express();
app.use(express.json());

interface CheckInPayload {
  name: string;
  dayISO: string;
  checkInTime: string;
  rating: number;
  note?: string;
  chronotype: string | null;
  confidence: string | null;
}

/**
 * POST /api/checkins
 * Appends a check-in to Google Sheet and sends email notification.
 */
app.post('/api/checkins', async (req, res) => {
  try {
    const payload = req.body as CheckInPayload;

    // Validate required fields
    if (!payload.name || !payload.dayISO || payload.rating === undefined) {
      res.status(400).json({ error: 'Missing required fields: name, dayISO, rating' });
      return;
    }

    const row = {
      name: payload.name,
      dayISO: payload.dayISO,
      checkInTime: payload.checkInTime,
      rating: payload.rating,
      note: payload.note || '',
      chronotype: payload.chronotype || '',
      confidence: payload.confidence || '',
      appVersion,
    };

    // Append to Google Sheet (non-blocking for email)
    const sheetPromise = appendToSheet(row);

    // Send email notification (non-blocking for sheet)
    const emailPromise = sendCheckInEmail(row);

    // Wait for both
    await Promise.allSettled([sheetPromise, emailPromise]);

    res.json({ success: true, appVersion });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to process check-in' });
  }
});

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', version: appVersion });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
