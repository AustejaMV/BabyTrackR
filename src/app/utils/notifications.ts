export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
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

export function sendNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  }
}

export function scheduleNotification(title: string, message: string, delayMs: number) {
  setTimeout(() => {
    sendNotification(title, { body: message });
  }, delayMs);
}

const WARNING_NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between same warning

export function maybeNotifyForWarning(
  warningKey: string,
  title: string,
  message: string
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const key = `lastWarningNotify:${warningKey}`;
  const last = parseInt(localStorage.getItem(key) || "0", 10);
  if (Date.now() - last < WARNING_NOTIFY_COOLDOWN_MS) return;
  sendNotification(title, { body: message });
  localStorage.setItem(key, String(Date.now()));
}
