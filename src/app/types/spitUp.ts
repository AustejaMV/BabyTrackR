/**
 * Spit-up / reflux tracking for GP discussions (0–6 months).
 */

export type SpitUpSeverity = "small" | "moderate" | "large" | "forceful";

export type SpitUpTiming =
  | "during_feed"
  | "immediately_after"
  | "30min_after";

export interface SpitUpEntry {
  id: string;
  timestamp: number;
  severity: SpitUpSeverity;
  timing: SpitUpTiming;
  note: string | null;
}
