import { describe, it, expect, beforeEach } from "vitest";
import { generateGPSummary } from "./gpSummary";

describe("generateGPSummary", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns overview with baby name and sections", () => {
    localStorage.setItem("babyProfile", JSON.stringify({ birthDate: Date.now() - 30 * 24 * 60 * 60 * 1000, name: "Test" }));
    localStorage.setItem("sleepHistory", JSON.stringify([]));
    localStorage.setItem("feedingHistory", JSON.stringify([]));
    localStorage.setItem("diaperHistory", JSON.stringify([]));
    localStorage.setItem("tummyTimeHistory", JSON.stringify([]));
    const s = generateGPSummary(14);
    expect(s.babyName).toBe("Test");
    expect(s.sections.length).toBeGreaterThan(0);
    expect(s.sections.some((sec) => sec.title === "Overview")).toBe(true);
    expect(s.sections.some((sec) => sec.title === "Sleep")).toBe(true);
  });

  it("computes age in weeks when birthDate set", () => {
    const birthDate = Date.now() - 14 * 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("babyProfile", JSON.stringify({ birthDate, name: "B" }));
    localStorage.setItem("sleepHistory", JSON.stringify([]));
    localStorage.setItem("feedingHistory", JSON.stringify([]));
    localStorage.setItem("diaperHistory", JSON.stringify([]));
    localStorage.setItem("tummyTimeHistory", JSON.stringify([]));
    const s = generateGPSummary(14);
    expect(s.ageWeeks).toBe(14);
  });
});
