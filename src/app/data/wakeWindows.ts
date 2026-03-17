/**
 * Age-based wake windows (max time awake between sleeps).
 * Used for nap window / sweet spot prediction.
 */

export interface WakeWindowRow {
  minWeeks: number;
  maxWeeks: number;
  minMinutes: number;
  maxMinutes: number;
}

export const WAKE_WINDOWS: WakeWindowRow[] = [
  { minWeeks: 0, maxWeeks: 6, minMinutes: 45, maxMinutes: 60 },
  { minWeeks: 6, maxWeeks: 12, minMinutes: 60, maxMinutes: 90 },
  { minWeeks: 12, maxWeeks: 16, minMinutes: 75, maxMinutes: 120 },
  { minWeeks: 16, maxWeeks: 24, minMinutes: 90, maxMinutes: 150 },
  { minWeeks: 24, maxWeeks: 32, minMinutes: 120, maxMinutes: 180 },
  { minWeeks: 32, maxWeeks: 40, minMinutes: 150, maxMinutes: 210 },
  { minWeeks: 40, maxWeeks: 52, minMinutes: 150, maxMinutes: 210 },
  { minWeeks: 52, maxWeeks: 68, minMinutes: 210, maxMinutes: 270 },
  { minWeeks: 68, maxWeeks: 90, minMinutes: 240, maxMinutes: 300 },
  { minWeeks: 90, maxWeeks: 201, minMinutes: 240, maxMinutes: 300 },
];

/**
 * Returns wake window for the given age in weeks.
 * Guard: returns null if ageInWeeks < 0 or > 200 or no matching row.
 */
export function getWakeWindowForAge(ageInWeeks: number): { minMinutes: number; maxMinutes: number } | null {
  if (ageInWeeks < 0 || ageInWeeks > 200) return null;
  const row = WAKE_WINDOWS.find((r) => ageInWeeks >= r.minWeeks && ageInWeeks < r.maxWeeks);
  if (!row) return null;
  return { minMinutes: row.minMinutes, maxMinutes: row.maxMinutes };
}
