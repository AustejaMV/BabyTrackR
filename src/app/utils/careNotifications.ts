/**
 * Schedules care reminders on web (in-app timers) and native (Capacitor Local Notifications).
 * Web: timers only run while the app/tab stays open — see product docs.
 */

import { Capacitor } from "@capacitor/core";
import type {
  FeedingRecord,
  BottleRecord,
  DiaperRecord,
  SleepRecord,
  PainkillerDose,
} from "../types";
import type { SweetSpotPrediction } from "./napPrediction";
import { readAlertThresholds } from "./alertThresholdsStorage";
import { readNotificationSettings } from "./notificationSettingsStorage";
import {
  planCareNotifications,
  CARE_NOTIF_IDS,
  type PlanCareNotificationsArgs,
} from "./careNotificationPlanner";
import { sendNotification } from "./notifications";
import { getAppointments, parseDateStr } from "../data/appointmentsStorage";
import { VACCINATION_REMIND_DAYS_BEFORE } from "./careNotificationPlanner";
import { getBabies, getActiveBabyId } from "../data/babiesStorage";
import { getSweetSpotPrediction } from "./napPrediction";
import { readStoredArray } from "./warningUtils";

const VACC_HINT =
  /vaccin|immunis|immuniz|jab|injection|6-in-1|8\s*week|mmr|bcg|flu\s*nasal/i;

const ALL_CARE_NOTIFICATION_IDS = [
  CARE_NOTIF_IDS.napOpening,
  CARE_NOTIF_IDS.feedOverdue,
  CARE_NOTIF_IDS.nappyOverdue,
  CARE_NOTIF_IDS.napClosing,
  CARE_NOTIF_IDS.tummyDaily,
  CARE_NOTIF_IDS.painRelief,
  CARE_NOTIF_IDS.vaccination,
];

const webTimers = new Map<number, ReturnType<typeof setTimeout>>();

type LocalNotificationsPlugin = {
  checkPermissions: () => Promise<{ display: "granted" | "denied" | "prompt" }>;
  requestPermissions: () => Promise<{ display: "granted" | "denied" | "prompt" }>;
  schedule: (options: {
    notifications: { id: number; title: string; body: string; schedule: { at: Date } }[];
  }) => Promise<unknown>;
  cancel: (options: { notifications: { id: number }[] }) => Promise<unknown>;
};

async function getLocalNotifications(): Promise<LocalNotificationsPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications as LocalNotificationsPlugin;
  } catch {
    return null;
  }
}

function clearAllWebCareTimers(): void {
  for (const id of webTimers.keys()) {
    const t = webTimers.get(id);
    if (t != null) clearTimeout(t);
    webTimers.delete(id);
  }
}

