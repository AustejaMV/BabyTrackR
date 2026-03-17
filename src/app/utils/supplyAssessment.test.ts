import { describe, it, expect } from "vitest";
import { assessSupply } from "./supplyAssessment";
import type { FeedingRecord } from "../types";

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

function feed(offsetDays: number, leftMin: number, rightMin: number): FeedingRecord {
  const t = now - offsetDays * day;
  return {
    id: "f1",
    timestamp: t,
    startTime: t,
    endTime: t + (leftMin + rightMin) * 60000,
    durationMs: (leftMin + rightMin) * 60000,
    segments: [
      { type: "Left breast", startTime: t, endTime: t + leftMin * 60000, durationMs: leftMin * 60000 },
      { type: "Right breast", startTime: t + leftMin * 60000, endTime: t + (leftMin + rightMin) * 60000, durationMs: rightMin * 60000 },
    ],
  };
}

describe("assessSupply", () => {
  it("returns low_data when fewer than 5 feeds or less than 60 min breast", () => {
    const r = assessSupply([feed(0, 5, 5), feed(1, 5, 5)], null);
    expect(r.status).toBe("low_data");
    expect(r.message).toContain("at least 5");
  });

  it("returns balanced when left and right within 15%", () => {
    const history = [
      feed(0, 20, 22),
      feed(1, 18, 20),
      feed(2, 25, 25),
      feed(3, 20, 20),
      feed(4, 22, 18),
    ];
    const r = assessSupply(history, null);
    expect(r.status).toBe("balanced");
    expect(r.message).toContain("even");
  });

  it("returns left_favoured when left total > right by more than 15%", () => {
    const history = [
      feed(0, 30, 10),
      feed(1, 28, 12),
      feed(2, 25, 15),
      feed(3, 30, 10),
      feed(4, 27, 13),
    ];
    const r = assessSupply(history, null);
    expect(r.status).toBe("left_favoured");
    expect(r.leftTotalMinutes).toBeGreaterThan(r.rightTotalMinutes);
    expect(r.message).toContain("right");
  });

  it("returns right_favoured when right total > left by more than 15%", () => {
    const history = [
      feed(0, 10, 30),
      feed(1, 12, 28),
      feed(2, 15, 25),
      feed(3, 10, 30),
      feed(4, 13, 27),
    ];
    const r = assessSupply(history, null);
    expect(r.status).toBe("right_favoured");
    expect(r.message).toContain("left");
  });
});
