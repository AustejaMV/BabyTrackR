/**
 * Tests for insights engine: guards and output.
 */
import { describe, it, expect } from 'vitest';
import {
  generateInsights,
  insightLongestSleepStretch,
  insightSleepVsFeeds,
  insightBreastBalance,
  insightDiaperGap,
  insightWakeTimeDrift,
  insightTummyTimeProgress,
  insightFeedingInterval,
} from './insights';
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BabyProfile } from '../types';

const NOW = Date.now();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY = (d: number) => NOW - d * MS_PER_DAY;

function sleep(overrides: Partial<SleepRecord> & { startTime: number; endTime?: number }): SleepRecord {
  return {
    id: '1',
    position: 'Back',
    startTime: overrides.startTime,
    endTime: overrides.endTime ?? overrides.startTime + 60 * 60 * 1000,
    ...overrides,
  };
}

function feed(overrides: Partial<FeedingRecord> & { timestamp: number }): FeedingRecord {
  return {
    id: '1',
    timestamp: overrides.timestamp,
    endTime: overrides.timestamp + 20 * 60 * 1000,
    ...overrides,
  };
}

describe('insightLongestSleepStretch', () => {
  it('returns null for fewer than 7 sleep entries', () => {
    const last14 = [sleep({ startTime: DAY(1), endTime: DAY(1) + 3600000 })];
    expect(insightLongestSleepStretch([], last14, null)).toBeNull();
    expect(insightLongestSleepStretch([], last14.slice(0, 6), null)).toBeNull();
  });

  it('returns insight when 7+ entries in last 14 days', () => {
    const last14: SleepRecord[] = [];
    for (let i = 0; i < 8; i++) {
      last14.push(sleep({ startTime: DAY(i) + 20 * 3600000, endTime: DAY(i) + 23 * 3600000 }));
    }
    const result = insightLongestSleepStretch(last14, last14, null);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('sleep');
    expect(result!.message).toContain('longest sleep stretch');
  });
});

describe('insightSleepVsFeeds', () => {
  it('returns null for insufficient data', () => {
    expect(insightSleepVsFeeds([], [], [], [], null)).toBeNull();
  });

  it('returns null when fewer than 7 days with data', () => {
    const s = [sleep({ startTime: DAY(1), endTime: DAY(1) + 3600000 })];
    const f = [feed({ timestamp: DAY(1) })];
    expect(insightSleepVsFeeds(s, f, s, f, null)).toBeNull();
  });
});

describe('insightBreastBalance', () => {
  it('returns null for fewer than 20 breast feed entries', () => {
    const last14 = Array(10).fill(null).map((_, i) => feed({ timestamp: DAY(i), type: 'left' }));
    expect(insightBreastBalance([], last14, null)).toBeNull();
  });

  it('returns null when left/right difference < 3 min', () => {
    const last14 = Array(25).fill(null).map((_, i) =>
      feed({
        timestamp: DAY(i % 14),
        type: i % 2 === 0 ? 'left' : 'right',
        durationMs: 15 * 60 * 1000,
      })
    );
    const result = insightBreastBalance([], last14, null);
    expect(result).toBeNull();
  });
});

describe('insightDiaperGap', () => {
  it('returns null for fewer than 5 diaper entries', () => {
    const hist: DiaperRecord[] = [
      { id: '1', type: 'poop', timestamp: DAY(1) },
      { id: '2', type: 'poop', timestamp: DAY(2) },
    ];
    expect(insightDiaperGap(hist, null)).toBeNull();
  });

  it('returns null when longest poop gap < 24h', () => {
    const hist: DiaperRecord[] = [
      { id: '1', type: 'poop', timestamp: DAY(5) },
      { id: '2', type: 'poop', timestamp: DAY(4) },
      { id: '3', type: 'poop', timestamp: DAY(3) },
      { id: '4', type: 'poop', timestamp: DAY(2) },
      { id: '5', type: 'poop', timestamp: DAY(1) },
    ];
    expect(insightDiaperGap(hist, null)).toBeNull();
  });

  it('returns insight when gap > 24h', () => {
    const hist: DiaperRecord[] = [
      { id: '1', type: 'poop', timestamp: DAY(10) },
      { id: '2', type: 'poop', timestamp: DAY(8) },
      { id: '3', type: 'poop', timestamp: DAY(5) },
      { id: '4', type: 'poop', timestamp: DAY(3) },
      { id: '5', type: 'poop', timestamp: DAY(1) },
    ];
    const result = insightDiaperGap(hist, 'Baby');
    expect(result).not.toBeNull();
    expect(result!.message).toContain('without a dirty diaper');
  });
});

describe('insightWakeTimeDrift', () => {
  it('returns null for fewer than 14 sleep entries in 28 days', () => {
    const last28 = Array(10).fill(null).map((_, i) => sleep({ startTime: DAY(i) + 6 * 3600000, endTime: DAY(i) + 8 * 3600000 }));
    expect(insightWakeTimeDrift([], last28, null)).toBeNull();
  });
});

describe('insightTummyTimeProgress', () => {
  it('returns null for fewer than 3 tummy entries', () => {
    const last7: TummyTimeRecord[] = [
      { id: '1', startTime: DAY(1), endTime: DAY(1) + 10 * 60000 },
      { id: '2', startTime: DAY(2), endTime: DAY(2) + 10 * 60000 },
    ];
    expect(insightTummyTimeProgress([], last7, null)).toBeNull();
  });

  it('returns low tummy message when total < 100 min', () => {
    const last7: TummyTimeRecord[] = [
      { id: '1', startTime: DAY(1), endTime: DAY(1) + 15 * 60000 },
      { id: '2', startTime: DAY(2), endTime: DAY(2) + 15 * 60000 },
      { id: '3', startTime: DAY(3), endTime: DAY(3) + 15 * 60000 },
    ];
    const result = insightTummyTimeProgress(last7, last7, null);
    expect(result).not.toBeNull();
    expect(result!.message).toMatch(/only \d+m total|2-minute session/);
  });
});

describe('insightFeedingInterval', () => {
  it('returns null for fewer than 10 feed entries', () => {
    const last7 = Array(5).fill(null).map((_, i) => feed({ timestamp: DAY(i) + 8 * 3600000 }));
    expect(insightFeedingInterval([], last7, null)).toBeNull();
  });
});

describe('generateInsights', () => {
  it('returns empty array when no data', () => {
    const result = generateInsights({
      sleepHistory: [],
      feedingHistory: [],
      diaperHistory: [],
      tummyHistory: [],
      bottleHistory: [],
      babyProfile: null,
      ageInWeeks: 0,
    });
    expect(result).toEqual([]);
  });

  it('returns insights sorted by confidence (high first)', () => {
    const result = generateInsights({
      sleepHistory: [],
      feedingHistory: [],
      diaperHistory: [
        { id: '1', type: 'poop', timestamp: DAY(12) },
        { id: '2', type: 'poop', timestamp: DAY(10) },
        { id: '3', type: 'poop', timestamp: DAY(5) },
        { id: '4', type: 'poop', timestamp: DAY(3) },
        { id: '5', type: 'poop', timestamp: DAY(1) },
      ],
      tummyHistory: [],
      bottleHistory: [],
      babyProfile: { birthDate: NOW - 60 * MS_PER_DAY, name: 'Test' },
      ageInWeeks: 8,
    });
    if (result.length > 1) {
      const order = result.map((r) => r.confidence);
      const highFirst = order.indexOf('high') <= order.indexOf('medium') && order.indexOf('medium') <= order.indexOf('low');
      expect(highFirst || order.every((c) => c === order[0])).toBe(true);
    }
  });
});
