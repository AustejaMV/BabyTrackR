import { describe, it, expect } from "vitest";
import { getReassuranceForKey, REASSURANCE_MAP } from "./reassuranceUtils";

describe("reassuranceUtils", () => {
  it("returns reassurance for known warning keys", () => {
    expect(getReassuranceForKey("no-poop")).toContain("dirty nappy");
    expect(getReassuranceForKey("feed-overdue")).toContain("timer");
    expect(getReassuranceForKey("no-sleep")).toContain("Sleep patterns");
  });

  it("returns null for unknown key", () => {
    expect(getReassuranceForKey("unknown-key")).toBeNull();
  });

  it("REASSURANCE_MAP has entries for all main warning keys", () => {
    const keys = ["no-poop", "no-sleep", "feed-overdue", "tummy-low", "feeding-due", "feeding-soon", "same-position", "no-tummy-time", "painkiller-due"];
    for (const k of keys) {
      expect(REASSURANCE_MAP[k]).toBeDefined();
      expect(REASSURANCE_MAP[k].length).toBeGreaterThan(10);
    }
  });
});
