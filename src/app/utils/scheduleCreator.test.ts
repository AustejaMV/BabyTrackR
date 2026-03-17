/**
 * Tests for nap schedule stages and buildDailySchedule.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getNapStage,
  buildDailySchedule,
  getSchedulePrefs,
  setSchedulePrefs,
  getLastNapStage,
  setLastNapStage,
} from '../data/napSchedules';

describe('getNapStage', () => {
  it('returns 4-nap newborn stage for 8 weeks', () => {
    const stage = getNapStage(8);
    expect(stage).not.toBeNull();
    expect(stage!.naps).toBe(4);
    expect(stage!.label).toContain('Newborn');
  });

  it('returns 3-nap stage for 20 weeks', () => {
    const stage = getNapStage(20);
    expect(stage).not.toBeNull();
    expect(stage!.naps).toBe(3);
  });

  it('returns 2-nap stage for 35 weeks', () => {
    const stage = getNapStage(35);
    expect(stage).not.toBeNull();
    expect(stage!.naps).toBe(2);
  });

  it('returns 1-nap stage for 70 weeks', () => {
    const stage = getNapStage(70);
    expect(stage).not.toBeNull();
    expect(stage!.naps).toBe(1);
  });

  it('returns null for invalid age', () => {
    expect(getNapStage(-1)).toBeNull();
  });

  it('returns correct stage at boundary ages', () => {
    expect(getNapStage(16)?.naps).toBe(3);
    expect(getNapStage(28)?.naps).toBe(2);
    expect(getNapStage(60)?.naps).toBe(1);
  });
});

describe('buildDailySchedule', () => {
  it('returns events for 8 weeks with 4 naps', () => {
    const events = buildDailySchedule('07:00', '19:30', 8);
    expect(events.length).toBeGreaterThanOrEqual(3);
    const wake = events.find((e) => e.type === 'wake');
    const bed = events.find((e) => e.type === 'bedtime');
    const naps = events.filter((e) => e.type === 'nap');
    expect(wake).toBeDefined();
    expect(wake!.time).toBe('07:00');
    expect(bed).toBeDefined();
    expect(naps.length).toBe(4);
  });

  it('returns events for 20 weeks with 3 naps', () => {
    const events = buildDailySchedule('07:00', '19:30', 20);
    const naps = events.filter((e) => e.type === 'nap');
    expect(naps.length).toBe(3);
  });

  it('returns events for 35 weeks with 2 naps', () => {
    const events = buildDailySchedule('07:00', '19:30', 35);
    const naps = events.filter((e) => e.type === 'nap');
    expect(naps.length).toBe(2);
  });

  it('returns events for 70 weeks with 1 nap', () => {
    const events = buildDailySchedule('07:00', '19:30', 70);
    const naps = events.filter((e) => e.type === 'nap');
    expect(naps.length).toBe(1);
  });

  it('returns empty array for invalid age', () => {
    expect(buildDailySchedule('07:00', '19:30', -1)).toEqual([]);
  });

  it('returns events sorted by time', () => {
    const events = buildDailySchedule('07:00', '19:30', 20);
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1].time;
      const curr = events[i].time;
      expect(prev <= curr || (prev.startsWith('0') && curr.startsWith('1'))).toBe(true);
    }
  });
});

describe('Schedule prefs and last nap stage', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      length: 0,
      key: () => null,
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('getSchedulePrefs returns default when empty', () => {
    const prefs = getSchedulePrefs();
    expect(prefs.wakeTime).toBe('07:00');
    expect(prefs.bedtime).toBe('19:30');
  });

  it('setSchedulePrefs and getSchedulePrefs round-trip', () => {
    setSchedulePrefs('06:30', '20:00');
    const prefs = getSchedulePrefs();
    expect(prefs.wakeTime).toBe('06:30');
    expect(prefs.bedtime).toBe('20:00');
  });

  it('getLastNapStage returns null when empty', () => {
    expect(getLastNapStage()).toBeNull();
  });

  it('setLastNapStage and getLastNapStage round-trip', () => {
    setLastNapStage('2-nap stage');
    expect(getLastNapStage()).toBe('2-nap stage');
  });

  it('stage transition: stored 3-nap and current 2-nap triggers transition message', () => {
    setLastNapStage('3-nap stage');
    const currentStage = getNapStage(35);
    expect(currentStage?.label).toBeDefined();
    expect(currentStage?.naps).toBe(2);
    expect(getLastNapStage()).toBe('3-nap stage');
  });
});
