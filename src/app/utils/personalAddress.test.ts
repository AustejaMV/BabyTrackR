import { describe, it, expect } from "vitest";
import { getGreeting } from "./personalAddress";

describe("getGreeting", () => {
  it("uses morning 5-11", () => {
    const g = getGreeting("Jane", "Baby", 8);
    expect(g).toContain("Jane");
    expect(g.toLowerCase()).toMatch(/morning|hello/);
  });

  it("uses afternoon 12-17", () => {
    const g = getGreeting("Jane", "Baby", 14);
    expect(g.toLowerCase()).toContain("afternoon");
  });

  it("uses evening 18-22", () => {
    const g = getGreeting("Jane", "Baby", 20);
    expect(g.toLowerCase()).toContain("evening");
  });

  it("uses Hi 23-4", () => {
    const g = getGreeting("Jane", "Baby", 2);
    expect(g).toMatch(/^Hi/);
  });

  it("works with null parentName", () => {
    const g = getGreeting(null, "Baby", 10);
    expect(g).toBeTruthy();
    expect(g).not.toContain("null");
  });

  it("works with null babyName", () => {
    const g = getGreeting("Jane", null, 10);
    expect(g).toBeTruthy();
  });
});
