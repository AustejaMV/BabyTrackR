import { describe, it, expect } from "vitest";
import { scoreEPDS } from "./epdsScoring";

describe("scoreEPDS", () => {
  it("requires exactly 10 answers", () => {
    expect(() => scoreEPDS([])).toThrow("exactly 10 answers");
    expect(() => scoreEPDS([0, 1, 2])).toThrow("exactly 10 answers");
    expect(() => scoreEPDS(Array(12).fill(0))).toThrow("exactly 10 answers");
  });

  it("requires each answer 0-3 integer", () => {
    expect(() => scoreEPDS([0, 1, 2, 3, 0, 1, 2, 3, -1, 0])).toThrow("0, 1, 2, or 3");
    expect(() => scoreEPDS([0, 1, 2, 3, 0, 1, 2, 4, 0, 0])).toThrow("0, 1, 2, or 3");
    expect(() => scoreEPDS([0, 1, 2, 3, 0, 1, 2, 3, 0.5, 0])).toThrow("0, 1, 2, or 3");
  });

  it("scores all zeros as 0, not flagged", () => {
    const r = scoreEPDS(Array(10).fill(0));
    expect(r.total).toBe(0);
    expect(r.flagged).toBe(false);
    expect(r.severity).toBe("none");
  });

  it("scores high when all answers are maximum (3)", () => {
    const allHigh = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    const r = scoreEPDS(allHigh);
    expect(r.total).toBe(30);
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe("high");
  });

  it("sums item scores directly", () => {
    const normal = [3, 3, 0, 3, 0, 0, 0, 3, 3, 3];
    const r = scoreEPDS(normal);
    expect(r.total).toBe(18);
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThanOrEqual(30);
  });

  it("flags at 13+", () => {
    const low = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(scoreEPDS(low).flagged).toBe(false);
    const at13 = [2, 2, 2, 2, 2, 1, 1, 1, 0, 0];
    const r = scoreEPDS(at13);
    expect(r.total).toBe(13);
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe("moderate");
  });

  it("severity: none < 10, mild 10-12, moderate 13-14, high 15+", () => {
    expect(scoreEPDS(Array(10).fill(0)).severity).toBe("none");
    expect(scoreEPDS(Array(10).fill(1)).severity).toBe("mild");
    expect(scoreEPDS([2, 2, 2, 2, 2, 1, 1, 1, 0, 0]).severity).toBe("moderate");
    expect(scoreEPDS(Array(10).fill(2)).severity).toBe("high");
  });
});
