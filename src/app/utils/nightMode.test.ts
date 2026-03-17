import { describe, it, expect, vi } from "vitest";
import { isNightHours, getNightMessage } from "./nightMode";

describe("nightMode", () => {
  it("isNightHours returns true at 23:00", () => {
    const d = new Date("2025-01-15T23:00:00");
    expect(isNightHours(d)).toBe(true);
  });

  it("isNightHours returns true at 02:30", () => {
    const d = new Date("2025-01-15T02:30:00");
    expect(isNightHours(d)).toBe(true);
  });

  it("isNightHours returns true at 05:00", () => {
    const d = new Date("2025-01-15T05:00:00");
    expect(isNightHours(d)).toBe(true);
  });

  it("isNightHours returns false at 05:01", () => {
    const d = new Date("2025-01-15T05:01:00");
    expect(isNightHours(d)).toBe(false);
  });

  it("isNightHours returns false at 12:00", () => {
    const d = new Date("2025-01-15T12:00:00");
    expect(isNightHours(d)).toBe(false);
  });

  it("isNightHours returns false at 22:59", () => {
    const d = new Date("2025-01-15T22:59:00");
    expect(isNightHours(d)).toBe(false);
  });

  it("getNightMessage returns a string", () => {
    const msg = getNightMessage();
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("getNightMessage never returns undefined or empty string", () => {
    for (let i = 0; i < 30; i++) {
      const msg = getNightMessage(Date.now() + i * 60_000);
      expect(msg).toBeDefined();
      expect(msg).not.toBe("");
    }
  });

  it("getNightMessage returns different strings across different minute buckets", () => {
    const seen = new Set<string>();
    for (let bucket = 0; bucket < 25; bucket++) {
      const ms = bucket * 60_000;
      const msg = getNightMessage(ms);
      seen.add(msg);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
