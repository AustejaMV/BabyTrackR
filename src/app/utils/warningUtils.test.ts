import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeWarnings, readStoredArray, readFeedingInterval } from './warningUtils';
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const h = (hours: number) => hours * 3_600_000;

const NOW = 1_700_000_000_000; // fixed epoch for deterministic tests

function baseArgs(overrides = {}) {
  return {
    feedingHistory: [] as FeedingRecord[],
    sleepHistory: [] as SleepRecord[],
    diaperHistory: [] as DiaperRecord[],
    tummyTimeHistory: [] as TummyTimeRecord[],
    painkillerHistory: [] as { id: string; timestamp: number }[],
    feedingIntervalHours: 3,
    now: NOW,
    ...overrides,
  };
}

// ─── computeWarnings ──────────────────────────────────────────────────────────

describe('computeWarnings', () => {
  describe('feeding-due', () => {
    it('returns feeding-due when last feeding ended > interval hours ago', () => {
      const feeding: FeedingRecord = { id: '1', timestamp: NOW - h(4), endTime: NOW - h(4) };
      const w = computeWarnings(baseArgs({ feedingHistory: [feeding] }));
      expect(w).toContain('feeding-due');
    });

    it('returns feeding-soon when within 30min of interval', () => {
      const feeding: FeedingRecord = { id: '1', timestamp: NOW - h(2.6), endTime: NOW - h(2.6) };
      const w = computeWarnings(baseArgs({ feedingHistory: [feeding] }));
      expect(w).toContain('feeding-soon');
      expect(w).not.toContain('feeding-due');
    });

    it('returns no feeding warning when fed recently', () => {
      const feeding: FeedingRecord = { id: '1', timestamp: NOW - h(1), endTime: NOW - h(1) };
      const w = computeWarnings(baseArgs({ feedingHistory: [feeding] }));
      expect(w).not.toContain('feeding-due');
      expect(w).not.toContain('feeding-soon');
    });

    it('uses timestamp when endTime is absent (legacy record)', () => {
      const feeding: FeedingRecord = { id: '1', timestamp: NOW - h(4) };
      const w = computeWarnings(baseArgs({ feedingHistory: [feeding] }));
      expect(w).toContain('feeding-due');
    });

    it('ignores feeding record with NaN/invalid endTime', () => {
      const feeding = { id: '1', timestamp: NaN, endTime: NaN } as unknown as FeedingRecord;
      const w = computeWarnings(baseArgs({ feedingHistory: [feeding] }));
      expect(w).not.toContain('feeding-due');
      expect(w).not.toContain('feeding-soon');
    });

    it('uses custom feedingIntervalHours', () => {
      const feeding: FeedingRecord = { id: '1', timestamp: NOW - h(2.5), endTime: NOW - h(2.5) };
      const w = computeWarnings(baseArgs({ feedingHistory: [feeding], feedingIntervalHours: 2 }));
      expect(w).toContain('feeding-due');
    });

    it('no warning when feedingHistory is empty', () => {
      const w = computeWarnings(baseArgs());
      expect(w).not.toContain('feeding-due');
    });
  });

  describe('same-position', () => {
    it('warns when last 3 sleeps have the same non-Back position', () => {
      const mk = (pos: string): SleepRecord => ({ id: String(Math.random()), position: pos, startTime: NOW });
      const w = computeWarnings(baseArgs({ sleepHistory: [mk('Left'), mk('Left'), mk('Left')] }));
      expect(w).toContain('same-position');
    });

    it('no warning when position is Back', () => {
      const mk = (): SleepRecord => ({ id: String(Math.random()), position: 'Back', startTime: NOW });
      const w = computeWarnings(baseArgs({ sleepHistory: [mk(), mk(), mk()] }));
      expect(w).not.toContain('same-position');
    });

    it('no warning when positions are mixed', () => {
      const sleepHistory: SleepRecord[] = [
        { id: '1', position: 'Left', startTime: NOW },
        { id: '2', position: 'Right', startTime: NOW },
        { id: '3', position: 'Left', startTime: NOW },
      ];
      const w = computeWarnings(baseArgs({ sleepHistory }));
      expect(w).not.toContain('same-position');
    });

    it('no warning with fewer than 3 sleep records', () => {
      const sleepHistory: SleepRecord[] = [
        { id: '1', position: 'Left', startTime: NOW },
        { id: '2', position: 'Left', startTime: NOW },
      ];
      const w = computeWarnings(baseArgs({ sleepHistory }));
      expect(w).not.toContain('same-position');
    });

    it('handles records with undefined position gracefully', () => {
      const sleepHistory = [
        { id: '1', position: undefined as unknown as string, startTime: NOW },
        { id: '2', position: undefined as unknown as string, startTime: NOW },
        { id: '3', position: undefined as unknown as string, startTime: NOW },
      ] as SleepRecord[];
      // all same (undefined) and not 'Back' — technically warns, but must not throw
      expect(() => computeWarnings(baseArgs({ sleepHistory }))).not.toThrow();
    });
  });

  describe('no-poop', () => {
    it('warns when no poop in 24h but older diapers exist', () => {
      const old: DiaperRecord = { id: '1', type: 'poop', timestamp: NOW - h(30) };
      const w = computeWarnings(baseArgs({ diaperHistory: [old] }));
      expect(w).toContain('no-poop');
    });

    it('no warning when poop recorded in last 24h', () => {
      const recent: DiaperRecord = { id: '1', type: 'poop', timestamp: NOW - h(2) };
      const w = computeWarnings(baseArgs({ diaperHistory: [recent] }));
      expect(w).not.toContain('no-poop');
    });

    it('"both" type counts as poop', () => {
      const old: DiaperRecord = { id: '1', type: 'both', timestamp: NOW - h(30) };
      const recent: DiaperRecord = { id: '2', type: 'both', timestamp: NOW - h(2) };
      expect(computeWarnings(baseArgs({ diaperHistory: [old] }))).toContain('no-poop');
      expect(computeWarnings(baseArgs({ diaperHistory: [recent] }))).not.toContain('no-poop');
    });

    it('no warning when diaperHistory is empty', () => {
      const w = computeWarnings(baseArgs());
      expect(w).not.toContain('no-poop');
    });
  });

  describe('no-sleep', () => {
    it('warns when no sleep in last 6h but older records exist', () => {
      const old: SleepRecord = { id: '1', position: 'Back', startTime: NOW - h(8) };
      const w = computeWarnings(baseArgs({ sleepHistory: [old] }));
      expect(w).toContain('no-sleep');
    });

    it('no warning when sleep recorded in last 6h', () => {
      const recent: SleepRecord = { id: '1', position: 'Back', startTime: NOW - h(2) };
      const w = computeWarnings(baseArgs({ sleepHistory: [recent] }));
      expect(w).not.toContain('no-sleep');
    });

    it('no warning when sleepHistory is empty', () => {
      expect(computeWarnings(baseArgs())).not.toContain('no-sleep');
    });
  });

  describe('no-tummy-time', () => {
    const todayStart = new Date(NOW).setHours(0, 0, 0, 0);

    it('warns when no tummy time today but older records exist', () => {
      const old: TummyTimeRecord = { id: '1', startTime: todayStart - h(1) };
      const w = computeWarnings(baseArgs({ tummyTimeHistory: [old] }));
      expect(w).toContain('no-tummy-time');
    });

    it('no warning when tummy time logged today', () => {
      const today: TummyTimeRecord = { id: '1', startTime: todayStart + 1 };
      const w = computeWarnings(baseArgs({ tummyTimeHistory: [today] }));
      expect(w).not.toContain('no-tummy-time');
    });

    it('no warning when history is empty', () => {
      expect(computeWarnings(baseArgs())).not.toContain('no-tummy-time');
    });
  });

  describe('painkiller-due', () => {
    it('warns when 8h have passed since last dose', () => {
      const dose = { id: '1', timestamp: NOW - h(9) };
      const w = computeWarnings(baseArgs({ painkillerHistory: [dose] }));
      expect(w).toContain('painkiller-due');
    });

    it('no warning when last dose was < 8h ago', () => {
      const dose = { id: '1', timestamp: NOW - h(4) };
      const w = computeWarnings(baseArgs({ painkillerHistory: [dose] }));
      expect(w).not.toContain('painkiller-due');
    });

    it('ignores invalid (NaN) timestamp', () => {
      const dose = { id: '1', timestamp: NaN };
      const w = computeWarnings(baseArgs({ painkillerHistory: [dose] }));
      expect(w).not.toContain('painkiller-due');
    });

    it('no warning when painkillerHistory is empty', () => {
      expect(computeWarnings(baseArgs())).not.toContain('painkiller-due');
    });
  });

  describe('multiple warnings at once', () => {
    it('can return several warnings simultaneously', () => {
      const oldFeeding: FeedingRecord = { id: '1', timestamp: NOW - h(5), endTime: NOW - h(5) };
      const oldSleep: SleepRecord = { id: '1', position: 'Left', startTime: NOW - h(10) };
      const w = computeWarnings(baseArgs({ feedingHistory: [oldFeeding], sleepHistory: [oldSleep] }));
      expect(w).toContain('feeding-due');
      expect(w).toContain('no-sleep');
    });
  });
});

