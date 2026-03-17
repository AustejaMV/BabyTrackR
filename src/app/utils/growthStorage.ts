/**
 * Growth measurements storage with guards.
 */

import type { GrowthMeasurement } from "../types";

const KEY = "growthMeasurements";
const WEIGHT_MIN = 0.5;
const WEIGHT_MAX = 25;
const HEIGHT_MIN = 30;
const HEIGHT_MAX = 120;
const HEAD_MIN = 25;
const HEAD_MAX = 60;

function readHistory(): GrowthMeasurement[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as GrowthMeasurement[]).sort((a, b) => a.date - b.date);
  } catch {
    return [];
  }
}

export function getGrowthHistory(): GrowthMeasurement[] {
  return readHistory();
}

export function saveGrowthEntry(entry: unknown): GrowthMeasurement {
  if (!entry || typeof entry !== "object") throw new Error("Invalid growth entry");
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : `growth-${Date.now()}`;
  let date: number;
  if (typeof o.date === "number" && Number.isFinite(o.date)) {
    date = o.date;
  } else if (typeof o.date === "string") {
    const ms = new Date(o.date).getTime();
    if (!Number.isFinite(ms)) throw new Error("Invalid date");
    date = new Date(ms).setHours(0, 0, 0, 0);
  } else {
    throw new Error("date required (number or ISO string)");
  }
  let weightKg: number | undefined;
  if (o.weightKg != null && Number.isFinite(Number(o.weightKg))) {
    const w = Number(o.weightKg);
    if (w < WEIGHT_MIN || w > WEIGHT_MAX) throw new Error(`Weight must be ${WEIGHT_MIN}–${WEIGHT_MAX} kg`);
    weightKg = Math.round(w * 10) / 10;
  }
  let heightCm: number | undefined;
  if (o.heightCm != null && Number.isFinite(Number(o.heightCm))) {
    const h = Number(o.heightCm);
    if (h < HEIGHT_MIN || h > HEIGHT_MAX) throw new Error(`Height must be ${HEIGHT_MIN}–${HEIGHT_MAX} cm`);
    heightCm = Math.round(h * 10) / 10;
  }
  let headCircumferenceCm: number | undefined;
  if (o.headCircumferenceCm != null && Number.isFinite(Number(o.headCircumferenceCm))) {
    const h = Number(o.headCircumferenceCm);
    if (h < HEAD_MIN || h > HEAD_MAX) throw new Error(`Head circumference must be ${HEAD_MIN}–${HEAD_MAX} cm`);
    headCircumferenceCm = Math.round(h * 10) / 10;
  }
  if (weightKg == null && heightCm == null && headCircumferenceCm == null) {
    throw new Error("At least one of weight, height, or head circumference required");
  }
  const record: GrowthMeasurement = { id, date, weightKg, heightCm, headCircumferenceCm };
  const history = readHistory();
  const idx = history.findIndex((e) => e.id === id);
  const next = idx >= 0 ? history.map((e, i) => (i === idx ? record : e)) : [...history, record];
  const sorted = next.sort((a, b) => a.date - b.date);
  try {
    localStorage.setItem(KEY, JSON.stringify(sorted));
  } catch {
    throw new Error("Failed to save growth entry");
  }
  return record;
}
