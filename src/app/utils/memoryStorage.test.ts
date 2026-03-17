/**
 * Tests for memory book storage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getMemoryDays,
  saveMemoryDay,
  getMemoryDayForDate,
  deleteMemoryDay,
  getMonthlyRecaps,
  saveMonthlyRecap,
  getMonthlyRecapFor,
  deleteMonthlyRecap,
} from "./memoryStorage";

const DAYS_KEY = "memoryDays";
const RECAPS_KEY = "memoryMonthlyRecaps";

describe("memoryStorage", () => {
  beforeEach(() => {
    localStorage.removeItem(DAYS_KEY);
    localStorage.removeItem(RECAPS_KEY);
  });

  describe("day entries", () => {
    it("saves and returns day entry", () => {
      const entry = saveMemoryDay({ date: "2025-03-15", note: "First smile!" });
      expect(entry.id).toBeTruthy();
      expect(entry.date).toBe("2025-03-15");
      expect(entry.note).toBe("First smile!");
      expect(getMemoryDays()).toHaveLength(1);
      expect(getMemoryDayForDate("2025-03-15")?.note).toBe("First smile!");
    });

    it("replaces entry for same date", () => {
      saveMemoryDay({ date: "2025-03-15", note: "Old" });
      saveMemoryDay({ date: "2025-03-15", note: "New" });
      const days = getMemoryDays();
      expect(days).toHaveLength(1);
      expect(days[0].note).toBe("New");
    });

    it("deleteMemoryDay removes entry", () => {
      const e = saveMemoryDay({ date: "2025-03-15" });
      deleteMemoryDay(e.id);
      expect(getMemoryDays()).toHaveLength(0);
    });
  });

  describe("monthly recaps", () => {
    it("saves and returns recap", () => {
      const recap = saveMonthlyRecap({ yearMonth: "2025-03", note: "Great month." });
      expect(recap.id).toBeTruthy();
      expect(recap.yearMonth).toBe("2025-03");
      expect(getMonthlyRecaps()).toHaveLength(1);
      expect(getMonthlyRecapFor("2025-03")?.note).toBe("Great month.");
    });

    it("replaces recap for same month", () => {
      saveMonthlyRecap({ yearMonth: "2025-03", note: "Old" });
      saveMonthlyRecap({ yearMonth: "2025-03", note: "New" });
      expect(getMonthlyRecaps()).toHaveLength(1);
      expect(getMonthlyRecapFor("2025-03")?.note).toBe("New");
    });

    it("deleteMonthlyRecap removes recap", () => {
      const r = saveMonthlyRecap({ yearMonth: "2025-03", note: "x" });
      deleteMonthlyRecap(r.id);
      expect(getMonthlyRecaps()).toHaveLength(0);
    });
  });
});
