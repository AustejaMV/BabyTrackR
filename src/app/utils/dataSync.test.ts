import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the retry engine logic, extracted into a pure form so we don't need
 * to mock the entire fetch stack.  We verify the back-off schedule and the
 * cancellation behaviour.
 */

// ─── Extracted retry logic (mirrors dataSync.ts implementation) ───────────────

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000] as const;

function makeRetryEngine() {
  const retrySlots = new Map<string, { timer: ReturnType<typeof setTimeout>; attempt: number }>();
  const log: { type: 'attempt' | 'success' | 'conflict' | 'schedule'; key: string; attempt?: number; delay?: number }[] = [];

  function scheduleRetry(
    key: string,
    attempt: number,
    task: () => Promise<'ok' | 'conflict'>,
  ) {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    log.push({ type: 'schedule', key, attempt, delay });
    const timer = setTimeout(async () => {
      retrySlots.delete(key);
      log.push({ type: 'attempt', key, attempt });
      try {
        const result = await task();
        if (result === 'conflict') {
          log.push({ type: 'conflict', key, attempt });
        } else {
          log.push({ type: 'success', key, attempt });
        }
      } catch {
        scheduleRetry(key, attempt + 1, task);
      }
    }, delay);
    retrySlots.set(key, { timer, attempt });
  }

  function save(key: string, task: () => Promise<'ok' | 'conflict'>) {
    // Cancel pending retry for this key
    const existing = retrySlots.get(key);
    if (existing != null) {
      clearTimeout(existing.timer);
      retrySlots.delete(key);
      log.push({ type: 'schedule', key, attempt: 0, delay: 0 }); // superseded
    }
    // Immediate attempt
    log.push({ type: 'attempt', key, attempt: 0 });
    task().then((result) => {
      if (result === 'conflict') log.push({ type: 'conflict', key });
      else log.push({ type: 'success', key });
    }).catch(() => {
      scheduleRetry(key, 0, task);
    });
  }

  return { save, log, retrySlots };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('retry back-off schedule', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('succeeds on first attempt — no retries scheduled', async () => {
    const { save, log } = makeRetryEngine();
    save('key', () => Promise.resolve('ok'));
    await vi.runAllTimersAsync();
    expect(log.filter((e) => e.type === 'attempt')).toHaveLength(1);
    expect(log.filter((e) => e.type === 'success')).toHaveLength(1);
    expect(log.filter((e) => e.type === 'schedule')).toHaveLength(0);
  });

  it('retries once after 1 s on first failure, then succeeds', async () => {
    const { save, log } = makeRetryEngine();
    let calls = 0;
    save('key', () => {
      calls++;
      if (calls === 1) return Promise.reject(new Error('network'));
      return Promise.resolve('ok');
    });
    await vi.runAllTimersAsync();
    const schedules = log.filter((e) => e.type === 'schedule');
    expect(schedules).toHaveLength(1);
    expect(schedules[0].delay).toBe(1_000);
    expect(log.filter((e) => e.type === 'success')).toHaveLength(1);
  });

  it('back-off delays follow the schedule', async () => {
    const { save, log } = makeRetryEngine();
    let calls = 0;
    save('key', () => {
      calls++;
      if (calls <= 4) return Promise.reject(new Error('network'));
      return Promise.resolve('ok');
    });
    await vi.runAllTimersAsync();
    const delays = log.filter((e) => e.type === 'schedule').map((e) => e.delay);
    // attempt=0 is the immediate call; first retry uses RETRY_DELAYS_MS[0] = 1000
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000]);
  });

  it('caps retry delay at 60 s for subsequent attempts', async () => {
    const { save, log } = makeRetryEngine();
    let calls = 0;
    save('key', () => {
      calls++;
      if (calls <= 10) return Promise.reject(new Error('network'));
      return Promise.resolve('ok');
    });
    await vi.runAllTimersAsync();
    const delays = log.filter((e) => e.type === 'schedule').map((e) => e.delay);
    // All delays after index 6 should be capped at 60_000
    expect(delays[RETRY_DELAYS_MS.length - 1]).toBe(60_000);
    delays.slice(RETRY_DELAYS_MS.length).forEach((d) => expect(d).toBe(60_000));
  });

  it('stops immediately on 409 conflict — no further retries', async () => {
    const { save, log } = makeRetryEngine();
    save('key', () => Promise.resolve('conflict'));
    await vi.runAllTimersAsync();
    expect(log.filter((e) => e.type === 'conflict')).toHaveLength(1);
    expect(log.filter((e) => e.type === 'schedule')).toHaveLength(0);
  });
});

describe('retry cancellation (new save supersedes old)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cancels pending retry when a new save arrives for the same key', async () => {
    const { save, retrySlots } = makeRetryEngine();
    let firstCalls = 0;
    // First save: always fails → schedules retry
    save('key', () => {
      firstCalls++;
      return Promise.reject(new Error('network'));
    });
    // .then().catch() on a rejected promise is a two-tick chain:
    // tick 1: .then() propagates the rejection; tick 2: .catch() runs scheduleRetry.
    await Promise.resolve();
    await Promise.resolve();
    // Now the retry is scheduled
    expect(retrySlots.has('key')).toBe(true);
    let secondCalls = 0;
    save('key', () => {
      secondCalls++;
      return Promise.resolve('ok');
    });
    // The old retry slot should be gone (cancelled)
    expect(retrySlots.has('key')).toBe(false);

    await vi.runAllTimersAsync();
    // The second task ran; the first's retry never fired
    expect(firstCalls).toBe(1);  // only the original attempt
    expect(secondCalls).toBe(1);
  });
});
