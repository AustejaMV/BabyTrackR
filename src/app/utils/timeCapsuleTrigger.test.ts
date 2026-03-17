import { describe, it, expect, beforeEach } from "vitest";
import { getTimeCapsuleTrigger, getTimeCapsuleShowBack, getDefaultShowBackWeeks } from "./timeCapsuleTrigger";
import { saveTimeCapsule } from "./timeCapsuleStorage";

describe("timeCapsuleTrigger", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getTimeCapsuleTrigger", () => {
    it("returns null when ageInWeeks < 0", () => {
      expect(getTimeCapsuleTrigger(-1)).toBeNull();
    });

    it("returns 6-month prompt when age is 26 weeks and not written", () => {
      const r = getTimeCapsuleTrigger(26);
      expect(r).not.toBeNull();
      expect(r!.milestoneWeeks).toBe(26);
      expect(r!.message).toContain("6 months");
    });

    it("returns null for 26 weeks when already written", () => {
      saveTimeCapsule({
        writtenAtWeeks: 26,
        writtenAt: new Date().toISOString(),
        body: "Test",
        showBackAtWeeks: 52,
      });
      expect(getTimeCapsuleTrigger(26)).toBeNull();
    });

    it("returns 12-month prompt when age is 52 weeks and 6mo already written", () => {
      saveTimeCapsule({
        writtenAtWeeks: 26,
        writtenAt: new Date().toISOString(),
        body: "Test",
        showBackAtWeeks: 52,
      });
      const r = getTimeCapsuleTrigger(52);
      expect(r).not.toBeNull();
      expect(r!.milestoneWeeks).toBe(52);
    });
  });

  describe("getTimeCapsuleShowBack", () => {
    it("returns null when no capsule due", () => {
      expect(getTimeCapsuleShowBack(10)).toBeNull();
    });

    it("returns capsule when age >= showBackAtWeeks and not shown", () => {
      saveTimeCapsule({
        writtenAtWeeks: 26,
        writtenAt: new Date().toISOString(),
        body: "Hello past me",
        showBackAtWeeks: 52,
      });
      const r = getTimeCapsuleShowBack(52);
      expect(r).not.toBeNull();
      expect(r!.body).toBe("Hello past me");
    });
  });

  describe("getDefaultShowBackWeeks", () => {
    it("returns milestone + 26", () => {
      expect(getDefaultShowBackWeeks(26)).toBe(52);
      expect(getDefaultShowBackWeeks(52)).toBe(78);
      expect(getDefaultShowBackWeeks(104)).toBe(130);
    });
  });
});
