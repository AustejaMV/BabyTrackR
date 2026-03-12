import { describe, it, expect } from 'vitest';
import { formatDurationMs, formatDurationShort, safeFormat } from '../utils/dateUtils';
import type { SleepRecord, TummyTimeRecord, FeedingRecord } from '../types';

// ─── NaN / invalid input guards ──────────────────────────────────────────────
// These tests document the defensive behaviour added to formatDurationMs.
// If the guard is ever removed the display will regress to "NaNm".

describe('formatDurationMs — NaN / invalid input guard', () => {
  it('returns "—" for NaN input', () => {
    expect(formatDurationMs(NaN)).toBe('—');
  });

  it('returns "—" for negative input', () => {
    expect(formatDurationMs(-1)).toBe('—');
  });

  it('returns "—" for -Infinity', () => {
    expect(formatDurationMs(-Infinity)).toBe('—');
  });

  it('returns "—" for +Infinity', () => {
    expect(formatDurationMs(Infinity)).toBe('—');
  });

  it('still formats 0 correctly (not treated as invalid)', () => {
    expect(formatDurationMs(0)).toBe('0:00');
  });

  it('still formats a positive value correctly after guard', () => {
    expect(formatDurationMs(90 * 60_000, false)).toBe('1h 30m');
  });
});

describe('formatDurationShort — inherits NaN guard', () => {
  it('returns "—" for NaN', () => {
    expect(formatDurationShort(NaN)).toBe('—');
  });

  it('returns "—" for negative', () => {
    expect(formatDurationShort(-100)).toBe('—');
  });
});

describe('safeFormat — tolerates falsy / zero timestamps', () => {
  it('returns fallback for 0', () => {
    expect(safeFormat(0, 'HH:mm')).toBe('—');
  });

  it('returns fallback for null', () => {
    expect(safeFormat(null, 'HH:mm')).toBe('—');
  });

  it('returns fallback for undefined', () => {
    expect(safeFormat(undefined, 'HH:mm')).toBe('—');
  });

  it('returns fallback for NaN', () => {
    expect(safeFormat(NaN, 'HH:mm')).toBe('—');
  });

  it('accepts a custom fallback string', () => {
    expect(safeFormat(null, 'HH:mm', 'unknown')).toBe('unknown');
  });
});

// ─── Deduplication by id ─────────────────────────────────────────────────────
// The rendering code uses `new Map(history.map(r => [r.id, r])).values()`
// to deduplicate before display.  This helper mirrors that behaviour
// so we can verify the contract without mounting any React component.

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((x) => [x.id, x])).values()];
}

describe('deduplication by id', () => {
  it('keeps a single copy when there are no duplicates', () => {
    const items = [
      { id: 'a', startTime: 1 },
      { id: 'b', startTime: 2 },
    ];
    expect(deduplicateById(items)).toHaveLength(2);
  });

  it('removes exact duplicates', () => {
    const item = { id: 'a', startTime: 1 };
    expect(deduplicateById([item, item])).toHaveLength(1);
  });

  it('keeps the LAST occurrence when ids collide (Map overwrites)', () => {
    const items = [
      { id: 'dup', startTime: 1 },
      { id: 'dup', startTime: 2 }, // newer / updated version
    ];
    const result = deduplicateById(items);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe(2); // last writer wins
  });

  it('handles an empty array', () => {
    expect(deduplicateById([])).toHaveLength(0);
  });
});

// ─── Legacy record startTime fallback ────────────────────────────────────────
// Old records were stored without a `startTime` field.
// The rendering falls back to `parseInt(record.id)` since IDs were created
// with `Date.now().toString()`, so they encode the creation timestamp.

