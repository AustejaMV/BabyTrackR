import { describe, it, expect, beforeEach } from "vitest";
import {
  getWoundCareHistory,
  saveWoundCareEntry,
  getPelvicFloorHistory,
  savePelvicFloorEntry,
  getPelvicFloorForDate,
  getBreastPainHistory,
  saveBreastPainEntry,
  getEPDSResponses,
  saveEPDSResponse,
} from "./mumHealthStorage";

describe("mumHealthStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("wound care", () => {
    it("saves and returns wound care entry", () => {
      const entry = saveWoundCareEntry({
        timestamp: new Date().toISOString(),
        area: "perineal",
        notes: "ok",
        hasRedness: false,
        hasPain: true,
        painLevel: 2,
      });
      expect(entry.id).toBeDefined();
      expect(entry.area).toBe("perineal");
      expect(entry.painLevel).toBe(2);
      expect(getWoundCareHistory()).toHaveLength(1);
    });

    it("rejects painLevel outside 1-5 when hasPain", () => {
      expect(() =>
        saveWoundCareEntry({
          timestamp: new Date().toISOString(),
          area: "caesarean",
          notes: null,
          hasRedness: false,
          hasPain: true,
          painLevel: 6 as unknown as 1,
        })
      ).toThrow("1–5");
    });
  });

  describe("pelvic floor", () => {
    it("saves and updates same date", () => {
      savePelvicFloorEntry({ date: "2025-03-15", completed: true, repsCompleted: 10 });
      expect(getPelvicFloorHistory()).toHaveLength(1);
      expect(getPelvicFloorForDate("2025-03-15")?.repsCompleted).toBe(10);
      savePelvicFloorEntry({ date: "2025-03-15", completed: true, repsCompleted: 15 });
      expect(getPelvicFloorHistory()).toHaveLength(1);
      expect(getPelvicFloorForDate("2025-03-15")?.repsCompleted).toBe(15);
    });
  });

  describe("breast pain", () => {
    it("saves entry and rejects invalid severity", () => {
      saveBreastPainEntry({
        timestamp: new Date().toISOString(),
        side: "left",
        severity: 3,
        warmth: false,
        redness: false,
        notes: null,
      });
      expect(getBreastPainHistory()).toHaveLength(1);
      expect(() =>
        saveBreastPainEntry({
          timestamp: new Date().toISOString(),
          side: "right",
          severity: 10 as unknown as 1,
          warmth: false,
          redness: false,
          notes: null,
        })
      ).toThrow("1–5");
    });
  });

  describe("EPDS", () => {
    it("saves response with correct score", () => {
      const answers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const resp = saveEPDSResponse(answers);
      expect(resp.totalScore).toBe(0);
      expect(resp.flagged).toBe(false);
      expect(getEPDSResponses()).toHaveLength(1);
    });

    it("saves flagged response for high score", () => {
      const answers = Array(10).fill(2);
      const resp = saveEPDSResponse(answers);
      expect(resp.flagged).toBe(true);
    });
  });
});
