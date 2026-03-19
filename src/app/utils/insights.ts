/**
 * Insights engine: generates personalised insight cards from tracking history.
 */

import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BottleRecord, BabyProfile } from '../types';

export type InsightType = 'sleep' | 'feed' | 'diaper' | 'tummy' | 'growth' | 'pattern';

export interface Insight {
  id: string;
  type: InsightType;
  message: string;
  detail: string | null;
  confidence: 'high' | 'medium' | 'low';
  actionable: boolean;
  icon: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS = 14 * MS_PER_DAY;
const TWENTY_EIGHT_DAYS = 28 * MS_PER_DAY;
const SEVEN_DAYS = 7 * MS_PER_DAY;

function getDayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sleepDurationMs(s: SleepRecord): number {
  const end = s.endTime ?? 0;
  if (!end || end <= s.startTime) return 0;
  return end - s.startTime - (s.excludedMs ?? 0);
}

/** Last 14 days of sleep (by endTime or startTime if no end). */
function filterLast14DaysSleep(sleepHistory: SleepRecord[], now: number): SleepRecord[] {
  if (!sleepHistory?.length) return [];
  const cutoff = now - FOURTEEN_DAYS;
  return sleepHistory.filter((s) => {
    const t = s.endTime ?? s.startTime;
    return t >= cutoff && Number.isFinite(t);
  });
}

/** Last 14 days of feeds (by endTime or timestamp). */
function filterLast14DaysFeeds(feedingHistory: FeedingRecord[], now: number): FeedingRecord[] {
  if (!feedingHistory?.length) return [];
  const cutoff = now - FOURTEEN_DAYS;
  return feedingHistory.filter((f) => {
    const t = f.endTime ?? f.timestamp;
    return t >= cutoff && Number.isFinite(t);
  });
}

export function insightLongestSleepStretch(
  sleepHistory: SleepRecord[],
  last14days: SleepRecord[],
  babyName?: string | null,
): Insight | null {
  if (!last14days?.length || last14days.length < 7) return null;
  let maxDuration = 0;
  const byHour: number[] = new Array(24).fill(0);
  for (const s of last14days) {
    const dur = sleepDurationMs(s);
    if (dur > maxDuration) maxDuration = dur;
    const start = new Date(s.startTime).getHours();
    byHour[start] = (byHour[start] ?? 0) + 1;
  }
  let maxHour = 0;
  let maxCount = 0;
  for (let h = 0; h < 24; h++) {
    if ((byHour[h] ?? 0) > maxCount) {
      maxCount = byHour[h] ?? 0;
      maxHour = h;
    }
  }
  const endHour = (maxHour + Math.round(maxDuration / (60 * 60 * 1000))) % 24;
  const h = Math.floor(maxDuration / (60 * 60 * 1000));
  const m = Math.round((maxDuration % (60 * 60 * 1000)) / (60 * 1000));
  const timeStr = `${maxHour.toString().padStart(2, '0')}:00–${endHour.toString().padStart(2, '0')}:00`;
  const bedStr = `${(maxHour - 2 + 24) % 24}:00`;
  const confidence = last14days.length >= 10 ? 'high' : 'medium';
  return {
    id: 'longest-sleep-stretch',
    type: 'sleep',
    message: `Her longest sleep stretch this week is ${h}h ${m}m, usually between ${timeStr}. Try moving bedtime to ${bedStr} to maximise this window.`,
    detail: null,
    confidence,
    actionable: true,
    icon: 'moon',
  };
}

export function insightSleepVsFeeds(
  sleepHistory: SleepRecord[],
  feedingHistory: FeedingRecord[],
  last14daysSleep: SleepRecord[],
  last14daysFeeds: FeedingRecord[],
  babyName?: string | null,
): Insight | null {
  if (!last14daysSleep?.length || !last14daysFeeds?.length) return null;
  const sleepByDay = new Map<number, number>();
  const feedsByDay = new Map<number, number>();
  const now = Date.now();
  for (let d = 0; d < 14; d++) {
    const dayStart = getDayStart(now - d * MS_PER_DAY);
    sleepByDay.set(dayStart, 0);
    feedsByDay.set(dayStart, 0);
  }
  for (const s of last14daysSleep) {
    const dayStart = getDayStart(s.endTime ?? s.startTime);
    const current = sleepByDay.get(dayStart) ?? 0;
    sleepByDay.set(dayStart, current + sleepDurationMs(s));
  }
  for (const f of last14daysFeeds) {
    const dayStart = getDayStart(f.endTime ?? f.timestamp);
    const current = feedsByDay.get(dayStart) ?? 0;
    feedsByDay.set(dayStart, current + 1);
  }
  const daysWithData = Array.from(sleepByDay.keys()).filter((day) => (sleepByDay.get(day) ?? 0) > 0);
  if (daysWithData.length < 7) return null;
  const totalSleep = daysWithData.reduce((sum, day) => sum + (sleepByDay.get(day) ?? 0), 0);
  const avgSleep = totalSleep / daysWithData.length;
  const lowSleepDays = daysWithData.filter((day) => (sleepByDay.get(day) ?? 0) < avgSleep * 0.9);
  const highSleepDays = daysWithData.filter((day) => (sleepByDay.get(day) ?? 0) >= avgSleep * 0.9);
  if (lowSleepDays.length === 0 || highSleepDays.length === 0) return null;
  const lowFeeds = lowSleepDays.reduce((sum, day) => sum + (feedsByDay.get(day) ?? 0), 0) / lowSleepDays.length;
  const highFeeds = highSleepDays.reduce((sum, day) => sum + (feedsByDay.get(day) ?? 0), 0) / highSleepDays.length;
  const diff = Math.abs(highFeeds - lowFeeds);
  if (diff < 1.5) return null;
  const lowH = Math.floor(avgSleep * 0.9 / (60 * 60 * 1000));
  const confidence = daysWithData.length >= 10 ? 'high' : 'medium';
  return {
    id: 'sleep-vs-feeds',
    type: 'pattern',
    message: `She fed ${lowFeeds.toFixed(1)} times on days with less than ${lowH}h sleep, vs ${highFeeds.toFixed(1)} times on well-rested days. More sleep = fewer feeds.`,
    detail: null,
    confidence,
    actionable: true,
    icon: 'trending-down',
  };
}

export function insightBreastBalance(
  feedingHistory: FeedingRecord[],
  last14days: FeedingRecord[],
  babyName?: string | null,
): Insight | null {
  const breastFeeds = last14days?.filter((f) => {
    const t = f.type ?? (f.segments?.some((seg) => seg.type === 'left' || seg.type === 'right') ? 'breast' : null);
    return t === 'left' || t === 'right' || (f.segments?.length && f.segments.some((s) => s.type === 'left' || s.type === 'right'));
  }) ?? [];
  if (breastFeeds.length < 20) return null;
  let leftTotalMs = 0;
  let leftCount = 0;
  let rightTotalMs = 0;
  let rightCount = 0;
  for (const f of breastFeeds) {
    if (f.segments?.length) {
      for (const seg of f.segments) {
        const dur = seg.durationMs ?? (seg.endTime && seg.startTime ? seg.endTime - seg.startTime : 0);
        if (seg.type === 'left') {
          leftTotalMs += dur;
          leftCount++;
        } else if (seg.type === 'right') {
          rightTotalMs += dur;
          rightCount++;
        }
      }
    } else {
      const dur = f.durationMs ?? (f.endTime && f.startTime ? f.endTime - f.startTime : 0);
      if (f.type === 'left') {
        leftTotalMs += dur;
        leftCount++;
      } else if (f.type === 'right') {
        rightTotalMs += dur;
        rightCount++;
      }
    }
  }
  if (leftCount < 5 || rightCount < 5) return null;
  const leftAvgMin = leftCount > 0 ? leftTotalMs / leftCount / (60 * 1000) : 0;
  const rightAvgMin = rightCount > 0 ? rightTotalMs / rightCount / (60 * 1000) : 0;
  const diff = Math.abs(leftAvgMin - rightAvgMin);
  if (diff < 3) return null;
  const leftM = Math.round(leftAvgMin);
  const rightM = Math.round(rightAvgMin);
  return {
    id: 'breast-balance',
    type: 'feed',
    message: `Left breast feeds average ${leftM}m, right average ${rightM}m. Your right supply may be lower — consider starting more feeds on the right.`,
    detail: null,
    confidence: 'medium',
    actionable: true,
    icon: 'scale',
  };
}

export function insightDiaperGap(
  diaperHistory: DiaperRecord[],
  babyName?: string | null,
): Insight | null {
  if (!diaperHistory?.length || diaperHistory.length < 5) return null;
  const now = Date.now();
  const cutoff = now - FOURTEEN_DAYS;
  const poops = diaperHistory
    .filter((d) => (d.type === 'poop' || d.type === 'both') && d.timestamp >= cutoff)
    .map((d) => d.timestamp)
    .sort((a, b) => a - b);
  if (poops.length < 2) return null;
  let maxGap = 0;
  for (let i = 1; i < poops.length; i++) {
    const gap = (poops[i]! - poops[i - 1]!) / (60 * 60 * 1000);
    if (gap > maxGap) maxGap = gap;
  }
  if (maxGap <= 24) return null;
  const name = babyName?.trim() || 'Baby';
  const confidence = maxGap > 48 ? 'high' : 'medium';
  const h = Math.round(maxGap);
  return {
    id: 'diaper-gap',
    type: 'diaper',
    message: `${name} went ${h}h without a dirty diaper this week. Worth mentioning at her next GP visit if it continues.`,
    detail: null,
    confidence,
    actionable: true,
    icon: 'alert-circle',
  };
}

export function insightWakeTimeDrift(
  sleepHistory: SleepRecord[],
  last28days: SleepRecord[],
  babyName?: string | null,
): Insight | null {
  if (!last28days?.length || last28days.length < 14) return null;
  const wakeTimes = last28days
    .filter((s) => s.endTime != null)
    .map((s) => ({ t: s.endTime!, day: getDayStart(s.endTime!) }));
  if (wakeTimes.length < 14) return null;
  const sorted = [...wakeTimes].sort((a, b) => a.t - b.t);
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const avgWake = (arr: { t: number }[]) => {
    const sum = arr.reduce((s, x) => s + new Date(x.t).getHours() * 60 + new Date(x.t).getMinutes(), 0);
    return sum / arr.length;
  };
  const avg1 = avgWake(firstHalf);
  const avg2 = avgWake(secondHalf);
  const weeks = 2;
  const driftPerWeek = (avg2 - avg1) / weeks;
  if (Math.abs(driftPerWeek) < 10) return null;
  const x = Math.round(Math.abs(driftPerWeek));
  return {
    id: 'wake-drift',
    type: 'sleep',
    message: `Her average wake time is drifting ${x} minutes later each week — she may be naturally shifting toward a later schedule.`,
    detail: null,
    confidence: 'medium',
    actionable: false,
    icon: 'clock',
  };
}

export function insightTummyTimeProgress(
  tummyHistory: TummyTimeRecord[],
  last7days: TummyTimeRecord[],
  babyName?: string | null,
): Insight | null {
  if (!last7days?.length || last7days.length < 3) return null;
  const thisWeekMs = last7days.reduce((sum, t) => {
    const end = t.endTime ?? t.startTime;
    return sum + Math.max(0, end - t.startTime - (t.excludedMs ?? 0));
  }, 0);
  const prevWeekStart = Date.now() - 14 * MS_PER_DAY;
  const prevWeek = tummyHistory?.filter((t) => {
    const start = t.startTime;
    return start >= prevWeekStart - 7 * MS_PER_DAY && start < prevWeekStart;
  }) ?? [];
  const prevWeekMs = prevWeek.reduce((sum, t) => {
    const end = t.endTime ?? t.startTime;
    return sum + Math.max(0, end - t.startTime - (t.excludedMs ?? 0));
  }, 0);
  const thisWeekMins = thisWeekMs / (60 * 1000);
  if (prevWeekMs > 0) {
    const pct = ((thisWeekMs - prevWeekMs) / prevWeekMs) * 100;
    if (pct > 20) {
      return {
        id: 'tummy-progress',
        type: 'tummy',
        message: `Great progress! Tummy time is up ${Math.round(pct)}% this week.`,
        detail: null,
        confidence: 'high',
        actionable: false,
        icon: 'trending-up',
      };
    }
  }
  if (thisWeekMins < 100) {
    return {
      id: 'tummy-low',
      type: 'tummy',
      message: `Tummy time this week was only ${Math.round(thisWeekMins)}m total. Try adding one 2-minute session after each nappy change.`,
      detail: null,
      confidence: 'high',
      actionable: true,
      icon: 'activity',
    };
  }
  return null;
}

export function insightFeedingInterval(
  feedingHistory: FeedingRecord[],
  last7days: FeedingRecord[],
  babyName?: string | null,
): Insight | null {
  if (!last7days?.length || last7days.length < 10) return null;
  const sorted = [...last7days].map((f) => f.endTime ?? f.timestamp).filter(Number.isFinite).sort((a, b) => a! - b!);
  if (sorted.length < 2) return null;
  let sumGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    sumGap += (sorted[i]! - sorted[i - 1]!) / (60 * 1000);
  }
  const avgIntervalMins = sumGap / (sorted.length - 1);
  const prevStart = Date.now() - 14 * MS_PER_DAY;
  const prevFeeds = feedingHistory?.filter((f) => {
    const t = f.endTime ?? f.timestamp;
    return t >= prevStart && t < prevStart + 7 * MS_PER_DAY;
  }) ?? [];
  if (prevFeeds.length < 2) return null;
  const prevSorted = prevFeeds.map((f) => f.endTime ?? f.timestamp).filter(Number.isFinite).sort((a, b) => a! - b!);
  let prevGap = 0;
  for (let i = 1; i < prevSorted.length; i++) {
    prevGap += (prevSorted[i]! - prevSorted[i - 1]!) / (60 * 1000);
  }
  const prevAvgMins = prevGap / (prevSorted.length - 1);
  const increase = avgIntervalMins - prevAvgMins;
  if (increase < 15) return null;
  const name = babyName?.trim() || 'Baby';
  const h = Math.floor(avgIntervalMins / 60);
  const m = Math.round(avgIntervalMins % 60);
  const ph = Math.floor(prevAvgMins / 60);
  const pm = Math.round(prevAvgMins % 60);
  return {
    id: 'feeding-interval',
    type: 'feed',
    message: `${name}'s feeds are spacing out — average interval is now ${h}h ${m}m, up from ${ph}h ${pm}m last week. This is a sign of growing capacity.`,
    detail: null,
    confidence: 'medium',
    actionable: false,
    icon: 'clock',
  };
}

