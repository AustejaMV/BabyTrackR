/**
 * Tests for articles data: structure and content length.
 */

import { describe, it, expect } from "vitest";
import { ARTICLES, getArticleById, getAllArticles } from "./articles";

describe("articles", () => {
  it("has at least 4 articles", () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(4);
  });

  it("each article has body length > 200 chars", () => {
    for (const a of ARTICLES) {
      expect(a.body.length).toBeGreaterThan(200);
      expect(a.body).not.toContain("undefined");
    }
  });

  it("each article has id, title, excerpt, triggerConditions, lastReviewed", () => {
    for (const a of ARTICLES) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.excerpt).toBeTruthy();
      expect(Array.isArray(a.triggerConditions)).toBe(true);
      expect(a.lastReviewed).toBeTruthy();
    }
  });

  it("getArticleById returns correct article", () => {
    const a = getArticleById("four-month-sleep-regression");
    expect(a).not.toBeNull();
    expect(a!.id).toBe("four-month-sleep-regression");
  });

  it("getArticleById returns null for unknown id", () => {
    expect(getArticleById("unknown")).toBeNull();
  });

  it("getAllArticles returns all articles", () => {
    expect(getAllArticles().length).toBe(ARTICLES.length);
  });

  it("four-month-sleep-regression has ageRangeWeeks [14, 22]", () => {
    const a = getArticleById("four-month-sleep-regression");
    expect(a?.ageRangeWeeks).toEqual([14, 22]);
  });
});
