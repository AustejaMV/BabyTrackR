/**
 * P20: Weekly reflection prompts (weeks 1–18) and saved responses.
 * Previous responses accessible from Memory book / time capsules.
 */

const KEY = "cradl-weekly-reflection";
const QUESTIONS: Record<number, string> = {
  1: "What's one thing you want to remember about these first days?",
  2: "What has been harder than you expected? What has been easier?",
  3: "What's one small win from this week?",
  4: "How are you and your partner doing? Really?",
  5: "What would you tell a friend who's about to have a baby?",
  6: "What would you tell yourself from before she was born?",
  7: "What's changed most about your days?",
  8: "What made you laugh this week?",
  9: "What are you proud of this week?",
  10: "What's one thing you're looking forward to?",
  11: "What support have you had — or wished you had?",
  12: "What surprised you most about becoming a parent?",
  13: "What does a good day look like for you right now?",
  14: "What's one thing you've let go of?",
  15: "How has your relationship with your baby changed?",
  16: "What is she doing now that she wasn't doing a month ago?",
  17: "What would you do with an hour to yourself?",
  18: "What has she taught you?",
};

export function getQuestionForWeek(week: number): string {
  const w = Math.max(1, Math.min(18, Math.floor(week)));
  return QUESTIONS[w] ?? QUESTIONS[18]!;
}

export interface WeeklyReflectionEntry {
  week: number;
  body: string;
  savedAt: string;
}

function load(): Record<number, WeeklyReflectionEntry> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj !== null ? obj : {};
  } catch {
    return {};
  }
}

function save(data: Record<number, WeeklyReflectionEntry>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getSavedReflectionForWeek(week: number): WeeklyReflectionEntry | null {
  const w = Math.floor(week);
  const data = load();
  return data[w] ?? null;
}

export function saveWeeklyReflection(week: number, body: string): void {
  const w = Math.max(1, Math.min(18, Math.floor(week)));
  const data = load();
  data[w] = { week: w, body: body.trim().slice(0, 2000), savedAt: new Date().toISOString() };
  save(data);
}

export function getAllReflections(): WeeklyReflectionEntry[] {
  const data = load();
  return Object.values(data).sort((a, b) => a.week - b.week);
}
