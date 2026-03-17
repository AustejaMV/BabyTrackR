import { serverUrl, supabaseAnonKey } from './supabase';

// ─── Sync throttler (load) ───────────────────────────────────────────────────
/** Last time we successfully called loadAllDataFromServer. Skip load if within 60s. */
let lastSyncAt = 0;
const SYNC_THROTTLE_MS = 60_000;

// ─── Batch save queue (saves within 2s are sent in one save-many) ─────────────
const BATCH_WINDOW_MS = 2_000;
interface BatchEntry {
  key: string;
  data: unknown;
}
const batchSaveQueue: BatchEntry[] = [];
let batchAccessToken: string | null = null;
let batchFlushTimer: ReturnType<typeof setTimeout> | null = null;

function flushBatchSaveQueue() {
  try {
    batchFlushTimer = null;
    if (batchSaveQueue.length === 0 || !batchAccessToken) {
      batchAccessToken = null;
      return;
    }
    const token = batchAccessToken;
    const updates = batchSaveQueue.splice(0, batchSaveQueue.length).map((e) => ({ dataType: e.key, data: e.data }));
    batchAccessToken = null;
    if (updates.length === 0 || !token) return;
    saveManyToServer(updates, token).catch((err) => {
      console.warn('[Cradl] batch save failed, re-queuing for retry', err);
      try {
        updates.forEach((u) => enqueue(u.dataType, u.data, Date.now()));
      } catch (e2) {
        console.warn('[Cradl] enqueue after batch failure failed', e2);
      }
    });
  } catch (err) {
    console.warn('[Cradl] flushBatchSaveQueue error', err);
    batchFlushTimer = null;
    batchAccessToken = null;
  }
}

function scheduleBatchFlush(accessToken: string) {
  if (!accessToken || typeof accessToken !== 'string') return;
  try {
    batchAccessToken = accessToken;
    if (batchFlushTimer != null) clearTimeout(batchFlushTimer);
    batchFlushTimer = setTimeout(flushBatchSaveQueue, BATCH_WINDOW_MS);
  } catch (err) {
    console.warn('[Cradl] scheduleBatchFlush error', err);
  }
}

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
  'temperatureHistory',
  'symptomHistory',
  'medicationHistory',
  'solidFoodHistory',
  'growthMeasurements',
  'activityHistory',
  'woundCareHistory',
  'pelvicFloorHistory',
  'breastPainHistory',
  'epdsResponses',
  'skinFlares',
  'skinCreams',
  'skinTriggers',
  'mumSleepHistory',
  'returnToWorkPlan',
  'memoryDays',
  'memoryMonthlyRecaps',
  'customTrackers',
  'customTrackerLogs',
  'spitUpHistory',
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
  temperatureHistory: [] as { id: string; timestamp: string; tempC: number; method: string; note: string | null }[],
  symptomHistory: [] as { id: string; timestamp: string; symptoms: string[]; severity: string; note: string | null }[],
  medicationHistory: [] as { id: string; timestamp: string; medication: string; doseML: number | null; note: string | null }[],
  solidFoodHistory: [] as { id: string; timestamp: string; food: string; isFirstTime: boolean; reaction: string; note: string | null; allergenFlags: string[] }[],
  growthMeasurements: [] as { id: string; date: number; weightKg?: number; heightCm?: number; headCircumferenceCm?: number }[],
  activityHistory: [] as { id: string; timestamp: string; durationMinutes: number; activityType: string; note: string | null }[],
  woundCareHistory: [] as { id: string; timestamp: string; area: string; notes: string | null; hasRedness: boolean; hasPain: boolean; painLevel: number | null }[],
  pelvicFloorHistory: [] as { id: string; date: string; completed: boolean; repsCompleted: number | null }[],
  breastPainHistory: [] as { id: string; timestamp: string; side: string; severity: number; warmth: boolean; redness: boolean; notes: string | null }[],
  epdsResponses: [] as { id: string; completedAt: string; answers: number[]; totalScore: number; flagged: boolean }[],
  skinFlares: [] as { id: string; timestamp: string; bodyAreas: string[]; severity: number; appearance: string[]; photo: string | null; note: string | null }[],
  skinCreams: [] as { id: string; timestamp: string; product: string; bodyAreas: string[]; note: string | null }[],
  skinTriggers: [] as { id: string; timestamp: string; triggerType: string; description: string; note: string | null }[],
  mumSleepHistory: [] as { id: string; date: string; sleepRange: string; loggedAt: string }[],
  returnToWorkPlan: null,
  memoryDays: [] as { id: string; date: string; note?: string | null; photoDataUrl?: string | null; createdAt: number }[],
  memoryMonthlyRecaps: [] as { id: string; yearMonth: string; note: string; createdAt: number }[],
  customTrackers: [] as { id: string; name: string; icon: string; unit?: string | null; createdAt: number }[],
  customTrackerLogs: [] as { id: string; trackerId: string; timestamp: number; value?: number | null; note?: string | null }[],
  spitUpHistory: [] as { id: string; timestamp: number; severity: string; timing: string; note: string | null }[],
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

