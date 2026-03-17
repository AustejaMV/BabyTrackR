import { describe, it, expect } from "vitest";
import { getParentAcknowledgement } from "./parentAcknowledgement";

describe("getParentAcknowledgement", () => {
  const stats = { feedCount: 6, sleepTotalMinutes: 420, diaperCount: 8, tummyMinutes: 15 };

  it("returns non-empty string", () => {
    expect(getParentAcknowledgement(null, stats).length).toBeGreaterThan(0);
  });

  it("can include parent name when provided", () => {
    const withName = getParentAcknowledgement("Jane", stats);
    const withoutName = getParentAcknowledgement(null, stats);
    expect(withName).toBeTruthy();
    expect(withoutName).toBeTruthy();
  });
});
