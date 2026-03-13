/**
 * Tummy time adjustments — what the timer shows when I add or subtract time.
 */
import { describe, it, expect } from 'vitest';
import { adjustActiveTummyItem, adjustTummyHistoryItem, tummyDisplayedDurationMs } from './tummyUtils';
import type { TummyTimeRecord } from '../types';

const NOW = 1_700_000_000_000;
const MIN = 60_000;

const makeActive = (startTime = NOW - 30 * MIN): TummyTimeRecord =>
  ({ id: 't1', startTime });

const makeSaved = (startTime = NOW - 30 * MIN, endTime = NOW): TummyTimeRecord =>
  ({ id: 't1', startTime, endTime });

// ─── Active session ───────────────────────────────────────────────────────────

describe('Adding time to a running tummy session (pause-based)', () => {
  it('+5 minutes makes the displayed duration 5 more minutes', () => {
    const r = makeActive(NOW - 30 * MIN);
    const updated = adjustActiveTummyItem(r, 5, NOW);
    expect(updated.startTime).toBe(r.startTime);
    expect(tummyDisplayedDurationMs(updated, NOW)).toBe(35 * MIN);
  });

  it('-5 minutes makes the displayed duration 5 fewer minutes', () => {
    const r = makeActive(NOW - 30 * MIN);
    const updated = adjustActiveTummyItem(r, -5, NOW);
    expect(updated.startTime).toBe(r.startTime);
    expect(tummyDisplayedDurationMs(updated, NOW)).toBe(25 * MIN);
  });

  it('subtracting more than elapsed clamps displayed duration, start unchanged', () => {
    const r = makeActive(NOW - 5 * MIN);
    const updated = adjustActiveTummyItem(r, -60, NOW);
    expect(updated.startTime).toBe(r.startTime);
    expect(tummyDisplayedDurationMs(updated, NOW)).toBeGreaterThanOrEqual(0);
  });

  it('start time is never modified', () => {
    const r = makeActive(2 * MIN);
    const updated = adjustActiveTummyItem(r, 999 * 60, NOW);
    expect(updated.startTime).toBe(2 * MIN);
  });
});

// ─── History entry ────────────────────────────────────────────────────────────

describe('Adjusting a saved tummy session in history (pause-based)', () => {
  it('+5 minutes increases the displayed duration by 5 minutes', () => {
    const start = NOW - 15 * MIN;
    const end   = NOW;
    const r = makeSaved(start, end);
    const updated = adjustTummyHistoryItem(r, 5);
    expect(updated.startTime).toBe(start);
    expect(updated.endTime).toBe(end);
    expect(tummyDisplayedDurationMs(updated)).toBe(20 * MIN);
  });

  it('cannot make displayed duration negative', () => {
    const r = makeSaved(NOW - 3 * MIN, NOW);
    const updated = adjustTummyHistoryItem(r, -10);
    expect(tummyDisplayedDurationMs(updated)).toBeGreaterThanOrEqual(0);
  });

  it('start time is never modified', () => {
    const r = makeSaved(2 * MIN, 10 * MIN);
    const updated = adjustTummyHistoryItem(r, 60);
    expect(updated.startTime).toBe(2 * MIN);
  });
});
