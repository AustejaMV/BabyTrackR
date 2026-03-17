/**
 * When to prompt for a time capsule (6, 12, 24 months) and when to show back.
 */

import { getTimeCapsules } from "./timeCapsuleStorage";
import type { TimeCapsuleEntry, TimeCapsuleMilestone } from "../types/timeCapsule";

const MILESTONES_WEEKS: TimeCapsuleMilestone[] = [26, 52, 104]; // 6, 12, 24 months

export interface TimeCapsuleTriggerResult {
  milestoneWeeks: TimeCapsuleMilestone;
  message: string;
  alreadyWritten: boolean;
}

/** Get prompt for writing a time capsule if baby is at a milestone (26, 52, 104 weeks) and not yet written. */
export function getTimeCapsuleTrigger(ageInWeeks: number): TimeCapsuleTriggerResult | null {
  if (ageInWeeks < 0) return null;
  const capsules = getTimeCapsules();
  for (const m of MILESTONES_WEEKS) {
    if (ageInWeeks < m) continue;
    const written = capsules.some((c) => c.writtenAtWeeks === m);
    if (written) continue;
    const labels: Record<TimeCapsuleMilestone, string> = {
      26: "6 months",
      52: "12 months",
      104: "24 months",
    };
    return {
      milestoneWeeks: m,
      message: `You've reached ${labels[m]}. What would you tell your past self from the early days?`,
      alreadyWritten: false,
    };
  }
  return null;
}

/** Find a capsule that is due to be "shown back" (baby age >= showBackAtWeeks) and not yet shown. */
export function getTimeCapsuleShowBack(ageInWeeks: number): TimeCapsuleEntry | null {
  if (ageInWeeks < 0) return null;
  const capsules = getTimeCapsules();
  const due = capsules
    .filter((c) => ageInWeeks >= c.showBackAtWeeks && !c.shownBackAt)
    .sort((a, b) => a.showBackAtWeeks - b.showBackAtWeeks)[0] ?? null;
  return due;
}

/** Default show-back is milestone + 6 months (e.g. write at 6mo, show back at 12mo). */
export function getDefaultShowBackWeeks(milestoneWeeks: TimeCapsuleMilestone): number {
  return milestoneWeeks + 26;
}
