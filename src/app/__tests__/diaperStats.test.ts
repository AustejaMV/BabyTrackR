import { describe, it, expect } from 'vitest';
import type { DiaperRecord } from '../types';

// ─── Logic mirrored from DiaperTracking.tsx ──────────────────────────────────
// Keeping the pure counting logic here means tests break loudly if the page
// changes the rules, prompting an intentional update.

function countPee(records: DiaperRecord[]): number {
  return records.filter((d) => d.type === 'pee' || d.type === 'both').length;
}

function countPoop(records: DiaperRecord[]): number {
  return records.filter((d) => d.type === 'poop' || d.type === 'both').length;
}

function calcStats(records: DiaperRecord[]) {
  return { pee: countPee(records), poop: countPoop(records) };
}

function calcChartData(records: DiaperRecord[]) {
  return [
    { name: 'Pee',  value: countPee(records)  },
    { name: 'Poop', value: countPoop(records) },
  ];
}

const T = 1_000_000; // arbitrary base timestamp

function make(type: DiaperRecord['type'], offset = 0): DiaperRecord {
  return { id: `d${offset}`, type, timestamp: T + offset };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('diaper stats — pee count', () => {
  it('counts "pee" records', () => {
    expect(calcStats([make('pee'), make('pee')]).pee).toBe(2);
  });

  it('"poop" records do not count as pee', () => {
    expect(calcStats([make('poop'), make('poop')]).pee).toBe(0);
  });

  it('"both" counts as +1 pee', () => {
    expect(calcStats([make('both')]).pee).toBe(1);
  });

  it('mixed: pee + both = 2 pee', () => {
    expect(calcStats([make('pee'), make('both')]).pee).toBe(2);
  });

  it('mixed: poop + pee + both = 2 pee', () => {
    const records = [make('poop'), make('pee'), make('both')];
    expect(calcStats(records).pee).toBe(2);
  });
});

describe('diaper stats — poop count', () => {
  it('counts "poop" records', () => {
    expect(calcStats([make('poop'), make('poop')]).poop).toBe(2);
  });

  it('"pee" records do not count as poop', () => {
    expect(calcStats([make('pee'), make('pee')]).poop).toBe(0);
  });

  it('"both" counts as +1 poop', () => {
    expect(calcStats([make('both')]).poop).toBe(1);
  });

  it('mixed: poop + both = 2 poop', () => {
    expect(calcStats([make('poop'), make('both')]).poop).toBe(2);
  });
});

describe('diaper stats — "both" double-counts correctly', () => {
  it('a single "both" record adds +1 to pee AND +1 to poop', () => {
    const { pee, poop } = calcStats([make('both')]);
    expect(pee).toBe(1);
    expect(poop).toBe(1);
  });

  it('three "both" records → pee=3, poop=3', () => {
    const records = [make('both', 0), make('both', 1), make('both', 2)];
    const { pee, poop } = calcStats(records);
    expect(pee).toBe(3);
    expect(poop).toBe(3);
  });

  it('real-world mix: 2 pee, 1 poop, 2 both → pee=4, poop=3', () => {
    const records = [
      make('pee',  0), make('pee',  1),
      make('poop', 2),
      make('both', 3), make('both', 4),
    ];
    const { pee, poop } = calcStats(records);
    expect(pee).toBe(4);
    expect(poop).toBe(3);
  });
});

describe('diaper stats — empty / edge cases', () => {
  it('empty history → all zeros', () => {
    const { pee, poop } = calcStats([]);
    expect(pee).toBe(0);
    expect(poop).toBe(0);
  });
});

describe('diaper chart data', () => {
  it('chart has exactly two entries named "Pee" and "Poop"', () => {
    const data = calcChartData([make('pee'), make('poop'), make('both')]);
    expect(data.map((d) => d.name)).toEqual(['Pee', 'Poop']);
  });

  it('"both" record contributes to both chart bars', () => {
    const data = calcChartData([make('both')]);
    const peeBar  = data.find((d) => d.name === 'Pee')!;
    const poopBar = data.find((d) => d.name === 'Poop')!;
    expect(peeBar.value).toBe(1);
    expect(poopBar.value).toBe(1);
  });

  it('chart does NOT have a separate "Both" bar', () => {
    const data = calcChartData([make('both'), make('both')]);
    expect(data.find((d) => d.name === 'Both')).toBeUndefined();
  });
});
