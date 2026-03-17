/**
 * Anti-anxiety reassurance (Cradl Concierge): short, warm one-liners for alerts and range UI.
 */

import type { WarningKey } from "./warningUtils";

export const REASSURANCE_MAP: Record<string, string> = {
  "no-poop": "Many babies go a day or two without a dirty nappy — especially on breast milk. If you're worried, your health visitor can help.",
  "no-sleep": "Sleep patterns change all the time. One short night doesn't mean something's wrong.",
  "feed-overdue": "Babies don't run on a timer. She'll feed when she's ready; you're doing fine.",
  "tummy-low": "Any amount of tummy time counts. Tomorrow is a new day.",
  "feeding-due": "You're right to notice. Offer the breast or bottle — she'll take it if she's hungry.",
  "feeding-soon": "Nothing to do yet. You're on top of it.",
  "same-position": "Small tweaks help. You're paying attention — that's what matters.",
  "no-tummy-time": "Easy to miss on busy days. A few minutes later is still good.",
  "painkiller-due": "Looking after yourself helps you look after her. Take it if you need it.",
};

/** Get a reassurance line for a warning key. Returns null if none. */
export function getReassuranceForKey(key: WarningKey | string): string | null {
  return REASSURANCE_MAP[key] ?? null;
}

/** Cradl Concierge: reassurance when nap window has passed or is approaching. */
export function getReassuranceForNapStatus(displayName: string, status: "amber" | "red"): string | null {
  const name = displayName?.trim() || "Baby";
  if (status === "red") {
    return `The nap window has passed — but that's okay. ${name} will still nap. Watch for tired cues: rubbing eyes, going quiet, losing interest in toys. Offer the nap now and she'll likely settle quickly even if she's slightly overtired.`;
  }
  if (status === "amber") {
    return `The nap window is approaching. When you see tired signs, offer the nap. ${name} may settle more easily in the next 15–20 minutes.`;
  }
  return null;
}

/** Cradl Concierge: reassurance when a metric is below or above typical range (for comparative insights). */
export function getReassuranceForMetric(
  babyName: string | null,
  metric: string,
  value: number,
  status: "low" | "high"
): string | null {
  const name = babyName?.trim() || "She";
  if (status === "low") {
    if (metric === "feedsPerDay") {
      return `${name} had ${Math.round(value)} feed${value === 1 ? "" : "s"} today, which is on the lower end for her age. This is normal for some babies. If she seems content and is gaining weight well, there's no cause for concern. If you're worried, it's always worth a quick call to your health visitor.`;
    }
    if (metric === "sleepHoursPerDay") {
      return `Sleep today was ${value.toFixed(1)}h — a bit less than typical. That's okay for one day. Watch for extra tiredness and offer an earlier bedtime if she shows tired signs.`;
    }
    if (metric === "diaperChangesPerDay") {
      return `Fewer nappy changes today than average. If ${name} is feeding well and has wet nappies, it's often fine. Mention it at your next check if it persists.`;
    }
    if (metric === "tummyTimeMinPerDay") {
      return `Any amount of tummy time counts. Tomorrow is a new day — a few minutes here and there still helps.`;
    }
    return `${name} is on the lower end for this. Normal for many babies; worth watching. If you're worried, your health visitor can help.`;
  }
  if (status === "high") {
    return `Above typical range — normal for some babies at this age. No need to worry unless your health visitor has said otherwise.`;
  }
  return null;
}
