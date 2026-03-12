import { describe, it, expect } from 'vitest';
import type { FeedingSegment, FeedingRecord } from '../types';

// ─── helpers that mirror FeedingTracking.tsx logic ───────────────────────────

/** Total duration = sum of completed segment wall-clock durations. */
function segmentSum(segments: Pick<FeedingSegment, 'startTime' | 'endTime'>[]): number {
  return segments.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0);
}

/** Time-adjust: move first segment startTime back by `mins` minutes. */
function adjustFirstSegmentStart(
  segs: FeedingSegment[],
  mins: number,
): { segments: FeedingSegment[]; sessionStartTime: number } {
  const delta = mins * 60_000;
  const updated = segs.map((seg, i) =>
    i === 0 ? { ...seg, startTime: seg.startTime - delta } : seg,
  );
  return { segments: updated, sessionStartTime: updated[0].startTime };
}

/** History adjust: bump first segment startTime + recompute durationMs. */
function adjustHistoryRecord(record: FeedingRecord, mins: number): FeedingRecord {
  const delta = mins * 60_000;
  const segs = (record.segments ?? []).map((seg, i) =>
    i === 0
      ? { ...seg, startTime: seg.startTime - delta, durationMs: (seg.durationMs ?? 0) + delta }
      : seg,
  );
  const newDurationMs =
    segs.length > 0
      ? segs.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)
      : (record.durationMs ?? 0) + delta;
  return { ...record, startTime: record.startTime - delta, segments: segs, durationMs: newDurationMs };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('feeding segment sum', () => {
  const T0 = 1_000_000; // arbitrary base timestamp (ms)

  it('single segment', () => {
    const segs = [{ startTime: T0, endTime: T0 + 24 * 60_000 }];
    expect(segmentSum(segs)).toBe(24 * 60_000);
  });

  it('two segments sum correctly (the original bug scenario)', () => {
    // Left breast 24 min + Right breast 30 min = 54 min total
    const segs = [
      { startTime: T0,                 endTime: T0 + 24 * 60_000 },
      { startTime: T0 + 24 * 60_000,   endTime: T0 + 54 * 60_000 },
    ];
    expect(segmentSum(segs) / 60_000).toBe(54);
  });

  it('gap between segments does NOT inflate total', () => {
    // 10 min segment, then 5 min gap, then 10 min segment → should be 20 min not 25
    const segs = [
      { startTime: T0,              endTime: T0 + 10 * 60_000 },
      { startTime: T0 + 15 * 60_000, endTime: T0 + 25 * 60_000 },
    ];
    expect(segmentSum(segs) / 60_000).toBe(20);
  });

  it('three segments', () => {
    const segs = [
      { startTime: T0,                endTime: T0 + 10 * 60_000 },
      { startTime: T0 + 10 * 60_000,  endTime: T0 + 27 * 60_000 },
      { startTime: T0 + 27 * 60_000,  endTime: T0 + 40 * 60_000 },
    ];
    expect(segmentSum(segs) / 60_000).toBe(40);
  });
});

describe('adjustFirstSegmentStart (active session)', () => {
  const T0 = 1_000_000;

  it('+5 min moves first segment back 5 minutes', () => {
    const segs: FeedingSegment[] = [
      { type: 'Left breast', startTime: T0, endTime: T0 + 20 * 60_000, durationMs: 20 * 60_000 },
    ];
    const { segments } = adjustFirstSegmentStart(segs, 5);
    expect(segments[0].startTime).toBe(T0 - 5 * 60_000);
  });

  it('sessionStartTime is updated to match new first segment startTime', () => {
    const segs: FeedingSegment[] = [
      { type: 'Left breast', startTime: T0, endTime: T0 + 20 * 60_000, durationMs: 20 * 60_000 },
    ];
    const { sessionStartTime } = adjustFirstSegmentStart(segs, 10);
    expect(sessionStartTime).toBe(T0 - 10 * 60_000);
  });

  it('-5 min (subtract) shortens the session', () => {
    const segs: FeedingSegment[] = [
      { type: 'Left breast', startTime: T0, endTime: T0 + 20 * 60_000, durationMs: 20 * 60_000 },
    ];
    const { segments } = adjustFirstSegmentStart(segs, -5);
    expect(segments[0].startTime).toBe(T0 + 5 * 60_000);
  });

  it('only the first segment is moved; subsequent segments are unchanged', () => {
    const segs: FeedingSegment[] = [
      { type: 'Left breast',  startTime: T0,               endTime: T0 + 15 * 60_000, durationMs: 15 * 60_000 },
      { type: 'Right breast', startTime: T0 + 15 * 60_000, endTime: T0 + 30 * 60_000, durationMs: 15 * 60_000 },
    ];
    const { segments } = adjustFirstSegmentStart(segs, 5);
    expect(segments[1].startTime).toBe(T0 + 15 * 60_000); // unchanged
    expect(segments[1].endTime).toBe(T0 + 30 * 60_000);   // unchanged
  });
});

describe('adjustHistoryRecord', () => {
  const T0 = 1_000_000;

  it('+10 min increases total durationMs by 10 min', () => {
    const record: FeedingRecord = {
      id: '1',
      timestamp: T0 + 30 * 60_000,
      startTime: T0,
      endTime:   T0 + 30 * 60_000,
      durationMs: 30 * 60_000,
      segments: [
        { type: 'Left breast', startTime: T0, endTime: T0 + 30 * 60_000, durationMs: 30 * 60_000 },
      ],
    };
    const updated = adjustHistoryRecord(record, 10);
    expect(updated.durationMs).toBe(40 * 60_000);
  });

  it('record startTime shifts back by the delta', () => {
    const record: FeedingRecord = {
      id: '1',
      timestamp: T0 + 20 * 60_000,
      startTime: T0,
      endTime:   T0 + 20 * 60_000,
      durationMs: 20 * 60_000,
      segments: [
        { type: 'Formula', startTime: T0, endTime: T0 + 20 * 60_000, durationMs: 20 * 60_000 },
      ],
    };
    const updated = adjustHistoryRecord(record, 5);
    expect(updated.startTime).toBe(T0 - 5 * 60_000);
  });

  it('-1 min (subtract) decreases total durationMs', () => {
    const record: FeedingRecord = {
      id: '1',
      timestamp: T0 + 15 * 60_000,
      startTime: T0,
      endTime:   T0 + 15 * 60_000,
      durationMs: 15 * 60_000,
      segments: [
        { type: 'Left breast', startTime: T0, endTime: T0 + 15 * 60_000, durationMs: 15 * 60_000 },
      ],
    };
    const updated = adjustHistoryRecord(record, -1);
    expect(updated.durationMs).toBe(14 * 60_000);
  });
});
