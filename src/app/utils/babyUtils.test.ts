import { describe, it, expect } from "vitest";
import { getAgeInDays, getAgeMonthsWeeks, getTargetsForAge, DEFAULT_MILESTONES } from "./babyUtils";

describe("babyUtils", () => {
  describe("getAgeInDays", () => {
    it("returns 0 when birth date is today", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(getAgeInDays(today.getTime(), today.getTime() + 1)).toBe(0);
    });

    it("returns 1 when birth was yesterday", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(getAgeInDays(yesterday.getTime(), today.getTime() + 1)).toBe(1);
    });

    it("returns 30 for ~1 month ago", () => {
      const now = new Date();
      now.setHours(12, 0, 0, 0);
      const birth = new Date(now);
      birth.setDate(birth.getDate() - 30);
      birth.setHours(0, 0, 0, 0);
      const nowStart = new Date(now);
      nowStart.setHours(0, 0, 0, 0);
      expect(getAgeInDays(birth.getTime(), now.getTime())).toBe(30);
    });

    it("returns 0 when birth is in the future (guarded)", () => {
      const now = Date.now();
      const future = now + 7 * 24 * 60 * 60 * 1000;
      expect(getAgeInDays(future, now)).toBe(0);
    });

    it("uses provided now when given", () => {
      const birth = new Date("2025-01-01T00:00:00Z").getTime();
      const now = new Date("2025-01-06T12:00:00Z").getTime();
      expect(getAgeInDays(birth, now)).toBe(5);
    });
  });

  describe("getAgeMonthsWeeks", () => {
    it("returns days for first 2 weeks", () => {
      const now = new Date("2025-02-01T12:00:00Z").getTime();
      const birth = new Date("2025-01-28T00:00:00Z").getTime();
      expect(getAgeMonthsWeeks(birth, now)).toBe("4 days");
    });

    it("returns weeks for under 1 month", () => {
      const now = new Date("2025-02-15T12:00:00Z").getTime();
      const birth = new Date("2025-01-01T00:00:00Z").getTime();
      expect(getAgeMonthsWeeks(birth, now)).toMatch(/\d+ weeks?/);
    });

    it("returns months (and weeks when non-zero) for older baby", () => {
      const now = new Date("2025-05-01T12:00:00Z").getTime();
      const birth = new Date("2025-01-01T00:00:00Z").getTime();
      expect(getAgeMonthsWeeks(birth, now)).toMatch(/\d+ month/);
    });
  });

  describe("getTargetsForAge", () => {
    it("returns newborn range for 0–7 days", () => {
      const t = getTargetsForAge(0);
      expect(t.feedsMin).toBe(8);
      expect(t.feedsMax).toBe(12);
      expect(t.sleepsMin).toBe(4);
      expect(t.sleepsMax).toBe(6);
      expect(t.diapersMin).toBe(6);
      expect(t.diapersMax).toBe(10);

      expect(getTargetsForAge(7)).toEqual(t);
    });

    it("returns 8–14 day range", () => {
      const t = getTargetsForAge(10);
      expect(t.feedsMin).toBe(8);
      expect(t.feedsMax).toBe(12);
    });

    it("returns 1–3 month range", () => {
      const t = getTargetsForAge(60);
      expect(t.feedsMin).toBe(5);
      expect(t.feedsMax).toBe(8);
      expect(t.sleepsMin).toBe(3);
      expect(t.diapersMin).toBe(4);
    });

    it("returns 3–6 month range", () => {
      const t = getTargetsForAge(120);
      expect(t.feedsMin).toBe(4);
      expect(t.feedsMax).toBe(6);
      expect(t.sleepsMax).toBe(4);
    });

    it("returns 6+ month range", () => {
      const t = getTargetsForAge(200);
      expect(t.feedsMin).toBe(3);
      expect(t.feedsMax).toBe(5);
      expect(t.sleepsMin).toBe(1);
      expect(t.sleepsMax).toBe(2);
    });

    it("returns same bucket for 365+ days", () => {
      const t = getTargetsForAge(400);
      expect(t.feedsMin).toBe(3);
      expect(t.diapersMax).toBe(6);
    });
  });

  describe("DEFAULT_MILESTONES", () => {
    it("has required fields on each milestone", () => {
      for (const m of DEFAULT_MILESTONES) {
        expect(m).toHaveProperty("id");
        expect(m).toHaveProperty("label");
        expect(m).toHaveProperty("typicalDaysMin");
        expect(m).toHaveProperty("typicalDaysMax");
        expect(typeof m.id).toBe("string");
        expect(typeof m.label).toBe("string");
        expect(typeof m.typicalDaysMin).toBe("number");
        expect(typeof m.typicalDaysMax).toBe("number");
        expect(m.typicalDaysMin).toBeLessThanOrEqual(m.typicalDaysMax);
      }
    });

    it("has stable ids for merging", () => {
      const ids = DEFAULT_MILESTONES.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
