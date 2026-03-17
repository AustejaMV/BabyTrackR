/**
 * Schedules the next medication reminder notification based on config and last dose.
 */
import { getMedicationReminderConfig } from "../data/medicationReminderStorage";
import { scheduleNotification } from "./notifications";

let scheduledTimeoutId: ReturnType<typeof setTimeout> | null = null;

function parseTimeHHMM(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map(Number);
  return { h: Number.isFinite(h) ? h : 7, m: Number.isFinite(m) ? m : 0 };
}

/** Get last medication timestamp (ms) from painkillerHistory or medicationHistory. */
function getLastMedicationTime(): number | null {
  try {
    const pain = localStorage.getItem("painkillerHistory");
    if (pain) {
      const arr: { timestamp?: number }[] = JSON.parse(pain);
      if (Array.isArray(arr) && arr.length > 0) {
        const last = arr[arr.length - 1];
        const ts = last?.timestamp;
        if (typeof ts === "number" && Number.isFinite(ts)) return ts;
      }
    }
    const med = localStorage.getItem("medicationHistory");
    if (med) {
      const arr: { timestamp?: string }[] = JSON.parse(med);
      if (Array.isArray(arr) && arr.length > 0) {
        const last = arr[arr.length - 1];
        const ts = last?.timestamp;
        if (typeof ts === "string") {
          const ms = new Date(ts).getTime();
          if (Number.isFinite(ms)) return ms;
        }
      }
    }
  } catch {}
  return null;
}

/** Check if a given time (ms) is within daytime window (config dayStart–dayEnd in local time). */
function isWithinDaytime(ms: number, dayStart: string, dayEnd: string): boolean {
  const d = new Date(ms);
  const minSinceMidnight = d.getHours() * 60 + d.getMinutes();
  const { h: sh, m: sm } = parseTimeHHMM(dayStart);
  const { h: eh, m: em } = parseTimeHHMM(dayEnd);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins > startMins) return minSinceMidnight >= startMins && minSinceMidnight <= endMins;
  return minSinceMidnight >= startMins || minSinceMidnight <= endMins;
}

/** Check if date (ms) is on a repeat day (0=Sun … 6=Sat). */
function isRepeatDay(ms: number, repeatDays: number[]): boolean {
  if (repeatDays.length === 0) return false;
  const day = new Date(ms).getDay();
  return repeatDays.includes(day);
}

/**
 * Schedule the next medication reminder. Call on app load and after user logs a dose.
 */
export function scheduleNextMedicationReminder(): void {
  if (scheduledTimeoutId) {
    clearTimeout(scheduledTimeoutId);
    scheduledTimeoutId = null;
  }

  const config = getMedicationReminderConfig();
  if (!config.enabled) return;

  const now = Date.now();

  if (config.mode === "remind_in") {
    const lastDose = getLastMedicationTime();
    if (lastDose == null) return; // no dose yet — could schedule for "first reminder" at a default time; for now skip
    const intervalMs = config.intervalHours * 60 * 60 * 1000;
    let nextAt = lastDose + intervalMs;
    while (nextAt <= now) nextAt += intervalMs;
    const dayStart = parseTimeHHMM(config.dayStart);
    const dayEnd = parseTimeHHMM(config.dayEnd);
    const getDayStartMs = (ts: number) => {
      const d = new Date(ts);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), dayStart.h, dayStart.m).getTime();
    };
    const getDayEndMs = (ts: number) => {
      const d = new Date(ts);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), dayEnd.h, dayEnd.m).getTime();
    };
    for (let i = 0; i < 500; i++) {
      if (nextAt <= now) { nextAt += intervalMs; continue; }
      if (!isRepeatDay(nextAt, config.repeatDays)) { nextAt += intervalMs; continue; }
      if (config.daytimeOnly) {
        const startMs = getDayStartMs(nextAt);
        const endMs = getDayEndMs(nextAt);
        if (nextAt < startMs) nextAt = startMs;
        else if (nextAt > endMs) { nextAt += intervalMs; continue; }
        if (nextAt <= now) { nextAt += intervalMs; continue; }
      }
      break;
    }
    if (nextAt <= now || nextAt - now > 7 * 24 * 60 * 60 * 1000) return;
    const delayMs = Math.max(0, nextAt - now);
    scheduledTimeoutId = setTimeout(() => {
      scheduledTimeoutId = null;
      scheduleNotification("Medication reminder", "Time for your next dose.", 0);
      scheduleNextMedicationReminder(); // reschedule for next occurrence
    }, delayMs);
    return;
  }

  if (config.mode === "remind_at") {
    const { h, m } = parseTimeHHMM(config.remindAtTime);
    const today = new Date();
    let next = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).getTime();
    if (next <= now) next += 24 * 60 * 60 * 1000;
    while (!isRepeatDay(next, config.repeatDays)) {
      next += 24 * 60 * 60 * 1000;
      if (next - now > 7 * 24 * 60 * 60 * 1000) return;
    }
    if (config.daytimeOnly && !isWithinDaytime(next, config.dayStart, config.dayEnd)) {
      next += 24 * 60 * 60 * 1000;
      while (!isRepeatDay(next, config.repeatDays)) next += 24 * 60 * 60 * 1000;
    }
    const delayMs = Math.max(0, next - now);
    scheduledTimeoutId = setTimeout(() => {
      scheduledTimeoutId = null;
      scheduleNotification("Medication reminder", "Time for your next dose.", 0);
      scheduleNextMedicationReminder();
    }, delayMs);
  }
}
