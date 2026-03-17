/**
 * Tests for growth storage guards.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveGrowthEntry, getGrowthHistory } from "./growthStorage";

describe("saveGrowthEntry", () => {
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

  it("saves valid entry with weight", () => {
    const date = new Date("2025-06-01").setHours(0, 0, 0, 0);
    const out = saveGrowthEntry({
      id: "g1",
      date,
      weightKg: 7.5,
      note: null,
    });
    expect(out.weightKg).toBe(7.5);
    expect(getGrowthHistory().length).toBe(1);
  });

  it("throws when weight < 0.5", () => {
    expect(() =>
      saveGrowthEntry({
        id: "g1",
        date: Date.now(),
        weightKg: 0.3,
      })
    ).toThrow(/0\.5/);
  });

  it("throws when weight > 25", () => {
    expect(() =>
      saveGrowthEntry({
        id: "g1",
        date: Date.now(),
        weightKg: 30,
      })
    ).toThrow(/25/);
  });

  it("throws when height < 30", () => {
    expect(() =>
      saveGrowthEntry({
        id: "g1",
        date: Date.now(),
        heightCm: 20,
      })
    ).toThrow(/30/);
  });

  it("throws when no measurement provided", () => {
    expect(() =>
      saveGrowthEntry({
        id: "g1",
        date: Date.now(),
      })
    ).toThrow(/At least one/);
  });

  it("accepts date as ISO string", () => {
    const out = saveGrowthEntry({
      id: "g2",
      date: "2025-07-15",
      weightKg: 8,
    });
    expect(out.date).toBeDefined();
  });
});
