/**
 * Progressive feature unlock based on accumulated tracking data.
 * Features gate on log count, completed sessions, and data age.
 */

export interface UnlockStatus {
  cryingDiagnostic: boolean;
  napPredictions: boolean;
  isThisNormal: boolean;
  personalInsights: boolean;
  personalPlaybook: boolean;
}

const HISTORY_KEYS = ["feedingHistory", "sleepHistory", "diaperHistory"] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PREMIUM_KEY = "cradl-premium";
const AD_REWARD_KEY = "cradl-ad-reward-expires";

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isPremiumFromStorage(): boolean {
  try {
    const testing = localStorage.getItem(PREMIUM_KEY);
    if (testing === "true") return true;
    const adExpiry = localStorage.getItem(AD_REWARD_KEY);
    if (adExpiry && Number(adExpiry) > Date.now()) return true;
    return false;
  } catch {
    return false;
  }
}

function getOldestTimestamp(): number | null {
  let oldest: number | null = null;

  for (const key of HISTORY_KEYS) {
    const arr = readArray<{ timestamp?: number; startTime?: number }>(key);
    for (const entry of arr) {
      const ts = entry.startTime ?? entry.timestamp;
      if (typeof ts === "number" && ts > 0) {
        if (oldest === null || ts < oldest) oldest = ts;
      }
    }
  }

  return oldest;
}

function daysSinceOldest(): number {
  const oldest = getOldestTimestamp();
  if (oldest === null) return 0;
  return Math.floor((Date.now() - oldest) / MS_PER_DAY);
}

export function getUnlockStatus(): UnlockStatus {
  const hasAnyLog = HISTORY_KEYS.some((k) => readArray(k).length > 0);

  const sleepEntries = readArray<{ endTime?: number }>("sleepHistory");
  const completedSleeps = sleepEntries.filter(
    (s) => s.endTime != null && s.endTime > 0,
  ).length;

  const days = daysSinceOldest();

  const hasFourWeeksData =
    days >= 28 &&
    sleepEntries.length >= 14 &&
    readArray("feedingHistory").length >= 10;

  return {
    cryingDiagnostic: hasAnyLog,
    napPredictions: completedSleeps >= 3,
    isThisNormal: days >= 3,
    personalInsights: days >= 7,
    personalPlaybook: isPremiumFromStorage() && hasFourWeeksData,
  };
}
