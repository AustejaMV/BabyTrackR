/**
 * Mum's sleep debt — one entry per date. Guard: only one entry per date (update if exists).
 */

import type { MumSleepEntry, MumSleepRange } from "../types/mumSleep";

const KEY = "mumSleepHistory";

const VALID_RANGES: MumSleepRange[] = ["under_2h", "2_to_4h", "4_to_6h", "6h_plus"];

function load(): MumSleepEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries: MumSleepEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {}
}

export function getMumSleepHistory(): MumSleepEntry[] {
  return load();
}

export function saveMumSleepEntry(entry: Omit<MumSleepEntry, "id">): void {
  if (!VALID_RANGES.includes(entry.sleepRange)) throw new Error("sleepRange must be valid MumSleepRange");
  const dateStr = String(entry.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error("date must be YYYY-MM-DD");
  const id = `mum_sleep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: MumSleepEntry = { ...entry, id };
  const history = load();
  const filtered = history.filter((e) => e.date !== dateStr);
  save([...filtered, full]);
}

export function getMumSleepForDate(dateStr: string): MumSleepEntry | null {
  return load().find((e) => e.date === dateStr) ?? null;
}
