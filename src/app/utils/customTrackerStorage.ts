/**
 * Custom tracker definitions and log entries. Synced when signed in.
 */

import type { CustomTrackerDefinition, CustomTrackerLogEntry } from "../types/customTracker";

const TRACKERS_KEY = "customTrackers";
const LOGS_KEY = "customTrackerLogs";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getCustomTrackers(): CustomTrackerDefinition[] {
  const list = loadJson<CustomTrackerDefinition[]>(TRACKERS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveCustomTracker(tracker: Omit<CustomTrackerDefinition, "id" | "createdAt">): CustomTrackerDefinition {
  const list = getCustomTrackers();
  const id = `ct-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const created: CustomTrackerDefinition = {
    ...tracker,
    id,
    createdAt: Date.now(),
  };
  list.push(created);
  try {
    localStorage.setItem(TRACKERS_KEY, JSON.stringify(list));
  } catch {}
  return created;
}

export function updateCustomTracker(id: string, updates: Partial<Pick<CustomTrackerDefinition, "name" | "icon" | "unit">>): void {
  const list = getCustomTrackers().map((t) => (t.id === id ? { ...t, ...updates } : t));
  try {
    localStorage.setItem(TRACKERS_KEY, JSON.stringify(list));
  } catch {}
}

export function deleteCustomTracker(id: string): void {
  const list = getCustomTrackers().filter((t) => t.id !== id);
  const logs = getCustomTrackerLogs().filter((e) => e.trackerId !== id);
  try {
    localStorage.setItem(TRACKERS_KEY, JSON.stringify(list));
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch {}
}

export function getCustomTrackerLogs(): CustomTrackerLogEntry[] {
  const list = loadJson<CustomTrackerLogEntry[]>(LOGS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getLogsForTracker(trackerId: string): CustomTrackerLogEntry[] {
  return getCustomTrackerLogs()
    .filter((e) => e.trackerId === trackerId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function saveCustomTrackerLog(entry: Omit<CustomTrackerLogEntry, "id">): CustomTrackerLogEntry {
  const list = getCustomTrackerLogs();
  const id = `ctl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const created: CustomTrackerLogEntry = { ...entry, id };
  list.push(created);
  list.sort((a, b) => b.timestamp - a.timestamp);
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(list));
  } catch {}
  return created;
}

export function deleteCustomTrackerLog(id: string): void {
  const list = getCustomTrackerLogs().filter((e) => e.id !== id);
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(list));
  } catch {}
}
