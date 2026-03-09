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
  'painkillerHistory',
  'notes',
] as const;

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

export async function loadAllDataFromServer(accessToken: string) {
  try {
    const response = await fetch(`${serverUrl}/data/all`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const result = await response.json();
    return result.data || {};
  } catch (error) {
    console.error('Error loading all data:', error);
    return {};
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
