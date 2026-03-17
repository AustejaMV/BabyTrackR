/**
 * Warm closing lines for parent in daily summary / cards.
 */

export interface DailySummary {
  feedCount: number;
  sleepTotalMinutes: number;
  diaperCount: number;
  tummyMinutes: number;
}

const LINES = [
  "You are doing an extraordinary job.",
  "Every one of those feeds matters. You matter.",
  "You showed up for her every single time today.",
  "The hard days count just as much as the easy ones.",
  "She knows your voice, your smell, your heartbeat.",
  "One feed at a time. That's all you have to do.",
  "You're not just keeping her fed and safe — you're building a bond.",
  "There is no one else she'd rather have.",
  "Rest when you can. You've earned it.",
  "You're doing brilliantly.",
  "This phase won't last forever. You're getting through it.",
  "Every nappy change, every cuddle — it all adds up.",
  "You're enough. More than enough.",
  "Be kind to yourself today.",
  "You're doing the hardest job in the world.",
];

let lastIndex = -1;

export function getParentAcknowledgement(parentName: string | null, stats: DailySummary): string {
  const dayOfYear = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  let idx = dayOfYear % LINES.length;
  if (idx === lastIndex) idx = (idx + 1) % LINES.length;
  lastIndex = idx;
  let line = LINES[idx]!;
  const name = (parentName ?? "").trim();
  if (name && line.startsWith("You ")) {
    line = line.replace(/^You /, `${name}, you `);
  } else if (name && line === "You showed up for her every single time today.") {
    line = `${name}, you showed up for her every single time today.`;
  }
  return line;
}
