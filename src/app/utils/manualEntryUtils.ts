/**
 * Pure helpers for the "Log a past session" forms.
 * No React, no localStorage, no side-effects — fully testable in isolation.
 */

/**
 * Build a local-time ms timestamp from form string inputs.
 * Splits the ISO date string into numeric parts so the result always reflects
 * the user's local clock, avoiding the locale-dependent parsing that
 * `new Date("YYYY-MM-DDTHH:mm")` can perform.
 *
 * Returns NaN when the date is missing/malformed.
 */
export function buildTimestamp(
  date: string,     // "YYYY-MM-DD"
  hourStr: string,  // "0"–"23", "" treated as 0
  minStr: string,   // "0"–"59", "" treated as 0
): number {
  if (!date) return NaN;
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return NaN;
  const [year, month, day] = parts;
  const h = clamp(parseInt(hourStr || '0', 10), 0, 23);
  const m = clamp(parseInt(minStr  || '0', 10), 0, 59);
  if (isNaN(h) || isNaN(m)) return NaN;
  return new Date(year, month - 1, day, h, m).getTime();
}

/**
 * Build a duration in milliseconds from hour and minute string inputs.
 * Treats empty or unparseable strings as 0.  Negative values are clamped to 0.
 */
export function buildDurationMs(hourStr: string, minStr: string): number {
  const h = Math.max(0, parseInt(hourStr || '0', 10) || 0);
  const m = Math.max(0, parseInt(minStr  || '0', 10) || 0);
  return (h * 60 + m) * 60_000;
}

/**
 * Returns true when the form has enough data to save a manual session entry.
 *
 * Rules:
 *  - `date` must be a non-empty "YYYY-MM-DD" string
 *  - `startHourStr` must be provided (even "0" = midnight is valid)
 *  - at least one of `durHourStr` / `durMinStr` must parse to a positive integer
 *
 * The start-time minute field is always optional (defaults to :00).
 */
export function isManualEntryValid(
  date: string,
  startHourStr: string,
  durHourStr: string,
  durMinStr: string,
): boolean {
  if (!date) return false;
  if (startHourStr === '' || startHourStr == null) return false;
  const sh = parseInt(startHourStr, 10);
  if (isNaN(sh) || sh < 0 || sh > 23) return false;
  const dh = parseInt(durHourStr || '0', 10) || 0;
  const dm = parseInt(durMinStr  || '0', 10) || 0;
  return dh > 0 || dm > 0;
}

// ─── internal ─────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  if (isNaN(n)) return NaN;
  return Math.min(max, Math.max(min, n));
}
