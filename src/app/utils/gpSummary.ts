/**
 * Generate a one-pager summary for GP/health visitor visits.
 */

import { format } from "date-fns";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BabyProfile } from "../types";
import { DATE_DISPLAY, DATETIME_DISPLAY } from './dateUtils';

export interface GPSummarySection {
  title: string;
  lines: string[];
}

export interface GPSummary {
  babyName: string;
  generatedAt: string;
  ageWeeks: number | null;
  sections: GPSummarySection[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function generateGPSummary(daysBack: number = 14): GPSummary {
  const babyProfile = safeParse<BabyProfile | null>("babyProfile", null);
  const sleepHistory = safeParse<SleepRecord[]>("sleepHistory", []);
  const feedingHistory = safeParse<FeedingRecord[]>("feedingHistory", []);
  const diaperHistory = safeParse<DiaperRecord[]>("diaperHistory", []);
  const tummyTimeHistory = safeParse<TummyTimeRecord[]>("tummyTimeHistory", []);
  const cutOff = Date.now() - daysBack * MS_PER_DAY;

  const recentSleep = sleepHistory.filter((s) => s.startTime >= cutOff && (s.endTime ?? 0) >= cutOff);
  const recentFeeding = feedingHistory.filter((f) => f.timestamp >= cutOff);
  const recentDiaper = diaperHistory.filter((d) => d.timestamp >= cutOff);
  const recentTummy = tummyTimeHistory.filter((t) => t.startTime >= cutOff);

  const sections: GPSummarySection[] = [];
  const babyName = babyProfile?.name?.trim() || "Baby";

  let ageWeeks: number | null = null;
  if (babyProfile?.birthDate) {
    ageWeeks = Math.floor((Date.now() - babyProfile.birthDate) / (7 * MS_PER_DAY));
  }

  sections.push({
    title: "Overview",
    lines: [
      `Summary for: ${babyName}`,
      babyProfile?.birthDate ? `Age: ${ageWeeks} weeks (DOB: ${format(new Date(babyProfile.birthDate), DATE_DISPLAY())})` : "DOB not set",
      `Period: last ${daysBack} days`,
    ],
  });

  const totalSleepMs = recentSleep.reduce((sum, s) => sum + ((s.endTime ?? s.startTime) - s.startTime) - (s.excludedMs ?? 0), 0);
  const avgSleepHours = recentSleep.length ? (totalSleepMs / MS_PER_DAY / recentSleep.length) * 24 : 0;
  sections.push({
    title: "Sleep",
    lines: [
      `Naps/sleeps logged: ${recentSleep.length}`,
      recentSleep.length ? `Average sleep per day: ${avgSleepHours.toFixed(1)}h` : "No sleep data in period",
    ],
  });

  const feedCount = recentFeeding.length;
  const totalFeedMin = recentFeeding.reduce((sum, f) => {
    const dur = f.durationMs ?? (f.endTime && f.startTime ? f.endTime - f.startTime : 0);
    return sum + (dur || 0) / 60000;
  }, 0);
  sections.push({
    title: "Feeding",
    lines: [
      `Feeds logged: ${feedCount}`,
      feedCount && totalFeedMin > 0 ? `Total feeding time (approx): ${Math.round(totalFeedMin)} min` : "",
    ].filter(Boolean),
  });

  const wet = recentDiaper.filter((d) => d.type === "pee" || d.type === "both").length;
  const dirty = recentDiaper.filter((d) => d.type === "poop" || d.type === "both").length;
  sections.push({
    title: "Nappies",
    lines: [
      `Wet: ${wet} · Dirty: ${dirty}`,
      recentDiaper.length ? `Total changes: ${recentDiaper.length}` : "No nappy data in period",
    ],
  });

  const tummyTotalMs = recentTummy.reduce((sum, t) => sum + ((t.endTime ?? Date.now()) - t.startTime) - (t.excludedMs ?? 0), 0);
  sections.push({
    title: "Tummy time",
    lines: [recentTummy.length ? `Sessions: ${recentTummy.length} · Total: ${Math.round(tummyTotalMs / 60000)} min` : "No tummy time in period"],
  });

  try {
    const tempHistory = safeParse<{ tempC: number; timestamp: string }[]>("temperatureHistory", []);
    const recentTemp = tempHistory.filter((t) => new Date(t.timestamp).getTime() >= cutOff);
    if (recentTemp.length > 0) {
      const withFever = recentTemp.filter((t) => t.tempC >= 38).length;
      sections.push({
        title: "Temperature",
        lines: [`Readings: ${recentTemp.length}`, withFever > 0 ? `Readings ≥38°C: ${withFever}` : ""].filter(Boolean),
      });
    }
  } catch {}

  return {
    babyName,
    generatedAt: format(new Date(), DATETIME_DISPLAY()),
    ageWeeks,
    sections,
  };
}
