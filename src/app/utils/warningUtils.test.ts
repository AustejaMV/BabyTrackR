/**
 * Warning indicators — what the user sees on the dashboard when something needs attention.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeWarnings, readStoredArray, readFeedingInterval } from './warningUtils';
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord } from '../types';

const h = (hours: number) => hours * 3_600_000;
const NOW = 1_700_000_000_000;

function base(overrides = {}) {
  return {
    feedingHistory:    [] as FeedingRecord[],
    sleepHistory:      [] as SleepRecord[],
    diaperHistory:     [] as DiaperRecord[],
    tummyTimeHistory:  [] as TummyTimeRecord[],
    painkillerHistory: [] as { id: string; timestamp: number }[],
    feedingIntervalHours: 3,
    now: NOW,
    ...overrides,
  };
}

// ─── Feeding warning ───────────────────────────────────────────────────────────

describe('"Feeding overdue" banner', () => {
  it('appears when the last feeding ended more than 3 hours ago', () => {
    const f: FeedingRecord = { id: '1', timestamp: NOW - h(4), endTime: NOW - h(4) };
    expect(computeWarnings(base({ feedingHistory: [f] }))).toContain('feed-overdue');
  });

  it('appears even for old records without endTime (legacy data)', () => {
    const f: FeedingRecord = { id: '1', timestamp: NOW - h(4) };
    expect(computeWarnings(base({ feedingHistory: [f] }))).toContain('feed-overdue');
  });

  it('does not appear when feeding was recent', () => {
    const f: FeedingRecord = { id: '1', timestamp: NOW - h(1), endTime: NOW - h(1) };
    expect(computeWarnings(base({ feedingHistory: [f] }))).not.toContain('feed-overdue');
  });

  it('does not appear when no feedings have been recorded yet', () => {
    expect(computeWarnings(base())).not.toContain('feed-overdue');
  });

  it('does not appear (and does not crash) when the stored timestamp is invalid', () => {
    const f = { id: '1', timestamp: NaN, endTime: NaN } as unknown as FeedingRecord;
    expect(() => computeWarnings(base({ feedingHistory: [f] }))).not.toThrow();
    expect(computeWarnings(base({ feedingHistory: [f] }))).not.toContain('feed-overdue');
  });
});

describe('"Feeding soon" banner', () => {
  it('appears when within 30 minutes of the feeding interval', () => {
    const f: FeedingRecord = { id: '1', timestamp: NOW - h(2.6), endTime: NOW - h(2.6) };
    expect(computeWarnings(base({ feedingHistory: [f] }))).toContain('feeding-soon');
  });

  it('does not appear at the same time as "feeding overdue"', () => {
    const f: FeedingRecord = { id: '1', timestamp: NOW - h(2.6), endTime: NOW - h(2.6) };
    expect(computeWarnings(base({ feedingHistory: [f] }))).not.toContain('feeding-due');
  });
});

// ─── Sleep position warning ────────────────────────────────────────────────────

describe('"Change sleep position" banner', () => {
  const mk = (pos: string): SleepRecord => ({ id: String(Math.random()), position: pos, startTime: NOW });

  it('appears when the last 3 sleeps were all in the same non-Back position', () => {
    expect(computeWarnings(base({ sleepHistory: [mk('Left'), mk('Left'), mk('Left')] }))).toContain('same-position');
  });

  it('does not appear when position is Back (recommended)', () => {
    expect(computeWarnings(base({ sleepHistory: [mk('Back'), mk('Back'), mk('Back')] }))).not.toContain('same-position');
  });

  it('does not appear when positions vary', () => {
    expect(computeWarnings(base({ sleepHistory: [mk('Left'), mk('Right'), mk('Left')] }))).not.toContain('same-position');
  });

  it('does not appear when there are fewer than 3 sleep records', () => {
    expect(computeWarnings(base({ sleepHistory: [mk('Left'), mk('Left')] }))).not.toContain('same-position');
  });
});

// ─── Poop warning ─────────────────────────────────────────────────────────────

describe('"No poop in 24h" banner', () => {
  it('appears when the most recent poop was over 24 hours ago', () => {
    const d: DiaperRecord = { id: '1', type: 'poop', timestamp: NOW - h(30) };
    expect(computeWarnings(base({ diaperHistory: [d] }))).toContain('no-poop');
  });

  it('treats "Both" diapers as poop', () => {
    const d: DiaperRecord = { id: '1', type: 'both', timestamp: NOW - h(30) };
    expect(computeWarnings(base({ diaperHistory: [d] }))).toContain('no-poop');
  });

  it('does not appear when there was a poop today', () => {
    const d: DiaperRecord = { id: '1', type: 'poop', timestamp: NOW - h(2) };
    expect(computeWarnings(base({ diaperHistory: [d] }))).not.toContain('no-poop');
  });

  it('does not appear when no diapers have been logged yet', () => {
    expect(computeWarnings(base())).not.toContain('no-poop');
  });
});

// ─── Sleep warning ────────────────────────────────────────────────────────────

describe('"No sleep in 6h" banner', () => {
  it('appears when there has been no sleep recorded in the last 6 hours', () => {
    const s: SleepRecord = { id: '1', position: 'Back', startTime: NOW - h(8) };
    expect(computeWarnings(base({ sleepHistory: [s] }))).toContain('no-sleep');
  });

  it('does not appear when sleep was recorded recently', () => {
    const s: SleepRecord = { id: '1', position: 'Back', startTime: NOW - h(2) };
    expect(computeWarnings(base({ sleepHistory: [s] }))).not.toContain('no-sleep');
  });

  it('does not appear when no sleep has been tracked yet', () => {
    expect(computeWarnings(base())).not.toContain('no-sleep');
  });
});

// ─── Tummy time warning ───────────────────────────────────────────────────────

describe('"No tummy time today" banner', () => {
  const todayStart = new Date(NOW).setHours(0, 0, 0, 0);

  it('appears when tummy time was only logged on a previous day', () => {
    const t: TummyTimeRecord = { id: '1', startTime: todayStart - h(1) };
    expect(computeWarnings(base({ tummyTimeHistory: [t] }))).toContain('no-tummy-time');
  });

  it('does not appear when tummy time was logged today', () => {
    const t: TummyTimeRecord = { id: '1', startTime: todayStart + 1 };
    expect(computeWarnings(base({ tummyTimeHistory: [t] }))).not.toContain('no-tummy-time');
  });

  it('does not appear when tummy time has never been tracked', () => {
    expect(computeWarnings(base())).not.toContain('no-tummy-time');
  });
});

// ─── Painkiller reminder ──────────────────────────────────────────────────────

describe('"You can take another painkiller" reminder', () => {
  it('appears once 8 hours have passed since the last dose', () => {
    expect(computeWarnings(base({ painkillerHistory: [{ id: '1', timestamp: NOW - h(9) }] }))).toContain('painkiller-due');
  });

  it('does not appear when the last dose was recent (< 8h)', () => {
    expect(computeWarnings(base({ painkillerHistory: [{ id: '1', timestamp: NOW - h(4) }] }))).not.toContain('painkiller-due');
  });

  it('does not crash when timestamp is corrupt', () => {
    expect(() => computeWarnings(base({ painkillerHistory: [{ id: '1', timestamp: NaN }] }))).not.toThrow();
  });
});

// ─── Multiple warnings ────────────────────────────────────────────────────────

describe('Multiple banners can appear at the same time', () => {
  it('feeding overdue + no sleep both show when applicable', () => {
    const w = computeWarnings(base({
      feedingHistory: [{ id: '1', timestamp: NOW - h(5), endTime: NOW - h(5) } as FeedingRecord],
      sleepHistory:   [{ id: '1', position: 'Back', startTime: NOW - h(10) } as SleepRecord],
    }));
    expect(w).toContain('feed-overdue');
    expect(w).toContain('no-sleep');
  });
});

// ─── Reading corrupt localStorage (readStoredArray / readFeedingInterval) ─────

describe('When localStorage data is corrupt', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    });
    Object.keys(store).forEach((k) => delete store[k]);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns an empty list when the history key does not exist', () => {
    expect(readStoredArray('missing')).toEqual([]);
  });

  it('returns an empty list when stored JSON is broken', () => {
    store['k'] = '{broken';
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns an empty list when the stored value is not an array', () => {
    store['k'] = JSON.stringify({ foo: 1 });
    expect(readStoredArray('k')).toEqual([]);
  });

  it('returns an empty list when localStorage itself throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
    expect(readStoredArray('k')).toEqual([]);
  });

  it('feeding interval defaults to 3 hours when setting is missing', () => {
    expect(readFeedingInterval()).toBe(3);
  });

  it('feeding interval defaults to 3 hours when setting is corrupt', () => {
    store['feedingInterval'] = '{bad';
    expect(readFeedingInterval()).toBe(3);
  });

  it('feeding interval defaults to 3 when set to 0 or negative', () => {
    store['feedingInterval'] = '0';
    expect(readFeedingInterval()).toBe(3);
    store['feedingInterval'] = '-2';
    expect(readFeedingInterval()).toBe(3);
  });
});
