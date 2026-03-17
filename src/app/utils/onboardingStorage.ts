/**
 * First-launch onboarding: complete flag and step (for persistence across refreshes).
 */

import { getBabies } from "../data/babiesStorage";

const COMPLETE_KEY = "cradl-onboarding-complete";
const STEP_KEY = "cradl-onboarding-step";

export function isOnboardingComplete(): boolean {
  try {
    if (localStorage.getItem(COMPLETE_KEY) === "true") return true;
    const babies = getBabies();
    if (babies.length > 0 && babies[0]?.birthDate) return true;
    return false;
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(COMPLETE_KEY, "true");
  } catch {}
}

export function getOnboardingStep(): number {
  try {
    const raw = localStorage.getItem(STEP_KEY);
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n <= 5 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveOnboardingStep(step: number): void {
  try {
    if (step >= 0 && step <= 5) localStorage.setItem(STEP_KEY, String(step));
  } catch {}
}

export function clearOnboardingStep(): void {
  try {
    localStorage.removeItem(STEP_KEY);
  } catch {}
}
