// Shared domain types used across pages, components, and utilities.
// All tracking record types live here so they are never re-declared in individual files.

export interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
  /** Server-assigned canonical start time (first-write-wins across devices). */
  serverStartTime?: number;
}

export interface FeedingSegment {
  type: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  amount?: number;
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
  /** Multi-segment session (e.g. 30m left, 10m right, 20m formula 60ml). */
  segments?: FeedingSegment[];
}

/** In-flight segment during an active feeding session. */
export interface ActiveFeedingSegment {
  type: string;
  startTime: number;
  endTime?: number;
  amount?: number;
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
