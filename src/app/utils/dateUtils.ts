import { format, parse, type Locale } from 'date-fns';
import { enGB } from 'date-fns/locale/en-GB';
import { lt } from 'date-fns/locale/lt';
import { de } from 'date-fns/locale/de';
import { fr } from 'date-fns/locale/fr';
import { es } from 'date-fns/locale/es';
import type { SupportedLocale } from './languageStorage';
import {
  userDatePattern,
  userTimePattern,
  userDateTimePattern,
  userShortDatePattern,
  userShortDateTimePattern,
  userDayDateTimePattern,
  userLongDatePattern,
  userDayMonthShortPattern,
  userMediumDatePattern,
  userWeekdayMediumDatePattern,
  userWeekdayLongDatePattern,
} from './formatPreferencesStorage';

/** User-facing short date — respects user preference (dd/MM/yyyy or MM/dd/yyyy). */
export function DATE_DISPLAY(): string { return userDatePattern(); }
/** User-facing long date pattern (named month, order from date preference). */
export function DATE_DISPLAY_LONG(): string {
  return userLongDatePattern();
}
/** User-facing time pattern — respects user preference (HH:mm or h:mm a). */
export function TIME_DISPLAY(): string { return userTimePattern(); }
/** Combined date + time pattern. */
export function DATETIME_DISPLAY(): string { return userDateTimePattern(); }
/** Short date without year (dd/MM or MM/dd). */
export function SHORT_DATE_DISPLAY(): string { return userShortDatePattern(); }
/** Short date + time — day/month order and 12h/24h from settings */
export function SHORT_DATETIME_DISPLAY(): string { return userShortDateTimePattern(); }
/** Weekday + short date + time — all from settings */
export function DAY_DATETIME_DISPLAY(): string { return userDayDateTimePattern(); }

const dateFnsLocales: Record<SupportedLocale, Locale> = {
  en: enGB,
  lt,
  de,
  fr,
  es,
};

export function getDateLocale(locale: SupportedLocale): Locale {
  return dateFnsLocales[locale] ?? enGB;
}

/**
 * Safely format a timestamp. Returns fallback when the value is
 * null/undefined/NaN/0 so pages never throw "Invalid time value".
 * Accepts an optional locale for patterns that contain month/day names.
 */
export function safeFormat(
  ts: number | null | undefined,
  pattern: string,
  fallback = '—',
  locale?: SupportedLocale,
): string {
  if (ts == null || !Number.isFinite(ts) || ts === 0) return fallback;
  try {
    const opts = locale ? { locale: dateFnsLocales[locale] } : undefined;
    return format(new Date(ts), pattern, opts);
  } catch {
    return fallback;
  }
}

/**
 * Convenience: format a timestamp using the user's chosen date format.
 */
export function formatDate(ts: number | null | undefined, fallback = '—'): string {
  return safeFormat(ts, DATE_DISPLAY(), fallback);
}

/**
 * Parse a date string in the user's chosen format (dd/MM/yyyy or MM/dd/yyyy).
 * Returns the Date or null if invalid.
 */
export function parseUserDateString(str: string): Date | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  try {
    const pattern = userDatePattern();
    const d = parse(trimmed, pattern, new Date());
    return Number.isFinite(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Convenience: format a timestamp as a long date with locale-aware month name.
 * e.g. "8 March 2025" (en) or "8 kovo 2025" (lt).
 */
export function formatDateLong(ts: number | null | undefined, locale: SupportedLocale = 'en', fallback = '—'): string {
  return safeFormat(ts, userLongDatePattern(), fallback, locale);
}

/** e.g. "8 Mar 2025" / "Mar 8, 2025" — respects date order preference */
export function formatMediumDate(ts: number | null | undefined, locale: SupportedLocale = 'en', fallback = '—'): string {
  return safeFormat(ts, userMediumDatePattern(), fallback, locale);
}

/** Weekday + medium date for modal headings */
export function formatWeekdayMediumDate(ts: number | null | undefined, locale: SupportedLocale = 'en', fallback = '—'): string {
  return safeFormat(ts, userWeekdayMediumDatePattern(), fallback, locale);
}

/** Memory book / long headings: weekday + long month */
export function formatWeekdayLongDate(ts: number | null | undefined, locale: SupportedLocale = 'en', fallback = '—'): string {
  return safeFormat(ts, userWeekdayLongDatePattern(), fallback, locale);
}

/** Short "8 Mar" / "Mar 8" */
export function formatDayMonthShort(ts: number | null | undefined, locale: SupportedLocale = 'en', fallback = '—'): string {
  return safeFormat(ts, userDayMonthShortPattern(), fallback, locale);
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
 * Human-readable intervals for Cradl notices / insights.
 * Avoids mixing large minute counts with decimal hours (e.g. "176 minutes (2.9 hours)").
 * Under 1h: "N minutes"; whole hours: "2 hours"; otherwise compact "2h 56m".
 */
export function formatIntervalMinutesProse(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "—";
  const m = Math.round(totalMinutes);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  if (m % 60 === 0) {
    const h = m / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return formatDurationShort(m * 60_000);
}

/** Same idea for millisecond durations (nap length, etc.). */
export function formatDurationMsProse(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  return formatIntervalMinutesProse(ms / 60_000);
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

/** Format time using the user's preferred clock format (24h or 12h). */
export function formatClockTime(ts: number | null | undefined, fallback = '—'): string {
  if (ts == null || !Number.isFinite(ts)) return fallback;
  try {
    return format(new Date(ts), TIME_DISPLAY());
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
