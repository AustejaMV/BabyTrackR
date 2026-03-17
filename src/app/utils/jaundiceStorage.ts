/**
 * Jaundice skin check storage. Local only — NOT in SYNCED_DATA_KEYS.
 */

import type { JaundiceSkinCheck } from "../types/jaundice";

const STORAGE_KEY = "cradl-jaundice-checks";

function loadChecks(): JaundiceSkinCheck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JaundiceSkinCheck[]) : [];
  } catch {
    return [];
  }
}

export function getJaundiceChecks(): JaundiceSkinCheck[] {
  return loadChecks();
}

export function saveJaundiceCheck(check: Omit<JaundiceSkinCheck, "id">): JaundiceSkinCheck {
  const list = loadChecks();
  const id = `j-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry: JaundiceSkinCheck = { ...check, id };
  list.push(entry);
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
  return entry;
}

export function getJaundiceChecksForBaby(babyId: string | null): JaundiceSkinCheck[] {
  const all = loadChecks();
  if (!babyId) return all;
  return all;
}
