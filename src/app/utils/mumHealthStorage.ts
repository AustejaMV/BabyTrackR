/**
 * Storage for mum's recovery and wellbeing (wound care, pelvic floor, breast pain, EPDS).
 */

import type {
  WoundCareEntry,
  PelvicFloorEntry,
  BreastPainEntry,
  EPDSResponse,
} from "../types/mumHealth";
import { scoreEPDS } from "./epdsScoring";

const KEY_WOUND = "woundCareHistory";
const KEY_PELVIC = "pelvicFloorHistory";
const KEY_BREAST = "breastPainHistory";
const KEY_EPDS = "epdsResponses";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const VALID_AREAS: WoundCareEntry["area"][] = ["caesarean", "perineal", "other"];
const VALID_SIDES: BreastPainEntry["side"][] = ["left", "right", "both"];

export function getWoundCareHistory(): WoundCareEntry[] {
  const arr = loadJson<WoundCareEntry[]>(KEY_WOUND, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveWoundCareEntry(entry: Omit<WoundCareEntry, "id">): WoundCareEntry {
  const painLevel = entry.painLevel != null;
  if (painLevel && (entry.painLevel! < 1 || entry.painLevel! > 5)) {
    throw new Error("painLevel must be 1–5 or null");
  }
  const area = VALID_AREAS.includes(entry.area) ? entry.area : "other";
  const id = `wound_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: WoundCareEntry = { ...entry, id, area, painLevel: entry.painLevel ?? null };
  const history = getWoundCareHistory();
  history.push(full);
  saveJson(KEY_WOUND, history);
  return full;
}

export function getPelvicFloorHistory(): PelvicFloorEntry[] {
  const arr = loadJson<PelvicFloorEntry[]>(KEY_PELVIC, []);
  return Array.isArray(arr) ? arr : [];
}

export function savePelvicFloorEntry(entry: Omit<PelvicFloorEntry, "id">): PelvicFloorEntry {
  const id = `pelvic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: PelvicFloorEntry = { ...entry, id };
  const history = getPelvicFloorHistory();
  const existing = history.findIndex((e) => e.date === entry.date);
  if (existing >= 0) history[existing] = full;
  else history.push(full);
  saveJson(KEY_PELVIC, history);
  return full;
}

export function getPelvicFloorForDate(date: string): PelvicFloorEntry | null {
  return getPelvicFloorHistory().find((e) => e.date === date) ?? null;
}

export function getBreastPainHistory(): BreastPainEntry[] {
  const arr = loadJson<BreastPainEntry[]>(KEY_BREAST, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveBreastPainEntry(entry: Omit<BreastPainEntry, "id">): BreastPainEntry {
  if (entry.severity < 1 || entry.severity > 5) {
    throw new Error("severity must be 1–5");
  }
  const side = VALID_SIDES.includes(entry.side) ? entry.side : "both";
  const id = `breast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: BreastPainEntry = { ...entry, id, side };
  const history = getBreastPainHistory();
  history.push(full);
  saveJson(KEY_BREAST, history);
  return full;
}

export function getEPDSResponses(): EPDSResponse[] {
  const arr = loadJson<EPDSResponse[]>(KEY_EPDS, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveEPDSResponse(answers: number[]): EPDSResponse {
  const result = scoreEPDS(answers);
  const id = `epds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const response: EPDSResponse = {
    id,
    completedAt: new Date().toISOString(),
    answers: [...answers],
    totalScore: result.total,
    flagged: result.flagged,
  };
  const history = getEPDSResponses();
  history.push(response);
  saveJson(KEY_EPDS, history);
  return response;
}

export function getLastEPDSResponse(): EPDSResponse | null {
  const history = getEPDSResponses();
  if (history.length === 0) return null;
  return history[history.length - 1]!;
}
