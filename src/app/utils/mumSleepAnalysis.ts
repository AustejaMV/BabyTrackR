/**
 * Mum's sleep analysis: consecutive poor nights, support card suggestion.
 */

import type { MumSleepEntry, MumSleepRange } from "../types/mumSleep";

const POOR_RANGES: MumSleepRange[] = ["under_2h", "2_to_4h"];

/** Local calendar YYYY-MM-DD (matches log entry dates from the app UI). */
export function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface MumSleepSummary {
  last7DaysEntries: MumSleepEntry[];
  averageCategory: string;
  consecutivePoorNights: number;
  shouldShowSupportCard: boolean;
  supportMessage: string | null;
}

export function analyseMumSleep(history: MumSleepEntry[], babyName?: string | null): MumSleepSummary | null {
  if (!Array.isArray(history) || history.length < 3) return null;

  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const last7 = sorted.slice(0, 7);

  const poorCount = last7.filter((e) => POOR_RANGES.includes(e.sleepRange)).length;
  const total = last7.length;
  const avg = total > 0 ? poorCount / total : 0;
  let averageCategory = "unknown";
  if (avg >= 0.75) averageCategory = "mostly_poor";
  else if (avg >= 0.5) averageCategory = "mixed";
  else if (avg > 0) averageCategory = "some_poor";
  else averageCategory = "ok";

  let consecutivePoorNights = 0;
  const todayStr = localISODate();
  for (const e of sorted) {
    if (e.date > todayStr) continue;
    if (POOR_RANGES.includes(e.sleepRange)) {
      consecutivePoorNights++;
    } else {
      break;
    }
  }

  const shouldShowSupportCard = consecutivePoorNights >= 3;
  const name = babyName ? babyName : "baby";
  const supportMessage =
    shouldShowSupportCard
      ? `You've had very little sleep for ${consecutivePoorNights} nights in a row. This is genuinely hard on your body and mind — sleep deprivation at this level affects everything from your mood to your reaction time. If you have any chance to rest while ${name} sleeps today, please take it. Asking for help is not a failure. It is the smart thing to do.`
      : null;

  return {
    last7DaysEntries: last7,
    averageCategory,
    consecutivePoorNights,
    shouldShowSupportCard,
    supportMessage,
  };
}

/** Check if support card was shown in last 48h (localStorage cradl-mum-sleep-card-shown). */
export function wasSupportCardShownRecently(): boolean {
  try {
    const raw = localStorage.getItem("cradl-mum-sleep-card-shown");
    if (!raw) return false;
    const t = parseInt(raw, 10);
    return Date.now() - t < 48 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function markSupportCardShown(): void {
  try {
    localStorage.setItem("cradl-mum-sleep-card-shown", String(Date.now()));
  } catch {}
}
