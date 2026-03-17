import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCSV,
  formatDateForCSV,
  formatDurationForCSV,
  generateAllCSVs,
} from "./csvExport";

describe("csvExport", () => {
  describe("generateCSV", () => {
    it("joins headers and rows with commas", () => {
      const out = generateCSV(["A", "B"], [["1", "2"], ["3", "4"]]);
      expect(out).toContain("A,B");
      expect(out).toContain("1,2");
      expect(out).toContain("3,4");
    });

    it("escapes cells that contain commas", () => {
      const out = generateCSV(["Title"], [["Hello, world"]]);
      expect(out).toContain('"Hello, world"');
    });

    it("doubles quotes inside quoted cells", () => {
      const out = generateCSV(["Note"], [['Say "hi"']]);
      expect(out).toContain('"Say ""hi"""');
    });

    it("prepends quote for CSV injection (=+-@)", () => {
      const out = generateCSV(["Formula"], [["=SUM(A1)"], ["+1"], ["-2"], ["@mention"]]);
      expect(out).toContain("'=SUM(A1)");
      expect(out).toContain("'+1");
      expect(out).toContain("'-2");
      expect(out).toContain("'@mention");
    });
  });

  describe("formatDateForCSV", () => {
    it("formats date only when mode is date", () => {
      const d = new Date("2025-03-15T14:30:00Z");
      expect(formatDateForCSV(d.getTime(), "date")).toMatch(/2025-03-15/);
    });

    it("formats date and time when mode is datetime", () => {
      const d = new Date("2025-03-15T14:30:00Z");
      const out = formatDateForCSV(d.getTime(), "datetime");
      expect(out).toContain("2025-03-15");
      expect(out).toContain("14");
    });
  });

  describe("formatDurationForCSV", () => {
    it("formats minutes under 60 as Xm", () => {
      expect(formatDurationForCSV(30 * 60 * 1000)).toBe("30m");
    });

    it("formats hours and minutes", () => {
      expect(formatDurationForCSV(90 * 60 * 1000)).toBe("1h 30m");
    });

    it("returns 0m for zero or invalid", () => {
      expect(formatDurationForCSV(0)).toBe("0m");
    });
  });

  describe("generateAllCSVs", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("returns empty array when no data", () => {
      expect(generateAllCSVs()).toEqual([]);
    });

    it("returns feeds CSV when feedingHistory exists", () => {
      localStorage.setItem(
        "feedingHistory",
        JSON.stringify([
          { id: "1", timestamp: 1710000000000, type: "Left breast", durationMs: 600000 },
        ])
      );
      const out = generateAllCSVs("Test");
      expect(out.length).toBeGreaterThanOrEqual(1);
      const feeds = out.find((o) => o.filename.startsWith("feeds"));
      expect(feeds).toBeDefined();
      expect(feeds!.content).toContain("Date");
      expect(feeds!.content).toContain("Left breast");
    });

    it("includes baby name in filename", () => {
      localStorage.setItem(
        "sleepHistory",
        JSON.stringify([{ id: "1", startTime: 1710000000000, endTime: 1710003600000 }])
      );
      const out = generateAllCSVs("Baby Luna");
      const sleep = out.find((o) => o.filename.includes("sleep"));
      expect(sleep?.filename).toContain("Baby-Luna");
    });
  });
});
