/**
 * Handoff session: snapshot of baby state for caregiver, shareable via URL.
 */

export interface HandoffLog {
  id: string;
  type: 'feed' | 'sleep' | 'diaper';
  loggedAt: string;
  loggedByName: string;
  note: string | null;
}

export interface HandoffSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  babyName: string;
  /** Optional: for showing age on handoff page */
  birthDate?: number;
  lastFeed: {
    time: string;
    side: string | null;
    durationSeconds: number;
  } | null;
  nextFeedEta: string | null;
  lastNap: {
    endTime: string;
    durationSeconds: number;
  } | null;
  napWindowStatus: 'open' | 'approaching' | 'closed' | 'unknown';
  lastDiaper: {
    time: string;
    type: string;
  } | null;
  moodNote: string | null;
  headsUp: string | null;
  logs: HandoffLog[];
}