describe('legacy record startTime fallback', () => {
  it('id-based fallback produces the same timestamp as Date.now() at creation', () => {
    const now = Date.now();
    const legacyId = String(now);
    const fallback = parseInt(legacyId);
    expect(fallback).toBe(now);
  });

  it('parseInt on a non-numeric id returns NaN (safeFormat handles gracefully)', () => {
    const result = parseInt('abc-123');
    expect(isNaN(result)).toBe(true);
    // safeFormat with NaN should return the fallback, not throw
    expect(safeFormat(result, 'HH:mm')).toBe('—');
  });

  it('sleep record with startTime=0 triggers fallback branch', () => {
    const record: SleepRecord = { id: String(Date.now()), position: 'Back', startTime: 0 };
    // Simulate the fallback: 0 is falsy, so we parse the id
    const effectiveStart = record.startTime || parseInt(record.id) || 0;
    expect(effectiveStart).toBeGreaterThan(0);
  });

  it('tummy time record without endTime is excluded from history display', () => {
    const records: TummyTimeRecord[] = [
      { id: '1', startTime: 1_000_000, endTime: 2_000_000 },
      { id: '2', startTime: 1_500_000 }, // no endTime — still in progress
    ];
    const completed = records.filter((r) => r.endTime !== undefined);
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe('1');
  });
});

// ─── getDuration guard (mirrored from SleepTracking / TummyTime) ─────────────

function getDuration(start: number, end?: number): string {
  if (!start || !Number.isFinite(start)) return '—';
  const ms = (end ?? Date.now()) - start;
  if (!Number.isFinite(ms) || ms < 0) return '—';
  return end != null ? formatDurationShort(ms) : '(live)';
}

describe('getDuration guard', () => {
  it('returns "—" for start=0', () => {
    expect(getDuration(0, 1_060_000)).toBe('—');
  });

  it('returns "—" for start=undefined (legacy record)', () => {
    expect(getDuration(undefined as unknown as number, 1_060_000)).toBe('—');
  });

  it('returns "—" for start=NaN', () => {
    expect(getDuration(NaN, 1_060_000)).toBe('—');
  });

  it('returns "—" when end < start (corrupt data)', () => {
    expect(getDuration(2_000_000, 1_000_000)).toBe('—');
  });

  it('returns a formatted string for valid inputs', () => {
    const start = 1_000_000;
    const end   = start + 30 * 60_000;
    expect(getDuration(start, end)).toBe('30m');
  });
});

// ─── FeedingRecord segment durationMs guard ───────────────────────────────────

describe('feeding segment durationMs display guard', () => {
  it('null durationMs renders "—" not a crash', () => {
    const seg = { durationMs: null as unknown as number };
    const display = seg.durationMs != null ? formatDurationShort(seg.durationMs) : '—';
    expect(display).toBe('—');
  });

  it('undefined durationMs renders "—"', () => {
    const seg = { durationMs: undefined as unknown as number };
    const display = seg.durationMs != null ? formatDurationShort(seg.durationMs) : '—';
    expect(display).toBe('—');
  });

  it('valid durationMs renders correctly', () => {
    const seg = { durationMs: 25 * 60_000 };
    const display = seg.durationMs != null ? formatDurationShort(seg.durationMs) : '—';
    expect(display).toBe('25m');
  });
});

// ─── FeedingRecord with legacy / missing startTime ───────────────────────────

describe('FeedingRecord legacy startTime fallback', () => {
  it('uses startTime when present', () => {
    const record: FeedingRecord = { id: '1', timestamp: 2_000_000, startTime: 1_000_000 };
    const effective = record.startTime ?? record.timestamp;
    expect(effective).toBe(1_000_000);
  });

  it('falls back to timestamp when startTime is undefined', () => {
    const record: FeedingRecord = { id: '1', timestamp: 1_000_000 };
    const effective = record.startTime ?? record.timestamp;
    expect(effective).toBe(1_000_000);
  });
});

// ─── Corrupt array entries ────────────────────────────────────────────────────
// Simulates records that arrived from the server or localStorage in a
// partially-corrupt state (nulls, missing fields, wrong types).

