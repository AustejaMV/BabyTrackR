/**
 * Activity history storage with guards.
 */

import type { ActivityEntry, ActivityType } from "../types/activity";

const KEY = "activityHistory";
const DURATION_MIN = 1;
const DURATION_MAX = 300;
const VALID_TYPES: ActivityType[] = ["play", "bath", "walk", "story", "music", "sensory", "outdoor", "other"];

function readHistory(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

function isValidType(t: unknown): t is ActivityType {
  return typeof t === "string" && VALID_TYPES.includes(t as ActivityType);
}

export function getActivityHistory(): ActivityEntry[] {
  return readHistory();
}

export function saveActivityEntry(entry: unknown): ActivityEntry {
  if (!entry || typeof entry !== "object") throw new Error("Invalid activity entry");
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : `activity-${Date.now()}`;
  const timestamp = typeof o.timestamp === "string" ? o.timestamp : new Date().toISOString();
  const durationMinutes = Number(o.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < DURATION_MIN || durationMinutes > DURATION_MAX) {
    throw new Error(`Duration must be ${DURATION_MIN}–${DURATION_MAX} minutes`);
  }
  const activityType = isValidType(o.activityType) ? o.activityType : "play";
  const note = o.note != null && typeof o.note === "string" ? o.note : null;
  const record: ActivityEntry = { id, timestamp, durationMinutes: Math.round(durationMinutes), activityType, note };
  const history = readHistory();
  const idx = history.findIndex((e) => e.id === id);
  const next = idx >= 0 ? history.map((e, i) => (i === idx ? record : e)) : [...history, record];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error("Failed to save activity");
  }
  return record;
}
