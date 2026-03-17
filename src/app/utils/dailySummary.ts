/**
 * Daily "good enough" summary and personal playbook.
 */

import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord } from "../types";
import { getParentAcknowledgement, type DailySummary as DailySummaryStats } from "./parentAcknowledgement";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DailySummaryLine {
  text: string;
  highlight?: boolean;
}

export interface DailySummaryResult {
  lines: DailySummaryLine[];
  acknowledgement: string;
  date: string;
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
  date: Date = new Date()
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

  return {
    lines,
    acknowledgement,
    date: date.toISOString().slice(0, 10),
  };
}

export interface PlaybookTip {
  id: string;
  text: string;
  category: "sleep" | "feed" | "comfort" | "general";
}

export function generatePlaybook(
  _sleepHistory: SleepRecord[],
  _feedingHistory: FeedingRecord[],
  _babyName: string | null
): PlaybookTip[] {
  return [
    { id: "1", text: "Follow wake windows — put down before she's overtired.", category: "sleep" },
    { id: "2", text: "Offer both breasts if breastfeeding — supply follows demand.", category: "feed" },
    { id: "3", text: "White noise and dark room can help naps.", category: "sleep" },
    { id: "4", text: "Short, frequent tummy time beats one long session.", category: "general" },
    { id: "5", text: "You can't spoil a newborn — respond to cues.", category: "comfort" },
  ];
}
