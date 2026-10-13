// Calendar-date helpers for "YYYY-MM-DD" keys (no time zones involved).
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Number of nights from check-in to check-out (negative if reversed). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000);
}

/** Each night's date key from check-in up to (not including) check-out. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  return Array.from({ length: Math.max(0, nightsBetween(checkIn, checkOut)) }, (_, i) => addDays(checkIn, i));
}

export function isDateKey(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function formatDay(key: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...options });
}
