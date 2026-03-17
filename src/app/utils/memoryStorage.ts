/**
 * Memory book storage. Synced when signed in.
 */

import type { MemoryDayEntry, MemoryMonthlyRecap } from "../types/memory";

const DAYS_KEY = "memoryDays";
const RECAPS_KEY = "memoryMonthlyRecaps";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getMemoryDays(): MemoryDayEntry[] {
  const list = loadJson<MemoryDayEntry[]>(DAYS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveMemoryDay(entry: Omit<MemoryDayEntry, "id" | "createdAt">): MemoryDayEntry {
  const list = getMemoryDays();
  const id = `md-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const created: MemoryDayEntry = {
    ...entry,
    id,
    createdAt: Date.now(),
  };
  const filtered = list.filter((e) => e.date !== entry.date);
  filtered.push(created);
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  try {
    localStorage.setItem(DAYS_KEY, JSON.stringify(filtered));
  } catch {}
  return created;
}

export function getMemoryDayForDate(date: string): MemoryDayEntry | null {
  return getMemoryDays().find((e) => e.date === date) ?? null;
}

export function deleteMemoryDay(id: string): void {
  const list = getMemoryDays().filter((e) => e.id !== id);
  try {
    localStorage.setItem(DAYS_KEY, JSON.stringify(list));
  } catch {}
}

export function getMonthlyRecaps(): MemoryMonthlyRecap[] {
  const list = loadJson<MemoryMonthlyRecap[]>(RECAPS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveMonthlyRecap(recap: Omit<MemoryMonthlyRecap, "id" | "createdAt">): MemoryMonthlyRecap {
  const list = getMonthlyRecaps();
  const id = `mr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const created: MemoryMonthlyRecap = {
    ...recap,
    id,
    createdAt: Date.now(),
  };
  const filtered = list.filter((e) => e.yearMonth !== recap.yearMonth);
  filtered.push(created);
  filtered.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  try {
    localStorage.setItem(RECAPS_KEY, JSON.stringify(filtered));
  } catch {}
  return created;
}

export function getMonthlyRecapFor(yearMonth: string): MemoryMonthlyRecap | null {
  return getMonthlyRecaps().find((e) => e.yearMonth === yearMonth) ?? null;
}

export function deleteMonthlyRecap(id: string): void {
  const list = getMonthlyRecaps().filter((e) => e.id !== id);
  try {
    localStorage.setItem(RECAPS_KEY, JSON.stringify(list));
  } catch {}
}
