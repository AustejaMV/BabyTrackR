/**
 * Sleep pattern summary from fall-asleep method, wake mood, and location (sleep mood logging).
 */

import type { SleepRecord } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LAST_DAYS = 14;

function getDurationMs(s: SleepRecord): number {
  const end = s.endTime ?? s.startTime;
  return Math.max(0, end - s.startTime - (s.excludedMs ?? 0));
}

export interface SleepPatternSummary {
  lines: string[];
  hasEnoughData: boolean;
}

/**
 * Analyze last 14 days of sleep with mood/location data.
 * Returns 0–3 pattern lines e.g. "Wakes happy 80% of the time from cot naps over 45 min."
 */
export function getSleepPatternSummary(
  sleepHistory: SleepRecord[],
  babyName: string | null,
  nowMs: number = Date.now()
): SleepPatternSummary {
  const cutoff = nowMs - LAST_DAYS * MS_PER_DAY;
  const recent = (sleepHistory ?? []).filter((s) => s.startTime >= cutoff && s.endTime != null);
  const withMoodOrLocation = recent.filter(
    (s) =>
      (s.wakeUpMood?.trim() ?? "") !== "" ||
      (s.sleepLocation?.trim() ?? "") !== "" ||
      (s.fallAsleepMethod?.trim() ?? "") !== "" ||
      s.whiteNoise !== undefined ||
      (s.roomTempC != null && Number.isFinite(s.roomTempC)) ||
      (s.lightLevel?.trim() ?? "") !== "" ||
      (s.sleepAid?.trim() ?? "") !== ""
  );

  const lines: string[] = [];
  const name = (babyName ?? "She").trim() || "She";

  if (withMoodOrLocation.length < 5) {
    return { lines: [], hasEnoughData: false };
  }

  // Wake mood by location (for naps over 45 min)
  const over45 = withMoodOrLocation.filter((s) => getDurationMs(s) >= 45 * 60 * 1000);
  if (over45.length >= 3 && over45.some((s) => s.sleepLocation) && over45.some((s) => s.wakeUpMood)) {
    const byLocation = new Map<string, { happy: number; total: number }>();
    for (const s of over45) {
      const loc = (s.sleepLocation ?? "Other").trim() || "Other";
      const entry = byLocation.get(loc) ?? { happy: 0, total: 0 };
      entry.total += 1;
      const mood = (s.wakeUpMood ?? "").toLowerCase();
      if (mood === "happy" || mood === "calm") entry.happy += 1;
      byLocation.set(loc, entry);
    }
    for (const [loc, { happy, total }] of byLocation) {
      if (total >= 3) {
        const pct = Math.round((happy / total) * 100);
        if (pct >= 60)
          lines.push(`${name} wakes happy or calm ${pct}% of the time from ${loc.toLowerCase()} naps over 45 minutes.`);
        else if (pct <= 40 && total >= 5)
          lines.push(`${name} often wakes grumpy or tired from ${loc.toLowerCase()} naps — cot naps might work better.`);
      }
    }
  }

  // Car naps vs cot: average duration
  const byLoc = new Map<string, number[]>();
  for (const s of withMoodOrLocation) {
    const loc = (s.sleepLocation ?? "Other").trim() || "Other";
    if (!byLoc.has(loc)) byLoc.set(loc, []);
    byLoc.get(loc)!.push(getDurationMs(s) / (60 * 1000));
  }
  const cotMins = byLoc.get("Cot") ?? [];
  const pramMins = byLoc.get("Pram") ?? [];
  const carMins = byLoc.get("Car seat") ?? [];
  if (cotMins.length >= 3 && (pramMins.length >= 3 || carMins.length >= 3)) {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const cotAvg = Math.round(avg(cotMins));
    const other = pramMins.length >= carMins.length ? { name: "pram", mins: pramMins } : { name: "car", mins: carMins };
    if (other.mins.length >= 3) {
      const otherAvg = Math.round(avg(other.mins));
      if (cotAvg - otherAvg >= 20)
        lines.push(`Cot naps last on average ${cotAvg} min longer than ${other.name} naps.`);
    }
  }

  // Fall-asleep method that leads to longest sleeps
  const byMethod = new Map<string, number[]>();
  for (const s of withMoodOrLocation) {
    const method = (s.fallAsleepMethod ?? "Other").trim() || "Other";
    if (!byMethod.has(method)) byMethod.set(method, []);
    byMethod.get(method)!.push(getDurationMs(s) / (60 * 1000));
  }
  let bestMethod: string | null = null;
  let bestAvg = 0;
  for (const [method, mins] of byMethod) {
    if (mins.length < 3) continue;
    const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestMethod = method;
    }
  }
  if (bestMethod && bestMethod !== "Other" && lines.length < 3) {
    lines.push(`${name}'s longest sleeps tend to follow falling asleep by ${bestMethod.toLowerCase()}.`);
  }

  // White noise + temperature: longest sleeps when white noise on and temp in range
  const withEnv = recent.filter((s) => s.whiteNoise === true && s.roomTempC != null && Number.isFinite(s.roomTempC));
  if (withEnv.length >= 5 && lines.length < 3) {
    const temps = withEnv.map((s) => s.roomTempC!);
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    if (maxT - minT <= 2) {
      lines.push(`${name}'s longest sleep stretches often happened when white noise was on and room temperature was ${minT}–${maxT}°C.`);
    }
  }

  return {
    lines: lines.slice(0, 3),
    hasEnoughData: withMoodOrLocation.length >= 5,
  };
}