/** Next reminder moment for vaccine-related appointments (7 days before, or next 9am if that passed). */
export function computeNextVaccinationReminderAtMs(now: number = Date.now()): number | null {
  const appts = getAppointments();
  let bestApptMs: number | null = null;
  for (const a of appts) {
    if (!VACC_HINT.test(`${a.name} ${a.notes}`)) continue;
    const d = parseDateStr(a.date);
    if (!d) continue;
    const timePart = (a.time || "09:00").trim().split(":");
    const h = Math.min(23, Math.max(0, parseInt(timePart[0] || "9", 10) || 9));
    const m = Math.min(59, Math.max(0, parseInt(timePart[1] || "0", 10) || 0));
    d.setHours(h, m, 0, 0);
    const apptMs = d.getTime();
    if (apptMs <= now) continue;
    if (bestApptMs == null || apptMs < bestApptMs) bestApptMs = apptMs;
  }
  if (bestApptMs == null) return null;

  const remind = new Date(bestApptMs);
  remind.setDate(remind.getDate() - VACCINATION_REMIND_DAYS_BEFORE);
  remind.setHours(9, 0, 0, 0);
  let fireAt = remind.getTime();

  if (fireAt < now && bestApptMs > now) {
    const d = new Date(now);
    d.setHours(9, 0, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    fireAt = d.getTime();
    if (fireAt >= bestApptMs) return null;
  }

  return fireAt;
}

export interface RescheduleCareNotificationsInput {
  babyDob: string | number | null | undefined;
  sleepHistory: SleepRecord[];
  feedingHistory: FeedingRecord[];
  bottleHistory: BottleRecord[];
  diaperHistory: DiaperRecord[];
  currentSleep: SleepRecord | null;
  prediction: SweetSpotPrediction | null;
  lastPainkiller: PainkillerDose | null;
  feedInProgress: boolean;
  now?: number;
}

function readCurrentSleepFromStorage(): SleepRecord | null {
  try {
    const raw = localStorage.getItem("currentSleep");
    if (!raw) return null;
    const p = JSON.parse(raw) as SleepRecord | null;
    return p?.id ? p : null;
  } catch {
    return null;
  }
}

/** Build input from current localStorage (active baby + flat synced keys). For Settings / global events. */
export function buildCareNotificationInputFromStorage(): RescheduleCareNotificationsInput | null {
  const activeId = getActiveBabyId();
  if (!activeId) return null;
  const baby = getBabies().find((b) => b.id === activeId);
  if (!baby?.birthDate) return null;

  const sleepHistory = readStoredArray<SleepRecord>("sleepHistory");
  const feedingHistory = readStoredArray<FeedingRecord>("feedingHistory");
  const bottleHistory = readStoredArray<BottleRecord>("bottleHistory");
  const diaperHistory = readStoredArray<DiaperRecord>("diaperHistory");
  const currentSleep = readCurrentSleepFromStorage();
  const prediction = getSweetSpotPrediction(sleepHistory, baby.birthDate);

  let lastPainkiller: PainkillerDose | null = null;
  try {
    const raw = localStorage.getItem("painkillerHistory");
    if (raw) {
      const doses = JSON.parse(raw) as PainkillerDose[];
      if (Array.isArray(doses) && doses.length > 0) lastPainkiller = doses[doses.length - 1] ?? null;
    }
  } catch {
    /* ignore */
  }

  return {
    babyDob: baby.birthDate,
    sleepHistory,
    feedingHistory,
    bottleHistory,
    diaperHistory,
    currentSleep,
    prediction,
    lastPainkiller,
    feedInProgress: false,
  };
}

export function rescheduleCareNotificationsFromStorage(): Promise<void> {
  const input = buildCareNotificationInputFromStorage();
  if (!input) return Promise.resolve();
  return rescheduleCareNotifications(input);
}

function toBabyDobMs(babyDob: string | number | null | undefined): number | null {
  if (babyDob == null || babyDob === "") return null;
  const dobMs = typeof babyDob === "number" ? babyDob : new Date(babyDob).getTime();
  return Number.isFinite(dobMs) ? dobMs : null;
}

/**
 * Cancel native + web care schedules and replan. Safe to call on web (native calls no-op).
 */
export async function rescheduleCareNotifications(
  input: RescheduleCareNotificationsInput,
): Promise<void> {
  const now = input.now ?? Date.now();
  const babyDobMs = toBabyDobMs(input.babyDob);
  if (babyDobMs == null) {
    clearAllWebCareTimers();
    await cancelNativeCareNotifications();
    return;
  }

  const settings = readNotificationSettings();
  const thresholds = readAlertThresholds();
  const vaccinationReminderAtMs = computeNextVaccinationReminderAtMs(now);

  const planArgs: PlanCareNotificationsArgs = {
    now,
    babyDobMs,
    settings,
    thresholds,
    prediction: input.prediction,
    isSleeping: Boolean(input.currentSleep?.id),
    feedInProgress: input.feedInProgress,
    feedingHistory: input.feedingHistory,
    bottleHistory: input.bottleHistory,
    diaperHistory: input.diaperHistory,
    lastPainkillerMs: input.lastPainkiller?.timestamp ?? null,
    vaccinationReminderAtMs,
  };

  const planned = planCareNotifications(planArgs);

  clearAllWebCareTimers();
  await cancelNativeCareNotifications();

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const localNotifications = await getLocalNotifications();
    if (!localNotifications) return;
    try {
      const perm = await localNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const req = await localNotifications.requestPermissions();
        if (req.display !== "granted") return;
      }
    } catch {
      return;
    }

    const nativePayload: {
      id: number;
      title: string;
      body: string;
      schedule: { at: Date };
    }[] = [];

    for (const n of planned) {
      nativePayload.push({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: new Date(n.fireAt) },
      });
    }

    if (nativePayload.length > 0) {
      try {
        await localNotifications.schedule({ notifications: nativePayload });
      } catch (e) {
        console.warn("[BabyTracker] LocalNotifications.schedule failed", e);
      }
    }
    return;
  }

  // Web: schedule in-app timers (requires tab open; permission for when timer fires)
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  for (const n of planned) {
    const delayMs = n.fireAt - now;
    if (delayMs < 50) continue;
    const id = n.id;
    const timer = setTimeout(() => {
      webTimers.delete(id);
      void sendNotification(n.title, { body: n.body });
    }, delayMs);
    webTimers.set(id, timer);
  }
}

async function cancelNativeCareNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const localNotifications = await getLocalNotifications();
  if (!localNotifications) return;
  try {
    await localNotifications.cancel({
      notifications: ALL_CARE_NOTIFICATION_IDS.map((id) => ({ id })),
    });
  } catch {
    /* ignore */
  }
}

/** Cancel web timers only (e.g. tests or sign-out). */
export function cancelWebCareNotifications(): void {
  clearAllWebCareTimers();
}
