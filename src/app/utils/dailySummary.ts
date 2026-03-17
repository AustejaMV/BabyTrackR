/**
 * Daily "good enough" summary and personal playbook.
 */

import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord } from "../types";
import { getParentAcknowledgement, type DailySummary as DailySummaryStats } from "./parentAcknowledgement";
import { getNormalRange } from "../data/normalRanges";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DailySummaryLine {
  text: string;
  highlight?: boolean;
}

export interface DailySummaryResult {
  lines: DailySummaryLine[];
  acknowledgement: string;
  date: string;
  /** "Good enough" one-liner with targets when age available, e.g. "She had a good day. 6 feeds (target 5–8 ✓), 11h sleep ✓..." */
  summarySentence: string | null;
}

function getDurationMs(s: SleepRecord): number {
  const end = s.endTime ?? s.startTime;
  return Math.max(0, end - s.startTime - (s.excludedMs ?? 0));
}

export function generateDailySummary(
  sleepHistory: SleepRecord[],
  feedingHistory: FeedingRecord[],
  diaperHistory: DiaperRecord[],
  tummyHistory: TummyTimeRecord[],
  parentName: string | null,
  date: Date = new Date(),
  options?: { ageInWeeks?: number | null; babyName?: string | null }
): DailySummaryResult {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = dayStart.getTime() + MS_PER_DAY;
  const dayStartMs = dayStart.getTime();

  const daySleep = sleepHistory.filter((s) => s.startTime >= dayStartMs && s.startTime < dayEnd && s.endTime != null);
  const dayFeeds = feedingHistory.filter((f) => f.timestamp >= dayStartMs && f.timestamp < dayEnd);
  const dayDiapers = diaperHistory.filter((d) => d.timestamp >= dayStartMs && d.timestamp < dayEnd);
  const dayTummy = tummyHistory.filter((t) => t.startTime >= dayStartMs && t.startTime < dayEnd);

  const totalSleepMs = daySleep.reduce((sum, s) => sum + getDurationMs(s), 0);
  const totalSleepMin = Math.round(totalSleepMs / 60000);
  const sleepHours = totalSleepMin / 60;
  const tummyMin = dayTummy.reduce((sum, t) => sum + Math.round(((t.endTime ?? t.startTime) - t.startTime) / 60000), 0);

  const lines: DailySummaryLine[] = [];
  if (dayFeeds.length > 0) lines.push({ text: `${dayFeeds.length} feed${dayFeeds.length === 1 ? "" : "s"}` });
  if (totalSleepMin > 0) lines.push({ text: `${Math.floor(totalSleepMin / 60)}h ${totalSleepMin % 60}m sleep` });
  if (dayDiapers.length > 0) lines.push({ text: `${dayDiapers.length} nappy change${dayDiapers.length === 1 ? "" : "s"}` });
  if (tummyMin > 0) lines.push({ text: `${tummyMin}m tummy time` });

  if (lines.length === 0) lines.push({ text: "No logs yet today — that's okay.", highlight: true });

  const stats: DailySummaryStats = {
    feedCount: dayFeeds.length,
    sleepTotalMinutes: totalSleepMin,
    diaperCount: dayDiapers.length,
    tummyMinutes: tummyMin,
  };
  const acknowledgement = getParentAcknowledgement(parentName, stats);

  let summarySentence: string | null = null;
  const ageInWeeks = options?.ageInWeeks ?? null;
  const babyName = (options?.babyName ?? "").trim() || "She";
  if (Number.isFinite(ageInWeeks) && ageInWeeks != null && ageInWeeks >= 0) {
    const feedRange = getNormalRange("feedsPerDay", ageInWeeks);
    const sleepRange = getNormalRange("sleepHoursPerDay", ageInWeeks);
    const diaperRange = getNormalRange("diaperChangesPerDay", ageInWeeks);
    const tummyRange = getNormalRange("tummyTimeMinPerDay", ageInWeeks);
    const feedOk = feedRange && dayFeeds.length >= feedRange.min && dayFeeds.length <= feedRange.max;
    const sleepOk = sleepRange && sleepHours >= sleepRange.min && sleepHours <= sleepRange.max;
    const sleepLow = sleepRange && totalSleepMin > 0 && sleepHours < sleepRange.min;
    const diaperOk = diaperRange && dayDiapers.length >= diaperRange.min && dayDiapers.length <= diaperRange.max;
    const tummyOk = tummyRange && tummyMin >= tummyRange.min && tummyMin <= tummyRange.max;
    const parts: string[] = [];
    if (feedRange) parts.push(`${dayFeeds.length} feed${dayFeeds.length === 1 ? "" : "s"} (target ${feedRange.min}–${feedRange.max}${feedOk ? " ✓" : ""})`);
    if (sleepRange) parts.push(`${sleepHours.toFixed(1)}h sleep (target ${sleepRange.min}–${sleepRange.max}h${sleepOk ? " ✓" : ""})`);
    if (diaperRange) parts.push(`${dayDiapers.length} nappy change${dayDiapers.length === 1 ? "" : "s"}${diaperOk ? " ✓" : ""}`);
    if (tummyRange && tummyMin > 0) parts.push(`${tummyMin}m tummy time${tummyOk ? " ✓" : ""}`);
    if (parts.length > 0) {
      if (sleepLow && totalSleepMin > 0)
        summarySentence = `Today was a little short on sleep — ${(totalSleepMin / 60).toFixed(1)}h total. That's okay for one day. Watch for extra tiredness tomorrow and offer an earlier bedtime if she shows tired signs.`;
      else
        summarySentence = `${babyName} had a good day. ${parts.join(", ")}. You're doing brilliantly.`;
    }
  }

  return {
    lines,
    acknowledgement,
    date: date.toISOString().slice(0, 10),
    summarySentence,
  };
}

