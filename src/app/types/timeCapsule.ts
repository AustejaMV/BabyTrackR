/**
 * "What I'd tell my past self" — local only, no sync.
 */

export interface TimeCapsuleEntry {
  id: string;
  /** Milestone in weeks when written (e.g. 26 = 6 months). */
  writtenAtWeeks: number;
  /** ISO date when the note was written. */
  writtenAt: string;
  /** Body of the note. */
  body: string;
  /** When to show back (e.g. 52 weeks = 12 months after DOB). */
  showBackAtWeeks: number;
  /** If user has seen the "show back" card, store when. */
  shownBackAt?: string;
}

export type TimeCapsuleMilestone = 26 | 52 | 104; // 6, 12, 24 months in weeks
