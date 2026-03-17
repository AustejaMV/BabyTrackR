/**
 * Storage for skin/eczema tracker. Keys: cradl-skin-flares, cradl-skin-creams, cradl-skin-triggers.
 */

import type { SkinFlareEntry, SkinCreamEntry, SkinTriggerEntry, BodyArea, SkinAppearance, TriggerType } from "../types/skin";

const KEY_FLARES = "skinFlares";
const KEY_CREAMS = "skinCreams";
const KEY_TRIGGERS = "skinTriggers";

const BODY_AREAS: BodyArea[] = ["face", "scalp", "neck", "chest", "back", "arms", "hands", "legs", "feet", "nappy_area", "behind_knees", "inside_elbows"];
const APPEARANCES: SkinAppearance[] = ["red", "dry", "scaly", "weeping", "cracked", "swollen", "hives"];
const TRIGGER_TYPES: TriggerType[] = ["food", "product", "fabric", "weather", "detergent", "animal", "stress", "other"];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function validBodyAreas(arr: unknown): arr is BodyArea[] {
  return Array.isArray(arr) && arr.length > 0 && arr.every((a) => BODY_AREAS.includes(a));
}

function validAppearance(arr: unknown): arr is SkinAppearance[] {
  return Array.isArray(arr) && arr.every((a) => APPEARANCES.includes(a));
}

export function getSkinFlares(): SkinFlareEntry[] {
  const arr = load<SkinFlareEntry[]>(KEY_FLARES, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveSkinFlare(entry: Omit<SkinFlareEntry, "id">): SkinFlareEntry {
  if (entry.severity < 1 || entry.severity > 5) throw new Error("severity must be 1–5");
  if (!validBodyAreas(entry.bodyAreas)) throw new Error("bodyAreas must be non-empty array of valid BodyArea");
  if (!validAppearance(entry.appearance)) throw new Error("appearance must be array of valid SkinAppearance");
  const note = entry.note != null ? String(entry.note).slice(0, 300) : null;
  const id = `flare_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: SkinFlareEntry = { ...entry, id, note };
  const history = getSkinFlares();
  history.push(full);
  save(KEY_FLARES, history);
  return full;
}

export function getSkinCreams(): SkinCreamEntry[] {
  const arr = load<SkinCreamEntry[]>(KEY_CREAMS, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveSkinCream(entry: Omit<SkinCreamEntry, "id">): SkinCreamEntry {
  const product = String(entry.product).trim().slice(0, 60);
  if (!product) throw new Error("product must be non-empty");
  if (!validBodyAreas(entry.bodyAreas)) throw new Error("bodyAreas must be non-empty array of valid BodyArea");
  const note = entry.note != null ? String(entry.note).slice(0, 300) : null;
  const id = `cream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: SkinCreamEntry = { ...entry, id, product, note };
  const history = getSkinCreams();
  history.push(full);
  save(KEY_CREAMS, history);
  return full;
}

export function getSkinTriggers(): SkinTriggerEntry[] {
  const arr = load<SkinTriggerEntry[]>(KEY_TRIGGERS, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveSkinTrigger(entry: Omit<SkinTriggerEntry, "id">): SkinTriggerEntry {
  if (!TRIGGER_TYPES.includes(entry.triggerType)) throw new Error("triggerType must be valid TriggerType");
  const description = String(entry.description).trim().slice(0, 100);
  if (!description) throw new Error("description must be non-empty");
  const note = entry.note != null ? String(entry.note).slice(0, 300) : null;
  const id = `trigger_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: SkinTriggerEntry = { ...entry, id, description, note };
  const history = getSkinTriggers();
  history.push(full);
  save(KEY_TRIGGERS, history);
  return full;
}
