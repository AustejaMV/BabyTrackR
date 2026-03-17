/**
 * Tests for crying diagnostic reasons.
 */
import { describe, it, expect } from 'vitest';
import {
  reasonHunger,
  reasonTired,
  reasonDiaper,
  reasonLeap,
  reasonGas,
  generateCryingReasons,
} from './cryingDiagnostic';

const NOW = Date.now();
const h = (hours: number) => hours * 60 * 60 * 1000;

describe('reasonHunger', () => {
  it('returns null when no feed history', () => {
    expect(reasonHunger([], 3 * 60 * 60 * 1000)).toBeNull();
  });

  it('returns unlikely when last feed 1h ago and interval 3h', () => {
    const hist = [{ timestamp: NOW - h(1), endTime: NOW - h(1) }];
    const r = reasonHunger(hist, h(3));
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('unlikely');
  });

  it('returns likely when last feed 3h ago and interval 3h', () => {
    const hist = [{ timestamp: NOW - h(3), endTime: NOW - h(3) }];
    const r = reasonHunger(hist, h(3));
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('likely');
    expect(r!.drawer).toBe('feed');
  });
});

describe('reasonTired', () => {
  it('returns null when no DOB', () => {
    const hist = [{ startTime: NOW - h(2), endTime: NOW - h(1) }];
    expect(reasonTired(hist, null)).toBeNull();
  });

  it('returns null when no sleep history', () => {
    expect(reasonTired([], NOW - 60 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it('returns possible when awake 2h and window 90–150 min (16 weeks)', () => {
    const dob = NOW - 16 * 7 * 24 * 60 * 60 * 1000;
    const lastWake = NOW - h(2);
    const hist = [{ startTime: lastWake - h(1), endTime: lastWake }];
    const r = reasonTired(hist, dob);
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('possible');
  });

  it('returns likely when awake 3h past window', () => {
    const dob = NOW - 10 * 7 * 24 * 60 * 60 * 1000;
    const lastWake = NOW - h(3);
    const hist = [{ startTime: lastWake - h(1), endTime: lastWake }];
    const r = reasonTired(hist, dob);
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('likely');
  });
});

describe('reasonDiaper', () => {
  it('returns null when no history', () => {
    expect(reasonDiaper([])).toBeNull();
  });

  it('returns unlikely when change 30m ago', () => {
    const hist = [{ timestamp: NOW - 30 * 60 * 1000 }];
    const r = reasonDiaper(hist);
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('unlikely');
  });

  it('returns likely when change 3h ago', () => {
    const hist = [{ timestamp: NOW - h(3) }];
    const r = reasonDiaper(hist);
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('likely');
  });
});

describe('reasonLeap', () => {
  it('returns null when no DOB', () => {
    expect(reasonLeap(null, {})).toBeNull();
  });

  it('returns reason when in leap (e.g. week 4.5, inside Leap 1 which is weeks 4–5)', () => {
    const weeks = 4.5;
    const dob = NOW - weeks * 7 * 24 * 60 * 60 * 1000;
    const now = NOW + 1;
    const r = reasonLeap(dob, {}, now);
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('possible');
  });

  it('returns null when not in leap', () => {
    const dob = NOW - 1 * 7 * 24 * 60 * 60 * 1000;
    const r = reasonLeap(dob, {}, NOW + 1);
    expect(r).toBeNull();
  });
});

describe('reasonGas', () => {
  it('returns null when no recent feed (last 30 min)', () => {
    const hist = [{ timestamp: NOW - h(1), endTime: NOW - h(1) }];
    expect(reasonGas(hist)).toBeNull();
  });

  it('returns possible when feed completed within last 30 min', () => {
    const hist = [{ timestamp: NOW - 15 * 60 * 1000, endTime: NOW - 10 * 60 * 1000 }];
    const r = reasonGas(hist);
    expect(r).not.toBeNull();
    expect(r!.likelihood).toBe('possible');
  });
});

describe('generateCryingReasons', () => {
  it('sorts by priority then likelihood', () => {
    const reasons = generateCryingReasons({
      feedingHistory: [{ timestamp: NOW - h(4), endTime: NOW - h(4) }],
      sleepHistory: [],
      diaperHistory: [{ timestamp: NOW - h(3) }],
      babyDob: NOW - 10 * 7 * 24 * 60 * 60 * 1000,
    });
    expect(reasons.length).toBeGreaterThan(0);
    for (let i = 1; i < reasons.length; i++) {
      const a = reasons[i - 1]!;
      const b = reasons[i]!;
      expect(a.priority <= b.priority).toBe(true);
      if (a.priority === b.priority) {
        const order = { likely: 0, possible: 1, unlikely: 2 };
        expect(order[a.likelihood]).toBeLessThanOrEqual(order[b.likelihood]);
      }
    }
  });
});
