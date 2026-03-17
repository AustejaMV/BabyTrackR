/**
 * Return to work plan storage (localStorage + synced via dataSync when signed in).
 */

import type { ReturnToWorkPlan } from "../types/returnToWork";

const KEY = "returnToWorkPlan";

export function getReturnToWorkPlan(): ReturnToWorkPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReturnToWorkPlan;
  } catch {
    return null;
  }
}

export function saveReturnToWorkPlan(plan: ReturnToWorkPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
  } catch (e) {
    console.warn("[Cradl] saveReturnToWorkPlan failed", e);
  }
}
