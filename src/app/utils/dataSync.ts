import { serverUrl, supabaseAnonKey } from './supabase';

// Keys that are synced per family (must match server DATA_TYPES)
export const SYNCED_DATA_KEYS = [
  'sleepHistory',
  'feedingHistory',
  'diaperHistory',
  'tummyTimeHistory',
  'currentSleep',
  'currentTummyTime',
  'feedingInterval',
  'feedingActiveSession',
  'painkillerHistory',
  'notes',
] as const;

/** Default value when server doesn't return a key. Use these so inputs never get "[]" (e.g. feedingInterval must be "3" not []). */
export const SYNCED_DATA_DEFAULTS: Record<(typeof SYNCED_DATA_KEYS)[number], unknown> = {
  sleepHistory: [],
  feedingHistory: [],
  diaperHistory: [],
  tummyTimeHistory: [],
  currentSleep: null,
  currentTummyTime: null,
  feedingInterval: '3',
  feedingActiveSession: null,
  painkillerHistory: [],
  notes: [],
};

export async function syncDataToServer(dataType: string, data: any, accessToken: string) {
  try {
    const response = await fetch(`${serverUrl}/data/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ dataType, data }),
    });
    
    if (!response.ok) {
      console.error(`Error syncing ${dataType}:`, await response.text());
    }
  } catch (error) {
    console.error(`Error syncing ${dataType}:`, error);
  }
}

export async function loadDataFromServer(dataType: string, accessToken: string) {
  try {
    const response = await fetch(`${serverUrl}/data/${dataType}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Error loading ${dataType}:`, error);
    return null;
  }
}

export type LoadAllDataResult = {
  ok: boolean;
  data: Record<string, unknown>;
  _debug?: { familyId: string | null; userId?: string; keysQueried?: number; rowsReturned?: number; keysWithData?: number; reason?: string };
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
    } catch (parseErr) {
      console.error('[BabyTracker] GET /data/all: response not JSON', { status: response.status, url });
      return { ok: false, data: {} };
    }
    const data = result?.data ?? {};
    const keys = Object.keys(data);
    const summary = keys.map((k) => {
      const v = data[k];
      if (Array.isArray(v)) return `${k}:${v.length}`;
      if (v && typeof v === 'object') return `${k}:obj`;
      return `${k}:${typeof v}`;
    });
    const _debug = result?._debug;
    console.log('[BabyTracker] GET /data/all', {
      status: response.status,
      ok: response.ok,
      keys: keys.length,
      summary: summary.join(', ') || '(empty)',
      _debug: _debug ?? '(none)',
    });
    if (_debug) {
      console.log('[BabyTracker] Server says: familyId =', _debug.familyId, '| rowsReturned =', _debug.rowsReturned, '| keysWithData =', _debug.keysWithData, _debug.reason ? `| reason: ${_debug.reason}` : '');
    }
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

// Helper to save to both localStorage and server
export function saveData(key: string, value: any, accessToken?: string) {
  localStorage.setItem(key, JSON.stringify(value));
  
  if (accessToken) {
    syncDataToServer(key, value, accessToken);
  }
}

// Helper to load from localStorage first, then sync from server
export async function loadData(key: string, accessToken?: string) {
  const localData = localStorage.getItem(key);
  
  if (accessToken) {
    const serverData = await loadDataFromServer(key, accessToken);
    if (serverData !== null) {
      localStorage.setItem(key, JSON.stringify(serverData));
      return serverData;
    }
  }
  
  return localData ? JSON.parse(localData) : null;
}

/** Clear all synced family data from localStorage (e.g. before loading a different family). */
export function clearSyncedDataFromLocalStorage() {
  SYNCED_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
}
