/**
 * Return to work plan generator: feeding transition, sleep shift, handoff doc, countdown messages.
 */

import type {
  ReturnToWorkPlan,
  FeedingTransitionWeek,
  SleepShiftDay,
  NurseryHandoffDoc,
  CountdownMessage,
} from "../types/returnToWork";
import type { FeedingRecord } from "../types";
import type { SleepRecord } from "../types";

const COUNTDOWN_MESSAGES: Record<number, string> = {
  7: "7 days to go. The logistics are mostly sorted. How are you feeling about it?",
  6: "6 days. It's okay to feel all the feelings — sad, excited, nervous. You're allowed to be all of them at once.",
  5: "5 days. You have done something extraordinary. Going back is just the next chapter, not the end of this one.",
  4: "4 days. Start thinking about what you need in place — bag, expressed milk or formula, handoff notes.",
  3: "3 days to go. It's okay to feel overwhelmed. You're not failing; you're human.",
  2: "2 days. Breathe. You've got this. One step at a time.",
  1: "1 day to go. You have done something extraordinary this year. Tomorrow is just the next chapter.",
};

function parseReturnDate(returnDate: string): Date {
  const d = new Date(returnDate);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid return date");
  return d;
}

function toDateOnlyISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/** Average feeds per day from last 7 days of feedingHistory. */
function avgFeedsPerDayLast7(feedingHistory: FeedingRecord[]): number {
  if (!Array.isArray(feedingHistory) || feedingHistory.length === 0) return 0;
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - sevenDaysMs;
  const recent = feedingHistory.filter((f) => (f.endTime ?? f.timestamp) >= cutoff);
  if (recent.length === 0) return 0;
  const byDay = new Set<number>();
  recent.forEach((f) => {
    const t = f.endTime ?? f.timestamp;
    byDay.add(Math.floor(t / 86400000));
  });
  const days = byDay.size || 1;
  return Math.round((recent.length / days) * 10) / 10;
}

/** Average wake time and bedtime from last 7 days (HH:mm). */
function avgWakeAndBed(sleepHistory: SleepRecord[]): { wakeTime: string; bedtime: string } {
  const defaultWake = "07:00";
  const defaultBed = "19:30";
  if (!Array.isArray(sleepHistory) || sleepHistory.length === 0) return { wakeTime: defaultWake, bedtime: defaultBed };
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - sevenDaysMs;
  const recent = sleepHistory.filter((s) => s.endTime != null && s.startTime >= cutoff);
  if (recent.length === 0) return { wakeTime: defaultWake, bedtime: defaultBed };
  let wakeSum = 0;
  let bedSum = 0;
  let count = 0;
  recent.forEach((s) => {
    if (s.endTime != null) {
      const end = new Date(s.endTime);
      wakeSum += end.getHours() * 60 + end.getMinutes();
      const start = new Date(s.startTime);
      bedSum += start.getHours() * 60 + start.getMinutes();
      count++;
    }
  });
  if (count === 0) return { wakeTime: defaultWake, bedtime: defaultBed };
  const wakeM = Math.round(wakeSum / count);
  const bedM = Math.round(bedSum / count);
  return {
    wakeTime: `${String(Math.floor(wakeM / 60)).padStart(2, "0")}:${String(wakeM % 60).padStart(2, "0")}`,
    bedtime: `${String(Math.floor(bedM / 60)).padStart(2, "0")}:${String(bedM % 60).padStart(2, "0")}`,
  };
}

function minutesFromMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export interface GenerateReturnPlanParams {
  returnDate: string;
  workStartTime: string;
  feedingHistory: FeedingRecord[];
  sleepHistory: SleepRecord[];
  babyProfile: { birthDate?: number | string; name?: string } | null;
  currentFeedingType: "breast" | "bottle" | "mixed";
  babyWillBe?: "nursery" | "childminder" | "family" | "other";
  caregiverName?: string | null;
  allergies?: string;
  emergencyContact?: string;
  whatWorks?: string;
}

