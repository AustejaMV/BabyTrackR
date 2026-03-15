import { serverUrl, supabaseAnonKey } from './supabase';

// Keys that are synced per family (must match server DATA_TYPES)
export const SYNCED_DATA_KEYS = [
  'sleepHistory',
  'feedingHistory',
  'diaperHistory',
  'tummyTimeHistory',
  'bottleHistory',
  'pumpHistory',
  'currentSleep',
  'currentTummyTime',
  'feedingInterval',
  'feedingActiveSession',
  'painkillerHistory',
  'notes',
  'shoppingList',
  'babyProfile',
  'milestones',
] as const;

/** Default value when server doesn't return a key. */
export const SYNCED_DATA_DEFAULTS: Record<(typeof SYNCED_DATA_KEYS)[number], unknown> = {
  sleepHistory: [],
  feedingHistory: [],
  diaperHistory: [],
  tummyTimeHistory: [],
  bottleHistory: [],
  pumpHistory: [],
  currentSleep: null,
  currentTummyTime: null,
  feedingInterval: '3',
  feedingActiveSession: null,
  painkillerHistory: [],
  notes: [],
  shoppingList: [],
  babyProfile: null as { birthDate: number; name?: string } | null,
  milestones: [] as { id: string; label: string; typicalDaysMin: number; typicalDaysMax: number; achievedAt?: number }[],
};

/** Poll interval when any live session is active (feeding, sleep, tummy time). */
export const POLL_MS_ACTIVE = 4_000;

/** Poll interval when nothing is active. Slower to reduce server cost. */
export const POLL_MS_IDLE = 20_000;

// ─── Retry engine ─────────────────────────────────────────────────────────────

/**
 * Exponential back-off delays (ms) for transient failures.
 * After the last entry the delay stays at 60 s indefinitely.
 */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000] as const;

interface PendingRetry {
  timer: ReturnType<typeof setTimeout>;
  attempt: number;
}

/**
 * One slot per dataType. When a new save for the same key arrives, the
 * previous pending retry is cancelled and replaced — the new data supersedes it.
 */
const retrySlots = new Map<string, PendingRetry>();

// ─── Persisted pending-saves queue ────────────────────────────────────────────
//
// Problem: if a save fails and the user closes the tab before the retry fires,
// the in-memory retry timer is lost.  We persist the queue to localStorage so
// the next session can replay it.
//
// Key: { dataType, data, clientUpdatedAt }[]
// On success / 409-conflict the entry is removed.
// On startup call `flushPendingSaves(accessToken)` (done in AuthContext).

const PENDING_QUEUE_KEY = '__bt_pending_saves__';

interface QueuedSave {
  dataType: string;
  data: unknown;
  clientUpdatedAt: number;
}

function readQueue(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSave[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedSave[]) {
  try {
    if (items.length === 0) {
      localStorage.removeItem(PENDING_QUEUE_KEY);
    } else {
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(items));
    }
  } catch { /* storage full — best effort */ }
}

function enqueue(dataType: string, data: unknown, clientUpdatedAt: number) {
  const existing = readQueue().filter((q) => q.dataType !== dataType);
  writeQueue([...existing, { dataType, data, clientUpdatedAt }]);
}

function dequeue(dataType: string) {
  writeQueue(readQueue().filter((q) => q.dataType !== dataType));
}

/**
 * Low-level HTTP send for a single save.
 *
 * Returns:
 *   'ok'       — server accepted the write
 *   'conflict' — server has a newer write; stop retrying
 *   throws     — transient failure; caller should retry
 */
async function doSave(
  dataType: string,
  data: unknown,
  accessToken: string,
  clientUpdatedAt: number,
): Promise<'ok' | 'conflict'> {
  const response = await fetch(`${serverUrl}/data/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ dataType, data, clientUpdatedAt }),
  });

  if (response.status === 409) {
    console.warn(`[BabyTracker] save conflict for "${dataType}": server has newer data`);
    dequeue(dataType); // server is ahead — no point replaying this
    return 'conflict';
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  dequeue(dataType); // successfully saved — remove from persist queue
  return 'ok';
}

/**
 * Schedule the next retry for a dataType, honouring exponential back-off.
 * If a new save for the same key arrives before the retry fires, this timer
 * will be cancelled and a fresh save will start from attempt 0.
 */
function scheduleRetry(
  dataType: string,
  data: unknown,
  accessToken: string,
  clientUpdatedAt: number,
  attempt: number,
) {
  const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
  const timer = setTimeout(async () => {
    retrySlots.delete(dataType);
    try {
      const result = await doSave(dataType, data, accessToken, clientUpdatedAt);
      if (result === 'ok') {
        console.log(`[BabyTracker] retry #${attempt} succeeded for "${dataType}"`);
      }
    } catch {
      scheduleRetry(dataType, data, accessToken, clientUpdatedAt, attempt + 1);
    }
  }, delay);

  retrySlots.set(dataType, { timer, attempt });
}