// ─── readStoredArray ──────────────────────────────────────────────────────────

describe('readStoredArray', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
    // clear between tests
    Object.keys(store).forEach((k) => delete store[k]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns [] when key is missing', () => {
    expect(readStoredArray('missing')).toEqual([]);
  });

  it('returns [] on empty string', () => {
    store['k'] = '';
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns [] on corrupt JSON', () => {
    store['k'] = '{not valid json!!!';
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns [] when stored value is not an array', () => {
    store['k'] = JSON.stringify({ foo: 1 });
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns [] when stored value is a number', () => {
    store['k'] = '42';
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns [] when stored value is null', () => {
    store['k'] = 'null';
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns the parsed array when valid', () => {
    store['k'] = JSON.stringify([{ id: '1' }, { id: '2' }]);
    expect(readStoredArray('k')).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns [] when localStorage.getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
    });
    expect(readStoredArray('k')).toEqual([]);
  });
});

// ─── readFeedingInterval ──────────────────────────────────────────────────────

describe('readFeedingInterval', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    });
    Object.keys(store).forEach((k) => delete store[k]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 3 when key is absent', () => {
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns 3 when value is "[]"', () => {
    store['feedingInterval'] = '[]';
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns the numeric value when valid', () => {
    store['feedingInterval'] = '4';
    expect(readFeedingInterval()).toBe(4);
  });

  it('parses a stringified number', () => {
    store['feedingInterval'] = '"2"';
    expect(readFeedingInterval()).toBe(2);
  });

  it('returns 3 for NaN string', () => {
    store['feedingInterval'] = '"abc"';
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns 3 for corrupt JSON', () => {
    store['feedingInterval'] = '{bad';
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns 3 for zero (not a valid interval)', () => {
    store['feedingInterval'] = '0';
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns 3 for negative value', () => {
    store['feedingInterval'] = '-1';
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns 3 for Infinity', () => {
    store['feedingInterval'] = 'Infinity'; // JSON.parse('Infinity') throws
    expect(readFeedingInterval()).toBe(3);
  });

  it('returns 3 when localStorage throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
    expect(readFeedingInterval()).toBe(3);
  });
});
