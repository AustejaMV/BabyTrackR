/**
 * Tests for developmental leaps (Wonder Weeks).
 */
import { describe, it, expect } from "vitest";
import { getLeapAtWeek, getNextLeap, isInLeap, getFreePreviewText } from "./leaps";

describe("getLeapAtWeek", () => {
  it("returns Leap 1 at week 4.5", () => {
    const leap = getLeapAtWeek(4.5);
    expect(leap).not.toBeNull();
    expect(leap!.leapNumber).toBe(1);
  });

  it("returns null at week 3", () => {
    expect(getLeapAtWeek(3)).toBeNull();
  });
});

describe("getNextLeap", () => {
  it("returns Leap 2 when at week 6", () => {
    const next = getNextLeap(6);
    expect(next).not.toBeNull();
    expect(next!.leap.leapNumber).toBe(2);
    expect(next!.inDays).toBe(7); // 1 week until week 7
  });
});

describe("isInLeap", () => {
  it("returns true when in leap", () => {
    expect(isInLeap(5)).toBe(true);
  });
  it("returns false when not in leap", () => {
    expect(isInLeap(1)).toBe(false);
  });
});

describe("getFreePreviewText", () => {
  it("returns 'Currently in Leap X' when in a leap", () => {
    const text = getFreePreviewText(4.5);
    expect(text).toContain("Currently in Leap");
    expect(text).toContain("1");
  });
  it("returns 'Leap X incoming in Y days' when next leap soon", () => {
    const text = getFreePreviewText(6);
    expect(text).toMatch(/Leap \d+ incoming in \d+ days/);
  });
});
