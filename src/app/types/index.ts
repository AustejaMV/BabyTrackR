// Shared domain types used across pages, components, and utilities.
// All tracking record types live here so they are never re-declared in individual files.

import type { TemperatureEntry, SymptomEntry, MedicationEntry } from "./health";
import type { CustomTrackerLogEntry } from "./customTracker";

export interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
  /** Minutes not counted (e.g. "paused") — displayed duration = elapsed - excludedMs */
  excludedMs?: number;
  /** Server-assigned canonical start time (first-write-wins across devices). */
  serverStartTime?: number;
  /** How baby fell asleep (e.g. "rocking", "nurse", "dummy", "self"). */
  fallAsleepMethod?: string;
  /** Mood on wake (e.g. "happy", "fussy", "crying"). */
  wakeUpMood?: string;
  /** Where baby slept (e.g. "cot", "moses", "bed", "pram"). */
  sleepLocation?: string;
  /** Was white noise used (sleep environment). */
  whiteNoise?: boolean;
  /** Room temperature in °C. */
  roomTempC?: number;
  /** Light level: dark / dim / light. */
  lightLevel?: "dark" | "dim" | "light";
  /** Sleep aid: dummy, swaddle, sleeping bag, nothing. */
  sleepAid?: string;
}

export interface FeedingSegment {
  type: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  amount?: number;
  /** Time not counted (paused) for this segment — effective duration = wall - excludedMs */
  excludedMs?: number;
}

export interface FeedingRecord {
  id: string;
  /** Single type for backward compat when no segments (legacy or simple feed). */
  type?: string;
  timestamp: number;
  amount?: number;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  /** Total "paused" time to subtract from sum(segment.durationMs) when displaying */
  excludedMs?: number;
  /** Multi-segment session (e.g. 30m left, 10m right, 20m formula 60ml). */
  segments?: FeedingSegment[];
  note?: string;
}

/** In-flight segment during an active feeding session. */
export interface ActiveFeedingSegment {
  type: string;
  startTime: number;
  endTime?: number;
  amount?: number;
  /** Time not counted (paused) — displayed duration = elapsed - excludedMs */
  excludedMs?: number;
}

/** Active feeding session stored in localStorage and synced to server while in progress. */
export interface ActiveSession {
  sessionStartTime: number;
  segments: ActiveFeedingSegment[];
}

/** Synced active feeding payload (wraps ActiveSession with pause state). */
export interface ActiveFeedingSession {
  session: ActiveSession;
  isPaused: boolean;
  totalPausedMs: number;
  pausedAt: number | null;
  serverStartTime?: number;
}

export interface DiaperRecord {
  id: string;
  type: "pee" | "poop" | "both";
  timestamp: number;
  notes?: string;
}

export interface TummyTimeRecord {
  id: string;
  startTime: number;
  endTime?: number;
  /** Time not counted (paused) — displayed duration = elapsed - excludedMs */
  excludedMs?: number;
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  done: boolean;
  isPublic?: boolean;
}

export interface PainkillerDose {
  id: string;
  timestamp: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

/** Baby profile for age-based targets and milestones */
export interface BabyProfile {
  birthDate: number; // epoch ms (start of day)
  name?: string;
  /** Parent/caregiver first name (max 40 chars) for personalised address */
  parentName?: string;
  /** Compressed image as data URL (JPEG, small size); set after client-side resize+compress */
  photoDataUrl?: string;
  weight?: number; // kg, optional
  height?: number; // cm, optional
  headCircumference?: number; // cm, optional
  sex?: "girl" | "boy" | "prefer_not_to_say";
  bloodType?: string;
}

/** Developmental milestone with typical range and user-set date */
export interface Milestone {
  id: string;
  label: string;
  /** Typical age range in days from birth, e.g. [30, 90] */
  typicalDaysMin: number;
  typicalDaysMax: number;
  /** When the user marked it achieved (epoch ms), or undefined */
  achievedAt?: number;
}

/** Bottle feed log */
export interface BottleRecord {
  id: string;
  timestamp: number;
  volumeMl: number;
  feedType: "formula" | "expressed" | "mixed";
  note?: string;
}

/** Pump session log */
export interface PumpRecord {
  id: string;
  timestamp: number;
  side: "left" | "right" | "both";
  volumeLeftMl?: number;
  volumeRightMl?: number;
  durationMs: number;
}

/** Mum mood log entry */
export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: "great" | "good" | "okay" | "tired" | "struggling";
}

/** Appointment */
export interface Appointment {
  id: string;
  date: string; // dd/mm/yyyy or YYYY-MM-DD
  time: string; // HH:mm
  type: "GP" | "Health visitor" | "Hospital";
  notes?: string;
}

/** Vaccination log entry (one vaccine at a visit) */
export interface VaccinationLogEntry {
  id: string;
  vaccineId: string;
  dateGiven: string; // dd/mm/yyyy
}

/** Growth measurement */
export interface GrowthMeasurement {
  id: string;
  date: number; // epoch ms start of day
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
}

/** Unified timeline event for Today view (and PDF export) */
export type TimelineEventKind = "feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump" | "health" | "custom";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  forDatetime: number; // sort key
  timeLabel: string; // HH:mm or dd/mm/yyyy HH:mm for past days
  description: string;
  /** Original record for edit/delete */
  record: FeedingRecord | SleepRecord | DiaperRecord | TummyTimeRecord | BottleRecord | PumpRecord | TemperatureEntry | SymptomEntry | MedicationEntry | CustomTrackerLogEntry;
}
