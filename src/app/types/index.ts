// Shared domain types used across pages, components, and utilities.
// All tracking record types live here so they are never re-declared in individual files.

export interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
  /** Minutes not counted (e.g. "paused") — displayed duration = elapsed - excludedMs */
  excludedMs?: number;
  /** Server-assigned canonical start time (first-write-wins across devices). */
  serverStartTime?: number;
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
  /** Compressed image as data URL (JPEG, small size); set after client-side resize+compress */
  photoDataUrl?: string;
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
