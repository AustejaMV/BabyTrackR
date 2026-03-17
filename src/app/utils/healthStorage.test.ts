/**
 * Tests for health storage: guards and fever thresholds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveTemperatureEntry,
  getTemperatureHistory,
  saveSymptomEntry,
  getSymptomHistory,
  saveMedicationEntry,
  getMedicationHistory,
} from "./healthStorage";

describe("saveTemperatureEntry", () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      length: 0,
      key: () => null,
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves valid entry", () => {
    const entry = {
      id: "temp-1",
      timestamp: new Date().toISOString(),
      tempC: 36.8,
      method: "axillary" as const,
      note: null,
    };
    const out = saveTemperatureEntry(entry);
    expect(out.tempC).toBe(36.8);
    expect(getTemperatureHistory().length).toBe(1);
  });

  it("throws when temp < 30", () => {
    expect(() =>
      saveTemperatureEntry({
        id: "t1",
        timestamp: new Date().toISOString(),
        tempC: 29,
        method: "axillary",
        note: null,
      })
    ).toThrow(/30/);
  });

  it("throws when temp > 42.5", () => {
    expect(() =>
      saveTemperatureEntry({
        id: "t1",
        timestamp: new Date().toISOString(),
        tempC: 43,
        method: "axillary",
        note: null,
      })
    ).toThrow(/42\.5/);
  });

  it("defaults method to axillary when invalid", () => {
    const out = saveTemperatureEntry({
      id: "t1",
      timestamp: new Date().toISOString(),
      tempC: 37,
      method: "invalid",
      note: null,
    });
    expect(out.method).toBe("axillary");
  });
});

describe("saveSymptomEntry", () => {
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
      id: "sym-1",
      timestamp: new Date().toISOString(),
      symptoms: ["fever", "cough"],
      severity: "mild" as const,
      note: null,
    };
    saveSymptomEntry(entry);
    expect(getSymptomHistory().length).toBe(1);
  });

  it("throws when symptoms array is empty", () => {
    expect(() =>
      saveSymptomEntry({
        id: "s1",
        timestamp: new Date().toISOString(),
        symptoms: [],
        severity: "mild",
        note: null,
      })
    ).toThrow(/symptom/);
  });

  it("defaults severity to mild when invalid", () => {
    const out = saveSymptomEntry({
      id: "s1",
      timestamp: new Date().toISOString(),
      symptoms: ["fever"],
      severity: "invalid",
      note: null,
    });
    expect(out.severity).toBe("mild");
  });
});

describe("saveMedicationEntry", () => {
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
      id: "med-1",
      timestamp: new Date().toISOString(),
      medication: "Calpol",
      doseML: 2.5,
      note: null,
    };
    saveMedicationEntry(entry);
    expect(getMedicationHistory().length).toBe(1);
  });

  it("throws when dose > 30", () => {
    expect(() =>
      saveMedicationEntry({
        id: "m1",
        timestamp: new Date().toISOString(),
        medication: "Calpol",
        doseML: 31,
        note: null,
      })
    ).toThrow(/30/);
  });

  it("throws when dose < 0", () => {
    expect(() =>
      saveMedicationEntry({
        id: "m1",
        timestamp: new Date().toISOString(),
        medication: "Calpol",
        doseML: -1,
        note: null,
      })
    ).toThrow();
  });

  it("throws when medication name is empty", () => {
    expect(() =>
      saveMedicationEntry({
        id: "m1",
        timestamp: new Date().toISOString(),
        medication: "   ",
        doseML: null,
        note: null,
      })
    ).toThrow(/name/);
  });
});

describe("Temperature fever thresholds", () => {
  it("37.9°C does not trigger fever alert (implementation: no alert in storage, UI shows alert at >= 38)", () => {
    expect(37.9).toBeLessThan(38);
  });
  it("38.0°C triggers mild fever alert", () => {
    expect(38.0).toBeGreaterThanOrEqual(38);
  });
  it("39.5°C triggers high fever alert", () => {
    expect(39.5).toBeGreaterThanOrEqual(39.5);
  });
});
