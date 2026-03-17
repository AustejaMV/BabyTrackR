const KEY = "babytrackr-moodLog";

export type MoodKey = "great" | "good" | "okay" | "tired" | "struggling" | "overwhelmed";

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: MoodKey;
}

export function getMoodLog(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveMoodEntry(entry: MoodEntry): void {
  const log = getMoodLog();
  const filtered = log.filter((e) => e.date !== entry.date);
  try {
    localStorage.setItem(KEY, JSON.stringify([...filtered, entry]));
  } catch {}
}

export function getMoodForDate(dateStr: string): MoodKey | null {
  const entry = getMoodLog().find((e) => e.date === dateStr);
  return entry?.mood ?? null;
}

export function getLastSevenDaysMood(): MoodEntry[] {
  const log = getMoodLog();
  const sorted = [...log].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(0, 7);
}

function toDateStr(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Has user selected "struggling" on 3 consecutive calendar days (most recent being one of them)? */
export function hasStrugglingThreeInARow(): boolean {
  const log = getMoodLog();
  const byDate = new Map(log.map((e) => [e.date, e.mood]));
  const sortedDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  if (sortedDates.length < 3) return false;
  const mostRecent = sortedDates[0];
  const d = new Date(mostRecent);
  const dayBefore = toDateStr(new Date(d.getTime() - 24 * 60 * 60 * 1000));
  const twoBefore = toDateStr(new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000));
  return byDate.get(mostRecent) === "struggling" && byDate.get(dayBefore) === "struggling" && byDate.get(twoBefore) === "struggling";
}
