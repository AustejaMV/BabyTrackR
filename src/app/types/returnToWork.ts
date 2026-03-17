/**
 * Return to work planner: feeding transition, sleep shift, nursery handoff, countdown.
 */

export interface FeedingTransitionWeek {
  weekNumber: number;
  weekStartDate: string;
  currentFeedsPerDay: number;
  targetFeedsPerDay: number;
  bottleFeeds: number;
  guidance: string;
}

export interface SleepShiftDay {
  date: string;
  currentBedtime: string;
  targetBedtime: string;
  currentWakeTime: string;
  targetWakeTime: string;
  shiftMinutes: number;
}

export interface NurseryHandoffDoc {
  babyName: string;
  babyDob: string;
  typicalWakeTime: string;
  typicalBedtime: string;
  napSchedule: string;
  feedingPreferences: string;
  settlingCues: string;
  whatWorks: string;
  allergies: string;
  emergencyContact: string;
}

export interface CountdownMessage {
  daysLeft: number;
  message: string;
}

export type CareArrangement = "nursery" | "childminder" | "family" | "other";

export interface ReturnToWorkPlan {
  returnDate: string;
  workStartTime: string;
  currentFeedingType: "breast" | "bottle" | "mixed";
  babyWillBe: CareArrangement;
  caregiverName: string | null;
  feedingTransitionPlan: FeedingTransitionWeek[];
  sleepScheduleShift: SleepShiftDay[];
  nurseryHandoffDoc: NurseryHandoffDoc;
  countdownMessages: CountdownMessage[];
}
