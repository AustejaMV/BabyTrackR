import { describe, it, expect } from "vitest";
import { analyseMumSleep } from "./mumSleepAnalysis";

function d(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe("analyseMumSleep", () => {
  it("returns null when fewer than 3 entries", () => {
    expect(analyseMumSleep([
      { id: "1", date: d(0), sleepRange: "6h_plus", loggedAt: new Date().toISOString() },
      { id: "2", date: d(1), sleepRange: "4_to_6h", loggedAt: new Date().toISOString() },
    ])).toBeNull();
  });

  it("returns summary with consecutivePoorNights from today backwards", () => {
    const history = [
      { id: "1", date: d(0), sleepRange: "under_2h" as const, loggedAt: new Date().toISOString() },
      { id: "2", date: d(1), sleepRange: "2_to_4h" as const, loggedAt: new Date().toISOString() },
      { id: "3", date: d(2), sleepRange: "2_to_4h" as const, loggedAt: new Date().toISOString() },
      { id: "4", date: d(3), sleepRange: "6h_plus" as const, loggedAt: new Date().toISOString() },
    ];
    const r = analyseMumSleep(history);
    expect(r).not.toBeNull();
    expect(r!.consecutivePoorNights).toBe(2);
    expect(r!.shouldShowSupportCard).toBe(false);
  });

  it("sets shouldShowSupportCard true when 3+ consecutive poor nights", () => {
    const history = [
      { id: "1", date: d(0), sleepRange: "under_2h" as const, loggedAt: new Date().toISOString() },
      { id: "2", date: d(1), sleepRange: "2_to_4h" as const, loggedAt: new Date().toISOString() },
      { id: "3", date: d(2), sleepRange: "under_2h" as const, loggedAt: new Date().toISOString() },
      { id: "4", date: d(3), sleepRange: "6h_plus" as const, loggedAt: new Date().toISOString() },
    ];
    const r = analyseMumSleep(history);
    expect(r).not.toBeNull();
    expect(r!.consecutivePoorNights).toBe(3);
    expect(r!.shouldShowSupportCard).toBe(true);
    expect(r!.supportMessage).toContain("nights in a row");
  });

  it("includes baby name in support message when provided", () => {
    const history = [
      { id: "1", date: d(0), sleepRange: "under_2h" as const, loggedAt: new Date().toISOString() },
      { id: "2", date: d(1), sleepRange: "under_2h" as const, loggedAt: new Date().toISOString() },
      { id: "3", date: d(2), sleepRange: "under_2h" as const, loggedAt: new Date().toISOString() },
    ];
    const r = analyseMumSleep(history, "Sky");
    expect(r).not.toBeNull();
    expect(r!.supportMessage).toContain("Sky");
  });
});
