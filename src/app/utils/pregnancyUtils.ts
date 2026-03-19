import { PREGNANCY_WEEKS, type PregnancyWeek } from "../data/pregnancyWeeks";

export function isPregnancyMode(birthDateMs: number): boolean {
  return birthDateMs > Date.now();
}

export function getPregnancyWeek(dueDateMs: number): number {
  const now = Date.now();
  const msUntilDue = dueDateMs - now;
  const weeksRemaining = msUntilDue / (7 * 24 * 60 * 60 * 1000);
  const currentWeek = Math.round(40 - weeksRemaining);
  return Math.max(1, Math.min(40, currentWeek));
}

export function getWeeksRemaining(dueDateMs: number): number {
  const msUntilDue = dueDateMs - Date.now();
  return Math.max(0, Math.ceil(msUntilDue / (7 * 24 * 60 * 60 * 1000)));
}

export function getDaysRemaining(dueDateMs: number): number {
  const msUntilDue = dueDateMs - Date.now();
  return Math.max(0, Math.ceil(msUntilDue / (24 * 60 * 60 * 1000)));
}

export function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 12) return 1;
  if (week <= 27) return 2;
  return 3;
}

export function getWeekData(week: number): PregnancyWeek | undefined {
  return PREGNANCY_WEEKS.find((w) => w.week === week);
}

export function formatDueDate(dueDateMs: number): string {
  return new Date(dueDateMs).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
