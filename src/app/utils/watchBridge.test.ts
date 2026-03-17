import { describe, it, expect } from "vitest";
import { getWatchState, updateWatchState, type WatchState } from "./watchBridge";

describe("watchBridge", () => {
  it("getWatchState returns default state", () => {
    const state = getWatchState();
    expect(state).toEqual({
      lastFeedAt: null,
      feedDueInMinutes: null,
      napWindowOpen: false,
      napClosesInMinutes: null,
      lastDiaperAt: null,
    });
  });

  it("updateWatchState is a no-op and does not throw", () => {
    expect(() => updateWatchState({ lastFeedAt: Date.now() })).not.toThrow();
  });

  it("getWatchState returns independent copy", () => {
    const a = getWatchState();
    const b = getWatchState();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
