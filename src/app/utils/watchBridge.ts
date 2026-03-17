/**
 * Watch state bridge: sends app state to Apple Watch / Wear OS.
 * Web: no-op. Native apps will implement platform-specific code (WCSession, MMKV, etc.).
 */

export interface WatchState {
  lastFeedAt: number | null;
  feedDueInMinutes: number | null;
  napWindowOpen: boolean;
  napClosesInMinutes: number | null;
  lastDiaperAt: number | null;
}

const defaultState: WatchState = {
  lastFeedAt: null,
  feedDueInMinutes: null,
  napWindowOpen: false,
  napClosesInMinutes: null,
  lastDiaperAt: null,
};

/**
 * Update watch state (e.g. after every log save or on app foreground).
 * Web: no-op. iOS/Android will send to Watch/Wear.
 */
export function updateWatchState(state: Partial<WatchState>): void {
  if (typeof navigator === "undefined" || !navigator.userAgent) return;
  // Web: no watch connectivity. Native implementations will override or use a different entry.
  void state;
}

/**
 * Get current watch state for display or for sending to watch.
 * Web: returns default/empty. Native may read from shared storage.
 */
export function getWatchState(): WatchState {
  return { ...defaultState };
}
