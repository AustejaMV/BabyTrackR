/**
 * Plans local care reminders from usual patterns + conservative age-based caps
 * inspired by common UK public-health messaging (responsive feeding, regular nappy checks).
 * Informational only — not medical advice.
 */

import type { FeedingRecord, BottleRecord, DiaperRecord } from "../types";
import type { SweetSpotPrediction } from "./napPrediction";
import type { AlertThresholds } from "./alertThresholdsStorage";
import type { NotificationSettingKey, NotificationSettings } from "./notificationSettingsStorage";
import { isNotificationEnabled } from "./notificationSettingsStorage";
import { getAgeInDays } from "./babyUtils";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const SEVEN_DAYS = 7 * MS_DAY;
const NAP_SOON_BEFORE_MS = 10 * 60 * 1000;
const NAP_CLOSING_BEFORE_MS = 8 * 60 * 1000;
const PAIN_RELIEF_DEFAULT_HOURS = 8;
export const VACCINATION_REMIND_DAYS_BEFORE = 7;

/** Stable IDs for Capacitor cancel/reschedule (small integers for Android). */
export const CARE_NOTIF_IDS = {
  napOpening: 92001,
  feedOverdue: 92002,
  nappyOverdue: 92003,
  napClosing: 92004,
  tummyDaily: 92005,
  painRelief: 92006,
  vaccination: 92007,
} as const;

export interface PlannedCareNotification {
  id: number;
  key: string;
  fireAt: number;
  title: string;
  body: string;
  settingKey: NotificationSettingKey;
}

export function getFeedEventTimeMs(r: FeedingRecord): number {
  if (r.endTime != null && Number.isFinite(r.endTime)) return r.endTime;
  if (r.segments?.length) {
    let max = 0;
    for (const seg of r.segments) {
      const t = seg.endTime ?? seg.startTime ?? 0;
      if (t > max) max = t;
    }
    if (max > 0) return max;
  }
  return r.timestamp ?? r.startTime ?? 0;
}

/** Upper bound for “might be time for a feed” reminders by age (conservative). */
export function nhsTypicalMaxFeedGapMs(ageDays: number): number {
  if (ageDays <= 7) return 2.5 * MS_HOUR;
  if (ageDays <= 28) return 3 * MS_HOUR;
  if (ageDays <= 90) return 3.5 * MS_HOUR;
  if (ageDays <= 180) return 4 * MS_HOUR;
  if (ageDays <= 365) return 5 * MS_HOUR;
  return 6 * MS_HOUR;
}

function typicalMaxNappyGapMs(ageDays: number): number {
  if (ageDays <= 90) return 4 * MS_HOUR;
  return 5 * MS_HOUR;
}

function sortedFeedTimestamps(
  feedingHistory: FeedingRecord[],
  bottleHistory: BottleRecord[],
  now: number,
): number[] {
  const cutoff = now - SEVEN_DAYS;
  const times: number[] = [];
  for (const r of feedingHistory) {
    const t = getFeedEventTimeMs(r);
    if (t >= cutoff && t <= now) times.push(t);
  }
  for (const b of bottleHistory) {
    const t = b.timestamp ?? 0;
    if (t >= cutoff && t <= now) times.push(t);
  }
  times.sort((a, b) => a - b);
  return times;
}

export function computeFeedAverageIntervalMs(
  feedingHistory: FeedingRecord[],
  bottleHistory: BottleRecord[],
  now: number,
): { avgMs: number | null; count: number } {
  const times = sortedFeedTimestamps(feedingHistory, bottleHistory, now);
  if (times.length < 4) return { avgMs: null, count: times.length };
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const g = times[i]! - times[i - 1]!;
    if (g > 30 * 1000 && g < 12 * MS_HOUR) gaps.push(g);
  }
  if (gaps.length < 3) return { avgMs: null, count: times.length };
  const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { avgMs, count: gaps.length };
}

export function getLastFeedTimeMs(
  feedingHistory: FeedingRecord[],
  bottleHistory: BottleRecord[],
): number | null {
  let max = 0;
  for (const r of feedingHistory) {
    const t = getFeedEventTimeMs(r);
    if (t > max) max = t;
  }
  for (const b of bottleHistory) {
    const t = b.timestamp ?? 0;
    if (t > max) max = t;
  }
  return max > 0 ? max : null;
}

