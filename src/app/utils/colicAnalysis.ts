/**
 * Colic analysis engine — pattern detection, PURPLE crying, progress tracking.
 *
 * Analyses 14 days of colic episodes to detect evening clustering,
 * feed-correlation, nap-window correlation, week-on-week trends,
 * and surfaces the PURPLE crying framework at the right moment.
 */

import type { ColicEpisode } from "./colicStorage";

export interface ColicPattern {
  /** "evening" | "post-feed" | "nap-window" | "random" */
  cluster: "evening" | "post-feed" | "nap-window" | "random";
  confidence: number;
  description: string;
}

export interface WeekComparison {
  thisWeek: { count: number; totalMinutes: number; avgIntensity: number };
  lastWeek: { count: number; totalMinutes: number; avgIntensity: number };
  trend: "improving" | "stable" | "worsening";
  message: string;
}

export interface ColicInsight {
  id: string;
  type: "purple" | "progress" | "pattern" | "peak";
  title: string;
  body: string;
  tone: "supportive" | "encouraging" | "informative";
}

const HOUR = 3_600_000;
const DAY = 86_400_000;

function hourOfDay(ts: number): number {
  return new Date(ts).getHours();
}

function durationMin(ep: ColicEpisode): number {
  return Math.max(1, Math.round((ep.endTime - ep.startTime) / 60_000));
}

/**
 * Detect clustering patterns from the last 14 days of episodes.
 */
export function detectColicPatterns(episodes: ColicEpisode[]): ColicPattern[] {
  if (episodes.length < 3) return [];

  const twoWeeksAgo = Date.now() - 14 * DAY;
  const recent = episodes.filter((e) => e.startTime >= twoWeeksAgo);
  if (recent.length < 3) return [];

  const patterns: ColicPattern[] = [];
  const total = recent.length;

  const eveningCount = recent.filter((e) => {
    const h = hourOfDay(e.startTime);
    return h >= 17 && h <= 23;
  }).length;
  const eveningPct = eveningCount / total;
  if (eveningPct >= 0.5) {
    patterns.push({
      cluster: "evening",
      confidence: Math.round(eveningPct * 100),
      description: `${Math.round(eveningPct * 100)}% of crying happens between 5pm and 11pm — this is classic colic pattern.`,
    });
  }

  const postFeedCount = recent.filter((e) => e.postFeed).length;
  const postFeedPct = postFeedCount / total;
  if (postFeedPct >= 0.4) {
    patterns.push({
      cluster: "post-feed",
      confidence: Math.round(postFeedPct * 100),
      description: `${Math.round(postFeedPct * 100)}% of episodes start within 30 minutes of a feed. Could be wind or reflux-related.`,
    });
  }

  const napWindowCount = recent.filter((e) => e.inNapWindow).length;
  const napWindowPct = napWindowCount / total;
  if (napWindowPct >= 0.4) {
    patterns.push({
      cluster: "nap-window",
      confidence: Math.round(napWindowPct * 100),
      description: `${Math.round(napWindowPct * 100)}% of episodes happen during a nap window — overtiredness may be a trigger.`,
    });
  }

  if (patterns.length === 0) {
    patterns.push({
      cluster: "random",
      confidence: 0,
      description: "No strong clustering yet. Keep logging — patterns usually emerge within 7–10 days.",
    });
  }

  return patterns;
}

/**
 * Compare this week vs last week.
 */
export function compareWeeks(episodes: ColicEpisode[]): WeekComparison | null {
  const now = Date.now();
  const thisWeekStart = now - 7 * DAY;
  const lastWeekStart = now - 14 * DAY;

  const thisWeek = episodes.filter((e) => e.startTime >= thisWeekStart);
  const lastWeek = episodes.filter((e) => e.startTime >= lastWeekStart && e.startTime < thisWeekStart);

  if (lastWeek.length === 0 && thisWeek.length === 0) return null;
  if (lastWeek.length === 0) return null;

  const stats = (list: ColicEpisode[]) => ({
    count: list.length,
    totalMinutes: list.reduce((s, e) => s + durationMin(e), 0),
    avgIntensity: list.length > 0 ? +(list.reduce((s, e) => s + e.intensity, 0) / list.length).toFixed(1) : 0,
  });

  const tw = stats(thisWeek);
  const lw = stats(lastWeek);

  let trend: WeekComparison["trend"] = "stable";
  let message: string;

  const countChange = lw.count > 0 ? (tw.count - lw.count) / lw.count : 0;
  const minuteChange = lw.totalMinutes > 0 ? (tw.totalMinutes - lw.totalMinutes) / lw.totalMinutes : 0;

  if (countChange <= -0.25 || minuteChange <= -0.25) {
    trend = "improving";
    const pct = Math.abs(Math.round(Math.min(countChange, minuteChange) * 100));
    message = `It's getting better — episodes are down ~${pct}% from last week. You're past the hardest part.`;
  } else if (countChange >= 0.25 || minuteChange >= 0.25) {
    trend = "worsening";
    message = "This week has been tougher. This is normal — colic peaks around 6 weeks and almost always improves by 12 weeks. You are not doing anything wrong.";
  } else {
    trend = "stable";
    message = "About the same as last week. Colic tends to peak around 6 weeks and ease by 12 weeks. Hang in there.";
  }

  return { thisWeek: tw, lastWeek: lw, trend, message };
}

