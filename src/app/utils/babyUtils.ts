/**
 * Age-based targets and milestone helpers.
 * Typical ranges are approximate guidelines, not medical advice.
 */

export function getAgeInDays(birthDateMs: number, now = Date.now()): number {
  const start = new Date(birthDateMs).setHours(0, 0, 0, 0);
  const end = new Date(now).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

/** Typical per-day ranges by age (feeds, naps/sleeps, diapers). */
export function getTargetsForAge(ageDays: number): {
  feedsMin: number;
  feedsMax: number;
  sleepsMin: number;
  sleepsMax: number;
  diapersMin: number;
  diapersMax: number;
} {
  if (ageDays <= 7) return { feedsMin: 8, feedsMax: 12, sleepsMin: 4, sleepsMax: 6, diapersMin: 6, diapersMax: 10 };
  if (ageDays <= 14) return { feedsMin: 8, feedsMax: 12, sleepsMin: 4, sleepsMax: 6, diapersMin: 6, diapersMax: 10 };
  if (ageDays <= 30) return { feedsMin: 7, feedsMax: 9, sleepsMin: 4, sleepsMax: 5, diapersMin: 6, diapersMax: 8 };
  if (ageDays <= 90) return { feedsMin: 5, feedsMax: 8, sleepsMin: 3, sleepsMax: 5, diapersMin: 4, diapersMax: 8 };
  if (ageDays <= 180) return { feedsMin: 4, feedsMax: 6, sleepsMin: 2, sleepsMax: 4, diapersMin: 4, diapersMax: 6 };
  return { feedsMin: 3, feedsMax: 5, sleepsMin: 1, sleepsMax: 2, diapersMin: 4, diapersMax: 6 };
}

/** Default developmental milestones with typical age range in days. */
export const DEFAULT_MILESTONES: { id: string; label: string; typicalDaysMin: number; typicalDaysMax: number }[] = [
  { id: "first-smile", label: "First social smile", typicalDaysMin: 30, typicalDaysMax: 60 },
  { id: "head-up", label: "Holds head up briefly", typicalDaysMin: 45, typicalDaysMax: 90 },
  { id: "coos", label: "Coos and gurgles", typicalDaysMin: 60, typicalDaysMax: 90 },
  { id: "rolls-tummy-back", label: "Rolls tummy to back", typicalDaysMin: 90, typicalDaysMax: 150 },
  { id: "rolls-back-tummy", label: "Rolls back to tummy", typicalDaysMin: 120, typicalDaysMax: 180 },
  { id: "sits-unsupported", label: "Sits without support", typicalDaysMin: 150, typicalDaysMax: 210 },
  { id: "first-foods", label: "First solid foods", typicalDaysMin: 165, typicalDaysMax: 210 },
  { id: "crawls", label: "Crawls", typicalDaysMin: 180, typicalDaysMax: 300 },
  { id: "pulls-stand", label: "Pulls to stand", typicalDaysMin: 240, typicalDaysMax: 330 },
  { id: "first-words", label: "First words", typicalDaysMin: 270, typicalDaysMax: 450 },
  { id: "walks", label: "First steps", typicalDaysMin: 300, typicalDaysMax: 420 },
];
