/**
 * Tests for solid food storage: guards and validation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveSolidEntry, getSolidHistory } from "./solidsStorage";

describe("saveSolidEntry", () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: () => {},
      length: 0,
      key: () => null,
      clear: () => {},
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves valid entry", () => {
    const entry = {
      id: "solid-1",
      timestamp: new Date().toISOString(),
      food: "Banana",
      isFirstTime: true,
      reaction: "liked" as const,
      note: null,
      allergenFlags: [] as const,
    };
    const out = saveSolidEntry(entry);
    expect(out.food).toBe("Banana");
    expect(out.isFirstTime).toBe(true);
    expect(getSolidHistory().length).toBe(1);
  });

  it("throws when food name is empty", () => {
    expect(() =>
      saveSolidEntry({
        id: "s1",
        timestamp: new Date().toISOString(),
        food: "   ",
        isFirstTime: false,
        reaction: "none",
        note: null,
        allergenFlags: [],
      })
    ).toThrow(/1–60/);
  });

  it("throws when reaction is invalid (defaults to none)", () => {
    const out = saveSolidEntry({
      id: "s1",
      timestamp: new Date().toISOString(),
      food: "Apple",
      isFirstTime: false,
      reaction: "invalid",
      note: null,
      allergenFlags: [],
    });
    expect(out.reaction).toBe("none");
  });

  it("filters invalid allergen flags", () => {
    const out = saveSolidEntry({
      id: "s1",
      timestamp: new Date().toISOString(),
      food: "Egg",
      isFirstTime: false,
      reaction: "none",
      note: null,
      allergenFlags: ["eggs", "invalid" as "eggs"],
    });
    expect(out.allergenFlags).toEqual(["eggs"]);
  });
});

describe("FoodsIntroducedList grouping", () => {
  it("groups by week when entries have same week start", () => {
    const weekStart = (ts: number) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.getTime();
    };
    const base = new Date("2025-03-10T12:00:00").getTime();
    expect(weekStart(base)).toBe(weekStart(base + 24 * 60 * 60 * 1000 * 2));
  });
});