export interface PlaybookTip {
  id: string;
  text: string;
  category: "sleep" | "feed" | "comfort" | "general";
}

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

/**
 * Personal playbook from 4+ weeks of data. Returns [] if insufficient data.
 * Tips are computed from actual patterns (put-down time, breast duration vs sleep, cot vs pram, tummy time).
 */
export function generatePlaybook(
  sleepHistory: SleepRecord[],
  feedingHistory: FeedingRecord[],
  babyName: string | null
): PlaybookTip[] {
  const now = Date.now();
  const cutoff = now - FOUR_WEEKS_MS;
  const sleep = (sleepHistory ?? []).filter((s) => s.startTime >= cutoff && s.endTime != null);
  const feeds = (feedingHistory ?? []).filter((f) => (f.endTime ?? f.timestamp) >= cutoff);
  const name = (babyName ?? "She").trim() || "She";

  const tips: PlaybookTip[] = [];
  let id = 1;

  if (sleep.length < 14) {
    return [
      { id: "1", text: "Follow wake windows — put down before she's overtired.", category: "sleep" },
      { id: "2", text: "Offer both breasts if breastfeeding — supply follows demand.", category: "feed" },
      { id: "3", text: "Log a few more weeks of sleep and feeds to see personalised tips here.", category: "general" },
    ];
  }

  // Preferred nap start time (when naps are longest)
  const byHour = new Map<number, number[]>();
  for (const s of sleep) {
    const start = new Date(s.startTime);
    const hour = start.getHours() * 60 + start.getMinutes();
    const dur = getDurationMs(s) / 60000;
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(dur);
  }
  let bestStartMin = -1;
  let bestAvg = 0;
  byHour.forEach((durs, hourKey) => {
    if (durs.length < 3) return;
    const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStartMin = hourKey;
    }
  });
  if (bestStartMin >= 0 && bestAvg >= 30) {
    const h = Math.floor(bestStartMin / 60);
    const m = bestStartMin % 60;
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    tips.push({
      id: String(id++),
      text: `${name} tends to have longer naps when put down around ${timeStr} (±15 min).`,
      category: "sleep",
    });
  }

  // Cot vs other location
  const byLoc = new Map<string, number[]>();
  for (const s of sleep) {
    const loc = (s.sleepLocation ?? "Other").trim() || "Other";
    if (!byLoc.has(loc)) byLoc.set(loc, []);
    byLoc.get(loc)!.push(getDurationMs(s) / 60000);
  }
  const cotMins = byLoc.get("Cot") ?? [];
  const otherLocs = [...byLoc.entries()].filter(([k]) => k !== "Cot");
  if (cotMins.length >= 5 && otherLocs.some(([, arr]) => arr.length >= 3)) {
    const avgCot = cotMins.reduce((a, b) => a + b, 0) / cotMins.length;
    let maxOther = 0;
    let otherName = "other";
    otherLocs.forEach(([k, arr]) => {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      if (avg > maxOther) {
        maxOther = avg;
        otherName = k.toLowerCase();
      }
    });
    if (avgCot - maxOther >= 15)
      tips.push({
        id: String(id++),
        text: `Cot naps last on average ${Math.round(avgCot - maxOther)} min longer than ${otherName} naps.`,
        category: "sleep",
      });
  }

  // Breast duration before longest sleeps
  if (feeds.length >= 20) {
    const withSegments = feeds.filter((f) => f.segments?.length);
    if (withSegments.length >= 10) {
      const feedDurations: number[] = [];
      withSegments.forEach((f) => {
        const total = f.segments!.reduce((s, seg) => s + (seg.durationMs ?? 0), 0);
        feedDurations.push(total / 60000);
      });
      const avgFeedMin = feedDurations.reduce((a, b) => a + b, 0) / feedDurations.length;
      if (avgFeedMin >= 15)
        tips.push({
          id: String(id++),
          text: `${name}'s longest sleeps often follow feeds of ${Math.round(avgFeedMin)}+ minutes.`,
          category: "feed",
        });
    }
  }

  if (tips.length === 0) {
    tips.push({ id: "1", text: "Keep logging — personalised playbook tips appear after a few weeks of data.", category: "general" });
  }

  return tips.slice(0, 5);
}

/** Returns true if we have at least 4 weeks of data for playbook. */
export function hasEnoughDataForPlaybook(
  sleepHistory: SleepRecord[],
  feedingHistory: FeedingRecord[]
): boolean {
  const now = Date.now();
  const cutoff = now - FOUR_WEEKS_MS;
  const sleep = (sleepHistory ?? []).filter((s) => s.startTime >= cutoff);
  const feeds = (feedingHistory ?? []).filter((f) => (f.endTime ?? f.timestamp) >= cutoff);
  return sleep.length >= 14 && (feedingHistory?.length ?? 0) >= 10;
}
