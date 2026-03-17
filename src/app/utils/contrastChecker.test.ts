import { describe, it, expect } from "vitest";
import { getContrastRatio, meetsWCAGAA, WCAG_AA_MIN_RATIO } from "./contrastChecker";

describe("contrastChecker", () => {
  it("returns ratio 1 for same color", () => {
    expect(getContrastRatio("#000000", "#000000")).toBe(1);
    expect(getContrastRatio("#ffffff", "#ffffff")).toBe(1);
  });

  it("returns high ratio for black on white", () => {
    const r = getContrastRatio("#000000", "#ffffff");
    expect(r).toBeGreaterThan(20);
  });

  it("returns same ratio regardless of order (foreground/background)", () => {
    expect(getContrastRatio("#000", "#fff")).toBe(getContrastRatio("#fff", "#000"));
  });

  it("meetsWCAGAA is true when ratio >= 4.5", () => {
    expect(meetsWCAGAA("#000000", "#ffffff")).toBe(true);
  });

  it("meetsWCAGAA is false for low-contrast pair", () => {
    expect(meetsWCAGAA("#888888", "#ffffff")).toBe(false);
  });

  it("WCAG_AA_MIN_RATIO is 4.5", () => {
    expect(WCAG_AA_MIN_RATIO).toBe(4.5);
  });
});
