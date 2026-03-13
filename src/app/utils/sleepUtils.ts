import type { SleepRecord } from '../types';

/**
 * Adjust displayed duration by changing "excluded" (paused) time.
 * Positive mins = show more (reduce excluded). Negative mins = show less (add excluded).
 * Start time is never changed.
 */
export function adjustActiveSleepItem(
  record: SleepRecord,
  mins: number,
  now = Date.now(),
): SleepRecord {
  const elapsed = now - record.startTime;
  const currentExcluded = record.excludedMs ?? 0;
  const newExcluded = currentExcluded - mins * 60_000;
  // Clamp so displayed (elapsed - excluded) is not negative; allow negative excluded to "add" time
  const clamped = Math.min(newExcluded, elapsed - 0);
  return { ...record, excludedMs: clamped };
}

/**
 * Set displayed duration of an active sleep session (for picker).
 */
export function setActiveSleepDisplayedDuration(record: SleepRecord, displayedMs: number, now = Date.now()): SleepRecord {
  const elapsed = now - record.startTime;
  const excludedMs = Math.max(0, elapsed - displayedMs);
  return { ...record, excludedMs };
}

/**
 * Adjust a SAVED sleep record's displayed duration via excludedMs.
 */
export function adjustSleepHistoryItem(record: SleepRecord, mins: number): SleepRecord {
  const wall = (record.endTime ?? Date.now()) - record.startTime;
  const currentExcluded = record.excludedMs ?? 0;
  const newExcluded = currentExcluded - mins * 60_000;
  const clamped = Math.min(newExcluded, wall - 60_000); // at least 1 min displayed
  return { ...record, excludedMs: clamped };
}

/** Set displayed duration for a saved sleep record (for duration picker on history). */
export function setSleepHistoryDisplayedDuration(record: SleepRecord, displayedMs: number): SleepRecord {
  const wall = (record.endTime ?? Date.now()) - record.startTime;
  const excludedMs = Math.min(wall - 60_000, Math.max(0, wall - displayedMs));
  return { ...record, excludedMs };
}

/** Displayed duration for a sleep record (ms). */
export function sleepDisplayedDurationMs(record: SleepRecord, now = Date.now()): number {
  const end = record.endTime ?? now;
  const elapsed = end - record.startTime;
  return Math.max(0, elapsed - (record.excludedMs ?? 0));
}

/**
 * Ends the current sleep session if one is active (e.g. when the user starts feeding).
 * Returns true if a session was ended.
 *
 * Guards against corrupt localStorage data by catching JSON parse errors.
 */
export function endCurrentSleepIfActive(
  onSaved?: (sleepHistory: { id: string; position: string; startTime: number; endTime?: number }[]) => void
): boolean {
  try {
    const raw = localStorage.getItem('currentSleep');
    if (!raw) return false;

    const currentSleep = JSON.parse(raw) as { id: string; position: string; startTime: number };
    if (!currentSleep?.id) return false; // guard against unexpected shapes

    const completed = { ...currentSleep, endTime: Date.now() };

    const historyRaw = localStorage.getItem('sleepHistory');
    const sleepHistory = historyRaw ? JSON.parse(historyRaw) : [];
    sleepHistory.push(completed);
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
    localStorage.removeItem('currentSleep');

    onSaved?.(sleepHistory);
    return true;
  } catch {
    // Corrupt localStorage data — fail silently so the app keeps running
    return false;
  }
}
