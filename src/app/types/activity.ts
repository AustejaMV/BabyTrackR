/**
 * Activity / playtime logging.
 */

export type ActivityType =
  | "play"
  | "bath"
  | "walk"
  | "story"
  | "music"
  | "sensory"
  | "outdoor"
  | "other";

export interface ActivityEntry {
  id: string;
  timestamp: string;
  durationMinutes: number;
  activityType: ActivityType;
  note: string | null;
}
