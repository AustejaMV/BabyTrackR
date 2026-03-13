/**
 * feedingUtils.test.ts
 *
 * Tests are written from the USER'S perspective, not the implementation's.
 * Each describe block represents a real scenario the user can trigger.
 *
 * The previous bug (adjusting segs[0] instead of segs[last]) would have been
 * caught immediately by the "switch then adjust" tests below.
 */
import { describe, it, expect } from 'vitest';
import {
  computeActiveTimers,
  adjustCurrentSegment,
  switchSegment,
  finaliseSession,
  adjustHistoryRecord,
  createSession,
  displayedDurationMs,
} from './feedingUtils';
import type { ActiveSession } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN = 60_000;
const T0  = 1_700_000_000_000; // fixed epoch

/** Build a multi-segment session: left 10m → switch → right (running) */
function twoSegmentSession(now = T0 + 15 * MIN): ActiveSession {
  const T_switch = T0 + 10 * MIN;
  return {
    sessionStartTime: T0,
    segments: [
      { type: 'Left breast',  startTime: T0,       endTime: T_switch },
      { type: 'Right breast', startTime: T_switch                     },  // no endTime = still running
    ],
  };
}

// ─── createSession ────────────────────────────────────────────────────────────

describe('createSession', () => {
  it('creates a session with one segment matching the chosen type', () => {
    const s = createSession('Left breast', undefined, T0);
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].type).toBe('Left breast');
  });

  it('sessionStartTime equals the segment startTime', () => {
    const s = createSession('Right breast', undefined, T0);
    expect(s.sessionStartTime).toBe(T0);
    expect(s.segments[0].startTime).toBe(T0);
  });

  it('stores formula amount on the first segment', () => {
    const s = createSession('Formula', 60, T0);
    expect(s.segments[0].amount).toBe(60);
  });
});

// ─── computeActiveTimers ─────────────────────────────────────────────────────

