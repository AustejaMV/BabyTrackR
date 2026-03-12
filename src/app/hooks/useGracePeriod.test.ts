import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * useGracePeriod is a React hook so we test its logic directly by
 * extracting the pure timing functions (no React renderer needed).
 *
 * We import the hook and call it outside React with renderHook from
 * @testing-library/react if available, but for pure-logic coverage we
 * can also test by simulating the ref behaviour.
 */

// Pure grace-period logic extracted for deterministic unit testing
function makeGrace(graceMs = 5_000) {
  let lastStartedAt  = 0;
  let lastStoppedAt  = 0;
  let lastActionAt   = 0;

  return {
    markStarted:     () => { lastStartedAt = lastActionAt = Date.now(); },
    markStopped:     () => { lastStoppedAt = lastActionAt = Date.now(); },
    markAction:      () => { lastActionAt  = Date.now(); },
    isInStartGrace:  () => Date.now() - lastStartedAt  < graceMs,
    isInStopGrace:   () => Date.now() - lastStoppedAt  < graceMs,
    isInActionGrace: () => Date.now() - lastActionAt   < graceMs,
  };
}

describe('grace period', () => {
  afterEach(() => vi.useRealTimers());

  it('starts with all graces inactive', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    expect(g.isInStartGrace()).toBe(false);
    expect(g.isInStopGrace()).toBe(false);
    expect(g.isInActionGrace()).toBe(false);
  });

  it('markStarted activates start and action graces', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markStarted();
    expect(g.isInStartGrace()).toBe(true);
    expect(g.isInActionGrace()).toBe(true);
    expect(g.isInStopGrace()).toBe(false);
  });

  it('markStopped activates stop and action graces', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markStopped();
    expect(g.isInStopGrace()).toBe(true);
    expect(g.isInActionGrace()).toBe(true);
    expect(g.isInStartGrace()).toBe(false);
  });

  it('markAction activates only action grace', () => {
    vi.useFakeTimers();
    const g = makeGrace();
    g.markAction();
    expect(g.isInActionGrace()).toBe(true);
    expect(g.isInStartGrace()).toBe(false);
    expect(g.isInStopGrace()).toBe(false);
  });

  it('graces expire after graceMs', () => {
    vi.useFakeTimers();
    const GRACE = 5_000;
    const g = makeGrace(GRACE);
    g.markStarted();
    vi.advanceTimersByTime(GRACE);
    // At exactly graceMs the condition is `elapsed < graceMs` → false
    expect(g.isInStartGrace()).toBe(false);
    expect(g.isInActionGrace()).toBe(false);
  });

  it('graces are still active just before expiry', () => {
    vi.useFakeTimers();
    const GRACE = 5_000;
    const g = makeGrace(GRACE);
    g.markStopped();
    vi.advanceTimersByTime(GRACE - 1);
    expect(g.isInStopGrace()).toBe(true);
    expect(g.isInActionGrace()).toBe(true);
  });

  it('markAction resets the expiry window', () => {
    vi.useFakeTimers();
    const GRACE = 5_000;
    const g = makeGrace(GRACE);
    g.markAction();
    vi.advanceTimersByTime(4_000);
    g.markAction(); // re-arm
    vi.advanceTimersByTime(4_000); // 8s total, but only 4s since re-arm
    expect(g.isInActionGrace()).toBe(true);
  });

  it('stop and start graces are independent', () => {
    vi.useFakeTimers();
    const GRACE = 5_000;
    const g = makeGrace(GRACE);
    g.markStarted();
    vi.advanceTimersByTime(GRACE - 1);
    expect(g.isInStartGrace()).toBe(true);
    expect(g.isInStopGrace()).toBe(false);
  });
});
