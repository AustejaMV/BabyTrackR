/**
 * Active timer threshold logic (Option A — smart colour shift).
 * Determines normal / warning / alert state for Sleep, Feed, and Tummy timers.
 */

import type { SleepRecord } from "../types";

const NAP_MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4h — exclude night sleep
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_NAPS_FOR_AVG = 5;

export type TimerThresholdState = "normal" | "warning" | "alert";

/**
 * Age-typical nap duration bounds (min–max) for “running long” thresholds.
 * Young babies often take naps well beyond a single 45‑minute sleep cycle; caps below follow
 * common NHS-style public guidance (variable nap length; short naps and 1–2h+ naps can be normal).
 * Night sleep is excluded elsewhere via NAP_MAX_DURATION_MS (4h) in nap averaging.
 */
function getAgeTypicalNapBoundsMs(ageWeeks: number): { minMs: number; maxMs: number } {
  if (ageWeeks < 8) return { minMs: 20 * 60 * 1000, maxMs: 120 * 60 * 1000 }; // 0–8w: catnaps + long naps
  if (ageWeeks < 16) return { minMs: 25 * 60 * 1000, maxMs: 90 * 60 * 1000 }; // ~2–4m
  if (ageWeeks < 26) return { minMs: 30 * 60 * 1000, maxMs: 105 * 60 * 1000 }; // ~4–6m
  if (ageWeeks < 52) return { minMs: 45 * 60 * 1000, maxMs: 120 * 60 * 1000 }; // 6–12m
  if (ageWeeks < 78) return { minMs: 45 * 60 * 1000, maxMs: 90 * 60 * 1000 }; // 12–18m
  return { minMs: 45 * 60 * 1000, maxMs: 120 * 60 * 1000 };
}

/** Average nap duration from last 14 days (naps only, min 5). Returns null if insufficient data. */
export function getNapAverageMs(
  sleepHistory: SleepRecord[],
  now: number = Date.now()
): number | null {
  const cutoff = now - FOURTEEN_DAYS_MS;
  const naps = sleepHistory.filter((s) => {
    const start = s.startTime ?? 0;
    const end = s.endTime ?? start;
    const dur = end - start - (s.excludedMs ?? 0);
    return end > 0 && dur > 0 && dur <= NAP_MAX_DURATION_MS && end >= cutoff;
  });
  if (naps.length < MIN_NAPS_FOR_AVG) return null;
  const totalMs = naps.reduce((sum, s) => {
    const end = s.endTime ?? s.startTime ?? 0;
    return sum + (end - (s.startTime ?? 0) - (s.excludedMs ?? 0));
  }, 0);
  return totalMs / naps.length;
}

export interface TimerThresholdContext {
  sleepHistory?: SleepRecord[];
  birthDateMs?: number | null;
}

/** Get threshold state for sleep/nap timer. Recalculate every 10s in UI; no need for second precision. */
export function getSleepThresholdState(
  elapsedMs: number,
  ctx: TimerThresholdContext
): TimerThresholdState {
  const ageWeeks = ctx.birthDateMs != null
    ? Math.max(0, (Date.now() - ctx.birthDateMs) / (7 * 24 * 60 * 60 * 1000))
    : 26;
  const typical = getAgeTypicalNapBoundsMs(ageWeeks);
  const avgMs = ctx.sleepHistory?.length
    ? getNapAverageMs(ctx.sleepHistory)
    : null;
  const warningMs = avgMs != null
    ? Math.min(avgMs * 1.4, typical.maxMs)
    : typical.maxMs;
  const alertMs = avgMs != null
    ? Math.min(avgMs * 1.8, typical.maxMs * 1.3)
    : typical.maxMs * 1.3;
  if (elapsedMs >= alertMs) return "alert";
  if (elapsedMs >= warningMs) return "warning";
  return "normal";
}

/** Feed (breast/pump): warning > 35 min, alert > 50 min. */
export function getFeedThresholdState(elapsedMs: number): TimerThresholdState {
  const WARNING_MS = 35 * 60 * 1000;
  const ALERT_MS = 50 * 60 * 1000;
  if (elapsedMs >= ALERT_MS) return "alert";
  if (elapsedMs >= WARNING_MS) return "warning";
  return "normal";
}

/** Tummy time: warning > 20 min, alert > 35 min. */
export function getTummyThresholdState(elapsedMs: number): TimerThresholdState {
  const WARNING_MS = 20 * 60 * 1000;
  const ALERT_MS = 35 * 60 * 1000;
  if (elapsedMs >= ALERT_MS) return "alert";
  if (elapsedMs >= WARNING_MS) return "warning";
  return "normal";
}

export function getTimerThresholdState(
  type: "feed" | "sleep" | "tummy",
  elapsedMs: number,
  ctx: TimerThresholdContext = {}
): TimerThresholdState {
  if (type === "feed") return getFeedThresholdState(elapsedMs);
  if (type === "sleep") return getSleepThresholdState(elapsedMs, ctx);
  return getTummyThresholdState(elapsedMs);
}
