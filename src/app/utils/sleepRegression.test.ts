import { describe, it, expect } from "vitest";
import { detectSleepRegression } from "./sleepRegression";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function sleep(startDaysAgo: number, durationHours: number, endDaysAgo?: number) {
  const start = Date.now() - startDaysAgo * MS_PER_DAY;
  const end = endDaysAgo != null ? Date.now() - endDaysAgo * MS_PER_DAY : start + durationHours * 60 * 60 * 1000;
  return { id: "1", position: "Back", startTime: start, endTime: end };
}

describe("detectSleepRegression", () => {
  it("returns null when insufficient data", () => {
    expect(detectSleepRegression([], null)).toBeNull();
    expect(detectSleepRegression([sleep(1, 2), sleep(2, 2)], null)).toBeNull();
  });

  it("returns null when no significant drop or more wakes", () => {
    const history = Array.from({ length: 14 }, (_, i) => sleep(13 - i, 2));
    expect(detectSleepRegression(history, 20)).toBeNull();
  });

  it("returns result when last 7 days have much less sleep", () => {
    const prev7 = Array.from({ length: 7 }, (_, i) => sleep(13 - i, 3));
    const last7 = Array.from({ length: 7 }, (_, i) => sleep(6 - i, 0.5));
    const history = [...prev7, ...last7];
    const r = detectSleepRegression(history, 18);
    expect(r).not.toBeNull();
    expect(r!.detected).toBe(true);
    expect(r!.message.length).toBeGreaterThan(0);
  });
});
