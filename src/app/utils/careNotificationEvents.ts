/** Fired when notification toggles or alert thresholds change so Dashboard can reschedule. */
export const CARE_NOTIFICATIONS_RESCHEDULE_EVENT = "cradl-reschedule-care-notifications";

export function dispatchCareNotificationsReschedule(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CARE_NOTIFICATIONS_RESCHEDULE_EVENT));
}
