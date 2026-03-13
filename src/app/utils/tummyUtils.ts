import type { TummyTimeRecord } from '../types';

/**
 * Adjust displayed duration by changing "excluded" (paused) time.
 * Start time is never changed.
 */
export function adjustActiveTummyItem(
  record: TummyTimeRecord,
  mins: number,
  now = Date.now(),
): TummyTimeRecord {
  const elapsed = now - record.startTime;
  const currentExcluded = record.excludedMs ?? 0;
  const newExcluded = Math.min(currentExcluded - mins * 60_000, elapsed);
  return { ...record, excludedMs: newExcluded };
}

/** Set displayed duration for picker. */
export function setActiveTummyDisplayedDuration(record: TummyTimeRecord, displayedMs: number, now = Date.now()): TummyTimeRecord {
  const elapsed = now - record.startTime;
  const excludedMs = Math.max(0, elapsed - displayedMs);
  return { ...record, excludedMs };
}

export function adjustTummyHistoryItem(record: TummyTimeRecord, mins: number): TummyTimeRecord {
  const wall = (record.endTime ?? Date.now()) - record.startTime;
  const currentExcluded = record.excludedMs ?? 0;
  const newExcluded = Math.min(currentExcluded - mins * 60_000, wall - 60_000);
  return { ...record, excludedMs: newExcluded };
}

/** Set displayed duration for a saved tummy time record (for duration picker on history). */
export function setTummyHistoryDisplayedDuration(record: TummyTimeRecord, displayedMs: number): TummyTimeRecord {
  const wall = (record.endTime ?? Date.now()) - record.startTime;
  const excludedMs = Math.min(wall - 60_000, Math.max(0, wall - displayedMs));
  return { ...record, excludedMs };
}

export function tummyDisplayedDurationMs(record: TummyTimeRecord, now = Date.now()): number {
  const end = record.endTime ?? now;
  return Math.max(0, end - record.startTime - (record.excludedMs ?? 0));
}
