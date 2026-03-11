import { format } from 'date-fns';

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
  const totalSeconds = Math.floor((Date.now() - timestamp) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}
