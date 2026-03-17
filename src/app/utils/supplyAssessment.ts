/**
 * Breastfeeding supply assessment from feed history. Informational only — never diagnostic.
 */

import type { FeedingRecord } from "../types";
import { lastFeedingEndTime } from "./feedingUtils";

export type SupplyStatus = "unknown" | "balanced" | "left_favoured" | "right_favoured" | "low_data";

export interface SupplyAssessment {
  status: SupplyStatus;
  leftTotalMinutes: number;
  rightTotalMinutes: number;
  feedCountLast7Days: number;
  message: string;
}

const LEFT_TYPES = ["Left breast", "left", "left breast"];
const RIGHT_TYPES = ["Right breast", "right", "right breast"];

function isLeft(type: string): boolean {
  return LEFT_TYPES.some((t) => type.toLowerCase().includes(t.toLowerCase()));
}

function isRight(type: string): boolean {
  return RIGHT_TYPES.some((t) => type.toLowerCase().includes(t.toLowerCase()));
}

function durationMs(record: FeedingRecord): number {
  if (record.segments && record.segments.length > 0) {
    return record.segments.reduce((s, seg) => s + (seg.durationMs ?? 0), 0);
  }
  return record.durationMs ?? 0;
}

/** Last 7 days of feeds (by end time). */
function last7DaysFeeds(history: FeedingRecord[]): FeedingRecord[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return history
    .filter((r) => lastFeedingEndTime(r) >= cutoff)
    .sort((a, b) => lastFeedingEndTime(b) - lastFeedingEndTime(a));
}

export function assessSupply(
  feedingHistory: FeedingRecord[],
  _babyDobMs: number | null
): SupplyAssessment {
  const last7 = last7DaysFeeds(feedingHistory ?? []);
  let leftTotalMs = 0;
  let rightTotalMs = 0;

  for (const record of last7) {
    if (record.segments && record.segments.length > 0) {
      for (const seg of record.segments) {
        const dur = seg.durationMs ?? 0;
        if (isLeft(seg.type)) leftTotalMs += dur;
        else if (isRight(seg.type)) rightTotalMs += dur;
      }
    } else {
      const type = (record.type ?? "").toLowerCase();
      const dur = durationMs(record);
      if (type.includes("left")) leftTotalMs += dur;
      else if (type.includes("right")) rightTotalMs += dur;
    }
  }

  const leftMinutes = Math.round(leftTotalMs / 60000);
  const rightMinutes = Math.round(rightTotalMs / 60000);
  const totalBreast = leftMinutes + rightMinutes;

  if (last7.length < 5 || totalBreast < 60) {
    return {
      status: "low_data",
      leftTotalMinutes: leftMinutes,
      rightTotalMinutes: rightMinutes,
      feedCountLast7Days: last7.length,
      message: "Log at least 5 breast feeds over the last 7 days to see supply balance.",
    };
  }

  const diff = Math.abs(leftMinutes - rightMinutes);
  const total = leftMinutes + rightMinutes;
  const pctDiff = total > 0 ? (diff / total) * 100 : 0;

  if (pctDiff < 15) {
    return {
      status: "balanced",
      leftTotalMinutes: leftMinutes,
      rightTotalMinutes: rightMinutes,
      feedCountLast7Days: last7.length,
      message: "Time on each breast is fairly even this week. Keep offering both sides.",
    };
  }

  if (leftMinutes > rightMinutes) {
    return {
      status: "left_favoured",
      leftTotalMinutes: leftMinutes,
      rightTotalMinutes: rightMinutes,
      feedCountLast7Days: last7.length,
      message: "You're spending more time on the left this week. Consider starting more feeds on the right to support supply there.",
    };
  }

  return {
    status: "right_favoured",
    leftTotalMinutes: leftMinutes,
    rightTotalMinutes: rightMinutes,
    feedCountLast7Days: last7.length,
    message: "You're spending more time on the right this week. Consider starting more feeds on the left to support supply there.",
  };
}
