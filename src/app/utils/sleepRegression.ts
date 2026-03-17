/**
 * Detect possible sleep regression (e.g. 4-month) from recent sleep pattern.
 */

import type { SleepRecord } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type RegressionType = "4_month" | "6_month" | "8_month" | "12_month" | "generic";

export interface SleepRegressionResult {
  detected: boolean;
  type: RegressionType;
  message: string;
  /** Suggested age range in weeks for this regression */
  ageWeeksMin: number;
  ageWeeksMax: number;
}

function getDurationMs(s: SleepRecord): number {
  const end = s.endTime ?? s.startTime;
  return Math.max(0, end - s.startTime - (s.excludedMs ?? 0));
}

/**
 * Heuristic: compare last 7 days vs previous 7 days — more wakes, shorter stretches, or lower total sleep may indicate regression.
 */
export function detectSleepRegression(
  sleepHistory: SleepRecord[],
  ageInWeeks: number | null,
  nowMs: number = Date.now()
): SleepRegressionResult | null {
  if (!Array.isArray(sleepHistory) || sleepHistory.length < 10) return null;
  const cutOff = nowMs - 14 * MS_PER_DAY;
  const recent = sleepHistory.filter((s) => s.startTime >= cutOff && s.endTime != null);
  if (recent.length < 7) return null;

  const mid = nowMs - 7 * MS_PER_DAY;
  const last7 = recent.filter((s) => s.startTime >= mid);
  const prev7 = recent.filter((s) => s.startTime < mid && s.endTime != null);
  if (last7.length < 3 || prev7.length < 3) return null;

  const totalLast7 = last7.reduce((sum, s) => sum + getDurationMs(s), 0);
  const totalPrev7 = prev7.reduce((sum, s) => sum + getDurationMs(s), 0);
  const avgLast7 = totalLast7 / 7;
  const avgPrev7 = totalPrev7 / 7;
  const dropPct = avgPrev7 > 0 ? (1 - avgLast7 / avgPrev7) * 100 : 0;
  const moreWakes = last7.length > prev7.length + 2;

  if (dropPct < 15 && !moreWakes) return null;

  let type: RegressionType = "generic";
  let ageWeeksMin = 0;
  let ageWeeksMax = 999;
  if (ageInWeeks != null) {
    if (ageInWeeks >= 14 && ageInWeeks <= 22) {
      type = "4_month";
      ageWeeksMin = 14;
      ageWeeksMax = 22;
    } else if (ageInWeeks >= 24 && ageInWeeks <= 32) {
      type = "6_month";
      ageWeeksMin = 24;
      ageWeeksMax = 32;
    } else if (ageInWeeks >= 32 && ageInWeeks <= 40) {
      type = "8_month";
      ageWeeksMin = 32;
      ageWeeksMax = 40;
    } else if (ageInWeeks >= 48 && ageInWeeks <= 56) {
      type = "12_month";
      ageWeeksMin = 48;
      ageWeeksMax = 56;
    }
  }

  const message =
    type !== "generic"
      ? `Sleep has been more broken this week — this often happens around ${type.replace("_", " ")}. It's usually temporary; keep offering naps and a consistent bedtime.`
      : "Sleep has been more broken this week. Growth spurts and developmental changes can affect sleep; it's often temporary.";

  return {
    detected: true,
    type,
    message,
    ageWeeksMin,
    ageWeeksMax,
  };
}
