import { useRef } from 'react';

/**
 * Grace-period guards to prevent server-poll race conditions.
 *
 * Problem: when the user takes a local action (start, stop, pause, resume,
 * adjust time, etc.) the server doesn't receive the save instantly. A poll
 * that fires in the gap will get stale server data and overwrite the fresh
 * local state, making the UI look like the action was ignored.
 *
 * Solution: call `markAction()` (or the specialised `markStarted` /
 * `markStopped`) immediately in every user-action handler. Poll handlers
 * must check `isInActionGrace()` before applying any server state.
 *
 *   markStarted / markStopped  – also mark the action window, so the
 *     directional guards (isInStartGrace / isInStopGrace) stay as a
 *     second layer of specificity.
 */
export function useGracePeriod(graceMs = 5_000) {
  const lastStartedAt = useRef(0);
  const lastStoppedAt = useRef(0);
  const lastActionAt  = useRef(0);   // ANY local action

  return {
    markStarted: () => {
      lastStartedAt.current = Date.now();
      lastActionAt.current  = Date.now();
    },
    markStopped: () => {
      lastStoppedAt.current = Date.now();
      lastActionAt.current  = Date.now();
    },
    /** Call for any local action that isn't a full start/stop (pause, resume, adjust, etc.) */
    markAction: () => {
      lastActionAt.current = Date.now();
    },

    isInStartGrace:  () => Date.now() - lastStartedAt.current < graceMs,
    isInStopGrace:   () => Date.now() - lastStoppedAt.current < graceMs,
    /** True for `graceMs` after ANY local action. Use to block polls from overwriting local state. */
    isInActionGrace: () => Date.now() - lastActionAt.current  < graceMs,
  };
}
