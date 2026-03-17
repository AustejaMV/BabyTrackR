/**
 * Tests for normal ranges and assessMetric.
 */
import { describe, it, expect } from 'vitest';
import { getNormalRange, assessMetric } from './normalRanges';

describe('getNormalRange', () => {
  it('returns range for feedsPerDay at each age boundary', () => {
    expect(getNormalRange('feedsPerDay', 0)).toEqual({ min: 8, max: 12, unit: 'feeds', label: 'Newborn' });
    expect(getNormalRange('feedsPerDay', 8)).toEqual({ min: 8, max: 10, unit: 'feeds', label: '1–3 mo' });
    expect(getNormalRange('feedsPerDay', 20)).toEqual({ min: 6, max: 8, unit: 'feeds', label: '3–6 mo' });
    expect(getNormalRange('feedsPerDay', 45)).toEqual({ min: 4, max: 6, unit: 'feeds', label: '9–12 mo' });
  });

  it('returns range for sleepHoursPerDay', () => {
    const r = getNormalRange('sleepHoursPerDay', 20);
    expect(r).not.toBeNull();
    expect(r!.min).toBe(12);
    expect(r!.max).toBe(15);
  });

  it('returns null for unknown metric', () => {
    expect(getNormalRange('unknownMetric', 10)).toBeNull();
  });

  it('returns null for age 0 when not in any range', () => {
    expect(getNormalRange('weightGainGPerWeek', 0)).not.toBeNull();
  });

  it('returns null for age 200 (not covered)', () => {
    expect(getNormalRange('feedsPerDay', 200)).toBeNull();
  });

  it('returns null for negative age', () => {
    expect(getNormalRange('feedsPerDay', -1)).toBeNull();
  });
});

describe('assessMetric', () => {
  it('returns normal when value within range', () => {
    const r = assessMetric(8, 'feedsPerDay', 8);
    expect(r.status).toBe('normal');
    expect(r.message).toContain('Within typical');
  });

  it('returns low when value below min', () => {
    const r = assessMetric(4, 'feedsPerDay', 8);
    expect(r.status).toBe('low');
    expect(r.message).toContain('lower end');
  });

  it('returns high when value above max', () => {
    const r = assessMetric(15, 'feedsPerDay', 8);
    expect(r.status).toBe('high');
    expect(r.message).toContain('Above typical');
  });

  it('returns unknown for zero value', () => {
    const r = assessMetric(0, 'feedsPerDay', 8);
    expect(r.status).toBe('unknown');
  });

  it('returns unknown for invalid age', () => {
    const r = assessMetric(8, 'feedsPerDay', -1);
    expect(r.status).toBe('unknown');
  });

  it('returns unknown when getNormalRange returns null', () => {
    const r = assessMetric(5, 'feedsPerDay', 200);
    expect(r.status).toBe('unknown');
  });
});