export function insightShortNapPattern(
  sleepHistory: SleepRecord[],
  babyName?: string | null,
): Insight | null {
  if (!sleepHistory?.length) return null;
  const naps = sleepHistory
    .filter((s) => {
      const dur = sleepDurationMs(s);
      if (dur <= 0) return false;
      const hour = new Date(s.startTime).getHours();
      return hour >= 6 && hour < 20;
    })
    .sort((a, b) => b.startTime - a.startTime);
  if (naps.length < 4) return null;
  const last4 = naps.slice(0, 4);
  const allShort = last4.every((s) => sleepDurationMs(s) < 35 * 60 * 1000);
  if (!allShort) return null;
  return {
    id: 'short-nap-pattern',
    type: 'sleep',
    message:
      'Last 4 naps all under 35 minutes. Short naps at this age often mean she\u2019s overtired going down. Try this tomorrow: start the nap routine 10\u201315 minutes earlier.',
    detail: null,
    confidence: 'high',
    actionable: true,
    icon: 'alert-triangle',
  };
}

export function insightCorrelationTummyNap(
  sleepHistory: SleepRecord[],
  tummyHistory: TummyTimeRecord[],
  babyName?: string | null,
): Insight | null {
  if (!sleepHistory?.length || !tummyHistory?.length) return null;

  const tummyByDay = new Map<number, number>();
  for (const t of tummyHistory) {
    const day = getDayStart(t.startTime);
    const dur = Math.max(0, (t.endTime ?? t.startTime) - t.startTime - (t.excludedMs ?? 0));
    tummyByDay.set(day, (tummyByDay.get(day) ?? 0) + dur);
  }

  const napByDay = new Map<number, { total: number; count: number }>();
  for (const s of sleepHistory) {
    const dur = sleepDurationMs(s);
    if (dur <= 0) continue;
    const hour = new Date(s.startTime).getHours();
    if (hour < 6 || hour >= 20) continue;
    const day = getDayStart(s.startTime);
    const entry = napByDay.get(day) ?? { total: 0, count: 0 };
    entry.total += dur;
    entry.count += 1;
    napByDay.set(day, entry);
  }

  const daysWithBoth = Array.from(napByDay.keys()).filter(
    (day) => tummyByDay.has(day) && (napByDay.get(day)?.count ?? 0) > 0,
  );
  if (daysWithBoth.length < 10) return null;

  const threshold = 20 * 60 * 1000;
  const withTummy: number[] = [];
  const withoutTummy: number[] = [];

  for (const day of daysWithBoth) {
    const napMin = (napByDay.get(day)?.total ?? 0) / (60 * 1000);
    if ((tummyByDay.get(day) ?? 0) >= threshold) {
      withTummy.push(napMin);
    } else {
      withoutTummy.push(napMin);
    }
  }

  if (withTummy.length === 0 || withoutTummy.length === 0) return null;

  const avgWith = withTummy.reduce((a, b) => a + b, 0) / withTummy.length;
  const avgWithout = withoutTummy.reduce((a, b) => a + b, 0) / withoutTummy.length;

  if (Math.abs(avgWith - avgWithout) < 15) return null;

  const x = Math.round(avgWith);
  const y = Math.round(avgWithout);
  return {
    id: 'tummy-nap-correlation',
    type: 'pattern',
    message: `Naps average ${x}m on days with 20+ min tummy time vs ${y}m without.`,
    detail: null,
    confidence: 'medium',
    actionable: true,
    icon: 'bar-chart',
  };
}

