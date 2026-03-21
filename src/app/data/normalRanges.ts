/**
 * Age-appropriate normal ranges (mixed NHS / WHO-aligned public guidance) for "is this normal?" comparisons.
 * Band values are approximate summaries for the app, not raw WHO table downloads.
 */

export interface AgeRangeRow {
  minWeeks: number;
  maxWeeks: number;
  min: number;
  max: number;
  unit: string;
  label: string;
}

export interface MetricRanges {
  metric: string;
  ageRanges: AgeRangeRow[];
}

/** feedsPerDay, sleepHoursPerDay, diaperChangesPerDay, tummyTimeMinPerDay, weightGainGPerWeek */
export const NORMAL_RANGES: Record<string, { metric: string; ageRanges: AgeRangeRow[] }> = {
  feedsPerDay: {
    metric: 'feedsPerDay',
    ageRanges: [
      { minWeeks: 0, maxWeeks: 4, min: 8, max: 12, unit: 'feeds', label: 'Newborn' },
      { minWeeks: 4, maxWeeks: 13, min: 8, max: 10, unit: 'feeds', label: '1–3 mo' },
      { minWeeks: 13, maxWeeks: 26, min: 6, max: 8, unit: 'feeds', label: '3–6 mo' },
      { minWeeks: 26, maxWeeks: 39, min: 5, max: 7, unit: 'feeds', label: '6–9 mo' },
      { minWeeks: 39, maxWeeks: 52, min: 4, max: 6, unit: 'feeds', label: '9–12 mo' },
    ],
  },
  sleepHoursPerDay: {
    metric: 'sleepHoursPerDay',
    ageRanges: [
      { minWeeks: 0, maxWeeks: 4, min: 14, max: 17, unit: 'h', label: 'Newborn' },
      { minWeeks: 4, maxWeeks: 13, min: 14, max: 17, unit: 'h', label: '1–3 mo' },
      { minWeeks: 13, maxWeeks: 48, min: 12, max: 15, unit: 'h', label: '4–11 mo' },
      { minWeeks: 48, maxWeeks: 104, min: 11, max: 14, unit: 'h', label: '12–24 mo' },
    ],
  },
  diaperChangesPerDay: {
    metric: 'diaperChangesPerDay',
    ageRanges: [
      { minWeeks: 0, maxWeeks: 4, min: 8, max: 12, unit: 'changes', label: 'Newborn' },
      { minWeeks: 4, maxWeeks: 13, min: 6, max: 10, unit: 'changes', label: '1–3 mo' },
      { minWeeks: 13, maxWeeks: 26, min: 4, max: 8, unit: 'changes', label: '3–6 mo' },
      { minWeeks: 26, maxWeeks: 52, min: 4, max: 6, unit: 'changes', label: '6–12 mo' },
    ],
  },
  tummyTimeMinPerDay: {
    metric: 'tummyTimeMinPerDay',
    ageRanges: [
      { minWeeks: 0, maxWeeks: 13, min: 15, max: 30, unit: 'min', label: '0–3 mo' },
      { minWeeks: 13, maxWeeks: 26, min: 20, max: 40, unit: 'min', label: '3–6 mo' },
      { minWeeks: 26, maxWeeks: 39, min: 30, max: 60, unit: 'min', label: '6–9 mo' },
    ],
  },
  weightGainGPerWeek: {
    metric: 'weightGainGPerWeek',
    ageRanges: [
      { minWeeks: 0, maxWeeks: 13, min: 150, max: 200, unit: 'g/week', label: '0–3 mo' },
      { minWeeks: 13, maxWeeks: 26, min: 100, max: 150, unit: 'g/week', label: '3–6 mo' },
      { minWeeks: 26, maxWeeks: 52, min: 70, max: 100, unit: 'g/week', label: '6–12 mo' },
    ],
  },
};

