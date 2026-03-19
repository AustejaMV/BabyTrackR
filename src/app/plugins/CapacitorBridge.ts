/**
 * Capacitor bridge — updates native widgets with latest baby data.
 * Works on iOS (UserDefaults group.com.cradl.app) and Android (SharedPreferences).
 * Falls back silently on web.
 */
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function syncWidgetData(): Promise<void> {
  if (!isNative()) return;

  try {
    let feedText = "Feed: No feeds yet";
    let sleepText = "Sleep: No sleeps yet";
    let nappyText = "Nappy: No nappies yet";

    try {
      const raw = localStorage.getItem("feedingHistory");
      if (raw) {
        const arr = JSON.parse(raw);
        const last = arr[arr.length - 1];
        if (last) {
          const t = last.endTime ?? last.timestamp;
          const side = last.segments?.[0]?.type?.includes("Left") ? "Left" : last.segments?.[0]?.type?.includes("Right") ? "Right" : "";
          feedText = `Feed: Fed ${formatTimeAgo(t)}${side ? ` · ${side}` : ""}`;
        }
      }
    } catch {}

    try {
      const raw = localStorage.getItem("sleepHistory");
      if (raw) {
        const arr = JSON.parse(raw);
        const last = arr[arr.length - 1];
        if (last && last.startTime && last.endTime) {
          const dur = last.endTime - last.startTime;
          sleepText = `Sleep: Slept ${formatDuration(dur)} · ${formatTimeAgo(last.endTime)}`;
        }
      }
    } catch {}

    try {
      const raw = localStorage.getItem("diaperHistory");
      if (raw) {
        const arr = JSON.parse(raw);
        const last = arr[arr.length - 1];
        if (last) {
          const type = last.type === "poop" ? "Dirty" : last.type === "both" ? "Both" : "Wet";
          nappyText = `Nappy: ${type} · ${formatTimeAgo(last.timestamp)}`;
        }
      }
    } catch {}

    await Preferences.set({ key: "widget_feed_text", value: feedText });
    await Preferences.set({ key: "widget_sleep_text", value: sleepText });
    await Preferences.set({ key: "widget_nappy_text", value: nappyText });
  } catch {}
}
