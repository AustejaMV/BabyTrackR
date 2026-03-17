/**
 * App completeness and empty-state checks.
 */

export type AppCompleteness = {
  hasBaby: boolean;
  hasDob: boolean;
  hasAnyLogs: boolean;
  hasLogsToday: boolean;
  feedCount: number;
  sleepCount: number;
  diaperCount: number;
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Get current app completeness for empty states and onboarding. */
export function getAppCompleteness(): AppCompleteness {
  const babies = loadJson<Array<{ id?: string; birthDate?: number | string; name?: string }>>("babies", []);
  const hasBaby = Array.isArray(babies) && babies.length > 0;
  const activeId = localStorage.getItem("activeBabyId");
  const activeBaby = hasBaby && activeId ? babies.find((b) => b.id === activeId) ?? babies[0] : null;
  const hasDob = !!(activeBaby && (activeBaby.birthDate != null && activeBaby.birthDate !== ""));

  const feeds = loadJson<unknown[]>("feedingHistory", []);
  const sleep = loadJson<unknown[]>("sleepHistory", []);
  const diapers = loadJson<unknown[]>("diaperHistory", []);
  const feedCount = Array.isArray(feeds) ? feeds.length : 0;
  const sleepCount = Array.isArray(sleep) ? sleep.length : 0;
  const diaperCount = Array.isArray(diapers) ? diapers.length : 0;
  const hasAnyLogs = feedCount > 0 || sleepCount > 0 || diaperCount > 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const hasLogsToday =
    (Array.isArray(feeds) && feeds.some((f: { timestamp?: number; endTime?: number }) => ((f.endTime ?? f.timestamp) ?? 0) >= todayMs)) ||
    (Array.isArray(sleep) && sleep.some((s: { startTime?: number }) => (s.startTime ?? 0) >= todayMs)) ||
    (Array.isArray(diapers) && diapers.some((d: { timestamp?: number }) => (d.timestamp ?? 0) >= todayMs));

  return {
    hasBaby,
    hasDob,
    hasAnyLogs,
    hasLogsToday,
    feedCount,
    sleepCount,
    diaperCount,
  };
}
