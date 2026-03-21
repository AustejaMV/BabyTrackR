/**
 * Time and duration display — what the user reads on screen.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { safeFormat, formatDurationMs, formatDurationShort, formatDurationMsProse, formatIntervalMinutesProse, formatLiveDuration, getTimeSince } from './dateUtils';

// ─── Timestamps ───────────────────────────────────────────────────────────────

describe('Displaying a clock time (HH:mm)', () => {
  it('shows the correct hour and minute for a real timestamp', () => {
    const ts = new Date('2025-01-15T14:30:00.000Z').getTime();
    expect(safeFormat(ts, 'yyyy-MM-dd')).toBe('2025-01-15');
  });

  it('shows "—" when the timestamp is missing', () => {
    expect(safeFormat(undefined, 'HH:mm')).toBe('—');
    expect(safeFormat(null,      'HH:mm')).toBe('—');
  });

  it('shows "—" when the timestamp is 0 (unset record)', () => {
    expect(safeFormat(0, 'HH:mm')).toBe('—');
  });

  it('shows "—" when the timestamp is corrupt (NaN)', () => {
    expect(safeFormat(NaN, 'HH:mm')).toBe('—');
  });

  it('shows a custom placeholder when one is provided', () => {
    expect(safeFormat(null, 'HH:mm', 'n/a')).toBe('n/a');
  });
});

// ─── Duration display ─────────────────────────────────────────────────────────

describe('Displaying a completed duration (e.g. history item)', () => {
  it('shows "0:00" for a zero-length session', () => {
    expect(formatDurationMs(0)).toBe('0:00');
  });

  it('shows seconds when under a minute', () => {
    expect(formatDurationMs(35_000)).toBe('0:35');
  });

  it('shows minutes and seconds for a typical short nap', () => {
    expect(formatDurationMs(3 * 60_000 + 5_000)).toBe('3:05');
  });

  it('shows hours, minutes and seconds for a long sleep', () => {
    expect(formatDurationMs(1 * 3_600_000 + 2 * 60_000 + 30_000)).toBe('1:02:30');
  });

  it('shows "—" instead of crashing when duration data is corrupt (NaN)', () => {
    expect(formatDurationMs(NaN)).toBe('—');
  });

  it('shows "—" when end time is before start time (corrupt record)', () => {
    expect(formatDurationMs(-1_000)).toBe('—');
  });
});

describe('Displaying a compact duration (no seconds, e.g. history list)', () => {
  it('shows "3m" for a 3-minute session', () => {
    expect(formatDurationShort(3 * 60_000)).toBe('3m');
  });

  it('shows "1h 2m" for a session over an hour', () => {
    expect(formatDurationMs(1 * 3_600_000 + 2 * 60_000, false)).toBe('1h 2m');
  });

  it('shows "—" for corrupt data', () => {
    expect(formatDurationShort(NaN)).toBe('—');
    expect(formatDurationShort(-100)).toBe('—');
  });
});

describe('Cradl notice copy (intervals / nap length)', () => {
  it('uses "N minutes" under one hour', () => {
    expect(formatIntervalMinutesProse(45)).toBe('45 minutes');
    expect(formatIntervalMinutesProse(1)).toBe('1 minute');
  });

  it('uses whole hours when exact', () => {
    expect(formatIntervalMinutesProse(120)).toBe('2 hours');
    expect(formatIntervalMinutesProse(60)).toBe('1 hour');
  });

  it('uses compact hours+minutes instead of huge minute counts', () => {
    expect(formatIntervalMinutesProse(176)).toBe('2h 56m');
  });

  it('formats ms durations for nap averages', () => {
    expect(formatDurationMsProse(176 * 60_000)).toBe('2h 56m');
    expect(formatDurationMsProse(35 * 60_000)).toBe('35 minutes');
  });
});

describe('Live timer display (running session)', () => {
  it('shows minutes and seconds while a session is active', () => {
    expect(formatLiveDuration(5 * 60_000 + 7_000)).toBe('5m 07s');
  });

  it('shows "0m 00s" at the moment a session starts', () => {
    expect(formatLiveDuration(0)).toBe('0m 00s');
  });

  it('shows hours once a session exceeds 60 minutes', () => {
    expect(formatLiveDuration(1 * 3_600_000 + 3 * 60_000 + 9_000)).toBe('1h 3m 09s');
  });
});

describe('Time since last event (e.g. "last fed 3m ago")', () => {
  afterEach(() => vi.useRealTimers());

  it('shows minutes and seconds for recent events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    expect(getTimeSince(new Date('2025-01-15T09:57:05.000Z').getTime())).toBe('2m 55s ago');
  });

  it('shows hours for events from a while ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    expect(getTimeSince(new Date('2025-01-15T09:30:00.000Z').getTime())).toBe('2h 30m ago');
  });
});
