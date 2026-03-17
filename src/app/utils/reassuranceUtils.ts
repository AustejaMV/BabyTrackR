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
