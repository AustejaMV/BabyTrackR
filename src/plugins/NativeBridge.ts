export interface WidgetState {
  lastFeedTime: number | null;
  lastFeedSide: string | null;
  nextFeedEta: number | null;
  napWindowStatus: string | null;
  napWindowOpensAt: number | null;
  napWindowClosesAt: number | null;
  awakeMinutes: number | null;
  lastDiaperTime: number | null;
  lastDiaperType: string | null;
  diapersToday: number;
  feedsToday: number;
  sleepToday: number;
  babyName: string | null;
  updatedAt: number;
}

const WIDGET_STORAGE_KEY = 'cradl_widget';

export async function updateWidgetState(state: WidgetState): Promise<void> {
  try {
    console.debug('[NativeBridge] updateWidgetState (web fallback)', state);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.debug('[NativeBridge] updateWidgetState failed', err);
  }
}

export async function syncNativeState(
  allHistory: any,
  babyProfile: any,
): Promise<void> {
  try {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const feeds = Array.isArray(allHistory?.feeds) ? allHistory.feeds : [];
    const diapers = Array.isArray(allHistory?.diapers) ? allHistory.diapers : [];
    const sleeps = Array.isArray(allHistory?.sleeps) ? allHistory.sleeps : [];

    const lastFeed = feeds.length > 0 ? feeds[feeds.length - 1] : null;
    const lastDiaper = diapers.length > 0 ? diapers[diapers.length - 1] : null;
    const lastSleep = sleeps.length > 0 ? sleeps[sleeps.length - 1] : null;

    const feedsToday = feeds.filter(
      (f: any) => (f.endTime ?? f.time ?? 0) >= todayMs,
    ).length;
    const diapersToday = diapers.filter(
      (d: any) => (d.time ?? 0) >= todayMs,
    ).length;
    const sleepTodayMs = sleeps
      .filter((s: any) => (s.startTime ?? 0) >= todayMs && s.endTime)
      .reduce((sum: number, s: any) => sum + (s.endTime - s.startTime), 0);

    const lastSleepEnd = lastSleep?.endTime ?? null;
    const awakeMinutes =
      lastSleepEnd != null ? Math.round((now - lastSleepEnd) / 60000) : null;

    const state: WidgetState = {
      lastFeedTime: lastFeed?.endTime ?? lastFeed?.time ?? null,
      lastFeedSide: lastFeed?.side ?? null,
      nextFeedEta: null,
      napWindowStatus: null,
      napWindowOpensAt: null,
      napWindowClosesAt: null,
      awakeMinutes,
      lastDiaperTime: lastDiaper?.time ?? null,
      lastDiaperType: lastDiaper?.type ?? null,
      diapersToday,
      feedsToday,
      sleepToday: Math.round(sleepTodayMs / 60000),
      babyName: babyProfile?.name ?? null,
      updatedAt: now,
    };

    await updateWidgetState(state);
  } catch (err) {
    console.debug('[NativeBridge] syncNativeState failed (non-fatal)', err);
  }
}

export function setupWidgetLogSync(): void {
  try {
    console.debug('[NativeBridge] setupWidgetLogSync: web no-op');
  } catch (err) {
    console.debug('[NativeBridge] setupWidgetLogSync failed', err);
  }
}
