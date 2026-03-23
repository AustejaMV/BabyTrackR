/**
 * 3am companion mode: night hours detection and supportive messages.
 */

const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 5;

/**
 * Returns true during "small hours": from 23:00 up to and including 05:00 local,
 * but false from 05:01 onward (day starts after 5am).
 */
export function isNightHours(now?: Date): boolean {
  const d = now ?? new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  const start = NIGHT_START_HOUR * 60; // 23:00
  const endInclusive = NIGHT_END_HOUR * 60; // 05:00
  return mins >= start || mins <= endInclusive;
}

const NIGHT_MESSAGES = [
  "You're up in the small hours doing the hardest job. That counts for everything.",
  "Right now, thousands of other parents are doing exactly what you're doing. You're not alone.",
  "The nights feel endless. They aren't. You're doing brilliantly.",
  "Nobody tells you it's this hard. It is. And you're doing it.",
  "She knows your voice, your smell, your heartbeat. You are her whole world.",
  "One feed at a time. That's all you have to do.",
  "You showed up again tonight. That's what she needs.",
  "It's okay to feel exhausted. You're still here, and that matters.",
  "These nights will become a blur. What will stay is that you were there.",
  "There's no medal for doing it alone. You're allowed to need rest too.",
  "Every time you pick her up, you're telling her she's safe. That's everything.",
  "The fact that you're still going at this hour says more than any book could.",
  "You don't have to love every moment. You just have to be there. You are.",
  "Rest when you can. The washing can wait. You can't pour from an empty cup.",
  "She won't remember this exact night. She'll remember that you were there.",
  "You're not failing. You're surviving the hardest bit. That's enough.",
  "Tomorrow will come. For now, this one moment is enough.",
  "You're allowed to cry. You're allowed to be tired. You're still a good parent.",
  "The sun will rise. So will you. One breath at a time.",
  "You're doing the invisible work that keeps her world turning. Thank you.",
];

/**
 * Returns a deterministic message based on current minute bucket so it doesn't change mid-feed.
 * Uses Math.floor(Date.now() / 60000) % messages.length.
 */
export function getNightMessage(nowMs?: number): string {
  const ms = nowMs ?? Date.now();
  const bucket = Math.floor(ms / 60_000) % NIGHT_MESSAGES.length;
  const msg = NIGHT_MESSAGES[bucket];
  return typeof msg === "string" && msg.length > 0 ? msg : NIGHT_MESSAGES[0];
}

/** Prompt 14: Five rotating messages for 3am mode; advance on each night session (stored index). */
export const PROMPT_14_ROTATING_MESSAGES = [
  "Right now, thousands of other parents are doing exactly what you're doing.",
  "The nights are long. They do get shorter. You are doing it.",
  "She knows your voice better than anything else in the world.",
  "Every feed you do tonight is an act of love. Even the hard ones.",
  "You don't have to have it figured out. You just have to be here.",
];

const NIGHT_INDEX_KEY = "cradl-night-message-index";

/** Advance index for next app open / feed log (Prompt 14). */
export function advanceNightMessageIndex(): void {
  try {
    const idx = parseInt(localStorage.getItem(NIGHT_INDEX_KEY) ?? "0", 10);
    localStorage.setItem(NIGHT_INDEX_KEY, String((idx + 1) % PROMPT_14_ROTATING_MESSAGES.length));
  } catch {}
}

export function getNightRotatingMessage(): string {
  try {
    const idx = parseInt(localStorage.getItem(NIGHT_INDEX_KEY) ?? "0", 10) % PROMPT_14_ROTATING_MESSAGES.length;
    return PROMPT_14_ROTATING_MESSAGES[idx] ?? PROMPT_14_ROTATING_MESSAGES[0];
  } catch {
    return PROMPT_14_ROTATING_MESSAGES[0];
  }
}
