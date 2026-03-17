import { describe, it, expect, beforeEach } from "vitest";
import { getAppCompleteness } from "./appState";

describe("getAppCompleteness", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns hasBaby false when no babies", () => {
    const c = getAppCompleteness();
    expect(c.hasBaby).toBe(false);
    expect(c.hasDob).toBe(false);
    expect(c.hasAnyLogs).toBe(false);
  });

  it("returns hasBaby true and hasDob when baby has birthDate", () => {
    localStorage.setItem(
      "babies",
      JSON.stringify([{ id: "1", name: "Luna", birthDate: "2025-01-01" }])
    );
    localStorage.setItem("activeBabyId", "1");
    const c = getAppCompleteness();
    expect(c.hasBaby).toBe(true);
    expect(c.hasDob).toBe(true);
  });

  it("returns hasAnyLogs when feedingHistory has entries", () => {
    localStorage.setItem("babies", JSON.stringify([{ id: "1", birthDate: "2025-01-01" }]));
    localStorage.setItem("activeBabyId", "1");
    localStorage.setItem("feedingHistory", JSON.stringify([{ id: "1", timestamp: Date.now() }]));
    const c = getAppCompleteness();
    expect(c.hasAnyLogs).toBe(true);
    expect(c.feedCount).toBe(1);
  });
});
