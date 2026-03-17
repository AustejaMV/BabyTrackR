/**
 * Nap schedule stages by age and buildDailySchedule for suggested daily timeline.
 */

import { getWakeWindowForAge } from './wakeWindows';

export interface NapScheduleStage {
  minWeeks: number;
  maxWeeks: number;
  naps: number;
  label: string;
  description: string;
}

export const NAP_SCHEDULE_STAGES: NapScheduleStage[] = [
  { minWeeks: 0, maxWeeks: 16, naps: 4, label: 'Newborn schedule', description: '4–5 naps' },
  { minWeeks: 16, maxWeeks: 28, naps: 3, label: '3-nap stage', description: '3 naps' },
  { minWeeks: 28, maxWeeks: 40, naps: 2, label: '2-nap stage — most common', description: '2 naps' },
  { minWeeks: 40, maxWeeks: 60, naps: 2, label: '2-to-1 nap transition', description: '2 naps transitioning to 1' },
  { minWeeks: 60, maxWeeks: 90, naps: 1, label: '1-nap stage', description: '1 nap' },
  { minWeeks: 90, maxWeeks: 999, naps: 1, label: 'Dropping naps', description: '0–1 naps' },
];

export interface ScheduleEvent {
  label: string;
  time: string;
  type: 'wake' | 'nap' | 'bedtime' | 'feed-window';
}

/**
 * Returns the nap stage for the given age in weeks.
 * Guard: returns null if ageInWeeks is invalid (< 0 or no matching stage).
 */
export function getNapStage(ageInWeeks: number): NapScheduleStage | null {
  if (ageInWeeks < 0 || !Number.isFinite(ageInWeeks)) return null;
  const stage = NAP_SCHEDULE_STAGES.find((s) => ageInWeeks >= s.minWeeks && ageInWeeks < s.maxWeeks);
  return stage ?? null;
}

const SCHEDULE_PREFS_KEY = 'babytrackr-schedule-prefs';
const LAST_NAP_STAGE_KEY = 'babytrackr-last-nap-stage';

export function getSchedulePrefs(): { wakeTime: string; bedtime: string } {
  try {
    const raw = localStorage.getItem(SCHEDULE_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.wakeTime === 'string' && typeof parsed.bedtime === 'string') {
        return { wakeTime: parsed.wakeTime, bedtime: parsed.bedtime };
      }
    }
  } catch {
    // ignore
  }
  return { wakeTime: '07:00', bedtime: '19:30' };
}

export function setSchedulePrefs(wakeTime: string, bedtime: string): void {
  try {
    localStorage.setItem(SCHEDULE_PREFS_KEY, JSON.stringify({ wakeTime, bedtime }));
  } catch {
    // ignore
  }
}

export function getLastNapStage(): string | null {
  try {
    return localStorage.getItem(LAST_NAP_STAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastNapStage(stageLabel: string): void {
  try {
    localStorage.setItem(LAST_NAP_STAGE_KEY, stageLabel);
  } catch {
    // ignore
  }
}

/**
 * Builds a daily schedule of wake, naps, and bedtime based on age.
 * Guard: returns [] if ageInWeeks < 0 or wake window unavailable.
 */
export function buildDailySchedule(
  wakeTime: string,
  bedtime: string,
  ageInWeeks: number,
): ScheduleEvent[] {
  if (ageInWeeks < 0 || !Number.isFinite(ageInWeeks)) return [];
  const wakeWindow = getWakeWindowForAge(ageInWeeks);
  if (!wakeWindow) return [];

  const today = new Date();
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [bedH, bedM] = bedtime.split(':').map(Number);
  if (isNaN(wakeH) || isNaN(wakeM) || isNaN(bedH) || isNaN(bedM)) return [];

  const wakeDate = new Date(today);
  wakeDate.setHours(wakeH, wakeM, 0, 0);
  let bedDate = new Date(today);
  bedDate.setHours(bedH, bedM, 0, 0);
  if (bedDate.getTime() <= wakeDate.getTime()) {
    bedDate = new Date(bedDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const stage = getNapStage(ageInWeeks);
  const napCount = stage ? stage.naps : 0;

  const events: ScheduleEvent[] = [];
  events.push({
    label: 'Wake',
    time: wakeTime,
    type: 'wake',
  });
  events.push({
    label: 'Bedtime',
    time: bedtime,
    type: 'bedtime',
  });

  if (napCount > 0) {
    const wakeMs = wakeDate.getTime();
    const bedMs = bedDate.getTime();
    const totalWakeMs = bedMs - wakeMs;
    const avgGapMs = totalWakeMs / (napCount + 1);
    const napDurationMin = 45;
    for (let i = 0; i < napCount; i++) {
      const napStartMs = wakeMs + Math.round((i + 1) * avgGapMs) - (napDurationMin * 60 * 1000) / 2;
      const napStart = new Date(napStartMs);
      const h = napStart.getHours();
      const m = napStart.getMinutes();
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      events.push({
        label: `Nap ${i + 1}`,
        time: timeStr,
        type: 'nap',
      });
    }
  }

  events.sort((a, b) => a.time.localeCompare(b.time));

  return events;
}