/**
 * Generate contextual insights — PURPLE framework, progress milestones, pattern explanations.
 */
export function generateColicInsights(
  episodes: ColicEpisode[],
  ageInWeeks: number,
): ColicInsight[] {
  const insights: ColicInsight[] = [];
  const twoWeeksAgo = Date.now() - 14 * DAY;
  const recent = episodes.filter((e) => e.startTime >= twoWeeksAgo);

  if (recent.length >= 2) {
    insights.push({
      id: "purple",
      type: "purple",
      title: "This is PURPLE crying",
      body: "Peak of crying · Unexpected · Resists soothing · Pain-like face · Long lasting · Evening. "
        + "This is a normal developmental phase, not something you caused. It peaks around 6–8 weeks and ends by 3–5 months.",
      tone: "supportive",
    });
  }

  if (ageInWeeks >= 4 && ageInWeeks <= 8) {
    insights.push({
      id: "peak-window",
      type: "peak",
      title: "You're in the peak window",
      body: `At ${ageInWeeks} weeks, colic is typically at its most intense. This is the hardest stretch — and it means you're closer to the end than the beginning.`,
      tone: "supportive",
    });
  }

  if (ageInWeeks > 8 && ageInWeeks <= 14) {
    const comparison = compareWeeks(episodes);
    if (comparison?.trend === "improving") {
      insights.push({
        id: "past-peak",
        type: "progress",
        title: "You're past the peak",
        body: comparison.message,
        tone: "encouraging",
      });
    }
  }

  if (ageInWeeks > 14 && recent.length > 0) {
    insights.push({
      id: "late-colic",
      type: "pattern",
      title: "Still going at " + ageInWeeks + " weeks",
      body: "Most colic resolves by 12–14 weeks. If intense crying continues, it's worth mentioning to your GP or health visitor — there may be other factors like reflux or CMPA.",
      tone: "informative",
    });
  }

  const patterns = detectColicPatterns(episodes);
  for (const p of patterns) {
    if (p.cluster !== "random" && p.confidence >= 50) {
      insights.push({
        id: `pattern-${p.cluster}`,
        type: "pattern",
        title: p.cluster === "evening" ? "Classic evening colic" : p.cluster === "post-feed" ? "Feed-linked pattern" : "Overtiredness trigger",
        body: p.description,
        tone: "informative",
      });
    }
  }

  return insights;
}

/**
 * Build a 24-hour heatmap of crying intensity (for pattern visualization).
 * Returns an array of 24 values (one per hour), 0–1 normalized.
 */
export function buildHourlyHeatmap(episodes: ColicEpisode[]): number[] {
  const buckets = new Array(24).fill(0);
  const twoWeeksAgo = Date.now() - 14 * DAY;
  const recent = episodes.filter((e) => e.startTime >= twoWeeksAgo);

  for (const ep of recent) {
    const hour = hourOfDay(ep.startTime);
    buckets[hour] += durationMin(ep) * ep.intensity;
  }

  const max = Math.max(...buckets, 1);
  return buckets.map((v) => v / max);
}

/**
 * Is this crying episode likely colic, or something else?
 * Uses existing diagnostic signals.
 */
export function isColicLikely(
  episode: ColicEpisode,
  ageInWeeks: number,
): { likely: boolean; reason: string } {
  const dur = durationMin(episode);
  const hour = hourOfDay(episode.startTime);
  const isEvening = hour >= 17 && hour <= 23;

  if (ageInWeeks < 2 || ageInWeeks > 20) {
    return { likely: false, reason: "Colic typically occurs between 2–16 weeks of age." };
  }

  if (dur < 15) {
    return { likely: false, reason: "Short episode — more likely hunger, nappy, or a brief fuss." };
  }

  if (episode.intensity <= 2) {
    return { likely: false, reason: "Low intensity — colic crying is usually intense and hard to soothe." };
  }

  if (isEvening && dur >= 20 && episode.intensity >= 3) {
    return { likely: true, reason: "Evening timing, sustained duration, high intensity — consistent with colic." };
  }

  if (dur >= 30 && episode.intensity >= 4) {
    return { likely: true, reason: "Long, intense episode that resists soothing — consistent with colic." };
  }

  if (episode.postFeed && dur >= 15) {
    return { likely: false, reason: "Starts after a feed — could be wind, reflux, or overfeeding rather than colic." };
  }

  if (episode.inNapWindow) {
    return { likely: false, reason: "Coincides with a nap window — overtiredness is the more likely cause." };
  }

  return { likely: true, reason: "Sustained crying that resists soothing — consistent with colic." };
}
