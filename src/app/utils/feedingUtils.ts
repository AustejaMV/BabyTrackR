/**
 * Pure feeding-session logic — no React, no localStorage, no side-effects.
 *
 * Every function takes plain data and returns a new value; nothing is mutated.
 * Keeping the logic here means it can be exhaustively unit-tested without
 * mounting any component.
 */
import type { ActiveSession, ActiveFeedingSegment, FeedingSegment, FeedingRecord } from '../types';

// ─── Read-only derivations ────────────────────────────────────────────────────

/**
 * Compute what the live timers should display given the current session state.
 * Displayed time = elapsed - excludedMs ("paused" time not counted).
 */
export function computeActiveTimers(
  session: ActiveSession,
  now = Date.now(),
): { currentSegMs: number; totalMs: number } {
  const segs = session.segments;
  if (segs.length === 0) return { currentSegMs: 0, totalMs: 0 };

  const last = segs[segs.length - 1];
  const lastElapsed = now - (last.endTime ?? last.startTime);
  const currentSegMs = Math.max(0, lastElapsed - (last.excludedMs ?? 0));

  const completedMs = segs.slice(0, -1).reduce((sum, s) => {
    const wall = (s.endTime ?? s.startTime) - s.startTime;
    return sum + Math.max(0, wall - (s.excludedMs ?? 0));
  }, 0);

  return { currentSegMs, totalMs: completedMs + currentSegMs };
}

// ─── Mutations (return new session, never mutate in place) ────────────────────

/**
 * Add or subtract "paused" minutes on the CURRENT (last active) segment.
 * Positive mins = more displayed time (reduce excluded / "unpause").
 * Negative mins = less displayed time (add to excluded / "pause").
 * Start time is never changed.
 */
export function adjustCurrentSegment(
  session: ActiveSession,
  mins: number,
  now = Date.now(),
): ActiveSession {
  const segs = [...session.segments];
  if (segs.length === 0) return session;

  const delta = mins * 60_000;
  const lastIdx = segs.length - 1;
  const last = segs[lastIdx];
  const elapsed = now - (last.endTime ?? last.startTime);
  const currentExcluded = last.excludedMs ?? 0;
  const newExcluded = currentExcluded - delta;
  // Clamp so displayed duration (elapsed - excluded) is never negative
  const clampedExcluded = Math.min(newExcluded, elapsed);
  segs[lastIdx] = { ...last, excludedMs: clampedExcluded };

  return { ...session, segments: segs };
}

/**
 * Set the displayed duration of the current segment to exactly displayedMs.
 * Used when the user picks a time from the wheel picker.
 */
export function setCurrentSegmentDisplayedDuration(
  session: ActiveSession,
  displayedMs: number,
  now = Date.now(),
): ActiveSession {
  const segs = [...session.segments];
  if (segs.length === 0) return session;

  const lastIdx = segs.length - 1;
  const last = segs[lastIdx];
  const elapsed = now - (last.endTime ?? last.startTime);
  const excludedMs = Math.max(0, elapsed - displayedMs);
  segs[lastIdx] = { ...last, excludedMs };

  return { ...session, segments: segs };
}

/**
 * Set the session's total displayed duration (by adjusting current segment's excluded so total = totalMs).
 */
export function setSessionTotalDisplayedDuration(
  session: ActiveSession,
  totalMs: number,
  now = Date.now(),
): ActiveSession {
  const segs = session.segments;
  if (segs.length === 0) return session;

  const completedMs = segs.slice(0, -1).reduce((sum, s) => {
    const wall = (s.endTime ?? s.startTime) - s.startTime;
    return sum + Math.max(0, wall - (s.excludedMs ?? 0));
  }, 0);
  const currentSegDisplayed = Math.max(0, totalMs - completedMs);
  return setCurrentSegmentDisplayedDuration(session, currentSegDisplayed, now);
}

/**
 * Close the current segment and open a new one with `newType`.
 * The old segment's endTime is set to `now`; the new one starts at `now`.
 *
 * Guard: if the user taps the type that is already active, nothing changes.
 * This prevents zero-duration ghost segments in history.
 */
