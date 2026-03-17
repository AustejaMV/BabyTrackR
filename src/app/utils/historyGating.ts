/**
 * History gating: free users see only last 30 days; premium see all.
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getTimestamp(entry: { timestamp?: string | number; startTime?: string | number; date?: string }): number | null {
  const ts = entry.timestamp ?? entry.startTime ?? entry.date;
  if (ts == null) return null;
  if (typeof ts === "number") return Number.isFinite(ts) ? ts : null;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * If isPremium: return all entries.
 * If not: return only entries within the last 30 days (by timestamp/startTime/date).
 * Entries without a timestamp field are included (e.g. metadata).
 */
export function filterBySubscription<T extends { timestamp?: string | number; startTime?: string | number; date?: string }>(
  entries: T[],
  isPremium: boolean
): T[] {
  if (!Array.isArray(entries)) return [];
  if (isPremium) return entries;
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return entries.filter((e) => {
    const ts = getTimestamp(e);
    if (ts === null) return true; // include entries with no timestamp
    return ts >= cutoff;
  });
}

/**
 * Returns the span in days from oldest to newest entry (using timestamp/startTime/date).
 */
export function getDaysOfDataAvailable(
  entries: Array<{ timestamp?: string | number; startTime?: string | number; date?: string }>
): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  let min: number | null = null;
  let max: number | null = null;
  entries.forEach((e) => {
    const ts = getTimestamp(e);
    if (ts !== null) {
      if (min == null || ts < min) min = ts;
      if (max == null || ts > max) max = ts;
    }
  });
  if (min == null || max == null) return 0;
  return Math.ceil((max - min) / (24 * 60 * 60 * 1000));
}
