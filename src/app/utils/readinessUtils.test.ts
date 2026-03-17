import { describe, it, expect } from "vitest";
import { generateReadinessCards } from "./readinessUtils";

describe("generateReadinessCards", () => {
  const dob = Date.now() - 30 * 7 * 24 * 60 * 60 * 1000;

  it("returns empty when no DOB", () => {
    expect(generateReadinessCards(null, {})).toEqual([]);
  });

  it("returns solids card around 6 months", () => {
    const cards = generateReadinessCards(dob, { solidsStarted: false });
    const solids = cards.find((c) => c.type === "solids");
    expect(solids).toBeDefined();
    expect(solids!.ready).toBe(false);
  });

  it("marks solids ready when solidsStarted true", () => {
    const cards = generateReadinessCards(dob, { solidsStarted: true });
    const solids = cards.find((c) => c.type === "solids");
    expect(solids?.ready).toBe(true);
  });
});
