import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNightPingConsent,
  setNightPingConsent,
  formatNightCount,
  NIGHT_PING_CONSENT_KEY,
} from "./villageApi";

describe("villageApi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getNightPingConsent / setNightPingConsent", () => {
    it("returns false when not set", () => {
      expect(getNightPingConsent()).toBe(false);
    });
    it("returns true after setNightPingConsent(true)", () => {
      setNightPingConsent(true);
      expect(getNightPingConsent()).toBe(true);
    });
    it("returns false after setNightPingConsent(false)", () => {
      setNightPingConsent(true);
      setNightPingConsent(false);
      expect(getNightPingConsent()).toBe(false);
    });
    it("stores under NIGHT_PING_CONSENT_KEY", () => {
      setNightPingConsent(true);
      expect(localStorage.getItem(NIGHT_PING_CONSENT_KEY)).toBe("true");
    });
  });

  describe("formatNightCount", () => {
    it("returns empty string for 0 or negative", () => {
      expect(formatNightCount(0)).toBe("");
      expect(formatNightCount(-1)).toBe("");
    });
    it("returns exact number for 1–5", () => {
      expect(formatNightCount(1)).toBe("1");
      expect(formatNightCount(5)).toBe("5");
    });
    it('returns "A few" for 6–20', () => {
      expect(formatNightCount(6)).toBe("A few");
      expect(formatNightCount(20)).toBe("A few");
    });
    it('returns "Many" for 21–50', () => {
      expect(formatNightCount(21)).toBe("Many");
      expect(formatNightCount(50)).toBe("Many");
    });
    it('returns "Lots of" for 51+', () => {
      expect(formatNightCount(51)).toBe("Lots of");
      expect(formatNightCount(999)).toBe("Lots of");
    });
  });
});