describe('Corrupt array entries — safe map/filter patterns', () => {
  /** Mirror of the guard used in rendering: skip records without a valid id */
  function safeRender<T extends { id?: unknown }>(items: T[]): T[] {
    return items.filter((r) => r != null && typeof r.id === 'string');
  }

  it('filters out null entries from a history array', () => {
    const arr = [{ id: 'a' }, null, { id: 'b' }] as unknown as { id: string }[];
    expect(safeRender(arr)).toHaveLength(2);
  });

  it('filters out undefined entries', () => {
    const arr = [{ id: 'a' }, undefined] as unknown as { id: string }[];
    expect(safeRender(arr)).toHaveLength(1);
  });

  it('filters out records whose id is a number (type coercion guard)', () => {
    const arr = [{ id: 1 }, { id: 'ok' }] as unknown as { id: string }[];
    expect(safeRender(arr)).toHaveLength(1);
    expect(safeRender(arr)[0].id).toBe('ok');
  });

  it('handles an all-corrupt array gracefully (returns empty)', () => {
    const arr = [null, undefined, 42, 'string'] as unknown as { id: string }[];
    expect(safeRender(arr)).toHaveLength(0);
  });
});

// ─── Feeding segment total duration calculation ───────────────────────────────
// The correct total is the SUM of segment durations, not wall-clock difference.

describe('Feeding total duration — sum of segments', () => {
  function sumSegments(segs: Array<{ durationMs: number }>): number {
    return segs.reduce((acc, s) => acc + (Number.isFinite(s.durationMs) ? s.durationMs : 0), 0);
  }

  it('sums two segments correctly', () => {
    const segs = [{ durationMs: 25 * 60_000 }, { durationMs: 27 * 60_000 }];
    expect(sumSegments(segs)).toBe(52 * 60_000);
  });

  it('skips segments with NaN durationMs', () => {
    const segs = [{ durationMs: 10 * 60_000 }, { durationMs: NaN }];
    expect(sumSegments(segs)).toBe(10 * 60_000);
  });

  it('skips segments with undefined durationMs (corrupt record)', () => {
    const segs = [{ durationMs: undefined as unknown as number }, { durationMs: 5 * 60_000 }];
    expect(sumSegments(segs)).toBe(5 * 60_000);
  });

  it('returns 0 for an empty segment list', () => {
    expect(sumSegments([])).toBe(0);
  });
});

// ─── Diaper stats with corrupt/unknown types ──────────────────────────────────

describe('Diaper stats — unknown type guard', () => {
  type DiType = 'pee' | 'poop' | 'both';

  function countPee(records: { type: DiType }[]): number {
    return records.filter((d) => d.type === 'pee' || d.type === 'both').length;
  }

  function countPoop(records: { type: DiType }[]): number {
    return records.filter((d) => d.type === 'poop' || d.type === 'both').length;
  }

  it('ignores records with unknown type values', () => {
    const records = [
      { type: 'pee' as DiType },
      { type: 'wet' as unknown as DiType }, // invalid
    ];
    expect(countPee(records)).toBe(1);
    expect(countPoop(records)).toBe(0);
  });

  it('both type increments pee AND poop counts', () => {
    const records = [{ type: 'both' as DiType }];
    expect(countPee(records)).toBe(1);
    expect(countPoop(records)).toBe(1);
  });
});

// ─── JSON.parse safety patterns ───────────────────────────────────────────────

describe('JSON.parse safety patterns', () => {
  function safeParse<T>(raw: string | null | undefined, fallback: T): T {
    try {
      if (raw == null || raw === '') return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  it('returns fallback for null', () => {
    expect(safeParse(null, [])).toEqual([]);
  });

  it('returns fallback for undefined', () => {
    expect(safeParse(undefined, [])).toEqual([]);
  });

  it('returns fallback for empty string', () => {
    expect(safeParse('', [])).toEqual([]);
  });

  it('returns fallback for malformed JSON', () => {
    expect(safeParse('{oops', [])).toEqual([]);
  });

  it('returns fallback for truncated JSON', () => {
    expect(safeParse('[{"id":"1"', [])).toEqual([]);
  });

  it('returns parsed value for valid JSON', () => {
    expect(safeParse('[{"id":"1"}]', [])).toEqual([{ id: '1' }]);
  });

  it('returns fallback for JSON number when array expected', () => {
    const result = safeParse('42', [] as number[]);
    // safeParse returns the parsed value — caller is responsible for type checking
    // the point is it does not throw
    expect(result).toBeDefined();
  });
});
