/**
 * Tests for activity storage guards.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveActivityEntry, getActivityHistory } from "./activityStorage";

describe("saveActivityEntry", () => {
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
    const out = saveActivityEntry({
      id: "a1",
      timestamp: new Date().toISOString(),
      durationMinutes: 30,
      activityType: "play",
      note: null,
    });
    expect(out.durationMinutes).toBe(30);
    expect(out.activityType).toBe("play");
    expect(getActivityHistory().length).toBe(1);
  });

  it("throws when duration is 0", () => {
    expect(() =>
      saveActivityEntry({
        id: "a1",
        timestamp: new Date().toISOString(),
        durationMinutes: 0,
        activityType: "play",
        note: null,
      })
    ).toThrow(/1–300/);
  });

  it("throws when duration > 300", () => {
    expect(() =>
      saveActivityEntry({
        id: "a1",
        timestamp: new Date().toISOString(),
        durationMinutes: 400,
        activityType: "play",
        note: null,
      })
    ).toThrow(/300/);
  });

  it("defaults to play when activityType invalid", () => {
    const out = saveActivityEntry({
      id: "a1",
      timestamp: new Date().toISOString(),
      durationMinutes: 15,
      activityType: "invalid",
      note: null,
    });
    expect(out.activityType).toBe("play");
  });
});
