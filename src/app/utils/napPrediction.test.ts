/**
 * Tests for nap prediction (wake windows, nap window, sweet spot).
 */
import { describe, it, expect, vi } from 'vitest';
import { getWakeWindowForAge } from '../data/wakeWindows';
import {
  getLastWakeTime,
  computeNapWindow,
  computePersonalisedOffset,
  getSweetSpotPrediction,
} from './napPrediction';
import type { SleepEntryLike } from './napPrediction';

const h = (hours: number) => hours * 3_600_000;
const NOW = 1_700_000_000_000;

describe('getWakeWindowForAge', () => {
  it('returns correct window for age 0 weeks', () => {
    const w = getWakeWindowForAge(0);
    expect(w).not.toBeNull();
    expect(w).toEqual({ minMinutes: 45, maxMinutes: 60 });
  });

  it('returns correct window for age 3 weeks', () => {
    const w = getWakeWindowForAge(3);
    expect(w).not.toBeNull();
    expect(w).toEqual({ minMinutes: 45, maxMinutes: 60 });
  });

  it('returns correct window for age 8 weeks', () => {
    const w = getWakeWindowForAge(8);
    expect(w).not.toBeNull();
    expect(w).toEqual({ minMinutes: 60, maxMinutes: 90 });
  });

  it('returns correct window for age 52 weeks', () => {
    const w = getWakeWindowForAge(52);
    expect(w).not.toBeNull();
    expect(w).toEqual({ minMinutes: 210, maxMinutes: 270 });
  });

  it('returns correct window for age 100 weeks', () => {
    const w = getWakeWindowForAge(100);
    expect(w).not.toBeNull();
    expect(w).toEqual({ minMinutes: 240, maxMinutes: 300 });
  });

  it('returns null for negative age', () => {
    expect(getWakeWindowForAge(-1)).toBeNull();
  });

  it('clamps very old ages to the last wake-window bracket', () => {
    expect(getWakeWindowForAge(250)).toEqual({ minMinutes: 240, maxMinutes: 300 });
  });
});

describe('getLastWakeTime', () => {
  it('returns null for empty history', () => {
    expect(getLastWakeTime([])).toBeNull();
  });

  it('returns null when all entries have no endTime', () => {
    const hist: SleepEntryLike[] = [
      { startTime: NOW - h(2), endTime: undefined },
      { startTime: NOW - h(5) },
    ];
    expect(getLastWakeTime(hist)).toBeNull();
  });

  it('returns endTime of most recent completed sleep', () => {
    const end = NOW - h(1);
    const hist: SleepEntryLike[] = [
      { startTime: NOW - h(5), endTime: NOW - h(4) },
      { startTime: NOW - h(3), endTime: end },
    ];
    const result = getLastWakeTime(hist);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(end);
  });
});

describe('computeNapWindow', () => {
  it('returns window for valid inputs', () => {
    const lastWake = new Date(NOW - h(1));
    const w = computeNapWindow(lastWake, 8);
    expect(w).not.toBeNull();
    expect(w!.opensAt.getTime()).toBe(lastWake.getTime() + 60 * 60 * 1000);
    expect(w!.closesAt.getTime()).toBe(lastWake.getTime() + 90 * 60 * 1000);
  });

  it('returns null when lastWakeTime is in the future', () => {
    const future = new Date(NOW + h(1));
    expect(computeNapWindow(future, 8, NOW)).toBeNull();
  });

  it('returns null when getWakeWindowForAge returns null', () => {
    const lastWake = new Date(NOW - h(1));
    expect(computeNapWindow(lastWake, -1)).toBeNull();
    expect(computeNapWindow(lastWake, Number.NaN)).toBeNull();
  });
});

