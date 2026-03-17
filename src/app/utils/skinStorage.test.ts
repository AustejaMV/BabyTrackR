import { describe, it, expect, beforeEach } from "vitest";
import { getSkinFlares, saveSkinFlare, getSkinCreams, saveSkinCream, getSkinTriggers, saveSkinTrigger } from "./skinStorage";

describe("skinStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("saveSkinFlare", () => {
    it("saves valid flare and returns entry with id", () => {
      const entry = saveSkinFlare({
        timestamp: new Date().toISOString(),
        bodyAreas: ["face", "arms"],
        severity: 3,
        appearance: ["red", "dry"],
        photo: null,
        note: "Test note",
      });
      expect(entry.id).toMatch(/^flare_/);
      expect(entry.severity).toBe(3);
      expect(entry.bodyAreas).toEqual(["face", "arms"]);
      expect(getSkinFlares()).toHaveLength(1);
    });

    it("throws when severity out of range", () => {
      expect(() =>
        saveSkinFlare({
          timestamp: new Date().toISOString(),
          bodyAreas: ["face"],
          severity: 0 as any,
          appearance: ["red"],
          photo: null,
          note: null,
        })
      ).toThrow("severity");
      expect(() =>
        saveSkinFlare({
          timestamp: new Date().toISOString(),
          bodyAreas: ["face"],
          severity: 6 as any,
          appearance: ["red"],
          photo: null,
          note: null,
        })
      ).toThrow("severity");
    });

    it("throws when bodyAreas empty", () => {
      expect(() =>
        saveSkinFlare({
          timestamp: new Date().toISOString(),
          bodyAreas: [],
          severity: 1,
          appearance: ["red"],
          photo: null,
          note: null,
        })
      ).toThrow("bodyAreas");
    });

    it("throws when appearance invalid", () => {
      expect(() =>
        saveSkinFlare({
          timestamp: new Date().toISOString(),
          bodyAreas: ["face"],
          severity: 1,
          appearance: ["invalid" as any],
          photo: null,
          note: null,
        })
      ).toThrow("appearance");
    });
  });

  describe("saveSkinCream", () => {
    it("saves valid cream", () => {
      const entry = saveSkinCream({
        timestamp: new Date().toISOString(),
        product: "E45",
        bodyAreas: ["arms", "legs"],
        note: null,
      });
      expect(entry.id).toMatch(/^cream_/);
      expect(entry.product).toBe("E45");
      expect(getSkinCreams()).toHaveLength(1);
    });

    it("throws when product empty", () => {
      expect(() =>
        saveSkinCream({
          timestamp: new Date().toISOString(),
          product: "   ",
          bodyAreas: ["face"],
          note: null,
        })
      ).toThrow("product");
    });

    it("truncates product to 60 chars", () => {
      const long = "A".repeat(80);
      saveSkinCream({
        timestamp: new Date().toISOString(),
        product: long,
        bodyAreas: ["face"],
        note: null,
      });
      expect(getSkinCreams()[0].product).toHaveLength(60);
    });
  });

  describe("saveSkinTrigger", () => {
    it("saves valid trigger", () => {
      const entry = saveSkinTrigger({
        timestamp: new Date().toISOString(),
        triggerType: "food",
        description: "Strawberries",
        note: null,
      });
      expect(entry.id).toMatch(/^trigger_/);
      expect(entry.triggerType).toBe("food");
      expect(entry.description).toBe("Strawberries");
      expect(getSkinTriggers()).toHaveLength(1);
    });

    it("throws when triggerType invalid", () => {
      expect(() =>
        saveSkinTrigger({
          timestamp: new Date().toISOString(),
          triggerType: "invalid" as any,
          description: "x",
          note: null,
        })
      ).toThrow("triggerType");
    });

    it("throws when description empty", () => {
      expect(() =>
        saveSkinTrigger({
          timestamp: new Date().toISOString(),
          triggerType: "product",
          description: "",
          note: null,
        })
      ).toThrow("description");
    });
  });
});
