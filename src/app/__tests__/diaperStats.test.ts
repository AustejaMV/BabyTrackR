/**
 * Diaper tracking — what the user sees on the stats screen.
 */
import { describe, it, expect } from 'vitest';
import { calcStats, calcChartData } from '../utils/diaperUtils';
import type { DiaperRecord } from '../types';

const T = 1_700_000_000_000;
const make = (type: DiaperRecord['type'], offset = 0): DiaperRecord =>
  ({ id: `d${offset}`, type, timestamp: T + offset });

describe('Pee counter', () => {
  it('goes up by 1 when I tap Pee', () => {
    expect(calcStats([make('pee')]).pee).toBe(1);
  });

  it('goes up by 1 when I tap Both (pee + poop together)', () => {
    expect(calcStats([make('both')]).pee).toBe(1);
  });

  it('does not change when I tap Poop', () => {
    expect(calcStats([make('poop')]).pee).toBe(0);
  });

  it('reflects the full count across multiple diapers', () => {
    expect(calcStats([make('pee'), make('both'), make('poop')]).pee).toBe(2);
  });
});

describe('Poop counter', () => {
  it('goes up by 1 when I tap Poop', () => {
    expect(calcStats([make('poop')]).poop).toBe(1);
  });

  it('goes up by 1 when I tap Both', () => {
    expect(calcStats([make('both')]).poop).toBe(1);
  });

  it('does not change when I tap Pee', () => {
    expect(calcStats([make('pee')]).poop).toBe(0);
  });

  it('reflects the full count across multiple diapers', () => {
    expect(calcStats([make('pee'), make('poop'), make('both')]).poop).toBe(2);
  });
});

describe('Both button', () => {
  it('increments pee AND poop at the same time', () => {
    const { pee, poop } = calcStats([make('both')]);
    expect(pee).toBe(1);
    expect(poop).toBe(1);
  });

  it('real-world day: 2 pee, 1 poop, 2 both → pee=4, poop=3', () => {
    const { pee, poop } = calcStats([
      make('pee', 0), make('pee', 1),
      make('poop', 2),
      make('both', 3), make('both', 4),
    ]);
    expect(pee).toBe(4);
    expect(poop).toBe(3);
  });
});

describe('Stats with no data', () => {
  it('shows zero for everything when no diapers have been logged', () => {
    const { pee, poop, total } = calcStats([]);
    expect(pee).toBe(0);
    expect(poop).toBe(0);
    expect(total).toBe(0);
  });
});

describe('Distribution chart', () => {
  it('shows only Pee and Poop bars — no separate Both bar', () => {
    const names = calcChartData([make('pee'), make('poop'), make('both')]).map((d) => d.name);
    expect(names).toEqual(['Pee', 'Poop']);
    expect(names).not.toContain('Both');
  });

  it('Both diapers contribute to both bars', () => {
    const [peeBar, poopBar] = calcChartData([make('both')]);
    expect(peeBar.value).toBe(1);
    expect(poopBar.value).toBe(1);
  });
});
