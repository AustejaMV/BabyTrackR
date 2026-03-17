/**
 * Tests for first-launch onboarding storage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  isOnboardingComplete,
  markOnboardingComplete,
  getOnboardingStep,
  saveOnboardingStep,
  clearOnboardingStep,
} from "./onboardingStorage";

const COMPLETE_KEY = "cradl-onboarding-complete";
const STEP_KEY = "cradl-onboarding-step";

describe("onboardingStorage", () => {
  beforeEach(() => {
    localStorage.removeItem(COMPLETE_KEY);
    localStorage.removeItem(STEP_KEY);
  });

  describe("isOnboardingComplete", () => {
    it("returns true when complete key is set", () => {
      localStorage.setItem(COMPLETE_KEY, "true");
      expect(isOnboardingComplete()).toBe(true);
    });

    it("returns true after markOnboardingComplete", () => {
      markOnboardingComplete();
      expect(isOnboardingComplete()).toBe(true);
    });
  });

  describe("markOnboardingComplete", () => {
    it("sets complete key to true", () => {
      markOnboardingComplete();
      expect(localStorage.getItem(COMPLETE_KEY)).toBe("true");
    });
  });

  describe("getOnboardingStep", () => {
    it("returns 0 when not set", () => {
      expect(getOnboardingStep()).toBe(0);
    });

    it("returns saved step 0-5", () => {
      saveOnboardingStep(3);
      expect(getOnboardingStep()).toBe(3);
    });

    it("returns 0 for invalid value", () => {
      localStorage.setItem(STEP_KEY, "99");
      expect(getOnboardingStep()).toBe(0);
    });
  });

  describe("saveOnboardingStep", () => {
    it("persists step", () => {
      saveOnboardingStep(2);
      expect(localStorage.getItem(STEP_KEY)).toBe("2");
    });
  });

  describe("clearOnboardingStep", () => {
    it("removes step key", () => {
      saveOnboardingStep(2);
      clearOnboardingStep();
      expect(localStorage.getItem(STEP_KEY)).toBeNull();
    });
  });
});
