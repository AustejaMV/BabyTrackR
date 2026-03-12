import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { endCurrentSleepIfActive } from './sleepUtils';

// ─── localStorage stub ────────────────────────────────────────────────────────

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

// ─── helpers ──────────────────────────────────────────────────────────────────

function setSleep(record: object) {
  store['currentSleep'] = JSON.stringify(record);
}

function setHistory(records: object[]) {
  store['sleepHistory'] = JSON.stringify(records);
}

function getHistory(): object[] {
  const raw = store['sleepHistory'];
  return raw ? JSON.parse(raw) : [];
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('endCurrentSleepIfActive', () => {
  it('returns false and does nothing when no active sleep session', () => {
    const result = endCurrentSleepIfActive();
    expect(result).toBe(false);
    expect(store['sleepHistory']).toBeUndefined();
  });

  it('returns true when an active sleep session exists', () => {
    setSleep({ id: 's1', position: 'Back', startTime: Date.now() - 60_000 });
    expect(endCurrentSleepIfActive()).toBe(true);
  });

  it('removes currentSleep from localStorage after ending', () => {
    setSleep({ id: 's1', position: 'Back', startTime: Date.now() - 60_000 });
    endCurrentSleepIfActive();
    expect(store['currentSleep']).toBeUndefined();
  });

  it('appends the completed record to sleepHistory', () => {
    setSleep({ id: 's1', position: 'Back', startTime: 1_000_000 });
    endCurrentSleepIfActive();
    const history = getHistory() as { id: string; endTime?: number }[];
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('s1');
    expect(history[0].endTime).toBeTypeOf('number');
  });

  it('appends to existing history (does not reset it)', () => {
    setHistory([{ id: 'old', position: 'Left Side', startTime: 500_000, endTime: 600_000 }]);
    setSleep({ id: 'new', position: 'Back', startTime: 700_000 });
    endCurrentSleepIfActive();
    expect(getHistory()).toHaveLength(2);
  });

  it('sets endTime to approximately now', () => {
    const before = Date.now();
    setSleep({ id: 's1', position: 'Back', startTime: before - 5_000 });
    endCurrentSleepIfActive();
    const after = Date.now();
    const { endTime } = (getHistory() as { endTime: number }[])[0];
    expect(endTime).toBeGreaterThanOrEqual(before);
    expect(endTime).toBeLessThanOrEqual(after);
  });

  it('calls onSaved callback with the updated history', () => {
    setSleep({ id: 's1', position: 'Right Side', startTime: Date.now() - 1_000 });
    const spy = vi.fn();
    endCurrentSleepIfActive(spy);
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0][0] as { id: string }[];
    expect(arg[0].id).toBe('s1');
  });

  it('starts a fresh history array when none exists in localStorage', () => {
    setSleep({ id: 's2', position: 'Back', startTime: Date.now() - 2_000 });
    endCurrentSleepIfActive();
    const history = getHistory() as { id: string }[];
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('s2');
  });

  it('returns false (and does not throw) when currentSleep contains corrupt JSON', () => {
    store['currentSleep'] = 'not-valid-json{{';
    expect(() => endCurrentSleepIfActive()).not.toThrow();
    expect(endCurrentSleepIfActive()).toBe(false);
  });

  it('returns false when currentSleep is stored as empty object (no id)', () => {
    store['currentSleep'] = JSON.stringify({});
    expect(endCurrentSleepIfActive()).toBe(false);
  });
});
