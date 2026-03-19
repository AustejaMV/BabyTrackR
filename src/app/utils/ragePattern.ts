/**
 * Postnatal rage / overwhelmed pattern detection. Never use 'depression' or clinical assessment.
 */

export type MoodKey = "great" | "good" | "okay" | "tired" | "struggling" | "overwhelmed" | "rage";

export interface MoodEntry {
  date: string;
  mood: MoodKey;
}

export interface OverwhelmedPattern {
  entriesInLast14Days: number;
  entriesInLastWeek: number;
  shouldSuggestSupport: boolean;
  message: string;
}

const SUPPORT_MESSAGE =
  "You've been feeling overwhelmed a few times this week. That's a signal worth paying attention to — not because something is wrong with you, but because you might need more support than you're getting. Your GP or health visitor can help, and so can the PANDAS Foundation (0808 1961 776).";

export function detectOverwhelmedPattern(moodHistory: MoodEntry[]): OverwhelmedPattern | null {
  if (!Array.isArray(moodHistory) || moodHistory.length < 3) return null;
  const overwhelmed = moodHistory.filter((e) => e.mood === "overwhelmed" || e.mood === "rage");
  if (overwhelmed.length === 0) return null;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const last14 = overwhelmed.filter((e) => {
    const t = new Date(e.date).getTime();
    return now - t <= 14 * dayMs;
  });
  const last7 = last14.filter((e) => {
    const t = new Date(e.date).getTime();
    return now - t <= 7 * dayMs;
  });

  const shouldSuggestSupport = last7.length >= 3 || last14.length >= 5;

  return {
    entriesInLast14Days: last14.length,
    entriesInLastWeek: last7.length,
    shouldSuggestSupport,
    message: SUPPORT_MESSAGE,
  };
}