export function generateReturnPlan(params: GenerateReturnPlanParams): ReturnToWorkPlan {
  const {
    returnDate,
    workStartTime,
    feedingHistory,
    sleepHistory,
    babyProfile,
    currentFeedingType,
    babyWillBe = "nursery",
    caregiverName = null,
    allergies = "",
    emergencyContact = "",
    whatWorks = "",
  } = params;

  const returnD = parseReturnDate(returnDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  returnD.setHours(0, 0, 0, 0);
  if (returnD.getTime() < today.getTime()) throw new Error("Return date must be in the future");

  const daysUntilReturn = daysBetween(today, returnD);
  const weeksUntilReturn = Math.max(0, Math.floor(daysUntilReturn / 7));

  const currentFeedsPerDay = avgFeedsPerDayLast7(feedingHistory);
  const { wakeTime: typicalWakeTime, bedtime: typicalBedtime } = avgWakeAndBed(sleepHistory);

  const feedingTransitionPlan: FeedingTransitionWeek[] = [];
  if (currentFeedingType === "breast" && weeksUntilReturn > 0) {
    const numWeeks = Math.min(4, weeksUntilReturn);
    const startFeeds = Math.max(1, Math.round(currentFeedsPerDay));
    for (let i = 0; i < numWeeks; i++) {
      const weekNum = numWeeks - i;
      const targetFeeds = Math.max(1, startFeeds - i);
      const weekStart = new Date(returnD);
      weekStart.setDate(weekStart.getDate() - (numWeeks - i) * 7);
      const guidance =
        i === 0
          ? `This week: introduce one bottle feed to replace a breast feed. Use expressed milk if possible.`
          : `Week ${weekNum}: aim for ${targetFeeds} breast feeds per day; add bottle as needed for when you're at work.`;
      feedingTransitionPlan.push({
        weekNumber: weekNum,
        weekStartDate: toDateOnlyISO(weekStart),
        currentFeedsPerDay: startFeeds,
        targetFeedsPerDay: targetFeeds,
        bottleFeeds: i + 1,
        guidance,
      });
    }
    feedingTransitionPlan.reverse();
  }

  const requiredWakeMinutes = Math.max(0, minutesFromMidnight(workStartTime) - 90);
  const currentWakeMinutes = minutesFromMidnight(typicalWakeTime);
  const sleepScheduleShift: SleepShiftDay[] = [];
  if (requiredWakeMinutes < currentWakeMinutes - 20) {
    const diff = currentWakeMinutes - requiredWakeMinutes;
    for (let day = 0; day < 21; day++) {
      const d = new Date(returnD);
      d.setDate(d.getDate() - 21 + day);
      const shift = Math.min(diff, Math.floor(day / 3) * 10);
      const newWake = currentWakeMinutes - shift;
      const newBed = minutesFromMidnight(typicalBedtime) - shift;
      const newBedH = Math.floor(newBed / 60);
      const newBedM = ((newBed % 60) + 60) % 60;
      sleepScheduleShift.push({
        date: toDateOnlyISO(d),
        currentBedtime: typicalBedtime,
        targetBedtime: `${String(newBedH).padStart(2, "0")}:${String(newBedM).padStart(2, "0")}`,
        currentWakeTime: typicalWakeTime,
        targetWakeTime: `${String(Math.floor(newWake / 60)).padStart(2, "0")}:${String((newWake % 60 + 60) % 60).padStart(2, "0")}`,
        shiftMinutes: shift,
      });
    }
  }

  const babyName = babyProfile?.name ?? "Baby";
  const dobStr =
    babyProfile?.birthDate != null
      ? typeof babyProfile.birthDate === "number"
        ? new Date(babyProfile.birthDate).toISOString().slice(0, 10)
        : String(babyProfile.birthDate).slice(0, 10)
      : "";

  const napSchedule =
    "Usually 2 naps: first around 10:00 lasting 45min, second around 14:00 lasting 1h. Adjust based on your baby's pattern.";
  const feedingPreferences =
    currentFeedingType === "breast"
      ? "Breastfed, usually left breast first, every 3h. Express if needed for nursery."
      : currentFeedingType === "bottle"
        ? "Formula fed, every 3h, amount varies."
        : "Mixed feeding: breast and bottle. See handoff for timing.";

  const nurseryHandoffDoc: NurseryHandoffDoc = {
    babyName,
    babyDob: dobStr,
    typicalWakeTime,
    typicalBedtime,
    napSchedule,
    feedingPreferences,
    settlingCues: "Usually settles with rocking, dummy if needed.",
    whatWorks: whatWorks || "Comfort and routine.",
    allergies: allergies || "None known.",
    emergencyContact: emergencyContact || "Parent/carer to provide.",
  };

  const countdownMessages: CountdownMessage[] = [];
  for (let d = 7; d >= 1; d--) {
    const msg = COUNTDOWN_MESSAGES[d];
    if (msg) countdownMessages.push({ daysLeft: d, message: msg });
  }

  return {
    returnDate: toDateOnlyISO(returnD),
    workStartTime,
    currentFeedingType,
    babyWillBe,
    caregiverName,
    feedingTransitionPlan,
    sleepScheduleShift,
    nurseryHandoffDoc,
    countdownMessages,
  };
}

/** Get today's countdown message if return is within 7 days. */
export function getCountdownMessageForToday(plan: ReturnToWorkPlan | null): string | null {
  if (!plan) return null;
  const today = toDateOnlyISO(new Date());
  const returnD = plan.returnDate;
  const daysLeft = daysBetween(new Date(), parseReturnDate(returnD));
  if (daysLeft < 1 || daysLeft > 7) return null;
  const msg = plan.countdownMessages.find((m) => m.daysLeft === daysLeft);
  return msg?.message ?? null;
}

/** Return date is within the next 7 days. */
export function isReturnWithinSevenDays(plan: ReturnToWorkPlan | null): boolean {
  if (!plan) return false;
  const daysLeft = daysBetween(new Date(), parseReturnDate(plan.returnDate));
  return daysLeft >= 1 && daysLeft <= 7;
}
