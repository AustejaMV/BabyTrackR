/**
 * Medication reminder settings (Huckleberry-style): mode, interval, daytime, repeat days, notifications.
 */
const KEY = "babytrackr-medication-reminder";

export type ReminderMode = "remind_at" | "remind_in";

export interface MedicationReminderConfig {
  enabled: boolean;
  mode: ReminderMode;
  /** Fixed time for "remind at" (HH:mm) */
  remindAtTime: string;
  /** Hours between doses for "remind in" (after last medication) */
  intervalHours: number;
  daytimeOnly: boolean;
  dayStart: string; // HH:mm
  dayEnd: string;   // HH:mm
  /** 0 = Sunday … 6 = Saturday; repeat on these days */
  repeatDays: number[];
  soundVibration: boolean;
}

const DEFAULT: MedicationReminderConfig = {
  enabled: false,
  mode: "remind_in",
  remindAtTime: "09:00",
  intervalHours: 4,
  daytimeOnly: true,
  dayStart: "07:00",
  dayEnd: "22:00",
  repeatDays: [0, 1, 2, 3, 4, 5, 6],
  soundVibration: true,
};

export function getMedicationReminderConfig(): MedicationReminderConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<MedicationReminderConfig>;
    return {
      enabled: parsed.enabled ?? DEFAULT.enabled,
      mode: parsed.mode === "remind_at" || parsed.mode === "remind_in" ? parsed.mode : DEFAULT.mode,
      remindAtTime: typeof parsed.remindAtTime === "string" ? parsed.remindAtTime : DEFAULT.remindAtTime,
      intervalHours: typeof parsed.intervalHours === "number" && parsed.intervalHours >= 1 && parsed.intervalHours <= 24
        ? parsed.intervalHours
        : DEFAULT.intervalHours,
      daytimeOnly: parsed.daytimeOnly ?? DEFAULT.daytimeOnly,
      dayStart: typeof parsed.dayStart === "string" ? parsed.dayStart : DEFAULT.dayStart,
      dayEnd: typeof parsed.dayEnd === "string" ? parsed.dayEnd : DEFAULT.dayEnd,
      repeatDays: Array.isArray(parsed.repeatDays) && parsed.repeatDays.every((d) => d >= 0 && d <= 6)
        ? parsed.repeatDays
        : DEFAULT.repeatDays,
      soundVibration: parsed.soundVibration ?? DEFAULT.soundVibration,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveMedicationReminderConfig(config: MedicationReminderConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}