/**
 * Send data to the server with automatic retry on failure.
 *
 * - Captures `clientUpdatedAt = Date.now()` at call time (the moment of the
 *   user action) so the server can compare it against concurrent writes.
 * - Cancels any pending retry for the same key; the new data supersedes it.
 * - Persists the save to localStorage so it survives a tab close.
 * - Stops retrying if the server returns 409 (its data is already newer).
 * - Keeps retrying on network errors / 5xx with exponential back-off up to 60 s.
 */
export function syncDataToServer(dataType: string, data: unknown, accessToken: string) {
  const clientUpdatedAt = Date.now();

  // Cancel any pending retry for this key
  const existing = retrySlots.get(dataType);
  if (existing != null) {
    clearTimeout(existing.timer);
    retrySlots.delete(dataType);
  }

  // Persist so next session can replay if this tab closes before success
  enqueue(dataType, data, clientUpdatedAt);

  doSave(dataType, data, accessToken, clientUpdatedAt).catch(() => {
    scheduleRetry(dataType, data, accessToken, clientUpdatedAt, 0);
  });
}

/**
 * Replay any saves that were persisted to localStorage but never confirmed
 * by the server (e.g. because the tab was closed mid-retry).
 *
 * Call this once on app startup after the user is authenticated.
 * The server's conflict detection ensures stale replays are safely rejected.
 */
export function flushPendingSaves(accessToken: string) {
  const queue = readQueue();
  if (queue.length === 0) return;
  console.log(`[BabyTracker] flushing ${queue.length} pending save(s) from previous session`);
  for (const { dataType, data, clientUpdatedAt } of queue) {
    // Cancel any in-memory retry for this key (avoid double-send)
    const existing = retrySlots.get(dataType);
    if (existing != null) {
      clearTimeout(existing.timer);
      retrySlots.delete(dataType);
    }
    doSave(dataType, data, accessToken, clientUpdatedAt).catch(() => {
      scheduleRetry(dataType, data, accessToken, clientUpdatedAt, 0);
    });
  }
}

/** Save to both localStorage and server (with retry). */
export function saveData(key: string, value: unknown, accessToken?: string) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // QuotaExceededError (disk full) or SecurityError (private browsing sandbox)
    console.warn(`[BabyTracker] localStorage.setItem("${key}") failed:`, e);
  }
  if (accessToken) {
    syncDataToServer(key, value, accessToken);
  }
}

// ─── Batch save ───────────────────────────────────────────────────────────────

/**
 * Save multiple data keys in a single request (cheaper than N sequential saves).
 * Each entry carries its own clientUpdatedAt so the server can detect conflicts
 * per-key. The whole batch is best-effort — individual conflicts are logged
 * but do not cause a retry of the unaffected keys.
 */
export async function saveManyToServer(
  updates: { dataType: string; data: unknown }[],
  accessToken: string,
) {
  const clientUpdatedAt = Date.now();
  try {
    const response = await fetch(`${serverUrl}/data/save-many`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        updates: updates.map((u) => ({ ...u, clientUpdatedAt })),
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('saveManyToServer failed:', response.status, text);
    }
  } catch (error) {
    console.error('saveManyToServer network error:', error);
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export type LoadAllDataResult = {
  ok: boolean;
  data: Record<string, unknown>;
  _debug?: {
    familyId: string | null;
    userId?: string;
    keysQueried?: number;
    rowsReturned?: number;
    keysWithData?: number;
    reason?: string;
  };
};

export async function loadAllDataFromServer(accessToken: string): Promise<LoadAllDataResult> {
  const url = `${serverUrl}/data/all`;
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    let result: { data?: Record<string, unknown>; error?: string; _debug?: LoadAllDataResult['_debug'] } = {};
    try {
      result = await response.json();
    } catch {
      console.error('[BabyTracker] GET /data/all: response not JSON', { status: response.status, url });
      return { ok: false, data: {} };
    }
    const data = result?.data ?? {};
    const _debug = result?._debug;
    if (!response.ok) {
      console.warn('[BabyTracker] GET /data/all failed', { status: response.status, error: result?.error });
      return { ok: false, data: {}, _debug };
    }
    return { ok: true, data, _debug };
  } catch (error) {
    console.error('[BabyTracker] GET /data/all network error', { url, error });
    return { ok: false, data: {} };
  }
}

/** Clear all synced family data from localStorage (e.g. before loading a different family). */
export function clearSyncedDataFromLocalStorage() {
  SYNCED_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
}