function sortedDiaperTimestamps(diaperHistory: DiaperRecord[], now: number): number[] {
  const cutoff = now - SEVEN_DAYS;
  return diaperHistory
    .map((d) => d.timestamp ?? 0)
    .filter((t) => t >= cutoff && t <= now)
    .sort((a, b) => a - b);
}

export function computeDiaperAverageGapMs(
  diaperHistory: DiaperRecord[],
  now: number,
): { avgMs: number | null; count: number } {
  const times = sortedDiaperTimestamps(diaperHistory, now);
  if (times.length < 4) return { avgMs: null, count: times.length };
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const g = times[i]! - times[i - 1]!;
    if (g > 60 * 1000 && g < 24 * MS_HOUR) gaps.push(g);
  }
  if (gaps.length < 3) return { avgMs: null, count: times.length };
  const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { avgMs, count: gaps.length };
}

export function getLastDiaperTimeMs(diaperHistory: DiaperRecord[]): number | null {
  if (!diaperHistory.length) return null;
  let max = 0;
  for (const d of diaperHistory) {
    const t = d.timestamp ?? 0;
    if (t > max) max = t;
  }
  return max > 0 ? max : null;
}

function feedThresholdMs(ageDays: number, thresholds: AlertThresholds, avgMs: number | null): number {
  const bufferMs = thresholds.feedOverdueMinutes * 60 * 1000;
  const nhsCap = nhsTypicalMaxFeedGapMs(ageDays) + bufferMs;
  if (avgMs != null) {
    const fromPattern = avgMs * 1.35 + bufferMs;
    return Math.min(nhsCap, fromPattern);
  }
  return nhsCap;
}

function nappyThresholdMs(ageDays: number, avgMs: number | null): number {
  const cap = typicalMaxNappyGapMs(ageDays);
  if (avgMs != null) {
    const fromPattern = avgMs * 1.25;
    return Math.min(cap, fromPattern);
  }
  return cap;
}

function clampFireTime(now: number, fireAt: number, maxAheadMs: number = 7 * MS_DAY): number | null {
  const minLead = 15 * 1000;
  if (fireAt < now + minLead) return null;
  if (fireAt > now + maxAheadMs) return null;
  return fireAt;
}

export interface PlanCareNotificationsArgs {
  now: number;
  babyDobMs: number;
  settings: NotificationSettings;
  thresholds: AlertThresholds;
  prediction: SweetSpotPrediction | null;
  isSleeping: boolean;
  feedInProgress: boolean;
  feedingHistory: FeedingRecord[];
  bottleHistory: BottleRecord[];
  diaperHistory: DiaperRecord[];
  lastPainkillerMs: number | null;
  painReliefIntervalHours?: number;
  /** Precomputed: local morning time on (vaccination date − N days), or null */
  vaccinationReminderAtMs: number | null;
}

