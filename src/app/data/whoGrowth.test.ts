/**
 * Tests for WHO growth percentiles.
 */
import { describe, it, expect } from "vitest";
import { getWeightPercentile, getPercentile } from "./whoGrowth";

describe("getWeightPercentile", () => {
  it("returns ~50th for weight 7.5 kg at 6 months female", () => {
    const p = getWeightPercentile("girls", 6, 7.5);
    expect(p).toBeGreaterThanOrEqual(45);
    expect(p).toBeLessThanOrEqual(55);
  });

  it("returns low percentile for value below 5th", () => {
    const p = getWeightPercentile("girls", 6, 4);
    expect(p).toBeLessThanOrEqual(10);
  });

  it("returns high percentile for value above 95th", () => {
    const p = getWeightPercentile("girls", 6, 12);
    expect(p).toBeGreaterThanOrEqual(90);
  });
});

describe("getPercentile", () => {
  it("returns null for invalid age", () => {
    expect(getPercentile(7, -1, "weight", "female")).toBeNull();
    expect(getPercentile(7, 25, "weight", "female")).toBeNull();
  });

  it("returns null for value <= 0", () => {
    expect(getPercentile(0, 6, "weight", "female")).toBeNull();
    expect(getPercentile(-1, 6, "weight", "female")).toBeNull();
  });

  it("returns number for valid weight and female", () => {
    const p = getPercentile(7.3, 6, "weight", "female");
    expect(p).not.toBeNull();
    expect(typeof p).toBe("number");
  });

  it("returns number for valid weight and male", () => {
    const p = getPercentile(8, 6, "weight", "male");
    expect(p).not.toBeNull();
  });

  it("returns null for height metric (not implemented)", () => {
    expect(getPercentile(65, 6, "height", "female")).toBeNull();
  });
});