describe('computeActiveTimers — what the user SEES on screen', () => {
  it('single segment running for 10 min: total = 10 min, current = 10 min', () => {
    const s = createSession('Left breast', undefined, T0);
    const { totalMs, currentSegMs } = computeActiveTimers(s, T0 + 10 * MIN);
    expect(currentSegMs).toBe(10 * MIN);
    expect(totalMs).toBe(10 * MIN);
  });

  it('after 10m left + switch + 5m right: total = 15m, current = 5m', () => {
    const s = twoSegmentSession(T0 + 15 * MIN);
    const { totalMs, currentSegMs } = computeActiveTimers(s, T0 + 15 * MIN);
    expect(currentSegMs).toBe(5 * MIN);
    expect(totalMs).toBe(15 * MIN);
  });

  it('total is the SUM of segment durations — NOT wall-clock from session start', () => {
    // Left 24m, right 30m → total must be 54m, not wall-clock which might differ
    const T_switch = T0 + 24 * MIN;
    const s: ActiveSession = {
      sessionStartTime: T0,
      segments: [
        { type: 'Left breast',  startTime: T0,       endTime: T_switch },
        { type: 'Right breast', startTime: T_switch                     },
      ],
    };
    const { totalMs } = computeActiveTimers(s, T_switch + 30 * MIN);
    expect(totalMs).toBe(54 * MIN);
  });

  it('returns zeros for an empty segment list', () => {
    const s: ActiveSession = { sessionStartTime: T0, segments: [] };
    const { totalMs, currentSegMs } = computeActiveTimers(s, T0 + 10 * MIN);
    expect(totalMs).toBe(0);
    expect(currentSegMs).toBe(0);
  });

  it('currentSegMs is never negative (guard against future startTime)', () => {
    const s = createSession('Left breast', undefined, T0 + 60 * MIN); // starts in the future
    const { currentSegMs } = computeActiveTimers(s, T0); // now is BEFORE startTime
    expect(currentSegMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── adjustCurrentSegment — THE BUG SCENARIO ─────────────────────────────────

describe('adjustCurrentSegment — "I pressed +10m on the active timer"', () => {
  // ── Single segment ──────────────────────────────────────────────────────────
  describe('single-segment session (left breast only)', () => {
    it('+10m: current segment timer increases by 10m', () => {
      const s = createSession('Left breast', undefined, T0);
      const adjusted = adjustCurrentSegment(s, 10, T0 + 5 * MIN);
      const { currentSegMs } = computeActiveTimers(adjusted, T0 + 5 * MIN);
      // Was 5m, should now show 15m
      expect(currentSegMs).toBe(15 * MIN);
    });

    it('+10m: sessionStartTime is unchanged (pause-based); displayed duration increases', () => {
      const s = createSession('Left breast', undefined, T0);
      const adjusted = adjustCurrentSegment(s, 10, T0 + 5 * MIN);
      expect(adjusted.sessionStartTime).toBe(T0);
      expect(computeActiveTimers(adjusted, T0 + 5 * MIN).totalMs).toBe(15 * MIN);
    });

    it('-5m: current segment timer decreases by 5m', () => {
      const s = createSession('Left breast', undefined, T0);
      const adjusted = adjustCurrentSegment(s, -5, T0 + 20 * MIN);
      const { currentSegMs } = computeActiveTimers(adjusted, T0 + 20 * MIN);
      // Was 20m, should now show 15m
      expect(currentSegMs).toBe(15 * MIN);
    });
  });

  // ── Multi-segment: THE ORIGINAL BUG ────────────────────────────────────────
  describe('multi-segment session — the reported bug', () => {
    it('+10m after switching to right breast: right breast shows 10m', () => {
      // Reproduce the exact user report:
      //   1. Start left breast
      //   2. Add +10m → left breast shows 10m  (already tested above)
      //   3. Switch to right breast at T0+10m
      //   4. Add +10m → right breast must show 10m  ← THIS FAILED BEFORE THE FIX
      const atSwitch = T0 + 10 * MIN;
      const s = twoSegmentSession(atSwitch); // right breast just started

      const adjusted = adjustCurrentSegment(s, 10, atSwitch);
      const { currentSegMs } = computeActiveTimers(adjusted, atSwitch);
      expect(currentSegMs).toBe(10 * MIN); // right breast = 10m ✓
    });

    it('+10m after switching: ONLY the current (right breast) segment changes', () => {
      const atSwitch = T0 + 10 * MIN;
      const s = twoSegmentSession(atSwitch);
      const adjusted = adjustCurrentSegment(s, 10, atSwitch);

      // Left breast segment must be FROZEN exactly as it was
      expect(adjusted.segments[0].startTime).toBe(T0);
      expect(adjusted.segments[0].endTime).toBe(atSwitch);
    });

    it('+10m after switching: total = left(10m) + right(10m) = 20m', () => {
      const atSwitch = T0 + 10 * MIN;
      const s = twoSegmentSession(atSwitch);
      const adjusted = adjustCurrentSegment(s, 10, atSwitch);
      const { totalMs } = computeActiveTimers(adjusted, atSwitch);
      expect(totalMs).toBe(20 * MIN);
    });

    it('sessionStartTime is NOT changed when multiple segments exist', () => {
      const s = twoSegmentSession();
      const adjusted = adjustCurrentSegment(s, 10);
      expect(adjusted.sessionStartTime).toBe(T0); // unchanged
    });

    it('-5m after switching: right breast shrinks, left breast stays the same', () => {
      const atSwitch = T0 + 10 * MIN;
      const now = atSwitch + 20 * MIN; // 20m into right breast
      const s = twoSegmentSession(now);

      const adjusted = adjustCurrentSegment(s, -5, now);
      const { currentSegMs, totalMs } = computeActiveTimers(adjusted, now);
      expect(currentSegMs).toBe(15 * MIN); // 20m - 5m
      expect(totalMs).toBe(25 * MIN);       // 10m left + 15m right
    });

    it('three segments: +10m only touches the last one', () => {
      const s: ActiveSession = {
        sessionStartTime: T0,
        segments: [
          { type: 'Left breast',  startTime: T0,           endTime: T0 + 10 * MIN },
          { type: 'Right breast', startTime: T0 + 10 * MIN, endTime: T0 + 15 * MIN },
          { type: 'Formula',      startTime: T0 + 15 * MIN                          },
        ],
      };
      const now = T0 + 15 * MIN; // formula just started
      const adjusted = adjustCurrentSegment(s, 10, now);

      expect(adjusted.segments[0].startTime).toBe(T0);              // left  — frozen
      expect(adjusted.segments[1].startTime).toBe(T0 + 10 * MIN);   // right — frozen
      const { currentSegMs } = computeActiveTimers(adjusted, now);
      expect(currentSegMs).toBe(10 * MIN);                           // formula = 10m
    });
  });

  // ── Guard: cannot produce negative duration ─────────────────────────────────
  describe('guard: adjusted startTime is clamped to now', () => {
    it('subtracting more than elapsed time clamps to 0 duration, not negative', () => {
      const s = createSession('Left breast', undefined, T0);
      const now = T0 + 2 * MIN;
      const adjusted = adjustCurrentSegment(s, -5, now);
      const { currentSegMs } = computeActiveTimers(adjusted, now);
      expect(currentSegMs).toBeGreaterThanOrEqual(0);
    });

    it('adding an absurdly large amount does not produce an epoch-0 (Jan 1 1970) timestamp', () => {
      // T0 = 1_700_000_000_000 ms; adding 999 hours is still way under T0
      // BUT: if T0 were small (e.g. a fresh test machine) we want to ensure we never go to ≤0
      const s = createSession('Left breast', undefined, T0);
      const adjusted = adjustCurrentSegment(s, 999 * 60, T0 + 1);
      expect(adjusted.segments[0].startTime).toBeGreaterThan(0);
    });
  });
});

// ─── switchSegment ────────────────────────────────────────────────────────────

describe('Tapping the same type that is already active', () => {
  it('does not add a new segment (no zero-duration ghost in history)', () => {
    const session = createSession('Left breast', undefined, T0);
    const after = switchSegment(session, 'Left breast', undefined, T0 + 10_000);
    expect(after.segments).toHaveLength(1);
    expect(after.segments[0].type).toBe('Left breast');
  });

  it('leaves the session start time unchanged', () => {
    const session = createSession('Right breast', undefined, T0);
    const after = switchSegment(session, 'Right breast', undefined, T0 + 5_000);
    expect(after.sessionStartTime).toBe(T0);
  });
});

describe('switchSegment — "I tapped Switch to right breast"', () => {
  it('closes the current segment at now', () => {
    const s = createSession('Left breast', undefined, T0);
    const switched = switchSegment(s, 'Right breast', undefined, T0 + 10 * MIN);
    expect(switched.segments[0].endTime).toBe(T0 + 10 * MIN);
  });

  it('adds a new segment with the chosen type starting at now', () => {
    const s = createSession('Left breast', undefined, T0);
    const switched = switchSegment(s, 'Right breast', undefined, T0 + 10 * MIN);
    expect(switched.segments).toHaveLength(2);
    expect(switched.segments[1].type).toBe('Right breast');
    expect(switched.segments[1].startTime).toBe(T0 + 10 * MIN);
  });

  it('new segment has no endTime (it is still running)', () => {
    const s = createSession('Left breast', undefined, T0);
    const switched = switchSegment(s, 'Right breast', undefined, T0 + 10 * MIN);
    expect(switched.segments[1].endTime).toBeUndefined();
  });

  it('sessionStartTime is preserved across a switch', () => {
    const s = createSession('Left breast', undefined, T0);
    const switched = switchSegment(s, 'Right breast', undefined, T0 + 10 * MIN);
    expect(switched.sessionStartTime).toBe(T0);
  });

  it('formula amount is stored on the new segment', () => {
    const s = createSession('Left breast', undefined, T0);
    const switched = switchSegment(s, 'Formula', 60, T0 + 10 * MIN);
    expect(switched.segments[1].amount).toBe(60);
  });

  it('previous segment remains unchanged after the switch', () => {
    const s = createSession('Left breast', undefined, T0);
    const switched = switchSegment(s, 'Right breast', undefined, T0 + 10 * MIN);
    expect(switched.segments[0].startTime).toBe(T0);
    expect(switched.segments[0].type).toBe('Left breast');
  });
});

// ─── finaliseSession ──────────────────────────────────────────────────────────

describe('finaliseSession — "I tapped Feeding ended"', () => {
  it('produces a FeedingRecord with the correct total duration', () => {
    const s = twoSegmentSession(T0 + 15 * MIN);
    const record = finaliseSession(s, T0 + 15 * MIN);
    // left 10m + right 5m = 15m
    expect(record.durationMs).toBe(15 * MIN);
  });

  it('all segments have their durationMs set (endTime − startTime)', () => {
    const s = twoSegmentSession(T0 + 15 * MIN);
    const record = finaliseSession(s, T0 + 15 * MIN);
    expect(record.segments![0].durationMs).toBe(10 * MIN);
    expect(record.segments![1].durationMs).toBe(5 * MIN);
  });

  it('the last segment is always closed at now', () => {
    const s = twoSegmentSession(T0 + 15 * MIN);
    const endTime = T0 + 15 * MIN;
    const record = finaliseSession(s, endTime);
    expect(record.segments![1].endTime).toBe(endTime);
  });

  it('record startTime matches sessionStartTime', () => {
    const s = createSession('Left breast', undefined, T0);
    const record = finaliseSession(s, T0 + 25 * MIN);
    expect(record.startTime).toBe(T0);
  });

  it('no segment durationMs is negative (guard)', () => {
    const s: ActiveSession = {
      sessionStartTime: T0,
      segments: [{ type: 'Left breast', startTime: T0, endTime: T0 - 5 * MIN }], // corrupt end < start
    };
    const record = finaliseSession(s, T0);
    record.segments!.forEach((seg) => expect(seg.durationMs).toBeGreaterThanOrEqual(0));
  });

  it('three-segment session: total = sum of all three', () => {
    const s: ActiveSession = {
      sessionStartTime: T0,
      segments: [
        { type: 'Left breast',  startTime: T0,           endTime: T0 + 10 * MIN },
        { type: 'Right breast', startTime: T0 + 10 * MIN, endTime: T0 + 20 * MIN },
        { type: 'Formula',      startTime: T0 + 20 * MIN                          },
      ],
    };
    const record = finaliseSession(s, T0 + 30 * MIN);
    expect(record.durationMs).toBe(30 * MIN);
  });
});

// ─── adjustHistoryRecord ──────────────────────────────────────────────────────

describe('adjustHistoryRecord — "+/- on a saved feeding"', () => {
  function makeRecord(totalMins: number) {
    return {
      id: '1',
      timestamp: T0 + totalMins * MIN,
      startTime: T0,
      endTime: T0 + totalMins * MIN,
      durationMs: totalMins * MIN,
      segments: [
        { type: 'Left breast', startTime: T0, endTime: T0 + totalMins * MIN, durationMs: totalMins * MIN },
      ],
    };
  }

  it('+10m increases displayed total by 10m, startTime unchanged', () => {
    const updated = adjustHistoryRecord(makeRecord(30), 10);
    expect(updated.startTime).toBe(T0);
    expect(displayedDurationMs(updated)).toBe(40 * MIN);
  });

  it('-5m decreases displayed total by 5m', () => {
    const updated = adjustHistoryRecord(makeRecord(30), -5);
    expect(displayedDurationMs(updated)).toBe(25 * MIN);
  });

  it('guard: displayed duration never goes below 1 minute', () => {
    const updated = adjustHistoryRecord(makeRecord(5), -99);
    expect(displayedDurationMs(updated)).toBeGreaterThanOrEqual(MIN);
  });

  it('segments are unchanged; only record-level excludedMs changes', () => {
    const record = {
      id: '1',
      timestamp: T0 + 40 * MIN,
      startTime: T0,
      endTime: T0 + 40 * MIN,
      durationMs: 40 * MIN,
      segments: [
        { type: 'Left breast',  startTime: T0,           endTime: T0 + 20 * MIN, durationMs: 20 * MIN },
        { type: 'Right breast', startTime: T0 + 20 * MIN, endTime: T0 + 40 * MIN, durationMs: 20 * MIN },
      ],
    };
    const updated = adjustHistoryRecord(record, 5);
    expect(updated.segments![0].durationMs).toBe(20 * MIN);
    expect(updated.segments![1].durationMs).toBe(20 * MIN);
    expect(displayedDurationMs(updated)).toBe(45 * MIN);
  });
});

// ─── Full end-to-end workflow ─────────────────────────────────────────────────

describe('End-to-end: full feeding session workflow', () => {
  it('start → +10m → switch → +10m → end  produces correct totals', () => {
    // 1. User starts left breast at T0
    let s = createSession('Left breast', undefined, T0);

    // 2. User adds +10m (forgot they started 10m ago)
    const t1 = T0 + 0; // pressing button immediately, but it's been "10m"
    s = adjustCurrentSegment(s, 10, t1);
    expect(computeActiveTimers(s, t1).currentSegMs).toBe(10 * MIN);

    // 3. User switches to right breast at T0+15m
    const tSwitch = T0 + 15 * MIN;
    s = switchSegment(s, 'Right breast', undefined, tSwitch);
    expect(s.segments[0].endTime).toBe(tSwitch);

    // 4. User adds +10m to right breast (pause-based: excludedMs = -10m so displayed = 10m)
    const t2 = tSwitch;
    s = adjustCurrentSegment(s, 10, t2);
    const { currentSegMs } = computeActiveTimers(s, t2);
    expect(currentSegMs).toBe(10 * MIN);

    // 5. User ends feeding 5m later
    const tEnd = tSwitch + 5 * MIN;
    const record = finaliseSession(s, tEnd);

    // Left: (tSwitch - T0) - excludedMs = 15m - (-10m) = 25m
    expect(record.segments![0].durationMs).toBe(25 * MIN);
    // Right: (tEnd - tSwitch) - excludedMs = 5m - (-10m) = 15m
    expect(record.segments![1].durationMs).toBe(15 * MIN);
    // Total = 25 + 15 = 40m
    expect(record.durationMs).toBe(40 * MIN);
  });

  it('switch multiple times and end: total = sum of all segment durations', () => {
    let s = createSession('Left breast', undefined, T0);
    s = switchSegment(s, 'Right breast', undefined, T0 + 10 * MIN);
    s = switchSegment(s, 'Formula', 30, T0 + 20 * MIN);
    const record = finaliseSession(s, T0 + 35 * MIN);

    const segTotal = record.segments!.reduce((a, b) => a + b.durationMs, 0);
    expect(segTotal).toBe(record.durationMs);
    expect(record.durationMs).toBe(35 * MIN);
  });
});