export function planCareNotifications(args: PlanCareNotificationsArgs): PlannedCareNotification[] {
  const {
    now,
    babyDobMs,
    settings,
    thresholds,
    prediction,
    isSleeping,
    feedInProgress,
    feedingHistory,
    bottleHistory,
    diaperHistory,
    lastPainkillerMs,
    painReliefIntervalHours = PAIN_RELIEF_DEFAULT_HOURS,
    vaccinationReminderAtMs,
  } = args;

  const ageDays = getAgeInDays(babyDobMs, now);
  const out: PlannedCareNotification[] = [];

  // —— Nap window opening soon ——
  if (
    !isSleeping &&
    prediction &&
    isNotificationEnabled(settings, "napWindowOpening")
  ) {
    const openMs = prediction.opensAt.getTime();
    const fireAt = openMs - NAP_SOON_BEFORE_MS;
    const t = clampFireTime(now, fireAt);
    if (t != null) {
      out.push({
        id: CARE_NOTIF_IDS.napOpening,
        key: "nap_opening",
        fireAt: t,
        title: "Nap window soon",
        body: "Based on usual wake windows, a nap may work well in the next few minutes.",
        settingKey: "napWindowOpening",
      });
    }
  }

  // —— Nap window closing soon ——
  if (
    !isSleeping &&
    prediction &&
    isNotificationEnabled(settings, "napStageTransition")
  ) {
    const closeMs = prediction.closesAt.getTime();
    const fireAt = closeMs - NAP_CLOSING_BEFORE_MS;
    if (now < closeMs) {
      const t = clampFireTime(now, fireAt);
      if (t != null) {
        out.push({
          id: CARE_NOTIF_IDS.napClosing,
          key: "nap_closing",
          fireAt: t,
          title: "Nap window closing",
          body: "If baby still needs a nap, settling soon may be easier before the window passes.",
          settingKey: "napStageTransition",
        });
      }
    }
  }

  // —— Feed reminder ——
  if (!feedInProgress && isNotificationEnabled(settings, "feedReminder")) {
    const lastFeed = getLastFeedTimeMs(feedingHistory, bottleHistory);
    if (lastFeed != null) {
      const { avgMs } = computeFeedAverageIntervalMs(feedingHistory, bottleHistory, now);
      const threshold = feedThresholdMs(ageDays, thresholds, avgMs);
      const dueAt = lastFeed + threshold;
      const t = clampFireTime(now, dueAt);
      if (t != null) {
        out.push({
          id: CARE_NOTIF_IDS.feedOverdue,
          key: "feed_overdue",
          fireAt: t,
          title: "Feed reminder",
          body: "It’s been a while since the last feed — consider offering one if baby seems hungry.",
          settingKey: "feedReminder",
        });
      }
    }
  }

  // —— Nappy reminder ——
  if (isNotificationEnabled(settings, "nappyReminder")) {
    const lastD = getLastDiaperTimeMs(diaperHistory);
    if (lastD != null) {
      const { avgMs } = computeDiaperAverageGapMs(diaperHistory, now);
      const threshold = nappyThresholdMs(ageDays, avgMs);
      const dueAt = lastD + threshold;
      const t = clampFireTime(now, dueAt);
      if (t != null) {
        out.push({
          id: CARE_NOTIF_IDS.nappyOverdue,
          key: "nappy_overdue",
          fireAt: t,
          title: "Nappy check",
          body: "It’s been a while since the last nappy change — worth a quick check.",
          settingKey: "nappyReminder",
        });
      }
    }
  }

  // —— Pain relief (paracetamol-style interval; matches dashboard copy) ——
  if (lastPainkillerMs != null && isNotificationEnabled(settings, "painReliefSafe")) {
    const fireAt = lastPainkillerMs + painReliefIntervalHours * MS_HOUR;
    const t = clampFireTime(now, fireAt);
    if (t != null) {
      out.push({
        id: CARE_NOTIF_IDS.painRelief,
        key: "pain_relief",
        fireAt: t,
        title: "Pain relief",
        body: "The usual minimum interval may have passed — only give medicine if appropriate and as advised.",
        settingKey: "painReliefSafe",
      });
    }
  }

  // —— Vaccination / jab (from appointments) ——
  if (
    vaccinationReminderAtMs != null &&
    isNotificationEnabled(settings, "vaccinationDue")
  ) {
    const t = clampFireTime(now, vaccinationReminderAtMs);
    if (t != null) {
      out.push({
        id: CARE_NOTIF_IDS.vaccination,
        key: "vaccination",
        fireAt: t,
        title: "Jab or vaccination coming up",
        body: `Something vaccine-related may be due in about ${VACCINATION_REMIND_DAYS_BEFORE} days — check your appointment details.`,
        settingKey: "vaccinationDue",
      });
    }
  }

  // —— Daily tummy — next fire at configured hour today or tomorrow ——
  if (isNotificationEnabled(settings, "dailyTummyReminder")) {
    const hour = Math.min(23, Math.max(0, Math.floor(thresholds.tummyLowByHour)));
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    const t = clampFireTime(now, next.getTime());
    if (t != null) {
      out.push({
        id: CARE_NOTIF_IDS.tummyDaily,
        key: "tummy_daily",
        fireAt: t,
        title: "Tummy time",
        body: "A little tummy time today helps build strength — whenever baby is happy and awake.",
        settingKey: "dailyTummyReminder",
      });
    }
  }

  return out;
}
