/**
 * Configurable alert thresholds and dismiss state (hide for 2h).
 */

import { CARE_NOTIFICATIONS_RESCHEDULE_EVENT } from "./careNotificationEvents";

const THRESHOLDS_KEY = "babytrackr-alertThresholds";
const DISMISS_KEY = "babytrackr-alertDismissed";

export interface AlertThresholds {
  noPoopHours: number;
  noSleepHours: number;
  feedOverdueMinutes: number; // added to avg interval
  tummyLowMinutes: number;
  tummyLowByHour: number; // 16 = 4pm
}

const DEFAULTS: AlertThresholds = {
  noPoopHours: 24,
  noSleepHours: 6,
  feedOverdueMinutes: 30,
  tummyLowMinutes: 20,
  tummyLowByHour: 16,
};

export function readAlertThresholds(): AlertThresholds {
  try {
    const raw = localStorage.getItem(THRESHOLDS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      noPoopHours: Number(parsed.noPoopHours) || DEFAULTS.noPoopHours,
      noSleepHours: Number(parsed.noSleepHours) || DEFAULTS.noSleepHours,
      feedOverdueMinutes: Number(parsed.feedOverdueMinutes) ?? DEFAULTS.feedOverdueMinutes,
      tummyLowMinutes: Number(parsed.tummyLowMinutes) ?? DEFAULTS.tummyLowMinutes,
      tummyLowByHour: Number(parsed.tummyLowByHour) ?? DEFAULTS.tummyLowByHour,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAlertThresholds(t: Partial<AlertThresholds>): void {
  const next = { ...readAlertThresholds(), ...t };
  try {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CARE_NOTIFICATIONS_RESCHEDULE_EVENT));
  }
}

const DISMISS_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isAlertDismissed(key: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const map: Record<string, number> = JSON.parse(raw);
    const until = map[key];
    return typeof until === "number" && until > Date.now();
  } catch {
    return false;
  }
}

export function dismissAlert(key: string, forMs: number = DISMISS_MS): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[key] = Date.now() + forMs;
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}
