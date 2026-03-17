/**
 * Custom tracking categories: user-defined trackers with optional value + note per log.
 */

export type CustomTrackerIcon =
  | "star"
  | "heart"
  | "drop"
  | "pill"
  | "apple"
  | "sun"
  | "moon"
  | "flower"
  | "book"
  | "coffee";

export interface CustomTrackerDefinition {
  id: string;
  name: string;
  icon: CustomTrackerIcon;
  /** Optional unit label e.g. "ml", "oz" */
  unit?: string | null;
  createdAt: number;
}

export interface CustomTrackerLogEntry {
  id: string;
  trackerId: string;
  timestamp: number;
  /** Optional numeric value */
  value?: number | null;
  note?: string | null;
}
