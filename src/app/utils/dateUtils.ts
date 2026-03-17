import { format } from 'date-fns';

/** User-facing short date: dd/mm/yyyy */
export const DATE_DISPLAY = 'dd/MM/yyyy';
/** User-facing long date: e.g. 8 March 2025 */
export const DATE_DISPLAY_LONG = 'd MMMM yyyy';

/**
 * Safely format a timestamp. Returns fallback when the value is
 * null/undefined/NaN/0 so pages never throw "Invalid time value".
 */
export function safeFormat(ts: number | null | undefined, pattern: string, fallback = '—'): string {
  if (ts == null || !Number.isFinite(ts) || ts === 0) return fallback;
  try {
    return format(new Date(ts), pattern);
  } catch {
    return fallback;
  }
}

/**
 * Format a millisecond duration as a timer string.
 *
 * - With seconds (default): "3:05" or "1:02:30"
 * - Without seconds:        "3m" or "1h 2m"
 */
export function formatDurationMs(ms: number, showSeconds = true): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (!showSeconds) {
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format a millisecond duration as a human-readable label for completed
 * sessions in history lists (no seconds needed for completed entries).
 *
 * Examples: "5m", "1h 2m"
 */
export function formatDurationShort(ms: number): string {
  return formatDurationMs(ms, false);
}

/**
 * Format an ongoing session duration as "Xm XXs" (shows seconds so the
 * live timer feels responsive). Falls back to "Xh Xm Xs" for long sessions.
 */
export function formatLiveDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Format a timestamp as a relative "X ago" string.
 *
 * Examples: "3m 05s ago", "1h 2m ago"
 */
export function getTimeSince(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return "just now";
  // If timestamp looks like seconds (e.g. < 1e11), convert to ms
  const tsMs = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const diffMs = Date.now() - tsMs;
  const totalSeconds = Math.floor(diffMs / 1000);
  if (totalSeconds < 0) return "just now";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

/** Format time as HH:mm (24h) for display. */
export function formatClockTime(ts: number | null | undefined, fallback = '—'): string {
  if (ts == null || !Number.isFinite(ts)) return fallback;
  try {
    return format(new Date(ts), 'HH:mm');
  } catch {
    return fallback;
  }
}

/** Format as "HH:mm" and "Xm ago" / "Xh Ym ago" for recent times (clock times everywhere). */
export function formatTimeAndAgo(ts: number | null | undefined, nowMs: number = Date.now()): { time: string; ago: string } {
  if (ts == null || !Number.isFinite(ts)) return { time: '—', ago: '' };
  const time = formatClockTime(ts, '—');
  const diffMs = nowMs - ts;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const remainderMins = mins % 60;
  const ago =
    hours >= 1
      ? remainderMins > 0
        ? `${hours}h ${remainderMins}m ago`
        : `${hours}h ago`
      : mins < 1
        ? 'just now'
        : `${mins}m ago`;
  return { time, ago };
}

/** Format "Last fed at HH:mm · Xh Ym ago" or "Next feed: around HH:mm". */
export function formatLastAtAndAgo(ts: number | null | undefined, nowMs: number = Date.now()): string {
  if (ts == null || !Number.isFinite(ts)) return '—';
  const { time, ago } = formatTimeAndAgo(ts, nowMs);
  return `${time} · ${ago}`;
}

/** Next feed ETA as clock time: "around HH:mm" from lastFeedEndMs + intervalHours. */
export function formatNextFeedClock(lastFeedEndMs: number | null | undefined, intervalHours: number, nowMs: number = Date.now()): string {
  if (lastFeedEndMs == null || !Number.isFinite(lastFeedEndMs) || !Number.isFinite(intervalHours) || intervalHours <= 0)
    return '—';
  const nextMs = lastFeedEndMs + intervalHours * 60 * 60 * 1000;
  if (nextMs <= nowMs) return 'now';
  return `around ${formatClockTime(nextMs, '—')}`;
}

/** Format ETA e.g. "in 45m" or "at 14:30". */
export function formatETA(msFromNow: number): string {
  if (!Number.isFinite(msFromNow) || msFromNow < 0) return '—';
  const mins = Math.floor(msFromNow / 60000);
  const hours = Math.floor(mins / 60);
  if (hours >= 1) return `in ${hours}h ${mins % 60}m`;
  if (mins < 1) return 'soon';
  return `in ${mins}m`;
}
