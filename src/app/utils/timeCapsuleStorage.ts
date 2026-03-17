/**
 * Time capsule storage — local only. Key: cradl-time-capsules.
 */

import type { TimeCapsuleEntry } from "../types/timeCapsule";

const KEY = "cradl-time-capsules";

function load(): TimeCapsuleEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries: TimeCapsuleEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {}
}

export function getTimeCapsules(): TimeCapsuleEntry[] {
  return load();
}

export function saveTimeCapsule(entry: Omit<TimeCapsuleEntry, "id">): TimeCapsuleEntry {
  const body = String(entry.body).trim().slice(0, 2000);
  if (!body) throw new Error("Note cannot be empty");
  const id = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: TimeCapsuleEntry = { ...entry, id, body };
  const list = load();
  list.push(full);
  save(list);
  return full;
}

export function markShownBack(id: string): void {
  const list = load();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx]!, shownBackAt: new Date().toISOString() };
    save(list);
  }
}

export function deleteTimeCapsule(id: string): void {
  const list = load().filter((e) => e.id !== id);
  save(list);
}
