import { describe, it, expect } from "vitest";
import { computeSkinCorrelations, generateSkinInsights } from "./skinCorrelation";

const now = new Date().toISOString();

describe("computeSkinCorrelations", () => {
  it("returns empty when no triggers", () => {
    expect(computeSkinCorrelations([], [])).toEqual([]);
    expect(computeSkinCorrelations([], [{ id: "f1", timestamp: now, bodyAreas: ["face"], severity: 3, appearance: ["red"], photo: null, note: null }])).toEqual([]);
  });

  it("returns correlation per trigger with subsequentFlare when flare within window", () => {
    const triggerTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const flareTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const triggers = [
      { id: "t1", timestamp: triggerTime, triggerType: "food" as const, description: "New food", note: null },
    ];
    const flares = [
      { id: "f1", timestamp: flareTime, bodyAreas: ["face"], severity: 3, appearance: ["red"], photo: null, note: null },
    ];
    const result = computeSkinCorrelations(triggers, flares, 48);
    expect(result).toHaveLength(1);
    expect(result[0].subsequentFlare).not.toBeNull();
    expect(result[0].hoursToFlare).toBeGreaterThan(0);
    expect(result[0].hoursToFlare).toBeLessThanOrEqual(2);
  });

  it("returns coincidental when flare is after 24h", () => {
    // Flare ~35h after trigger (>24h ⇒ coincidental), still within default 48h window
    const triggerTime = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString();
    const flareTime = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const triggers = [
      { id: "t1", timestamp: triggerTime, triggerType: "product" as const, description: "Soap", note: null },
    ];
    const flares = [
      { id: "f1", timestamp: flareTime, bodyAreas: ["arms"], severity: 2, appearance: ["dry"], photo: null, note: null },
    ];
    const result = computeSkinCorrelations(triggers, flares, 48);
    expect(result[0].likelihood).toBe("coincidental");
  });
});

describe("generateSkinInsights", () => {
  it("returns empty when fewer than 5 correlations", () => {
    const correlations = [
      { trigger: { id: "t1", timestamp: now, triggerType: "food" as const, description: "X", note: null }, subsequentFlare: null, hoursToFlare: null, likelihood: "coincidental" as const },
    ];
    expect(generateSkinInsights(correlations, [], [])).toEqual([]);
  });

  it("never includes allergy or allergic in message", () => {
    const correlations = Array(6).fill(null).map((_, i) => ({
      trigger: { id: `t${i}`, timestamp: now, triggerType: "food" as const, description: "Same food", note: null },
      subsequentFlare: { id: "f1", timestamp: now, bodyAreas: ["face"], severity: 3, appearance: ["red"], photo: null, note: null },
      hoursToFlare: 2,
      likelihood: "likely" as const,
    }));
    const insights = generateSkinInsights(correlations, [], []);
    for (const i of insights) {
      expect(i.message.toLowerCase()).not.toMatch(/allergy|allergic/);
    }
  });
});
