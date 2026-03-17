/**
 * Tests for jaundice assessment (NICE NG98–aligned).
 */

import { describe, it, expect } from "vitest";
import {
  isJaundiceMonitoringActive,
  getJaundiceAgeDays,
  assessJaundice,
  computeJaundiceFeeds,
} from "./jaundiceAssessment";
import type { JaundiceSkinCheck } from "../types/jaundice";

const NOW = Date.now();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("isJaundiceMonitoringActive", () => {
  it("returns true when baby is under 21 days", () => {
    const dob = NOW - 10 * ONE_DAY_MS;
    expect(isJaundiceMonitoringActive(dob)).toBe(true);
  });

  it("returns false when baby is 21 days or older", () => {
    const dob = NOW - 22 * ONE_DAY_MS;
    expect(isJaundiceMonitoringActive(dob)).toBe(false);
  });

  it("returns false when babyDob is null", () => {
    expect(isJaundiceMonitoringActive(null)).toBe(false);
  });
});

describe("getJaundiceAgeDays", () => {
  it("returns correct age in days", () => {
    const dob = NOW - 5 * ONE_DAY_MS;
    expect(getJaundiceAgeDays(dob)).toBe(5);
  });

  it("returns null when babyDob is null", () => {
    expect(getJaundiceAgeDays(null)).toBeNull();
  });
});

describe("assessJaundice", () => {
  it("returns none when no_yellow", () => {
    const check: JaundiceSkinCheck = {
      id: "1",
      date: new Date().toISOString().slice(0, 10),
      colour: "no_yellow",
      areas: [],
    };
    const r = assessJaundice(check, 48);
    expect(r.level).toBe("none");
    expect(r.showDialler).toBe(false);
  });

  it("returns monitor when slight_face and age < 24h", () => {
    const check: JaundiceSkinCheck = {
      id: "1",
      date: new Date().toISOString().slice(0, 10),
      colour: "slight_face",
      areas: ["face"],
    };
    const r = assessJaundice(check, 12);
    expect(r.level).toBe("monitor");
    expect(r.showDialler).toBe(false);
  });

  it("returns call_midwife when yellow_arms_legs", () => {
    const check: JaundiceSkinCheck = {
      id: "1",
      date: new Date().toISOString().slice(0, 10),
      colour: "yellow_arms_legs",
      areas: ["face", "chest", "belly", "arms_legs"],
    };
    const r = assessJaundice(check, 72);
    expect(r.level).toBe("call_midwife");
    expect(r.showDialler).toBe(true);
  });

  it("returns urgent when yellow_palms_soles", () => {
    const check: JaundiceSkinCheck = {
      id: "1",
      date: new Date().toISOString().slice(0, 10),
      colour: "yellow_palms_soles",
      areas: ["face", "chest", "belly", "arms_legs", "palms_soles"],
    };
    const r = assessJaundice(check, 96);
    expect(r.level).toBe("urgent");
    expect(r.showDialler).toBe(true);
  });

  it("daylightWarning is true when level is not none", () => {
    const check: JaundiceSkinCheck = {
      id: "1",
      date: new Date().toISOString().slice(0, 10),
      colour: "slight_face",
      areas: ["face"],
    };
    const r = assessJaundice(check, 48);
    expect(r.daylightWarning).toBe(true);
  });
});

describe("computeJaundiceFeeds", () => {
  it("counts feeds in last 24h from default (now)", () => {
    const feeds = [
      { id: "1", timestamp: NOW - 1 * 60 * 60 * 1000 },
      { id: "2", timestamp: NOW - 5 * 60 * 60 * 1000 },
      { id: "3", timestamp: NOW - 23 * 60 * 60 * 1000 },
      { id: "4", timestamp: NOW - 25 * 60 * 60 * 1000 },
    ] as { id: string; timestamp: number }[];
    expect(computeJaundiceFeeds(feeds, NOW)).toBe(3);
  });

  it("returns 0 for empty history", () => {
    expect(computeJaundiceFeeds([])).toBe(0);
  });
});