/** Number of saves waiting to be synced (e.g. after offline). Use for sync icon. */
export function getPendingSavesCount(): number {
  return readQueue().length;
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
    console.warn(`[Cradl] save conflict for "${dataType}": server has newer data`);
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
        console.log(`[Cradl] retry #${attempt} succeeded for "${dataType}"`);
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
  if (!accessToken || typeof accessToken !== 'string') return;
  try {
    const queue = readQueue();
    if (queue.length === 0) return;
    console.log(`[Cradl] flushing ${queue.length} pending save(s) from previous session`);
    for (const { dataType, data, clientUpdatedAt } of queue) {
      try {
        const existing = retrySlots.get(dataType);
        if (existing != null) {
          clearTimeout(existing.timer);
          retrySlots.delete(dataType);
        }
        doSave(dataType, data, accessToken, clientUpdatedAt).catch(() => {
          scheduleRetry(dataType, data, accessToken, clientUpdatedAt, 0);
        });
      } catch (e) {
        console.warn(`[Cradl] flushPendingSaves item failed for "${dataType}"`, e);
      }
    }
  } catch (e) {
    console.warn('[Cradl] flushPendingSaves failed', e);
  }
}

/** Save to both localStorage and server. When token is present, enqueues to batch and flushes after 2s (single save-many). */
export function saveData(key: string, value: unknown, accessToken?: string) {
  if (key == null || key === '') {
    console.warn('[Cradl] saveData called with invalid key');
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // QuotaExceededError (disk full) or SecurityError (private browsing sandbox)
    console.warn(`[Cradl] localStorage.setItem("${key}") failed:`, e);
  }
  if (accessToken) {
    try {
      const existing = batchSaveQueue.findIndex((e) => e.key === key);
      if (existing >= 0) batchSaveQueue[existing] = { key, data: value };
      else batchSaveQueue.push({ key, data: value });
      scheduleBatchFlush(accessToken);
    } catch (e) {
      console.warn('[Cradl] batch queue / scheduleBatchFlush failed', e);
    }
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
  if (!accessToken || typeof accessToken !== 'string') return;
  if (!Array.isArray(updates) || updates.length === 0) return;
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
  if (!accessToken || typeof accessToken !== 'string') {
    return { ok: false, data: {} };
  }
  if (Date.now() - lastSyncAt < SYNC_THROTTLE_MS) {
    return { ok: false, data: {} };
  }
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
      console.error('[Cradl] GET /data/all: response not JSON', { status: response.status, url });
      return { ok: false, data: {} };
    }
    const data = result?.data ?? {};
    const _debug = result?._debug;
    if (!response.ok) {
      console.warn('[Cradl] GET /data/all failed', { status: response.status, error: result?.error });
      return { ok: false, data: {}, _debug };
    }
    lastSyncAt = Date.now();
    return { ok: true, data, _debug };
  } catch (error) {
    console.error('[Cradl] GET /data/all network error', { url, error });
    return { ok: false, data: {} };
  }
}

/** Clear all synced family data from localStorage (e.g. before loading a different family). */
export function clearSyncedDataFromLocalStorage() {
  try {
    SYNCED_DATA_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore per-key failures (e.g. private mode)
      }
    });
  } catch (e) {
    console.warn('[Cradl] clearSyncedDataFromLocalStorage failed', e);
  }
}
