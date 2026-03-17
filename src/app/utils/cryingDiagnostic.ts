/**
 * "Why might she be crying?" — diagnostic reasons from recent feeds, sleep, diapers, leaps.
 */

import { getWakeWindowForAge } from '../data/wakeWindows';
import { getLeapAtWeek } from '../data/leaps';

export type CryLikelihood = 'likely' | 'possible' | 'unlikely';

export interface CryReason {
  priority: number;
  reason: string;
  detail: string;
  likelihood: CryLikelihood;
  action: string;
  icon: string;
  /** drawer to open: 'feed' | 'sleep' | 'diaper' | null */
  drawer?: 'feed' | 'sleep' | 'diaper';
}

interface FeedingEntryLike {
  endTime?: number | null;
  timestamp: number;
}

interface SleepEntryLike {
  endTime?: number | null;
  startTime: number;
}

interface DiaperEntryLike {
  timestamp: number;
}

const DEFAULT_FEED_INTERVAL_MS = 3 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatDuration(ms: number): string {
  const totalMins = Math.floor(ms / (60 * 1000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function reasonHunger(
  feedingHistory: FeedingEntryLike[],
  averageFeedIntervalMs: number,
): CryReason | null {
  if (!feedingHistory?.length) return null;
  const last = feedingHistory[feedingHistory.length - 1];
  const lastEnd = last?.endTime ?? last?.timestamp;
  if (lastEnd == null || !Number.isFinite(lastEnd)) return null;
  const interval = averageFeedIntervalMs > 0 ? averageFeedIntervalMs : DEFAULT_FEED_INTERVAL_MS;
  const now = Date.now();
  const timeSinceMs = now - lastEnd;
  let likelihood: CryLikelihood = 'unlikely';
  if (timeSinceMs >= interval * 0.9) likelihood = 'likely';
  else if (timeSinceMs >= interval * 0.7) likelihood = 'possible';
  const usualStr = formatDuration(interval);
  const agoStr = formatDuration(timeSinceMs);
  return {
    priority: 1,
    reason: 'Hunger',
    detail: `Last fed ${agoStr} ago (usual interval ${usualStr})`,
    likelihood,
    action: 'Try feeding',
    icon: 'droplet',
    drawer: 'feed',
  };
}

export function reasonTired(
  sleepHistory: SleepEntryLike[],
  babyDobMs: number | null,
): CryReason | null {
  if (babyDobMs == null || !sleepHistory?.length) return null;
  const completed = sleepHistory
    .filter((s) => s.endTime != null && Number.isFinite(s.endTime))
    .sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
  const lastWake = completed[0]?.endTime;
  if (lastWake == null) return null;
  const ageInWeeks = (Date.now() - babyDobMs) / (7 * 24 * 60 * 60 * 1000);
  const window = getWakeWindowForAge(ageInWeeks);
  if (!window) return null;
  const awakeMs = Date.now() - lastWake;
  const awakeMins = awakeMs / (60 * 1000);
  let likelihood: CryLikelihood = 'unlikely';
  if (awakeMins >= window.maxMinutes) likelihood = 'likely';
  else if (awakeMins >= window.minMinutes) likelihood = 'possible';
  const agoStr = formatDuration(awakeMs);
  const detail =
    likelihood === 'likely'
      ? `Awake ${agoStr} — past nap window`
      : likelihood === 'possible'
        ? `Awake ${agoStr} — approaching nap window`
        : `Awake ${agoStr}`;
  return {
    priority: 2,
    reason: 'Tired',
    detail,
    likelihood,
    action: 'Start nap',
    icon: 'moon',
    drawer: 'sleep',
  };
}

export function reasonDiaper(diaperHistory: DiaperEntryLike[]): CryReason | null {
  if (!diaperHistory?.length) return null;
  const last = diaperHistory[diaperHistory.length - 1];
  const ts = last?.timestamp;
  if (ts == null || !Number.isFinite(ts)) return null;
  const agoMs = Date.now() - ts;
  const agoStr = formatDuration(agoMs);
  let likelihood: CryLikelihood = 'unlikely';
  if (agoMs > 2 * 60 * 60 * 1000) likelihood = 'likely';
  else if (agoMs >= 60 * 60 * 1000) likelihood = 'possible';
  return {
    priority: 3,
    reason: 'Diaper',
    detail: `Last change ${agoStr} ago`,
    likelihood,
    action: 'Check nappy',
    icon: 'baby',
    drawer: 'diaper',
  };
}

export function reasonLeap(
  babyDobMs: number | null,
  _leapData: unknown,
  nowMs: number = Date.now(),
): CryReason | null {
  if (babyDobMs == null) return null;
  const ageInWeeks = (nowMs - babyDobMs) / (7 * 24 * 60 * 60 * 1000);
  const leap = getLeapAtWeek(ageInWeeks);
  if (!leap) return null;
  return {
    priority: 4,
    reason: 'Developmental leap',
    detail: `Currently in Leap ${leap.leapNumber} — extra fussiness is normal this week`,
    likelihood: 'possible',
    action: 'Offer comfort',
    icon: 'sparkles',
  };
}

export function reasonGas(feedingHistory: FeedingEntryLike[]): CryReason | null {
  if (!feedingHistory?.length) return null;
  const last = feedingHistory[feedingHistory.length - 1];
  const lastEnd = last?.endTime ?? last?.timestamp;
  if (lastEnd == null || !Number.isFinite(lastEnd)) return null;
  const agoMs = Date.now() - lastEnd;
  if (agoMs > 30 * 60 * 1000) return null;
  const mins = Math.round(agoMs / (60 * 1000));
  return {
    priority: 5,
    reason: 'Wind',
    detail: `Fed ${mins}m ago — may need winding`,
    likelihood: 'possible',
    action: 'Try winding',
    icon: 'wind',
  };
}

const LIKELIHOOD_ORDER: Record<CryLikelihood, number> = { likely: 0, possible: 1, unlikely: 2 };

export interface CryingReasonsParams {
  feedingHistory: FeedingEntryLike[];
  sleepHistory: SleepEntryLike[];
  diaperHistory: DiaperEntryLike[];
  babyDob: number | null;
  leapData?: unknown;
  averageFeedIntervalMs?: number;
}

export function generateCryingReasons(params: CryingReasonsParams): CryReason[] {
  const {
    feedingHistory,
    sleepHistory,
    diaperHistory,
    babyDob,
    leapData,
    averageFeedIntervalMs,
  } = params;

  let intervalMs = averageFeedIntervalMs ?? 0;
  if (intervalMs <= 0 && feedingHistory?.length >= 10) {
    const recent = feedingHistory.slice(-10);
    const times = recent.map((f) => f.endTime ?? f.timestamp).filter(Number.isFinite) as number[];
    if (times.length >= 2) {
      let sum = 0;
      for (let i = 1; i < times.length; i++) sum += times[i]! - times[i - 1]!;
      intervalMs = sum / (times.length - 1);
    }
  }
  if (intervalMs <= 0) intervalMs = DEFAULT_FEED_INTERVAL_MS;

  const results: (CryReason | null)[] = [
    reasonHunger(feedingHistory ?? [], intervalMs),
    reasonTired(sleepHistory ?? [], babyDob),
    reasonDiaper(diaperHistory ?? []),
    reasonLeap(babyDob, leapData),
    reasonGas(feedingHistory ?? []),
  ];

  const reasons = results.filter((r): r is CryReason => r != null);
  reasons.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return LIKELIHOOD_ORDER[a.likelihood] - LIKELIHOOD_ORDER[b.likelihood];
  });
  return reasons;
}