const CONF_ORDER = { high: 0, medium: 1, low: 2 };

export interface GenerateInsightsParams {
  sleepHistory: SleepRecord[];
  feedingHistory: FeedingRecord[];
  diaperHistory: DiaperRecord[];
  tummyHistory: TummyTimeRecord[];
  bottleHistory: BottleRecord[];
  babyProfile: BabyProfile | null;
  ageInWeeks: number;
}

export function generateInsights(params: GenerateInsightsParams): Insight[] {
  const {
    sleepHistory,
    feedingHistory,
    diaperHistory,
    tummyHistory,
    babyProfile,
    ageInWeeks,
  } = params;
  const now = Date.now();
  const last14Sleep = filterLast14DaysSleep(sleepHistory ?? [], now);
  const last14Feeds = filterLast14DaysFeeds(feedingHistory ?? [], now);
  const last28Sleep = (sleepHistory ?? []).filter((s) => (s.endTime ?? s.startTime) >= now - TWENTY_EIGHT_DAYS);
  const last7Tummy = (tummyHistory ?? []).filter((t) => t.startTime >= now - SEVEN_DAYS);
  const last7Feeds = (feedingHistory ?? []).filter((f) => (f.endTime ?? f.timestamp) >= now - SEVEN_DAYS);
  const name = babyProfile?.name ?? null;

  const results: (Insight | null)[] = [
    insightLongestSleepStretch(sleepHistory ?? [], last14Sleep, name),
    insightSleepVsFeeds(sleepHistory ?? [], feedingHistory ?? [], last14Sleep, last14Feeds, name),
    insightBreastBalance(feedingHistory ?? [], last14Feeds, name),
    insightDiaperGap(diaperHistory ?? [], name),
    insightWakeTimeDrift(sleepHistory ?? [], last28Sleep, name),
    insightTummyTimeProgress(tummyHistory ?? [], last7Tummy, name),
    insightFeedingInterval(feedingHistory ?? [], last7Feeds, name),
    insightShortNapPattern(sleepHistory ?? [], name),
    insightCorrelationTummyNap(sleepHistory ?? [], tummyHistory ?? [], name),
  ];

  const insights = results.filter((r): r is Insight => r != null);
  insights.sort((a, b) => CONF_ORDER[a.confidence] - CONF_ORDER[b.confidence]);
  return insights;
}
