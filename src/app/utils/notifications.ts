export async function requestNotificationPermission() {
  if (!Notification) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Send a notification, supporting both desktop and mobile browsers.
 *
 * Desktop Chrome/Firefox allow `new Notification()` directly.
 * Mobile Chrome (and some other mobile browsers) forbid the direct constructor
 * and require `ServiceWorkerRegistration.showNotification()` instead.
 *
 * Strategy:
 *   1. Try `new Notification()` first (zero-latency, works on desktop).
 *   2. If that throws "Illegal constructor", fall back to the service-worker path.
 *   3. If neither is available, fail silently.
 */
export async function sendNotification(title: string, options?: NotificationOptions) {
  if (!Notification || Notification.permission !== "granted") return;

  const opts: NotificationOptions = { icon: "/favicon.ico", badge: "/favicon.ico", ...options };

  try {
    new Notification(title, opts);
  } catch {
    // Mobile browsers throw "Illegal constructor" — use service worker instead
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, opts);
      } catch (swErr) {
        console.warn("[BabyTracker] sendNotification: service worker fallback failed", swErr);
      }
    }
  }
}

export function scheduleNotification(title: string, message: string, delayMs: number) {
  setTimeout(() => {
    sendNotification(title, { body: message });
  }, delayMs);
}

const WARNING_NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between same warning

export async function maybeNotifyForWarning(
  warningKey: string,
  title: string,
  message: string
): Promise<void> {
  if (!Notification || Notification.permission !== "granted") return;
  const key = `lastWarningNotify:${warningKey}`;
  const last = parseInt(localStorage.getItem(key) || "0", 10);
  if (Date.now() - last < WARNING_NOTIFY_COOLDOWN_MS) return;
  localStorage.setItem(key, String(Date.now()));
  await sendNotification(title, { body: message });
}
