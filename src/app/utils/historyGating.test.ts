/**
 * Tests for history gating (30-day free limit).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { filterBySubscription, getDaysOfDataAvailable } from "./historyGating";

const NOW = 1700000000000; // fixed reference
const DAY_MS = 24 * 60 * 60 * 1000;

describe("filterBySubscription", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns all entries when isPremium is true", () => {
    const entries = [
      { id: "1", timestamp: NOW - 60 * DAY_MS },
      { id: "2", timestamp: NOW - 5 * DAY_MS },
    ];
    expect(filterBySubscription(entries, true)).toHaveLength(2);
  });

  it("returns only last 30 days when isPremium is false", () => {
    const entries = [
      { id: "1", timestamp: NOW - 60 * DAY_MS },
      { id: "2", timestamp: NOW - 5 * DAY_MS },
    ];
    const out = filterBySubscription(entries, false);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("2");
  });

  it("includes entries with no timestamp when not premium", () => {
    const entries = [
      { id: "1" },
      { id: "2", timestamp: NOW - 5 * DAY_MS },
    ];
    const out = filterBySubscription(entries, false);
    expect(out).toHaveLength(2);
  });

  it("handles startTime (number) for sleep-style records", () => {
    const entries = [
      { id: "1", startTime: NOW - 40 * DAY_MS },
      { id: "2", startTime: NOW - 10 * DAY_MS },
    ];
    const out = filterBySubscription(entries, false);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("2");
  });
});

describe("getDaysOfDataAvailable", () => {
  it("returns 0 for empty array", () => {
    expect(getDaysOfDataAvailable([])).toBe(0);
  });

  it("returns span in days from oldest to newest", () => {
    const entries = [
      { timestamp: NOW - 10 * DAY_MS },
      { timestamp: NOW - 2 * DAY_MS },
    ];
    expect(getDaysOfDataAvailable(entries)).toBe(8);
  });
});
