/**
 * Tests for article loader.
 */

import { describe, it, expect } from "vitest";
import { loadArticle } from "./articleLoader";

describe("loadArticle", () => {
  it("returns article content for valid id", () => {
    const a = loadArticle("four-month-sleep-regression");
    expect(a).not.toBeNull();
    expect(a!.id).toBe("four-month-sleep-regression");
    expect(a!.title).toBeTruthy();
    expect(a!.body).toBeTruthy();
    expect(a!.body.length).toBeGreaterThan(200);
  });

  it("returns null for invalid id", () => {
    expect(loadArticle("nonexistent-id")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(loadArticle("")).toBeNull();
  });

  it("returns null for whitespace-only id", () => {
    expect(loadArticle("   ")).toBeNull();
  });
});
