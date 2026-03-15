/**
 * Persist last breast feeding side for alternating suggestion in feed drawer.
 */

const KEY = "babytrackr-lastFeedSide";

export type LastFeedSide = "left" | "right" | "both" | null;

export function getLastFeedSide(): LastFeedSide {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "left" || raw === "right" || raw === "both") return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveLastFeedSide(side: "left" | "right" | "both"): void {
  try {
    localStorage.setItem(KEY, side);
  } catch {
    // ignore
  }
}