describe('computePersonalisedOffset', () => {
  it('returns 0 when fewer than 7 valid wake→nap pairs', () => {
    const hist: SleepEntryLike[] = [];
    for (let i = 0; i < 6; i++) {
      const end = NOW - (14 - i) * h(1);
      hist.push({ startTime: end - h(0.5), endTime: end });
    }
    expect(computePersonalisedOffset(hist, 10, NOW)).toBe(0);
  });

  it('returns 0 when ageInWeeks < 4', () => {
    const hist: SleepEntryLike[] = [
      { startTime: NOW - h(2), endTime: NOW - h(1) },
      { startTime: NOW - h(0.5), endTime: null },
    ];
    expect(computePersonalisedOffset(hist, 3, NOW)).toBe(0);
  });

  it('returns 0 for entries outside 14 days', () => {
    const hist: SleepEntryLike[] = [
      { startTime: NOW - 20 * 24 * 3600 * 1000, endTime: NOW - 20 * 24 * 3600 * 1000 + h(1) },
    ];
    expect(computePersonalisedOffset(hist, 10, NOW)).toBe(0);
  });

  it('returns a number when 10+ valid pairs exist', () => {
    const hist: SleepEntryLike[] = [];
    for (let d = 0; d < 10; d++) {
      const wake = NOW - (10 - d) * 24 * 3600 * 1000 - h(2);
      const napStart = wake + 90 * 60 * 1000;
      hist.push({ startTime: wake - h(1), endTime: wake });
      hist.push({ startTime: napStart, endTime: napStart + h(0.5) });
    }
    const offset = computePersonalisedOffset(hist, 10, NOW);
    expect(typeof offset).toBe('number');
  });
});

describe('getSweetSpotPrediction', () => {
  it('returns null when babyDob is null', () => {
    const hist: SleepEntryLike[] = [{ startTime: NOW - h(2), endTime: NOW - h(1) }];
    expect(getSweetSpotPrediction(hist, null as unknown as string, NOW)).toBeNull();
  });

  it('returns null when sleepHistory is empty', () => {
    expect(getSweetSpotPrediction([], NOW - 30 * 24 * h(1), NOW)).toBeNull();
  });

  it('returns null when baby is under 4 weeks (no completed sleep for last wake)', () => {
    const dob = NOW - 2 * 7 * 24 * 3600 * 1000;
    const hist: SleepEntryLike[] = [{ startTime: NOW - h(2) }];
    expect(getLastWakeTime(hist)).toBeNull();
    expect(getSweetSpotPrediction(hist, dob, NOW)).toBeNull();
  });

  it('returns valid prediction with green status when now is inside window', () => {
    const dob = NOW - 10 * 7 * 24 * 3600 * 1000;
    const lastWake = NOW - 65 * 60 * 1000;
    const hist: SleepEntryLike[] = [{ startTime: lastWake - h(1), endTime: lastWake }];
    const pred = getSweetSpotPrediction(hist, dob, NOW);
    expect(pred).not.toBeNull();
    expect(pred!.status).toBe('green');
  });

  it('returns amber when now is within 15 min before opensAt', () => {
    const dob = NOW - 10 * 7 * 24 * 3600 * 1000;
    const lastWake = NOW - 50 * 60 * 1000;
    const hist: SleepEntryLike[] = [{ startTime: lastWake - h(1), endTime: lastWake }];
    const pred = getSweetSpotPrediction(hist, dob, NOW);
    expect(pred).not.toBeNull();
    expect(pred!.status).toBe('amber');
  });

  it('returns red when now is after closesAt', () => {
    const dob = NOW - 10 * 7 * 24 * 3600 * 1000;
    const lastWake = NOW - 2 * 60 * 60 * 1000;
    const hist: SleepEntryLike[] = [{ startTime: lastWake - h(1), endTime: lastWake }];
    const pred = getSweetSpotPrediction(hist, dob, NOW);
    expect(pred).not.toBeNull();
    expect(pred!.status).toBe('red');
  });

  it('returns null when last wake is older than 20h (stale anchor — missing logs)', () => {
    const dob = NOW - 10 * 7 * 24 * 3600 * 1000;
    const lastWake = NOW - 21 * 60 * 60 * 1000;
    const hist: SleepEntryLike[] = [{ startTime: lastWake - h(1), endTime: lastWake }];
    expect(getSweetSpotPrediction(hist, dob, NOW)).toBeNull();
  });

  it('returns null when ageInWeeks > 156', () => {
    const dob = NOW - 200 * 7 * 24 * 3600 * 1000;
    const hist: SleepEntryLike[] = [{ startTime: NOW - h(2), endTime: NOW - h(1) }];
    expect(getSweetSpotPrediction(hist, dob, NOW)).toBeNull();
  });
});
