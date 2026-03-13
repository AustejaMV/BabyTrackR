import type { DiaperRecord } from '../types';

/** Number of pee diapers: pee + both each count as +1 */
export function countPee(records: DiaperRecord[]): number {
  return records.filter((d) => d.type === 'pee' || d.type === 'both').length;
}

/** Number of poop diapers: poop + both each count as +1 */
export function countPoop(records: DiaperRecord[]): number {
  return records.filter((d) => d.type === 'poop' || d.type === 'both').length;
}

/** Stats shown in the "Last 24 Hours" card */
export function calcStats(records: DiaperRecord[]) {
  return {
    pee:   countPee(records),
    poop:  countPoop(records),
    total: records.length,
  };
}

/** Data for the pee/poop pie chart (no separate "Both" bar) */
export function calcChartData(records: DiaperRecord[]) {
  return [
    { name: 'Pee',  value: countPee(records)  },
    { name: 'Poop', value: countPoop(records) },
  ];
}
