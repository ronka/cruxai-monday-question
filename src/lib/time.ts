// Time-zone helpers built on Intl (no extra dependency). An "instant" is a UTC
// millisecond timestamp. A "wall time" is a calendar date and clock time in a
// specific IANA time zone.

export interface WallTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, format);
  }
  return format;
}

/** Wall time of an instant in a time zone. */
export function toWallTime(instant: number, timeZone: string): WallTime {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(new Date(instant)).map((p) => [p.type, p.value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour % 24, minute: +parts.minute };
}

/** UTC offset of a zone at an instant, in minutes (e.g. +60 for Europe/London in summer). */
export function offsetMinutes(instant: number, timeZone: string): number {
  const wall = toWallTime(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  return Math.round((asUtc - Math.floor(instant / 60000) * 60000) / 60000);
}

/**
 * Instant for a wall time in a zone. For wall times that do not exist (spring
 * forward gap) the result is shifted forward by the gap; for ambiguous wall
 * times (fall back) the earlier instant is returned.
 */
export function fromWallTime(wall: WallTime, timeZone: string): number {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const first = guess - offsetMinutes(guess, timeZone) * 60000;
  const second = guess - offsetMinutes(first, timeZone) * 60000;
  const matches = [first, second].filter((instant) => {
    const actual = toWallTime(instant, timeZone);
    return actual.day === wall.day && actual.hour === wall.hour && actual.minute === wall.minute;
  });
  return matches.length ? Math.min(...matches) : Math.max(first, second);
}

/** "YYYY-MM-DD" for a wall time. */
export function dateKey(wall: Pick<WallTime, "year" | "month" | "day">): string {
  return `${wall.year}-${String(wall.month).padStart(2, "0")}-${String(wall.day).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Pick<WallTime, "year" | "month" | "day"> {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/** Adds calendar days to a date key (zone-independent). */
export function addDays(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return dateKey({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Start (Sunday) of the week containing a date key. */
export function startOfWeek(key: string): string {
  return addDays(key, -weekday(key));
}

export function formatInZone(instant: number, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(instant).toLocaleString("en-US", { timeZone, ...options });
}

export const TIME_ZONES = [
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];
