import type { ModeGovernanceDecision, TimeSegment, BaselineMode } from '../types.js';
import { MODES_COPY } from '../canon/modes_copy.js';

/**
 * Generates a unique identifier for ICS events.
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@align`;
}

/**
 * Formats a Date to ICS local datetime format: YYYYMMDDTHHMMSS
 */
function formatICSDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escapes special characters for ICS text fields.
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Folds long lines per ICS spec (max 75 chars per line).
 */
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) {
    return line;
  }

  const parts: string[] = [];
  let remaining = line;

  // First line can be full length
  parts.push(remaining.substring(0, maxLen));
  remaining = remaining.substring(maxLen);

  // Continuation lines start with space and have max 74 chars of content
  while (remaining.length > 0) {
    parts.push(' ' + remaining.substring(0, maxLen - 1));
    remaining = remaining.substring(maxLen - 1);
  }

  return parts.join('\r\n');
}

/**
 * Generates a VEVENT string for a single time segment.
 */
function generateSegmentVEvent(
  mode: BaselineMode,
  segment: TimeSegment,
  isFragmented: boolean,
  dtstamp: string
): string {
  const modeInfo = MODES_COPY[mode];

  if (!modeInfo) {
    return '';
  }

  const start = new Date(segment.start);
  const end = new Date(segment.end);

  // Event title format per spec
  const title = isFragmented
    ? `Align — ${mode} (Segment)`
    : `Align — ${mode}`;

  // Status line per spec
  const statusLine = 'Status: Structurally reliable.';

  // Build description
  const descriptionParts = [
    modeInfo.definition,
    '',
    'Examples:',
    ...modeInfo.examples.slice(0, 6).map(ex => `- ${ex}`),
    '',
    statusLine,
  ];

  // Add segment note for fragmented
  if (isFragmented) {
    descriptionParts.push('');
    descriptionParts.push('This is a segment. The baseline window is split by unavailable time(s).');
  }

  descriptionParts.push('');
  descriptionParts.push('Align does not schedule for you. Importing is optional.');

  const description = escapeICSText(descriptionParts.join('\n'));

  const lines = [
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatICSDateTime(start)}`,
    `DTEND:${formatICSDateTime(end)}`,
    foldLine(`SUMMARY:${escapeICSText(title)}`),
    foldLine(`DESCRIPTION:${description}`),
    'END:VEVENT',
  ];

  return lines.join('\r\n');
}

/**
 * Generates an ICS calendar string from governor decisions for a day.
 * - PERMIT: Single event with "Align — MODE"
 * - FRAGMENTED: One event per segment with "Align — MODE (Segment)"
 * - SILENCE: Skipped (no events)
 */
export function generateICS(
  decisions: ModeGovernanceDecision[],
  dayISODate: string
): string {
  const dtstamp = formatICSDateTime(new Date());
  const events: string[] = [];

  for (const decision of decisions) {
    if (decision.decision === 'PERMIT' && decision.window) {
      // Single event for PERMIT
      const event = generateSegmentVEvent(
        decision.mode,
        decision.window,
        false, // not fragmented
        dtstamp
      );
      if (event) {
        events.push(event);
      }
    } else if (decision.decision === 'FRAGMENTED' && decision.segments) {
      // One event per segment for FRAGMENTED
      for (const segment of decision.segments) {
        const event = generateSegmentVEvent(
          decision.mode,
          segment,
          true, // fragmented
          dtstamp
        );
        if (event) {
          events.push(event);
        }
      }
    }
    // SILENCE and WARN (if any remain) are skipped
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Align//Align MVP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Align ${dayISODate}`,
    ...events,
    'END:VCALENDAR',
  ];

  // Join with CRLF per ICS spec
  return lines.join('\r\n') + '\r\n';
}

/**
 * Triggers a browser download of the ICS file.
 */
export function downloadICS(icsContent: string, dayISODate: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `align-${dayISODate}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Creates and downloads an ICS file for the given day's decisions.
 */
export function exportDayToICS(
  decisions: ModeGovernanceDecision[],
  dayISODate: string
): void {
  const icsContent = generateICS(decisions, dayISODate);
  downloadICS(icsContent, dayISODate);
}