export function switchSegment(
  session: ActiveSession,
  newType: string,
  amount: number | undefined,
  now = Date.now(),
): ActiveSession {
  const segs = [...session.segments];
  if (segs.length === 0) return session;

  // No-op: switching to the same type would create an empty segment
  if (segs[segs.length - 1].type === newType) return session;

  segs[segs.length - 1] = { ...segs[segs.length - 1], endTime: now };
  segs.push({ type: newType, startTime: now, amount, excludedMs: 0 });

  return { ...session, segments: segs };
}

/**
 * Finalise the active session into a saveable FeedingRecord.
 * Each segment's durationMs = endTime - startTime (wall-clock; never negative).
 * Total durationMs = sum of all segment durations.
 */
export function finaliseSession(session: ActiveSession, now = Date.now()): FeedingRecord {
  const segments: FeedingSegment[] = session.segments.map((s) => {
    const end = s.endTime ?? now;
    const wall = end - s.startTime;
    const dur = Math.max(0, wall - (s.excludedMs ?? 0));
    return { type: s.type, startTime: s.startTime, endTime: end, durationMs: dur, amount: s.amount, excludedMs: s.excludedMs };
  });
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    segments[segments.length - 1] = {
      ...last,
      endTime: now,
      durationMs: Math.max(0, now - last.startTime - (last.excludedMs ?? 0)),
    };
  }

  const totalDurationMs = segments.reduce((sum, s) => sum + s.durationMs, 0);

  return {
    id: now.toString(),
    timestamp: now,
    startTime: session.sessionStartTime,
    endTime: now,
    durationMs: totalDurationMs,
    segments,
  };
}

/**
 * Adjust a saved record's displayed total by changing "excluded" (paused) time.
 * Positive mins = show more time (reduce excluded). Negative mins = show less (add excluded).
 * Start time is never changed.
 */
export function adjustHistoryRecord(record: FeedingRecord, mins: number): FeedingRecord {
  const rawTotal = (record.segments ?? []).reduce((sum, s) => sum + (s.durationMs ?? 0), 0) || (record.durationMs ?? 0);
  const currentExcluded = record.excludedMs ?? 0;
  const delta = mins * 60_000;
  const newExcluded = Math.min(currentExcluded - delta, rawTotal - 60_000);
  return { ...record, excludedMs: newExcluded };
}

/** Displayed total duration for a saved feeding record (raw total minus excluded). */
export function displayedDurationMs(record: FeedingRecord): number {
  const raw = (record.segments ?? []).reduce((sum, s) => sum + (s.durationMs ?? 0), 0) || (record.durationMs ?? 0);
  return Math.max(0, raw - (record.excludedMs ?? 0));
}

/** Set displayed total duration for a saved feeding record (for duration picker on history). */
export function setFeedingHistoryDisplayedDuration(record: FeedingRecord, displayedMs: number): FeedingRecord {
  const rawTotal = (record.segments ?? []).reduce((sum, s) => sum + (s.durationMs ?? 0), 0) || (record.durationMs ?? 0);
  const excludedMs = Math.min(rawTotal - 60_000, Math.max(0, rawTotal - displayedMs));
  return { ...record, excludedMs };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Total ml consumed across all segments of a finished record. */
export function totalMl(record: FeedingRecord): number {
  if (record.segments && record.segments.length > 0) {
    return record.segments.reduce((s, seg) => s + (seg.amount ?? 0), 0);
  }
  return record.amount ?? 0;
}

/** The timestamp to use as "last feeding end time" for interval calculations. */
export function lastFeedingEndTime(record: FeedingRecord): number {
  return record.endTime ?? record.timestamp;
}

/** Build a fresh single-segment ActiveSession starting now. */
export function createSession(type: string, amount: number | undefined, now = Date.now()): ActiveSession {
  const seg: ActiveFeedingSegment = { type, startTime: now, amount };
  return { sessionStartTime: now, segments: [seg] };
}
