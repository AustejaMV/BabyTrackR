/**
 * Server-sync protection — after I interact with a tracker, the server cannot
 * overwrite my change for the next few seconds (grace period).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

function makeGrace(graceMs = 5_000) {
  let lastStartedAt = 0, lastStoppedAt = 0, lastActionAt = 0;
  return {
    markStarted:     () => { lastStartedAt = lastActionAt = Date.now(); },
    markStopped:     () => { lastStoppedAt = lastActionAt = Date.now(); },
    markAction:      () => { lastActionAt  = Date.now(); },
    isInStartGrace:  () => Date.now() - lastStartedAt  < graceMs,
    isInStopGrace:   () => Date.now() - lastStoppedAt  < graceMs,
    isInActionGrace: () => Date.now() - lastActionAt   < graceMs,
  };
}

afterEach(() => vi.useRealTimers());

describe('Before I do anything', () => {
  it('the server can update freely — no grace period is active', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    expect(g.isInActionGrace()).toBe(false);
    expect(g.isInStartGrace()).toBe(false);
    expect(g.isInStopGrace()).toBe(false);
  });
});

describe('Right after I start a timer', () => {
  it('server polls are blocked so they cannot overwrite my new session', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markStarted();
    expect(g.isInActionGrace()).toBe(true);
    expect(g.isInStartGrace()).toBe(true);
  });

  it('the stop-grace is NOT active — only start and action are', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markStarted();
    expect(g.isInStopGrace()).toBe(false);
  });
});

describe('Right after I stop a timer', () => {
  it('server polls are blocked so they cannot restore the stopped session', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markStopped();
    expect(g.isInActionGrace()).toBe(true);
    expect(g.isInStopGrace()).toBe(true);
  });

  it('the start-grace is NOT active', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markStopped();
    expect(g.isInStartGrace()).toBe(false);
  });
});

describe('Right after I adjust time or pause/resume', () => {
  it('server polls are blocked for 5 seconds', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markAction();
    expect(g.isInActionGrace()).toBe(true);
    expect(g.isInStartGrace()).toBe(false);
    expect(g.isInStopGrace()).toBe(false);
  });
});

describe('After the grace period expires', () => {
  it('server can update normally once 5 seconds have passed', () => {
    vi.useFakeTimers();
    const g = makeGrace(5_000);
    g.markStarted();
    vi.advanceTimersByTime(5_000);
    expect(g.isInActionGrace()).toBe(false);
    expect(g.isInStartGrace()).toBe(false);
  });

  it('protection is still active just before the 5 seconds are up', () => {
    vi.useFakeTimers();
    const g = makeGrace(5_000);
    g.markStopped();
    vi.advanceTimersByTime(4_999);
    expect(g.isInStopGrace()).toBe(true);
  });
});

describe('Tapping again resets the clock', () => {
  it('a second tap within the window extends protection for another 5 seconds', () => {
    vi.useFakeTimers();
    const g = makeGrace(5_000);
    g.markAction();
    vi.advanceTimersByTime(4_000);
    g.markAction(); // tap again
    vi.advanceTimersByTime(4_000); // 8 s total, but only 4 s since last tap
    expect(g.isInActionGrace()).toBe(true);
  });
});
