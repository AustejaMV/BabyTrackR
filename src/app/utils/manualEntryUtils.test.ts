import { describe, it, expect } from 'vitest';
import { buildTimestamp, buildDurationMs, isManualEntryValid } from './manualEntryUtils';

// ─── buildTimestamp ───────────────────────────────────────────────────────────

describe('buildTimestamp', () => {
  it('builds a correct local-time epoch for a typical date and time', () => {
    const ts = buildTimestamp('2025-03-08', '14', '30');
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // 0-indexed
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('midnight: hour=0, min=0', () => {
    const ts = buildTimestamp('2025-01-01', '0', '0');
    const d = new Date(ts);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('end of day: hour=23, min=59', () => {
    const ts = buildTimestamp('2025-12-31', '23', '59');
    const d = new Date(ts);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it('empty hour string is treated as 0 (midnight)', () => {
    const ts = buildTimestamp('2025-06-15', '', '30');
    const d = new Date(ts);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(30);
  });

  it('empty minute string is treated as 0', () => {
    const ts = buildTimestamp('2025-06-15', '9', '');
    const d = new Date(ts);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it('hour > 23 is clamped to 23', () => {
    const ts = buildTimestamp('2025-06-15', '99', '0');
    expect(new Date(ts).getHours()).toBe(23);
  });

  it('minute > 59 is clamped to 59', () => {
    const ts = buildTimestamp('2025-06-15', '10', '99');
    expect(new Date(ts).getMinutes()).toBe(59);
  });

  it('returns NaN for empty date', () => {
    expect(isNaN(buildTimestamp('', '10', '30'))).toBe(true);
  });

  it('returns NaN for malformed date string', () => {
    expect(isNaN(buildTimestamp('not-a-date', '10', '30'))).toBe(true);
  });

  it('returns NaN for partial date (missing day)', () => {
    expect(isNaN(buildTimestamp('2025-06', '10', '30'))).toBe(true);
  });

  it('two calls with different minutes produce timestamps 30 min apart', () => {
    const t1 = buildTimestamp('2025-06-15', '10', '0');
    const t2 = buildTimestamp('2025-06-15', '10', '30');
    expect(t2 - t1).toBe(30 * 60_000);
  });
});

// ─── buildDurationMs ─────────────────────────────────────────────────────────

describe('buildDurationMs', () => {
  it('1 hour, 30 minutes → 90 min in ms', () => {
    expect(buildDurationMs('1', '30')).toBe(90 * 60_000);
  });

  it('1 hour, 0 minutes → 60 min in ms', () => {
    expect(buildDurationMs('1', '0')).toBe(60 * 60_000);
  });

  it('0 hours, 45 minutes', () => {
    expect(buildDurationMs('0', '45')).toBe(45 * 60_000);
  });

  it('empty hour string treated as 0', () => {
    expect(buildDurationMs('', '30')).toBe(30 * 60_000);
  });

  it('empty minute string treated as 0', () => {
    expect(buildDurationMs('2', '')).toBe(120 * 60_000);
  });

  it('both empty → 0', () => {
    expect(buildDurationMs('', '')).toBe(0);
  });

  it('negative values clamped to 0', () => {
    expect(buildDurationMs('-5', '-10')).toBe(0);
  });

  it('non-numeric strings treated as 0', () => {
    expect(buildDurationMs('abc', 'xyz')).toBe(0);
  });
});

// ─── isManualEntryValid ───────────────────────────────────────────────────────

describe('isManualEntryValid', () => {
  // date missing
  it('returns false when date is empty', () => {
    expect(isManualEntryValid('', '14', '1', '0')).toBe(false);
  });

  // start hour missing
  it('returns false when start hour is empty string', () => {
    expect(isManualEntryValid('2025-06-15', '', '1', '0')).toBe(false);
  });

  it('returns false when start hour is null-ish (undefined cast to empty)', () => {
    expect(isManualEntryValid('2025-06-15', undefined as unknown as string, '1', '0')).toBe(false);
  });

  it('returns false when start hour is out of range (negative)', () => {
    expect(isManualEntryValid('2025-06-15', '-1', '1', '0')).toBe(false);
  });

  it('returns false when start hour > 23', () => {
    expect(isManualEntryValid('2025-06-15', '24', '1', '0')).toBe(false);
  });

  // start hour "0" = midnight — valid
  it('accepts start hour "0" (midnight)', () => {
    expect(isManualEntryValid('2025-06-15', '0', '1', '0')).toBe(true);
  });

  // duration rules
  it('returns false when both duration fields are "0"', () => {
    expect(isManualEntryValid('2025-06-15', '14', '0', '0')).toBe(false);
  });

  it('returns false when both duration fields are empty', () => {
    expect(isManualEntryValid('2025-06-15', '14', '', '')).toBe(false);
  });

  it('returns true when only duration hours > 0 (minutes empty)', () => {
    expect(isManualEntryValid('2025-06-15', '14', '1', '')).toBe(true);
  });

  it('returns true when only duration minutes > 0 (hours empty)', () => {
    expect(isManualEntryValid('2025-06-15', '14', '', '30')).toBe(true);
  });

  it('returns true when only duration minutes > 0 (hours "0")', () => {
    expect(isManualEntryValid('2025-06-15', '14', '0', '30')).toBe(true);
  });

  it('returns true when only duration hours > 0 (minutes "0")', () => {
    expect(isManualEntryValid('2025-06-15', '14', '2', '0')).toBe(true);
  });

  it('returns true when both duration fields are positive', () => {
    expect(isManualEntryValid('2025-06-15', '14', '1', '30')).toBe(true);
  });

  // start-time minute is always optional — doesn't affect validity
  it('start-time minute field has no effect on validity', () => {
    // valid without providing durMin (note: durH is provided)
    expect(isManualEntryValid('2025-06-15', '9', '1', '0')).toBe(true);
  });
});
