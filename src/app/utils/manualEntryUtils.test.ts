/**
 * Logging a past session manually — what the user fills in and what gets saved.
 */
import { describe, it, expect } from 'vitest';
import { buildTimestamp, buildDurationMs, isManualEntryValid } from './manualEntryUtils';

// ─── The Save button (isManualEntryValid) ─────────────────────────────────────

describe('Save button is disabled when the form is incomplete', () => {
  it('no date selected', () => {
    expect(isManualEntryValid('', '14', '1', '0')).toBe(false);
  });

  it('start hour not filled in', () => {
    expect(isManualEntryValid('2025-06-15', '', '1', '0')).toBe(false);
  });

  it('start hour out of valid range (negative)', () => {
    expect(isManualEntryValid('2025-06-15', '-1', '1', '0')).toBe(false);
  });

  it('start hour out of valid range (> 23)', () => {
    expect(isManualEntryValid('2025-06-15', '24', '1', '0')).toBe(false);
  });

  it('both duration fields left at zero — session would be 0 minutes long', () => {
    expect(isManualEntryValid('2025-06-15', '14', '0', '0')).toBe(false);
  });

  it('both duration fields left empty', () => {
    expect(isManualEntryValid('2025-06-15', '14', '', '')).toBe(false);
  });
});

describe('Save button is enabled when the form is valid', () => {
  it('midnight start (hour 0) is a valid time', () => {
    expect(isManualEntryValid('2025-06-15', '0', '1', '0')).toBe(true);
  });

  it('only duration hours filled in — minutes can be left blank', () => {
    expect(isManualEntryValid('2025-06-15', '14', '1', '')).toBe(true);
  });

  it('only duration minutes filled in — hours can be left blank', () => {
    expect(isManualEntryValid('2025-06-15', '14', '', '30')).toBe(true);
  });

  it('both hours and minutes filled in', () => {
    expect(isManualEntryValid('2025-06-15', '14', '1', '30')).toBe(true);
  });

  it('exactly 1 hour with minutes set to 0', () => {
    expect(isManualEntryValid('2025-06-15', '14', '1', '0')).toBe(true);
  });
});

// ─── Building the start timestamp ─────────────────────────────────────────────

describe('The start time I enter appears correctly in history', () => {
  it('date + 14:30 produces the right clock time', () => {
    const ts = buildTimestamp('2025-03-08', '14', '30');
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2);   // 0-indexed March
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('midnight (0:00) is stored correctly', () => {
    const d = new Date(buildTimestamp('2025-01-01', '0', '0'));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('leaving the minute field blank is the same as typing 0', () => {
    const withBlank = buildTimestamp('2025-06-15', '9', '');
    const withZero  = buildTimestamp('2025-06-15', '9', '0');
    expect(withBlank).toBe(withZero);
  });

  it('typing 30 minutes apart produces timestamps 30 minutes apart', () => {
    const t1 = buildTimestamp('2025-06-15', '10', '0');
    const t2 = buildTimestamp('2025-06-15', '10', '30');
    expect(t2 - t1).toBe(30 * 60_000);
  });

  it('an invalid date returns NaN so the save is prevented', () => {
    expect(isNaN(buildTimestamp('', '10', '30'))).toBe(true);
    expect(isNaN(buildTimestamp('not-a-date', '10', '30'))).toBe(true);
  });

  it('an hour > 23 is clamped to 23 (typo protection)', () => {
    expect(new Date(buildTimestamp('2025-06-15', '99', '0')).getHours()).toBe(23);
  });
});

// ─── Building the duration ────────────────────────────────────────────────────

describe('The duration I enter is saved correctly', () => {
  it('1 hour 30 minutes = 90 minutes total', () => {
    expect(buildDurationMs('1', '30')).toBe(90 * 60_000);
  });

  it('exactly 1 hour with no minutes = 60 minutes', () => {
    expect(buildDurationMs('1', '0')).toBe(60 * 60_000);
    expect(buildDurationMs('1', '')).toBe(60 * 60_000);
  });

  it('45 minutes with no hours', () => {
    expect(buildDurationMs('0', '45')).toBe(45 * 60_000);
    expect(buildDurationMs('',  '45')).toBe(45 * 60_000);
  });

  it('typos (letters) are treated as 0', () => {
    expect(buildDurationMs('abc', 'xyz')).toBe(0);
  });
});
