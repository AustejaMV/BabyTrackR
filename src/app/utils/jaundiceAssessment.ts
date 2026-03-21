/**
 * Jaundice assessment per NICE NG98 (simplified for parent tracking).
 * Not a substitute for clinical assessment — prompts when to seek care.
 */

import type { JaundiceSkinCheck, JaundiceAlert } from "../types/jaundice";
import type { FeedingRecord } from "../types";

const HOURS_PER_DAY = 24;
const DAYS_JAUNDICE_WATCH = 21;

export function isJaundiceMonitoringActive(babyDob: number | string | null): boolean {
  if (babyDob == null) return false;
  const dobMs = typeof babyDob === "number" ? babyDob : new Date(babyDob).getTime();
  if (!Number.isFinite(dobMs)) return false;
  const ageDays = (Date.now() - dobMs) / (HOURS_PER_DAY * 60 * 60 * 1000);
  return ageDays >= 0 && ageDays < DAYS_JAUNDICE_WATCH;
}

export function getJaundiceAgeDays(babyDob: number | string | null): number | null {
  if (babyDob == null) return null;
  const dobMs = typeof babyDob === "number" ? babyDob : new Date(babyDob).getTime();
  if (!Number.isFinite(dobMs)) return null;
  return Math.floor((Date.now() - dobMs) / (HOURS_PER_DAY * 60 * 60 * 1000));
}

/**
 * Assess a single skin check. babyAgeHours = age in hours at time of check (or now).
 */
export function assessJaundice(check: JaundiceSkinCheck, babyAgeHours: number): JaundiceAlert {
  const ageHours = Math.max(0, babyAgeHours);
  const ageDays = ageHours / HOURS_PER_DAY;

  if (check.colour === "no_yellow") {
    return {
      level: "none",
      message: "No yellowing seen. Keep feeding well and check again if you notice any change.",
      showDialler: false,
      daylightWarning: true,
    };
  }

  if (check.colour === "slight_face" || check.colour === "slight_chest" || check.colour === "slight_belly") {
    if (ageHours < 24) {
      return {
        level: "monitor",
        message: "Slight yellowing in the first 24 hours — this can be normal, but your midwife or health visitor should be aware. Keep feeding frequently and check again in good daylight.",
        showDialler: false,
        daylightWarning: true,
      };
    }
    return {
      level: "monitor",
      message: "Some yellowing noted. Keep feeding well and check again in natural daylight. If it spreads to arms and legs or baby is sleepy or not feeding well, contact your midwife or your local health advice line.",
      showDialler: false,
      daylightWarning: true,
    };
  }

  if (check.colour === "yellow_arms_legs") {
    return {
      level: "call_midwife",
      message: "Yellowing has reached the arms and legs. Contact your midwife or call your local health advice line today for advice.",
      showDialler: true,
      daylightWarning: true,
    };
  }

  if (check.colour === "yellow_palms_soles") {
    return {
      level: "urgent",
      message: "Yellowing on palms or soles needs assessment. Call your local health advice line or contact your midwife or doctor today.",
      showDialler: true,
      daylightWarning: true,
    };
  }

  return {
    level: "monitor",
    message: "Keep feeding well and check again in good natural light. If you're worried, contact your midwife or your local health advice line.",
    showDialler: false,
    daylightWarning: true,
  };
}

/**
 * Count feeds (by start time) in the last 24 hours from a given timestamp.
 */
export function computeJaundiceFeeds(
  feedingHistory: FeedingRecord[],
  sinceMs: number = Date.now() - 24 * 60 * 60 * 1000
): number {
  if (!Array.isArray(feedingHistory)) return 0;
  const cutoff = sinceMs - 24 * 60 * 60 * 1000;
  return feedingHistory.filter((f) => (f.timestamp ?? f.startTime ?? 0) >= cutoff).length;
}
