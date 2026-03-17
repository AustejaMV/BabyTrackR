/**
 * Tests for article trigger logic.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { checkArticleTriggers, buildActiveTriggers, markArticleDismissed } from "./articleTrigger";

const DISMISSED_KEY = "cradl-dismissed-articles";

describe("buildActiveTriggers", () => {
  it("returns no_poop_alert when warnings include no-poop", () => {
    const t = buildActiveTriggers({ warnings: ["no-poop"] });
    expect(t).toContain("no_poop_alert");
  });

  it("returns sleep_regression_detected when regression detected", () => {
    const t = buildActiveTriggers({ sleepRegressionDetected: true });
    expect(t).toContain("sleep_regression_detected");
  });

  it("returns first_app_open when firstAppOpen true", () => {
    const t = buildActiveTriggers({ firstAppOpen: true });
    expect(t).toContain("first_app_open");
  });

  it("returns empty when nothing active", () => {
    expect(buildActiveTriggers({})).toEqual([]);
  });
});

describe("checkArticleTriggers", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch {}
  });

  it("returns empty when no triggers", () => {
    const out = checkArticleTriggers({ activeTriggers: [], ageInWeeks: 20 });
    expect(out).toEqual([]);
  });

  it("returns four-month-sleep-regression when sleep_regression_detected and age in range", () => {
    const out = checkArticleTriggers({
      activeTriggers: ["sleep_regression_detected"],
      ageInWeeks: 18,
    });
    expect(out.some((a) => a.id === "four-month-sleep-regression")).toBe(true);
  });

  it("returns no-dirty-nappy when no_poop_alert", () => {
    const out = checkArticleTriggers({
      activeTriggers: ["no_poop_alert"],
      ageInWeeks: 10,
    });
    expect(out.some((a) => a.id === "no-dirty-nappy")).toBe(true);
  });

  it("returns safe-sleep-guide when first_app_open", () => {
    const out = checkArticleTriggers({
      activeTriggers: ["first_app_open"],
      ageInWeeks: 4,
    });
    expect(out.some((a) => a.id === "safe-sleep-guide")).toBe(true);
  });

  it("excludes article when age out of range", () => {
    const out = checkArticleTriggers({
      activeTriggers: ["sleep_regression_detected"],
      ageInWeeks: 50,
    });
    expect(out.some((a) => a.id === "four-month-sleep-regression")).toBe(false);
  });

  it("returns at most 2 articles", () => {
    const out = checkArticleTriggers({
      activeTriggers: ["no_poop_alert", "sleep_regression_detected", "first_app_open", "nap_window_passed_by_30min", "diaper_colour_green_logged"],
      ageInWeeks: 16,
    });
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it("excludes recently dismissed article", () => {
    markArticleDismissed("no-dirty-nappy");
    const out = checkArticleTriggers({
      activeTriggers: ["no_poop_alert"],
      ageInWeeks: 10,
    });
    expect(out.some((a) => a.id === "no-dirty-nappy")).toBe(false);
  });

  it("returns empty when ageInWeeks is invalid", () => {
    expect(checkArticleTriggers({ activeTriggers: ["no_poop_alert"], ageInWeeks: -1 })).toEqual([]);
  });
});
