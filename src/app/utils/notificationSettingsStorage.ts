/**
 * Notification toggles (persisted). Missing keys merge with defaults so new installs
 * don't have everything effectively "off".
 */

export const NOTIFICATION_SETTINGS_KEY = "cradl-notification-settings";

export const NOTIFICATION_ROWS = [
  { key: "feedReminder", label: "Feed reminder" },
  { key: "nappyReminder", label: "Nappy reminder" },
  { key: "napWindowOpening", label: "Nap window opening" },
  { key: "napStageTransition", label: "Nap window closing soon" },
  { key: "painReliefSafe", label: "Pain relief safe" },
  { key: "vaccinationDue", label: "Vaccination / jab reminder" },
  { key: "dailyTummyReminder", label: "Daily tummy reminder" },
] as const;

export type NotificationSettingKey = (typeof NOTIFICATION_ROWS)[number]["key"];

export type NotificationSettings = Record<NotificationSettingKey, boolean>;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  feedReminder: true,
  nappyReminder: true,
  napWindowOpening: true,
  napStageTransition: true,
  painReliefSafe: true,
  vaccinationDue: true,
  dailyTummyReminder: true,
};

export function readNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export function isNotificationEnabled(
  settings: NotificationSettings,
  key: NotificationSettingKey,
): boolean {
  return settings[key] !== false;
}
