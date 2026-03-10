import { format } from "date-fns";

/**
 * Safely format a timestamp. Returns "—" when the value is null/undefined/NaN/0
 * so pages never throw "Invalid time value".
 */
export function safeFormat(ts: number | null | undefined, pattern: string, fallback = "—"): string {
  if (ts == null || !Number.isFinite(ts) || ts === 0) return fallback;
  try {
    return format(new Date(ts), pattern);
  } catch {
    return fallback;
  }
}
