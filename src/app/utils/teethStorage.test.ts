/**
 * Tests for tooth storage and expected teeth.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveToothRecord, getToothHistory, removeToothRecord } from "./teethStorage";
import { getExpectedTeeth } from "../data/teethData";

describe("saveToothRecord", () => {
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

  it("saves valid tooth record", () => {
    const out = saveToothRecord({
      toothId: "lower-left-central",
      eruptedAt: "2025-06-01",
      note: null,
    });
    expect(out.toothId).toBe("lower-left-central");
    expect(out.eruptedAt).toBe("2025-06-01");
    expect(getToothHistory().length).toBe(1);
  });

  it("throws when toothId is invalid", () => {
    expect(() =>
      saveToothRecord({
        toothId: "invalid-tooth",
        eruptedAt: "2025-06-01",
        note: null,
      })
    ).toThrow(/Unknown tooth/);
  });

  it("allows future date for eruptedAt", () => {
    const future = "2030-01-15";
    const out = saveToothRecord({
      toothId: "upper-left-central",
      eruptedAt: future,
      note: null,
    });
    expect(out.eruptedAt).toMatch(/2030-01-15/);
  });

  it("throws when eruptedAt is empty", () => {
    expect(() =>
      saveToothRecord({
        toothId: "upper-left-central",
        eruptedAt: "",
        note: null,
      })
    ).toThrow(/eruptedAt/);
  });
});

describe("removeToothRecord", () => {
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

  it("throws when toothId is unknown", () => {
    expect(() => removeToothRecord("no-such-tooth")).toThrow(/Unknown tooth/);
  });
});

describe("getExpectedTeeth", () => {
  it("returns central incisors expected soon at age 24 weeks (within 4 weeks of 25)", () => {
    const teeth = getExpectedTeeth(24);
    const centrals = teeth.filter((t) => t.label.includes("central incisor"));
    expect(teeth.length).toBeGreaterThan(0);
    expect(centrals.some((t) => t.typicalWeeksMin === 25)).toBe(true);
  });

  it("returns first molars expected soon at age 51 weeks (within 4 weeks of 52)", () => {
    const teeth = getExpectedTeeth(51);
    const molars = teeth.filter((t) => t.label.includes("first molar"));
    expect(teeth.length).toBeGreaterThan(0);
    expect(molars.length).toBeGreaterThan(0);
  });

  it("returns empty when age 15 weeks (no teeth within 4 weeks)", () => {
    const teeth = getExpectedTeeth(15);
    expect(teeth).toEqual([]);
  });
});
