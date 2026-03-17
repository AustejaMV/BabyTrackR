import { describe, it, expect, beforeEach } from "vitest";
import { detectOverwhelmedPattern } from "./ragePattern";

function d(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe("detectOverwhelmedPattern", () => {
  beforeEach(() => {
    // no localStorage side effects in these tests
  });

  it("returns null when fewer than 3 mood entries", () => {
    expect(detectOverwhelmedPattern([{ date: d(0), mood: "great" }, { date: d(1), mood: "good" }])).toBeNull();
  });

  it("returns null when no overwhelmed entries in last 14 days", () => {
    const history = [
      { date: d(0), mood: "great" as const },
      { date: d(1), mood: "good" as const },
      { date: d(2), mood: "tired" as const },
    ];
    expect(detectOverwhelmedPattern(history)).toBeNull();
  });

  it("returns pattern when 2 overwhelmed in last week (shouldSuggestSupport false)", () => {
    const history = [
      { date: d(0), mood: "overwhelmed" as const },
      { date: d(2), mood: "overwhelmed" as const },
      { date: d(3), mood: "good" as const },
      { date: d(4), mood: "good" as const },
      { date: d(5), mood: "good" as const },
    ];
    const r = detectOverwhelmedPattern(history);
    expect(r).not.toBeNull();
    expect(r!.entriesInLastWeek).toBe(2);
    expect(r!.shouldSuggestSupport).toBe(false);
  });

  it("returns pattern with shouldSuggestSupport true when 3+ overwhelmed in last 7 days", () => {
    const history = [
      { date: d(0), mood: "overwhelmed" as const },
      { date: d(1), mood: "overwhelmed" as const },
      { date: d(2), mood: "overwhelmed" as const },
      { date: d(3), mood: "good" as const },
      { date: d(4), mood: "good" as const },
    ];
    const r = detectOverwhelmedPattern(history);
    expect(r).not.toBeNull();
    expect(r!.entriesInLastWeek).toBe(3);
    expect(r!.shouldSuggestSupport).toBe(true);
    expect(r!.message).toContain("PANDAS");
  });

  it("returns pattern with shouldSuggestSupport true when 5+ overwhelmed in last 14 days", () => {
    const history = [
      { date: d(0), mood: "overwhelmed" as const },
      { date: d(3), mood: "overwhelmed" as const },
      { date: d(5), mood: "overwhelmed" as const },
      { date: d(8), mood: "overwhelmed" as const },
      { date: d(10), mood: "overwhelmed" as const },
      { date: d(12), mood: "good" as const },
    ];
    const r = detectOverwhelmedPattern(history);
    expect(r).not.toBeNull();
    expect(r!.entriesInLast14Days).toBe(5);
    expect(r!.shouldSuggestSupport).toBe(true);
  });
});
