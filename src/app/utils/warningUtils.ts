/**
 * Pure warning-check logic, fully decoupled from React and localStorage.
 * All functions take plain data arrays so they can be unit-tested without DOM.
 */
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord } from '../types';

export type WarningKey =
  | 'feeding-due'
  | 'feeding-soon'
  | 'same-position'
  | 'no-poop'
  | 'no-sleep'
  | 'no-tummy-time'
  | 'painkiller-due';

const PAINKILLER_INTERVAL_HOURS = 8;

/**
 * Compute which warning keys are active given snapshot data and a reference
 * timestamp (defaults to `Date.now()` for real use; pass a fixed value in tests).
 */
export function computeWarnings({
  feedingHistory,
  sleepHistory,
  diaperHistory,
  tummyTimeHistory,
  painkillerHistory,
  feedingIntervalHours = 3,
  now = Date.now(),
}: {
  feedingHistory: FeedingRecord[];
  sleepHistory: SleepRecord[];
  diaperHistory: DiaperRecord[];
  tummyTimeHistory: TummyTimeRecord[];
  painkillerHistory: { id: string; timestamp: number }[];
  feedingIntervalHours?: number;
  now?: number;
}): WarningKey[] {
  const warnings: WarningKey[] = [];

  // ─── Feeding ─────────────────────────────────────────────────────────────────
  if (feedingHistory.length > 0) {
    const last = feedingHistory[feedingHistory.length - 1];
    const lastEnd = last.endTime ?? last.timestamp;
    if (Number.isFinite(lastEnd)) {
      const hours = (now - lastEnd) / 3_600_000;
      if (hours >= feedingIntervalHours) warnings.push('feeding-due');
      else if (hours >= feedingIntervalHours - 0.5) warnings.push('feeding-soon');
    }
  }

  // ─── Sleep position ───────────────────────────────────────────────────────────
  if (sleepHistory.length >= 3) {
    const last3 = sleepHistory.slice(-3);
    const first = last3[0];
    if (first && last3.every((s) => s?.position === first?.position) && first?.position !== 'Back') {
      warnings.push('same-position');
    }
  }

  // ─── No poop in 24 h ─────────────────────────────────────────────────────────
  const oneDayAgo = now - 24 * 60 * 60 * 1_000;
  const recentPoops = diaperHistory.filter(
    (d) => (d.type === 'poop' || d.type === 'both') && d.timestamp > oneDayAgo,
  );
  if (recentPoops.length === 0 && diaperHistory.length > 0) {
    warnings.push('no-poop');
  }

  // ─── No sleep in 6 h ─────────────────────────────────────────────────────────
  const sixHoursAgo = now - 6 * 60 * 60 * 1_000;
  const recentSleep = sleepHistory.filter((s) => s.startTime > sixHoursAgo);
  if (recentSleep.length === 0 && sleepHistory.length > 0) {
    warnings.push('no-sleep');
  }

  // ─── No tummy time today ──────────────────────────────────────────────────────
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const todayTummy = tummyTimeHistory.filter((t) => t.startTime > todayStart);
  if (todayTummy.length === 0 && tummyTimeHistory.length > 0) {
    warnings.push('no-tummy-time');
  }

  // ─── Painkiller ───────────────────────────────────────────────────────────────
  if (painkillerHistory.length > 0) {
    const last = painkillerHistory[painkillerHistory.length - 1];
    if (Number.isFinite(last.timestamp)) {
      const hours = (now - last.timestamp) / 3_600_000;
      if (hours >= PAINKILLER_INTERVAL_HOURS) warnings.push('painkiller-due');
    }
  }

  return warnings;
}

/**
 * Safely read and JSON-parse a localStorage array.
 * Returns `[]` on any error (missing key, corrupt JSON, non-array value).
 */
export function readStoredArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Safely read the feeding interval setting.
 * Returns the default (3 h) on any error or invalid value.
 */
export function readFeedingInterval(): number {
  try {
    const raw = localStorage.getItem('feedingInterval');
    if (!raw || raw === '[]') return 3;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0) return parsed;
    if (typeof parsed === 'string') {
      const n = parseInt(parsed, 10);
      return Number.isFinite(n) && n > 0 ? n : 3;
    }
    return 3;
  } catch {
    return 3;
  }
}
