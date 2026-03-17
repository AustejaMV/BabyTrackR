/**
 * Nap window and sweet spot prediction based on wake windows and sleep history.
 * Works with sleep entries that have startTime/endTime in epoch ms (SleepRecord).
 */

import { getWakeWindowForAge } from '../data/wakeWindows';

/** Minimal sleep entry shape: startTime/endTime in epoch ms (matches SleepRecord). */
export interface SleepEntryLike {
  startTime: number;
  endTime?: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * MS_PER_DAY;

/**
 * Returns the end time of the most recent completed sleep.
 * Guard: returns null if sleepHistory is empty or all entries have null/undefined endTime.
 */
export function getLastWakeTime(sleepHistory: SleepEntryLike[]): Date | null {
  if (!sleepHistory?.length) return null;
  const completed = sleepHistory
    .filter((s) => s.endTime != null && Number.isFinite(s.endTime))
    .sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
  if (completed.length === 0) return null;
  const last = completed[0];
  return last ? new Date(last.endTime!) : null;
}

export interface NapWindow {
  opensAt: Date;
  closesAt: Date;
  dangerAt: Date;
}

/**
 * Computes the nap window (opensAt, closesAt, dangerAt) from last wake time and age.
 * Guard: returns null if lastWakeTime is in the future.
 * Guard: returns null if getWakeWindowForAge returns null.
 */
export function computeNapWindow(
  lastWakeTime: Date,
  ageInWeeks: number,
  nowMs: number = Date.now(),
): NapWindow | null {
  if (lastWakeTime.getTime() > nowMs) return null;
  const windowForAge = getWakeWindowForAge(ageInWeeks);
  if (!windowForAge) return null;
  const lastMs = lastWakeTime.getTime();
  const opensAt = new Date(lastMs + windowForAge.minMinutes * 60 * 1000);
  const closesAt = new Date(lastMs + windowForAge.maxMinutes * 60 * 1000);
  const dangerAt = new Date(lastMs + (windowForAge.maxMinutes + 15) * 60 * 1000);
  return { opensAt, closesAt, dangerAt };
}

/**
 * Personalised offset in minutes: positive = baby naps earlier than typical, negative = later.
 * Uses last 14 days of sleep; for each wake→nap pair, computes actual time from wake to next sleep start.
 * Guard: returns 0 if fewer than 7 valid wake→nap pairs.
 * Guard: returns 0 if ageInWeeks < 4.
 */
export function computePersonalisedOffset(
  sleepHistory: SleepEntryLike[],
  ageInWeeks: number,
  now: number = Date.now(),
): number {
  if (ageInWeeks < 4) return 0;
  if (!sleepHistory?.length) return 0;
  const cutoff = now - FOURTEEN_DAYS_MS;
  const recent = sleepHistory
    .filter((s) => s.endTime != null && Number.isFinite(s.endTime) && s.endTime >= cutoff)
    .sort((a, b) => (a.endTime ?? 0) - (b.endTime ?? 0));
  const pairs: { wakeTime: number; nextStart: number }[] = [];
  for (let i = 0; i < recent.length - 1; i++) {
    const curr = recent[i];
    const next = recent[i + 1];
    if (!curr?.endTime || !next?.startTime) continue;
    if (next.startTime <= curr.endTime) continue;
    pairs.push({ wakeTime: curr.endTime, nextStart: next.startTime });
  }
  if (pairs.length < 7) return 0;
  const sumMinutes = pairs.reduce((acc, p) => acc + (p.nextStart - p.wakeTime) / (60 * 1000), 0);
  const avgMinutes = sumMinutes / pairs.length;
  const windowForAge = getWakeWindowForAge(ageInWeeks);
  if (!windowForAge) return 0;
  const midpoint = (windowForAge.minMinutes + windowForAge.maxMinutes) / 2;
  return Math.round(avgMinutes - midpoint);
}

export type SweetSpotStatus = 'green' | 'amber' | 'red' | 'unknown';

export interface SweetSpotPrediction {
  opensAt: Date;
  closesAt: Date;
  personalisedTime: Date | null;
  ageInWeeks: number;
  hasPersonalisedData: boolean;
  status: SweetSpotStatus;
}

/**
 * Full sweet spot prediction for the next nap.
 * Guard: returns null if babyDob is null.
 * Guard: returns null if sleepHistory is empty.
 * Guard: returns null if lastWakeTime is null.
 * Guard: returns null if nap window (getWakeWindowForAge) is null.
 * Guard: returns null if ageInWeeks > 156 (3 years).
 */
export function getSweetSpotPrediction(
  sleepHistory: SleepEntryLike[],
  babyDob: string | number | null,
  now: number = Date.now(),
): SweetSpotPrediction | null {
  if (babyDob == null || babyDob === '') return null;
  if (!sleepHistory?.length) return null;
  const dobMs = typeof babyDob === 'number' ? babyDob : new Date(babyDob).getTime();
  if (!Number.isFinite(dobMs)) return null;
  const ageInWeeks = (now - dobMs) / (7 * 24 * 60 * 60 * 1000);
  if (ageInWeeks > 156) return null;
  const lastWake = getLastWakeTime(sleepHistory);
  if (!lastWake) return null;
  const napWindow = computeNapWindow(lastWake, ageInWeeks, now);
  if (!napWindow) return null;
  const offsetMinutes = computePersonalisedOffset(sleepHistory, ageInWeeks, now);
  const hasPersonalisedData = offsetMinutes !== 0;
  const midpointMs = (napWindow.opensAt.getTime() + napWindow.closesAt.getTime()) / 2;
  const personalisedTime = hasPersonalisedData
    ? new Date(midpointMs + offsetMinutes * 60 * 1000)
    : null;
  const fifteenMinMs = 15 * 60 * 1000;
  let status: SweetSpotStatus = 'unknown';
  if (now >= napWindow.opensAt.getTime() && now <= napWindow.closesAt.getTime()) {
    status = 'green';
  } else if (now >= napWindow.opensAt.getTime() - fifteenMinMs && now < napWindow.opensAt.getTime()) {
    status = 'amber';
  } else if (now > napWindow.closesAt.getTime()) {
    status = 'red';
  }
  return {
    opensAt: napWindow.opensAt,
    closesAt: napWindow.closesAt,
    personalisedTime,
    ageInWeeks,
    hasPersonalisedData,
    status,
  };
}