/**
 * Returns the normal range for a metric at the given age in weeks.
 * Guard: returns null if metric unknown or age not covered.
 */
export function getNormalRange(
  metric: string,
  ageInWeeks: number,
): { min: number; max: number; unit: string; label: string } | null {
  if (metric == null || metric === '' || !Number.isFinite(ageInWeeks) || ageInWeeks < 0) return null;
  const data = NORMAL_RANGES[metric];
  if (!data?.ageRanges?.length) return null;
  const row = data.ageRanges.find((r) => ageInWeeks >= r.minWeeks && ageInWeeks < r.maxWeeks);
  if (!row) return null;
  return { min: row.min, max: row.max, unit: row.unit, label: row.label };
}

export type MetricStatus = 'normal' | 'low' | 'high' | 'unknown';

export interface AssessResult {
  status: MetricStatus;
  message: string;
}

/**
 * Assesses a value against the normal range for the metric and age.
 * Guard: returns unknown if value <= 0 or age invalid or getNormalRange returns null.
 */
export function assessMetric(
  value: number,
  metric: string,
  ageInWeeks: number,
): AssessResult {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(ageInWeeks) || ageInWeeks < 0) {
    return { status: 'unknown', message: '' };
  }
  const range = getNormalRange(metric, ageInWeeks);
  if (!range) return { status: 'unknown', message: '' };
  if (value >= range.min && value <= range.max) {
    return { status: 'normal', message: 'Within typical range.' };
  }
  if (value < range.min) {
    return {
      status: 'low',
      message: 'On the lower end — normal for many babies, but worth watching.',
    };
  }
  return {
    status: 'high',
    message: 'Above typical range — normal for some babies at this age.',
  };
}

/** Official references for transparency (shown under each metric in the UI). */
export interface NormalRangeReference {
  label: string;
  url: string;
}

const WHO_CGS = "https://www.who.int/tools/child-growth-standards";
const WHO_IYCF =
  "https://www.who.int/teams/nutrition-and-food-safety/food-and-nutrition-actions-in-health-systems/infant-and-young-child-feeding";
const WHO_IYCN_FACTSHEET = "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding";

/** Per-metric public sources similar to the bands we summarise (not 1:1 row-level WHO tables). */
export const NORMAL_RANGE_REFERENCE_LINKS: Record<string, NormalRangeReference[]> = {
  feedsPerDay: [
    { label: "WHO — Infant and young child feeding", url: WHO_IYCF },
    { label: "WHO — Infant and young child nutrition (fact sheet)", url: WHO_IYCN_FACTSHEET },
    { label: "NHS — How often to feed your baby", url: "https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/how-often-feed-baby/" },
  ],
  sleepHoursPerDay: [
    { label: "WHO — Child growth standards (context)", url: WHO_CGS },
    { label: "NHS — Baby sleep and nighttime feeding", url: "https://www.nhs.uk/conditions/baby/sleep-and-nighttime-feeding/" },
  ],
  diaperChangesPerDay: [
    { label: "NHS — Changing your baby’s nappy", url: "https://www.nhs.uk/conditions/baby/caring-for-a-newborn/how-to-change-your-babys-nappy/" },
    { label: "WHO — Child growth standards", url: WHO_CGS },
  ],
  tummyTimeMinPerDay: [
    { label: "NHS — Tummy time for babies", url: "https://www.nhs.uk/start-for-life/baby/babies-tummy-time/" },
    { label: "WHO — Child growth standards", url: WHO_CGS },
  ],
  weightGainGPerWeek: [
    { label: "WHO — Child growth standards", url: WHO_CGS },
    { label: "WHO — Weight-for-age growth charts (0–2 years, methodology)", url: "https://www.who.int/tools/child-growth-standards/standards" },
  ],
};

export function getNormalRangeReferenceLinks(metric: string): NormalRangeReference[] {
  return NORMAL_RANGE_REFERENCE_LINKS[metric] ?? [];
}
