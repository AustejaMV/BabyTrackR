import { describe, it, expect, vi, afterEach } from 'vitest';
import { safeFormat, formatDurationMs, formatDurationShort, formatLiveDuration, getTimeSince } from './dateUtils';

// ─── safeFormat ─────────────────────────────────────────────────────────────

describe('safeFormat', () => {
  it('returns fallback for null', () => {
    expect(safeFormat(null, 'HH:mm')).toBe('—');
  });

  it('returns fallback for undefined', () => {
    expect(safeFormat(undefined, 'HH:mm')).toBe('—');
  });

  it('returns fallback for 0', () => {
    expect(safeFormat(0, 'HH:mm')).toBe('—');
  });

  it('returns custom fallback', () => {
    expect(safeFormat(null, 'HH:mm', 'n/a')).toBe('n/a');
  });

  it('formats a real timestamp', () => {
    // 2025-01-15 14:30 UTC — pin to a fixed moment so the test is timezone-stable
    const ts = new Date('2025-01-15T14:30:00.000Z').getTime();
    const result = safeFormat(ts, 'yyyy-MM-dd');
    expect(result).toBe('2025-01-15');
  });
});

// ─── formatDurationMs ───────────────────────────────────────────────────────

describe('formatDurationMs', () => {
  it('formats zero duration', () => {
    expect(formatDurationMs(0)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(formatDurationMs(35_000)).toBe('0:35');
  });

  it('formats minutes and seconds', () => {
    expect(formatDurationMs(3 * 60_000 + 5_000)).toBe('3:05');
  });

  it('formats hours minutes seconds', () => {
    expect(formatDurationMs(1 * 3_600_000 + 2 * 60_000 + 30_000)).toBe('1:02:30');
  });

  it('formats without seconds (short mode)', () => {
    expect(formatDurationMs(3 * 60_000 + 5_000, false)).toBe('3m');
  });

  it('formats hours without seconds', () => {
    expect(formatDurationMs(1 * 3_600_000 + 2 * 60_000, false)).toBe('1h 2m');
  });

  it('handles non-round millisecond values', () => {
    // 2 min 59 s 999 ms → should show 2:59 (floor, not round)
    expect(formatDurationMs(2 * 60_000 + 59_000 + 999)).toBe('2:59');
  });
});

// ─── formatDurationShort ────────────────────────────────────────────────────

describe('formatDurationShort', () => {
  it('is equivalent to formatDurationMs with showSeconds=false', () => {
    const ms = 25 * 60_000;
    expect(formatDurationShort(ms)).toBe(formatDurationMs(ms, false));
  });
});

// ─── formatLiveDuration ─────────────────────────────────────────────────────

describe('formatLiveDuration', () => {
  it('formats sub-hour as "Xm XXs"', () => {
    expect(formatLiveDuration(5 * 60_000 + 7_000)).toBe('5m 07s');
  });

  it('formats zero as "0m 00s"', () => {
    expect(formatLiveDuration(0)).toBe('0m 00s');
  });

  it('formats over an hour', () => {
    expect(formatLiveDuration(1 * 3_600_000 + 3 * 60_000 + 9_000)).toBe('1h 3m 09s');
  });
});

// ─── getTimeSince ────────────────────────────────────────────────────────────

describe('getTimeSince', () => {
  afterEach(() => vi.useRealTimers());

  it('shows minutes and seconds for recent timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    const threeMinutesAgo = new Date('2025-01-15T09:57:05.000Z').getTime();
    expect(getTimeSince(threeMinutesAgo)).toBe('2m 55s ago');
  });

  it('shows hours for older timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    const twoHoursAgo = new Date('2025-01-15T09:30:00.000Z').getTime();
    expect(getTimeSince(twoHoursAgo)).toBe('2h 30m ago');
  });
});
