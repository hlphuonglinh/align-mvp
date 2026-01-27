import nodemailer from 'nodemailer';

const RECIPIENT = 'hello@phuong-linh.com';

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
 * Create email transporter from environment.
 * Supports common providers via SMTP.
 *
 * Required env vars:
 * - SMTP_HOST (e.g., smtp.gmail.com)
 * - SMTP_PORT (e.g., 587)
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_FROM (sender email)
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send email notification for a check-in.
 */
export async function sendCheckInEmail(row: CheckInRow): Promise<void> {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const subject = `Align check-in: ${row.name} - ${row.dayISO} - ${row.rating}/5`;

    const body = `
New Align check-in received:

Name: ${row.name}
Date: ${row.dayISO}
Time: ${row.checkInTime}
Rating: ${row.rating}/5
Note: ${row.note || '(none)'}
Chronotype: ${row.chronotype || '(unknown)'}
Confidence: ${row.confidence || '(unknown)'}
App Version: ${row.appVersion}
`.trim();

    await transporter.sendMail({
      from,
      to: RECIPIENT,
      subject,
      text: body,
    });

    console.log('Successfully sent email notification');
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
