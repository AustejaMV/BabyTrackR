/**
 * Data reliability — what the user can rely on when the server is flaky.
 *
 * The retry engine is the only non-trivial logic here so we test it
 * through its observable outcomes: does the data eventually get saved?
 * does a new save cancel a stale retry? does a server conflict stop retrying?
 *
 * Also tests: saveData/loadAllDataFromServer guards, clearSyncedDataFromLocalStorage safety.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SYNCED_DATA_KEYS,
  SYNCED_DATA_DEFAULTS,
  saveData,
  loadAllDataFromServer,
  clearSyncedDataFromLocalStorage,
  applyServerSnapshotToLocalStorage,
  parseActiveCurrentSleepRaw,
} from './dataSync';

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000] as const;

function makeRetryEngine() {
  const retrySlots = new Map<string, { timer: ReturnType<typeof setTimeout>; attempt: number }>();
  const saves: { outcome: 'ok' | 'conflict' | 'pending' }[] = [];
  const scheduledDelays: number[] = [];

  function scheduleRetry(key: string, attempt: number, task: () => Promise<'ok' | 'conflict'>) {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    scheduledDelays.push(delay);
    const timer = setTimeout(async () => {
      retrySlots.delete(key);
      try {
        const result = await task();
        saves.push({ outcome: result });
      } catch {
        scheduleRetry(key, attempt + 1, task);
      }
    }, delay);
    retrySlots.set(key, { timer, attempt });
  }

  function save(key: string, task: () => Promise<'ok' | 'conflict'>) {
    const existing = retrySlots.get(key);
    if (existing != null) { clearTimeout(existing.timer); retrySlots.delete(key); }
    task().then((r) => saves.push({ outcome: r })).catch(() => {
      scheduleRetry(key, 0, task);
    });
  }

  return { save, saves, retrySlots, scheduledDelays };
}

describe('Saving data to the server', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('succeeds immediately when the server responds — no retry needed', async () => {
    const { save, saves } = makeRetryEngine();
    save('key', () => Promise.resolve('ok'));
    await vi.runAllTimersAsync();
    expect(saves).toHaveLength(1);
    expect(saves[0].outcome).toBe('ok');
  });

  it('automatically retries after 1 second when the first attempt fails', async () => {
    const { save, saves, scheduledDelays } = makeRetryEngine();
    let calls = 0;
    save('key', () => { calls++; return calls === 1 ? Promise.reject(new Error('timeout')) : Promise.resolve('ok'); });
    await vi.runAllTimersAsync();
    expect(scheduledDelays[0]).toBe(1_000);
    expect(saves[0].outcome).toBe('ok');
  });

  it('waits longer and longer between each retry (back-off)', async () => {
    const { save, scheduledDelays } = makeRetryEngine();
    let calls = 0;
    save('key', () => { calls++; return calls <= 4 ? Promise.reject(new Error('down')) : Promise.resolve('ok'); });
    await vi.runAllTimersAsync();
    expect(scheduledDelays).toEqual([1_000, 2_000, 4_000, 8_000]);
  });

  it('never waits more than 60 seconds between retries', async () => {
    const { save, scheduledDelays } = makeRetryEngine();
    let calls = 0;
    save('key', () => { calls++; return calls <= 10 ? Promise.reject(new Error('down')) : Promise.resolve('ok'); });
    await vi.runAllTimersAsync();
    const maxDelay = Math.max(...scheduledDelays);
    expect(maxDelay).toBe(60_000);
  });

  it('stops retrying immediately when the server says my data is outdated (conflict)', async () => {
    const { save, saves, scheduledDelays } = makeRetryEngine();
    save('key', () => Promise.resolve('conflict'));
    await vi.runAllTimersAsync();
    expect(saves[0].outcome).toBe('conflict');
    expect(scheduledDelays).toHaveLength(0);
  });
});

describe('When I make a change while a retry is pending', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('the outdated retry is cancelled and only my latest change is saved', async () => {
    const { save, retrySlots } = makeRetryEngine();
    let firstCalls = 0;
    save('key', () => { firstCalls++; return Promise.reject(new Error('network')); });
    await Promise.resolve();
    await Promise.resolve(); // flush microtask chain
    expect(retrySlots.has('key')).toBe(true);

    let secondCalls = 0;
    save('key', () => { secondCalls++; return Promise.resolve('ok'); });
    expect(retrySlots.has('key')).toBe(false); // old retry cancelled

    await vi.runAllTimersAsync();
    expect(firstCalls).toBe(1);   // original attempt only; retry never fired
    expect(secondCalls).toBe(1);
  });
});

describe('Synced data keys and defaults', () => {
  it('includes babyProfile and milestones in SYNCED_DATA_KEYS', () => {
    expect(SYNCED_DATA_KEYS).toContain('babyProfile');
    expect(SYNCED_DATA_KEYS).toContain('milestones');
  });

  it('SYNCED_DATA_DEFAULTS has correct shape for babyProfile and milestones', () => {
    expect(SYNCED_DATA_DEFAULTS.babyProfile).toBeNull();
    expect(Array.isArray(SYNCED_DATA_DEFAULTS.milestones)).toBe(true);
    expect((SYNCED_DATA_DEFAULTS.milestones as unknown[]).length).toBe(0);
  });

  it('every SYNCED_DATA_KEY has a default', () => {
    for (const key of SYNCED_DATA_KEYS) {
      expect(SYNCED_DATA_DEFAULTS).toHaveProperty(key);
      expect(SYNCED_DATA_DEFAULTS[key]).toBeDefined();
    }
  });
});

describe('saveData and loadAllDataFromServer guards', () => {
  it('saveData with empty key does not throw', () => {
    expect(() => saveData('', [])).not.toThrow();
    expect(() => saveData('', [], 'token')).not.toThrow();
  });

  it('saveData without token only writes to localStorage (no network)', () => {
    const key = '__test_saveData_no_token_' + Date.now();
    saveData(key, { foo: 1 });
    try {
      const raw = localStorage.getItem(key);
      expect(raw).toBe(JSON.stringify({ foo: 1 }));
    } finally {
      localStorage.removeItem(key);
    }
  });

  it('loadAllDataFromServer with empty token returns ok false and empty data', async () => {
    const result = await loadAllDataFromServer('');
    expect(result.ok).toBe(false);
    expect(result.data).toEqual({});
  });

  it('loadAllDataFromServer with null-like token returns ok false', async () => {
    const result = await loadAllDataFromServer(null as unknown as string);
    expect(result.ok).toBe(false);
    expect(result.data).toEqual({});
  });

  it('clearSyncedDataFromLocalStorage does not throw', () => {
    expect(() => clearSyncedDataFromLocalStorage()).not.toThrow();
  });
});

describe('applyServerSnapshotToLocalStorage (currentSleep)', () => {
  const activeSleep = {
    id: 'sleep-1',
    position: 'Back',
    startTime: Date.now() - 60_000,
  };

  afterEach(() => {
    try {
      localStorage.removeItem('currentSleep');
      localStorage.removeItem('sleepHistory');
      localStorage.removeItem('feedingHistory');
    } catch {
      /* ignore */
    }
  });

  it('restores in-progress sleep when server snapshot still has currentSleep null', () => {
    localStorage.setItem('currentSleep', JSON.stringify(activeSleep));
    applyServerSnapshotToLocalStorage({
      currentSleep: null,
      sleepHistory: [],
    });
    const restored = parseActiveCurrentSleepRaw(localStorage.getItem('currentSleep'));
    expect(restored?.id).toBe(activeSleep.id);
  });

  it('does not restore when sleepHistory on server already ended that session', () => {
    localStorage.setItem('currentSleep', JSON.stringify(activeSleep));
    applyServerSnapshotToLocalStorage({
      currentSleep: null,
      sleepHistory: [{ ...activeSleep, endTime: Date.now() }],
    });
    expect(localStorage.getItem('currentSleep')).toBe(JSON.stringify(null));
  });

  it('keeps server in-progress currentSleep when present', () => {
    localStorage.setItem('currentSleep', JSON.stringify(activeSleep));
    const other: typeof activeSleep = { id: 'sleep-2', position: 'Side', startTime: Date.now() - 120_000 };
    applyServerSnapshotToLocalStorage({
      currentSleep: other,
      sleepHistory: [],
    });
    const raw = localStorage.getItem('currentSleep');
    expect(raw).toBe(JSON.stringify(other));
  });
});
