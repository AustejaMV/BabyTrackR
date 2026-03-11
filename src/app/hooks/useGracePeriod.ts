import { useRef } from 'react';

/**
 * Provides grace-period guards to prevent polling race conditions.
 *
 * When you start a session, mark it with `markStarted()`. For the next
 * `graceMs`, `isInStartGrace()` returns true — the poll won't apply a
 * server null that arrived before the save reached the server.
 *
 * When you stop a session, mark it with `markStopped()`. For the next
 * `graceMs`, `isInStopGrace()` returns true — the poll won't restore
 * a stale active session from before the stop reached the server.
 *
 * Each guard is independent, so a stop from ANOTHER user always propagates
 * immediately to watchers (they never called `markStarted`/`markStopped`).
 */
export function useGracePeriod(graceMs = 5_000) {
  const lastStartedAt = useRef(0);
  const lastStoppedAt = useRef(0);

  return {
    markStarted: () => { lastStartedAt.current = Date.now(); },
    markStopped: () => { lastStoppedAt.current = Date.now(); },
    isInStartGrace: () => Date.now() - lastStartedAt.current < graceMs,
    isInStopGrace:  () => Date.now() - lastStoppedAt.current < graceMs,
  };
}
