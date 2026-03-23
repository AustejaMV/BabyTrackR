/**
 * Personalised greetings and "you moment" messaging.
 */

import { format } from 'date-fns';
import { TIME_DISPLAY } from './dateUtils';

export function getGreeting(
  parentName: string | null,
  babyName: string | null,
  hour: number
): string {
  const name = (parentName ?? "").trim();
  const baby = (babyName ?? "").trim();
  let timeOfDay = "Good morning";
  if (hour >= 12 && hour < 18) timeOfDay = "Good afternoon";
  else if (hour >= 18 && hour < 23) timeOfDay = "Good evening";
  else if (hour >= 23 || hour < 5) timeOfDay = "Hi";

  if (name && baby) {
    return `${timeOfDay}, ${name} — ${baby} had a good night.`;
  }
  if (baby) return `${timeOfDay} — ${baby} had a good night.`;
  return `${timeOfDay}.`;
}

const YOU_MOMENT_LAST_KEY = "cradl-you-moment-date";

export function getWeeklyYouMoment(
  parentName: string | null,
  babyName: string | null,
  napWindowOpensAt: Date | null
): string | null {
  if (!napWindowOpensAt) return null;
  const now = new Date();
  const opensMs = napWindowOpensAt.getTime();
  const diffMs = opensMs - now.getTime();
  const diffMin = diffMs / (60 * 1000);
  const windowMin = 20;
  if (diffMin < 15 || diffMin > 24 * 60) return null;
  try {
    const last = localStorage.getItem(YOU_MOMENT_LAST_KEY);
    const today = now.toISOString().slice(0, 10);
    if (last === today) return null;
  } catch {}
  const timeStr = format(napWindowOpensAt, TIME_DISPLAY());
  const mins = Math.round(diffMin);
  const who = (parentName ?? "You").trim();
  return `${who}, ${babyName ?? "baby"}'s nap window opens at ${timeStr}. That's ${mins} minutes. What would you do with ${mins} minutes just for you?`;
}

export function markWeeklyYouMomentShown(): void {
  try {
    localStorage.setItem(YOU_MOMENT_LAST_KEY, new Date().toISOString().slice(0, 10));
  } catch {}
}
