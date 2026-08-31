/**
 * ICS Calendar Export Utility
 *
 * Generates a RFC 5545-compliant .ics file string and triggers a browser
 * download. No external dependency required — ICS is plain text.
 *
 * Issue #629: Add ICS calendar export for registered events.
 */

export interface ICSEventOptions {
  /** Event title / summary */
  title: string;
  /** ISO date string or "YYYY-MM-DD" */
  startDate: string;
  /**
   * Human-readable time string, e.g. "5:00 PM IST".
   * When provided the utility parses it into the start datetime.
   * When omitted the event is treated as an all-day event.
   */
  startTime?: string;
  /**
   * Duration in minutes. Default: 60.
   * Used to derive endDate when not supplied explicitly.
   */
  durationMinutes?: number;
  /** Physical or virtual location */
  location?: string;
  /** Short plain-text description shown in calendar apps */
  description?: string;
  /** Deep-link URL back to the event page */
  url?: string;
  /**
   * IANA timezone identifier, e.g. "Asia/Kolkata".
   * Defaults to the browser's local timezone.
   */
  timezone?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date as a UTC datetime stamp: YYYYMMDDTHHmmssZ
 */
function toUTCStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Format a Date as a local datetime stamp for a TZID property: YYYYMMDDTHHmmss
 */
function toLocalStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Parse a human-readable time string like "5:00 PM IST" or "18:30" into
 * { hours, minutes } in local time (IST offsets are handled via timezone).
 * Returns null if the string cannot be parsed.
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  // Strip timezone abbreviation suffixes (IST, UTC, PST, etc.)
  const cleaned = timeStr.replace(/\s+[A-Z]{2,5}$/, "").trim();

  // 12-hour format: "5:00 PM" / "11:30 AM"
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "AM" && hours === 12) hours = 0;
    if (ampm === "PM" && hours !== 12) hours += 12;
    return { hours, minutes };
  }

  // 24-hour format: "18:30"
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return {
      hours: parseInt(match24[1], 10),
      minutes: parseInt(match24[2], 10),
    };
  }

  return null;
}

/**
 * Fold long lines per RFC 5545 §3.1 (max 75 octets, continuation with CRLF + space).
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let pos = 75;
  while (pos < line.length) {
    chunks.push(" " + line.slice(pos, pos + 74));
    pos += 74;
  }
  return chunks.join("\r\n");
}

/**
 * Escape special characters in ICS text values per RFC 5545 §3.3.11.
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Generate a pseudo-random UID suitable for VEVENT.
 */
function generateUID(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts = Date.now();
  return `${ts}-${rand}@yuvahub.xyz`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a RFC 5545 .ics string for a single event.
 */
export function buildICS(options: ICSEventOptions): string {
  const {
    title,
    startDate,
    startTime,
    durationMinutes = 60,
    location = "",
    description = "",
    url = "",
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  } = options;

  // Parse start datetime
  const [year, month, day] = startDate.split("-").map(Number);
  const timeComponents = startTime ? parseTimeString(startTime) : null;

  let dtStart: Date;
  let isAllDay = false;

  if (timeComponents) {
    // Construct a local date in the specified timezone by using UTC offset
    // approximation. For IST (UTC+5:30) this is accurate enough for v1.
    dtStart = new Date(year, month - 1, day, timeComponents.hours, timeComponents.minutes, 0);
  } else {
    isAllDay = true;
    dtStart = new Date(year, month - 1, day);
  }

  const dtEnd = new Date(dtStart.getTime() + durationMinutes * 60 * 1000);

  const now = toUTCStamp(new Date());
  const uid = generateUID();

  let dtStartProp: string;
  let dtEndProp: string;

  if (isAllDay) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateOnly = `${year}${pad(month)}${pad(day)}`;
    const endDay = new Date(dtEnd);
    const endDateOnly =
      endDay.getFullYear().toString() +
      pad(endDay.getMonth() + 1) +
      pad(endDay.getDate());
    dtStartProp = `DTSTART;VALUE=DATE:${dateOnly}`;
    dtEndProp = `DTEND;VALUE=DATE:${endDateOnly}`;
  } else {
    // Emit with TZID so calendar apps apply the correct offset
    const startStamp = toLocalStamp(dtStart);
    const endStamp = toLocalStamp(dtEnd);
    dtStartProp = `DTSTART;TZID=${timezone}:${startStamp}`;
    dtEndProp = `DTEND;TZID=${timezone}:${endStamp}`;
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YuvaHub//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtStartProp,
    dtEndProp,
    foldLine(`SUMMARY:${escapeText(title)}`),
  ];

  if (location) {
    lines.push(foldLine(`LOCATION:${escapeText(location)}`));
  }

  // Combine description and URL into the DESCRIPTION field
  const descParts: string[] = [];
  if (description) descParts.push(escapeText(description));
  if (url) descParts.push(`Event link: ${url}`);
  if (descParts.length > 0) {
    lines.push(foldLine(`DESCRIPTION:${descParts.join("\\n")}`));
  }

  if (url) {
    lines.push(foldLine(`URL:${url}`));
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

/**
 * Trigger a browser download of a .ics file for the given event.
 */
export function downloadICS(options: ICSEventOptions): void {
  const icsContent = buildICS(options);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  // Sanitize the filename: keep alphanumeric, spaces → underscores
  const safeName = options.title
    .replace(/[^a-z0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  anchor.setAttribute("href", url);
  anchor.setAttribute("download", `${safeName}.ics`);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
