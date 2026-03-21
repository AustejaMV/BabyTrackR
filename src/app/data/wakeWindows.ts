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
  /** Older toddlers: reuse 90+ week window through schedule module max age */
  { minWeeks: 90, maxWeeks: 1000, minMinutes: 240, maxMinutes: 300 },
];

/**
 * Returns wake window for the given age in weeks.
 * Ages beyond tabulated ranges clamp to the last row (90+ weeks).
 */
export function getWakeWindowForAge(ageInWeeks: number): { minMinutes: number; maxMinutes: number } | null {
  if (ageInWeeks < 0 || !Number.isFinite(ageInWeeks)) return null;
  const clamped = Math.min(ageInWeeks, 999);
  const row = WAKE_WINDOWS.find((r) => clamped >= r.minWeeks && clamped < r.maxWeeks);
  if (!row) return null;
  return { minMinutes: row.minMinutes, maxMinutes: row.maxMinutes };
}
