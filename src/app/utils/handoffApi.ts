/**
 * API helpers for handoff session (fetch by id, save log). Uses serverUrl when available.
 */

import { serverUrl, supabaseAnonKey } from './supabase';
import type { HandoffSession, HandoffLog } from '../types/handoff';

export async function fetchHandoffSession(sessionId: string): Promise<HandoffSession | null> {
  try {
    const url = `${serverUrl}/handoff/${sessionId}`;
    const res = await fetch(url, {
      headers: { apikey: supabaseAnonKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as HandoffSession;
  } catch {
    return null;
  }
}

export async function saveHandoffSessionToServer(session: HandoffSession, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(session),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function addHandoffLog(
  sessionId: string,
  log: { type: 'feed' | 'sleep' | 'diaper'; loggedByName: string; note: string | null },
): Promise<HandoffLog | null> {
  try {
    const res = await fetch(`${serverUrl}/handoff/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
      body: JSON.stringify({ sessionId, ...log }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as HandoffLog;
  } catch {
    return null;
  }
}

export async function fetchHandoffLogs(sessionId: string): Promise<HandoffLog[]> {
  try {
    const res = await fetch(`${serverUrl}/handoff/${sessionId}/logs`, {
      headers: { apikey: supabaseAnonKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
