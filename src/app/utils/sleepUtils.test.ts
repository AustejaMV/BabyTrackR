/**
 * Auto-stopping sleep — when feeding starts, the active sleep session ends.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { endCurrentSleepIfActive, adjustActiveSleepItem, adjustSleepHistoryItem, sleepDisplayedDurationMs } from './sleepUtils';
import type { SleepRecord } from '../types';

const store: Record<string, string> = {};

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => Object.keys(store).forEach((k) => delete store[k]),
  });
});
afterEach(() => vi.unstubAllGlobals());

// Shorthand helpers — no implementation is being tested here
const startSleep = (overrides = {}) =>
  store['currentSleep'] = JSON.stringify({ id: 's1', position: 'Back', startTime: Date.now() - 60_000, ...overrides });
const getHistory = (): object[] => {
  const raw = store['sleepHistory'];
  return raw ? JSON.parse(raw) : [];
};

describe('When no sleep session is active', () => {
  it('nothing happens and the app does not crash', () => {
    expect(() => endCurrentSleepIfActive()).not.toThrow();
    expect(getHistory()).toHaveLength(0);
  });

  it('returns false so the caller knows nothing was stopped', () => {
    expect(endCurrentSleepIfActive()).toBe(false);
  });
});

describe('When baby was sleeping and I start feeding', () => {
  it('the sleep session is stopped automatically', () => {
    startSleep();
    expect(endCurrentSleepIfActive()).toBe(true);
  });

  it('the active sleep indicator disappears', () => {
    startSleep();
    endCurrentSleepIfActive();
    expect(store['currentSleep']).toBeUndefined();
  });

  it('the sleep session appears in history with an end time', () => {
    startSleep();
    endCurrentSleepIfActive();
    const history = getHistory() as { id: string; endTime?: number }[];
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('s1');
    expect(typeof history[0].endTime).toBe('number');
  });

  it('the end time is stamped as right now', () => {
    const before = Date.now();
    startSleep();
    endCurrentSleepIfActive();
    const after = Date.now();
    const { endTime } = (getHistory() as { endTime: number }[])[0];
    expect(endTime).toBeGreaterThanOrEqual(before);
    expect(endTime).toBeLessThanOrEqual(after);
  });

  it('previous sleep sessions are kept — history is not wiped', () => {
    store['sleepHistory'] = JSON.stringify([{ id: 'prev', position: 'Left Side', startTime: 500_000, endTime: 600_000 }]);
    startSleep({ id: 'current' });
    endCurrentSleepIfActive();
    expect(getHistory()).toHaveLength(2);
  });

  it('the caller (e.g. feeding page) receives the updated history to sync with server', () => {
    startSleep();
    const spy = vi.fn();
    endCurrentSleepIfActive(spy);
    expect(spy).toHaveBeenCalledOnce();
    const received = spy.mock.calls[0][0] as { id: string }[];
    expect(received[0].id).toBe('s1');
  });
});

describe('When localStorage data is corrupt', () => {
  it('does not crash — returns false gracefully', () => {
    store['currentSleep'] = 'this is not json !!!';
    expect(() => endCurrentSleepIfActive()).not.toThrow();
    expect(endCurrentSleepIfActive()).toBe(false);
  });

  it('does nothing when the stored sleep record has no id (incomplete save)', () => {
    store['currentSleep'] = JSON.stringify({});
    expect(endCurrentSleepIfActive()).toBe(false);
  });
});

// ─── Adjusting an active sleep timer ─────────────────────────────────────────

const NOW = 1_700_000_000_000;
const MIN = 60_000;

const makeSleep = (overrides: Partial<SleepRecord> = {}): SleepRecord => ({
  id: 's1', position: 'Back', startTime: NOW - 30 * MIN, ...overrides,
});

describe('Adding time to a running sleep session (pause-based: start time never changes)', () => {
  it('+5 minutes makes the displayed duration 5 minutes longer', () => {
    const r = makeSleep({ startTime: NOW - 30 * MIN });
    const updated = adjustActiveSleepItem(r, 5, NOW);
    expect(updated.startTime).toBe(r.startTime); // unchanged
    expect(sleepDisplayedDurationMs(updated, NOW)).toBe(35 * MIN);
  });

  it('subtracting more than elapsed clamps displayed duration to 0, start time unchanged', () => {
    const r = makeSleep({ startTime: NOW - 10 * MIN });
    const updated = adjustActiveSleepItem(r, -60, NOW);
    expect(updated.startTime).toBe(r.startTime);
    expect(sleepDisplayedDurationMs(updated, NOW)).toBeGreaterThanOrEqual(0);
  });

  it('start time is never modified', () => {
    const r = makeSleep({ startTime: 5 * MIN });
    const updated = adjustActiveSleepItem(r, 60, NOW);
    expect(updated.startTime).toBe(5 * MIN);
  });
});

describe('Adjusting a saved sleep history entry (pause-based)', () => {
  it('+10 minutes increases the visible duration by 10 minutes, start/end unchanged', () => {
    const start = NOW - 30 * MIN;
    const end = NOW;
    const r = makeSleep({ startTime: start, endTime: end });
    const updated = adjustSleepHistoryItem(r, 10);
    expect(updated.startTime).toBe(start);
    expect(updated.endTime).toBe(end);
    expect(sleepDisplayedDurationMs(updated)).toBe(40 * MIN);
  });

  it('cannot make displayed duration negative', () => {
    const r = makeSleep({ startTime: NOW - 5 * MIN, endTime: NOW });
    const updated = adjustSleepHistoryItem(r, -30);
    expect(sleepDisplayedDurationMs(updated)).toBeGreaterThanOrEqual(0);
  });

  it('start time is never modified', () => {
    const r = makeSleep({ startTime: 2 * MIN, endTime: 20 * MIN });
    const updated = adjustSleepHistoryItem(r, 60);
    expect(updated.startTime).toBe(2 * MIN);
  });
});
