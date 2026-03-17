/**
 * Spit-up / reflux log storage. Sync key: spitUpHistory.
 */

import type { SpitUpEntry, SpitUpSeverity, SpitUpTiming } from "../types/spitUp";

const KEY = "spitUpHistory";

const SEVERITIES: SpitUpSeverity[] = ["small", "moderate", "large", "forceful"];
const TIMINGS: SpitUpTiming[] = ["during_feed", "immediately_after", "30min_after"];

function read(): SpitUpEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SpitUpEntry[]) : [];
  } catch {
    return [];
  }
}

export function getSpitUpHistory(): SpitUpEntry[] {
  return read();
}

function isValidSeverity(s: unknown): s is SpitUpSeverity {
  return typeof s === "string" && SEVERITIES.includes(s as SpitUpSeverity);
}

function isValidTiming(t: unknown): t is SpitUpTiming {
  return typeof t === "string" && TIMINGS.includes(t as SpitUpTiming);
}

export function saveSpitUpEntry(entry: {
  severity: SpitUpSeverity;
  timing: SpitUpTiming;
  note?: string | null;
  timestamp?: number;
}): SpitUpEntry {
  const timestamp = Number.isFinite(entry.timestamp) ? entry.timestamp! : Date.now();
  if (!isValidSeverity(entry.severity)) throw new Error("Invalid spit-up severity");
  if (!isValidTiming(entry.timing)) throw new Error("Invalid spit-up timing");
  const record: SpitUpEntry = {
    id: `spit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp,
    severity: entry.severity,
    timing: entry.timing,
    note: entry.note != null && typeof entry.note === "string" ? entry.note : null,
  };
  const history = read();
  history.push(record);
  history.sort((a, b) => b.timestamp - a.timestamp);
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    throw new Error("Failed to save spit-up entry");
  }
  return record;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Weekly summary sentence for GP, e.g. "18 episodes this week, mostly within 10 min of feeds, usually moderate." */
export function getSpitUpWeeklySummary(entries: SpitUpEntry[], babyName: string | null, nowMs: number = Date.now()): string | null {
  const weekStart = nowMs - 7 * MS_PER_DAY;
  const week = entries.filter((e) => e.timestamp >= weekStart);
  if (week.length === 0) return null;
  const name = (babyName ?? "Baby").trim() || "Baby";
  const timingLabels: Record<SpitUpTiming, string> = {
    during_feed: "during feeds",
    immediately_after: "within 10 minutes of feeds",
    "30min_after": "30+ minutes after feeds",
  };
  const byTiming = new Map<SpitUpTiming, number>();
  const bySeverity = new Map<SpitUpSeverity, number>();
  for (const e of week) {
    byTiming.set(e.timing, (byTiming.get(e.timing) ?? 0) + 1);
    bySeverity.set(e.severity, (bySeverity.get(e.severity) ?? 0) + 1);
  }
  const mainTiming = [...byTiming.entries()].sort((a, b) => b[1] - a[1])[0];
  const mainSeverity = [...bySeverity.entries()].sort((a, b) => b[1] - a[1])[0];
  const timingPhrase = mainTiming ? timingLabels[mainTiming[0]] : "";
  const severityPhrase = mainSeverity ? mainSeverity[0] : "mixed";
  return `${name} had ${week.length} spit-up episode${week.length === 1 ? "" : "s"} this week, mostly ${timingPhrase}, usually ${severityPhrase}. This is consistent with reflux — worth discussing with your GP if it seems to cause her distress.`;
}
