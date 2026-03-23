import type { FeedingRecord } from "../types";

/** Average minutes between consecutive feeds in [startMs, endMs). */
export function averageMinutesBetweenFeedsInRange(
  feeds: FeedingRecord[],
  startMs: number,
  endMs: number,
): number | null {
  const windowFeeds = feeds.filter((f) => {
    const t = f.endTime ?? f.timestamp ?? 0;
    return t >= startMs && t < endMs;
  });
  if (windowFeeds.length < 2) return null;
  const sorted = [...windowFeeds].sort((a, b) => (a.endTime ?? a.timestamp ?? 0) - (b.endTime ?? b.timestamp ?? 0));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(((sorted[i].endTime ?? sorted[i].timestamp ?? 0) - (sorted[i - 1].endTime ?? sorted[i - 1].timestamp ?? 0)) / 60000);
  }
  return gaps.reduce((s, g) => s + g, 0) / gaps.length;
}
