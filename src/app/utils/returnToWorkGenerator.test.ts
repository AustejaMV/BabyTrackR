import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReturnPlan, getCountdownMessageForToday, isReturnWithinSevenDays } from "./returnToWorkGenerator";

describe("returnToWorkGenerator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));
  });

  describe("generateReturnPlan", () => {
    it("throws when return date is in the past", () => {
      expect(() =>
        generateReturnPlan({
          returnDate: "2025-03-01",
          workStartTime: "09:00",
          feedingHistory: [],
          sleepHistory: [],
          babyProfile: null,
          currentFeedingType: "breast",
        })
      ).toThrow("future");
    });

    it("generates plan with return 6 weeks away, breastfeeding", () => {
      const plan = generateReturnPlan({
        returnDate: "2025-04-21",
        workStartTime: "09:00",
        feedingHistory: [
          { id: "1", timestamp: Date.now() - 3600000, type: "Left breast", durationMs: 600000 },
          { id: "2", timestamp: Date.now() - 7200000, type: "Right breast", durationMs: 300000 },
        ] as any,
        sleepHistory: [],
        babyProfile: { birthDate: "2024-09-01", name: "Luna" },
        currentFeedingType: "breast",
      });
      expect(plan.returnDate).toBe("2025-04-21");
      expect(plan.workStartTime).toBe("09:00");
      expect(plan.currentFeedingType).toBe("breast");
      expect(plan.nurseryHandoffDoc.babyName).toBe("Luna");
      expect(plan.countdownMessages.length).toBeGreaterThanOrEqual(7);
    });

    it("generates nursery handoff doc with no undefined fields", () => {
      const plan = generateReturnPlan({
        returnDate: "2025-05-01",
        workStartTime: "08:30",
        feedingHistory: [],
        sleepHistory: [],
        babyProfile: { birthDate: "2024-10-01", name: "Max" },
        currentFeedingType: "bottle",
      });
      const doc = plan.nurseryHandoffDoc;
      expect(doc.babyName).toBe("Max");
      expect(doc.babyDob).toBeDefined();
      expect(doc.typicalWakeTime).toBeDefined();
      expect(doc.typicalBedtime).toBeDefined();
      expect(doc.napSchedule).toBeDefined();
      expect(doc.feedingPreferences).toBeDefined();
      expect(doc.settlingCues).toBeDefined();
      expect(doc.whatWorks).toBeDefined();
      expect(doc.allergies).toBeDefined();
      expect(doc.emergencyContact).toBeDefined();
      expect(String(doc.babyName)).not.toContain("undefined");
    });
  });

  describe("getCountdownMessageForToday", () => {
    it("returns null when plan is null", () => {
      expect(getCountdownMessageForToday(null)).toBeNull();
    });

    it("returns message when return is in 3 days", () => {
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));
      const plan = generateReturnPlan({
        returnDate: "2025-03-13",
        workStartTime: "09:00",
        feedingHistory: [],
        sleepHistory: [],
        babyProfile: null,
        currentFeedingType: "breast",
      });
      const msg = getCountdownMessageForToday(plan);
      expect(msg).toBeTruthy();
      expect(msg).toContain("3 days");
    });
  });

  describe("isReturnWithinSevenDays", () => {
    it("returns false when plan is null", () => {
      expect(isReturnWithinSevenDays(null)).toBe(false);
    });

    it("returns true when return is in 5 days", () => {
      const plan = generateReturnPlan({
        returnDate: "2025-03-15",
        workStartTime: "09:00",
        feedingHistory: [],
        sleepHistory: [],
        babyProfile: null,
        currentFeedingType: "breast",
      });
      expect(isReturnWithinSevenDays(plan)).toBe(true);
    });
  });
});
