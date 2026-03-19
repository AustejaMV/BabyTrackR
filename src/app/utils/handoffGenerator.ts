/**
 * Generate handoff session from current localStorage state. Safe defaults; never throws.
 */

import { format } from 'date-fns';
import type { HandoffSession, HandoffLog } from '../types/handoff';
import { getSweetSpotPrediction } from './napPrediction';
import { getMoodForDate } from './moodStorage';
import { TIME_DISPLAY } from './dateUtils';

const HANDOFF_SESSIONS_KEY = 'cradl-handoff-sessions';
const DEFAULT_FEED_INTERVAL_MS = 3 * 60 * 60 * 1000;

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function toISO(ms: number): string {
  try {
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function formatTime(ms: number): string {
  try {
    return format(new Date(ms), TIME_DISPLAY());
  } catch {
    return '—';
  }
}

/** Map sweet spot status to nap window status. */
function napStatusFromSweetSpot(status: 'green' | 'amber' | 'red' | 'unknown'): HandoffSession['napWindowStatus'] {
  switch (status) {
    case 'green': return 'open';
    case 'amber': return 'approaching';
    case 'red': return 'closed';
    default: return 'unknown';
  }
}

/**
 * Generate a handoff session from current baby data. Never throws; returns safe defaults for missing data.
 */
export function generateHandoffSession(babyName: string, headsUp: string | null): HandoffSession {
  const id = `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = Date.now();
  const createdAt = toISO(now);
  const expiresAt = toISO(now + 24 * 60 * 60 * 1000);

  const feedingHistory = safeJson<Array<{ timestamp?: number; endTime?: number; durationMs?: number; segments?: Array<{ type?: string; durationMs?: number }> }>>('feedingHistory', []);
  const sleepHistory = safeJson<Array<{ startTime?: number; endTime?: number }>>('sleepHistory', []);
  const diaperHistory = safeJson<Array<{ timestamp?: number; type?: string }>>('diaperHistory', []);
  const babyProfile = safeJson<{ birthDate?: number; name?: string } | null>('babyProfile', null);

  const name = typeof babyName === 'string' && babyName.trim() ? babyName.trim() : (babyProfile?.name ?? 'Baby');

  let lastFeed: HandoffSession['lastFeed'] = null;
  const withEnd = feedingHistory.filter((f) => (f.endTime ?? f.timestamp) != null).sort((a, b) => (b.endTime ?? b.timestamp ?? 0) - (a.endTime ?? a.timestamp ?? 0));
  if (withEnd.length > 0) {
    const last = withEnd[0];
    const endMs = last.endTime ?? last.timestamp ?? 0;
    let durationSeconds = 0;
    let side: string | null = null;
    if (last.segments?.length) {
      durationSeconds = Math.round((last.segments.reduce((s, seg) => s + (seg.durationMs ?? 0), 0)) / 1000);
      const firstSeg = last.segments[0];
      if (firstSeg?.type === 'left' || firstSeg?.type === 'right') side = firstSeg.type;
    } else {
      durationSeconds = Math.round((last.durationMs ?? 0) / 1000);
      if ((last as { type?: string }).type === 'left' || (last as { type?: string }).type === 'right') side = (last as { type?: string }).type;
    }
    lastFeed = { time: formatTime(endMs), side, durationSeconds };
  }

  let nextFeedEta: string | null = null;
  if (withEnd.length > 0) {
    const lastEndMs = withEnd[0].endTime ?? withEnd[0].timestamp ?? 0;
    const intervals: number[] = [];
    for (let i = 1; i < withEnd.length; i++) {
      const prev = withEnd[i].endTime ?? withEnd[i].timestamp ?? 0;
      if (prev > 0) intervals.push(lastEndMs - prev);
    }
    const avgIntervalMs = intervals.length >= 3
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : DEFAULT_FEED_INTERVAL_MS;
    nextFeedEta = toISO(lastEndMs + Math.round(avgIntervalMs));
  }

  let lastNap: HandoffSession['lastNap'] = null;
  const completedSleeps = sleepHistory.filter((s) => s.endTime != null && Number.isFinite(s.endTime)).sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
  if (completedSleeps.length > 0) {
    const s = completedSleeps[0];
    const endMs = s.endTime!;
    const startMs = s.startTime ?? endMs;
    const durationSeconds = Math.round((endMs - startMs) / 1000);
    lastNap = { endTime: formatTime(endMs), durationSeconds };
  }

  let napWindowStatus: HandoffSession['napWindowStatus'] = 'unknown';
  const dob = babyProfile?.birthDate ?? null;
  if (dob != null && sleepHistory.length > 0) {
    const prediction = getSweetSpotPrediction(sleepHistory, dob, now);
    if (prediction) napWindowStatus = napStatusFromSweetSpot(prediction.status);
  }

  let lastDiaper: HandoffSession['lastDiaper'] = null;
  const sortedDiapers = [...diaperHistory].filter((d) => d.timestamp != null).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  if (sortedDiapers.length > 0) {
    const d = sortedDiapers[0];
    lastDiaper = { time: formatTime(d.timestamp!), type: d.type ?? '—' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const moodKey = getMoodForDate(today);
  const moodNote = moodKey ? moodKey : null;

  const birthDate = babyProfile?.birthDate && Number.isFinite(babyProfile.birthDate) ? babyProfile.birthDate : undefined;

  const session: HandoffSession = {
    id,
    createdAt,
    expiresAt,
    babyName: name,
    birthDate,
    lastFeed,
    nextFeedEta,
    lastNap,
    napWindowStatus,
    lastDiaper,
    moodNote,
    headsUp: headsUp != null && String(headsUp).trim() ? String(headsUp).trim() : null,
    logs: [],
  };

  saveHandoffSessionToLocal(session);
  return session;
}

export function getHandoffShareUrl(session: HandoffSession): string {
  try {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    return `${origin}/handoff/${session.id}`;
  } catch {
    return `/handoff/${session.id}`;
  }
}

export function saveHandoffSessionToLocal(session: HandoffSession): void {
  try {
    const list = safeJson<HandoffSession[]>(HANDOFF_SESSIONS_KEY, []);
    const next = [session, ...list].slice(0, 50);
    localStorage.setItem(HANDOFF_SESSIONS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getHandoffSessionFromLocal(sessionId: string): HandoffSession | null {
  try {
    const list = safeJson<HandoffSession[]>(HANDOFF_SESSIONS_KEY, []);
    return list.find((s) => s.id === sessionId) ?? null;
  } catch {
    return null;
  }
}

export function isHandoffSessionExpired(session: HandoffSession): boolean {
  try {
    return new Date(session.expiresAt).getTime() < Date.now();
  } catch {
    return true;
  }
}

export function getHandoffSessionsFromLocal(): HandoffSession[] {
  return safeJson<HandoffSession[]>(HANDOFF_SESSIONS_KEY, []);
}

export function updateHandoffSessionLogs(sessionId: string, logs: HandoffLog[]): void {
  try {
    const list = safeJson<HandoffSession[]>(HANDOFF_SESSIONS_KEY, []);
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], logs: [...logs] };
      localStorage.setItem(HANDOFF_SESSIONS_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

/**
 * Add a log entry directly to a locally-stored handoff session.
 * Used as fallback when the server API is unavailable.
 */
export function addLocalHandoffLog(
  sessionId: string,
  log: { type: 'feed' | 'sleep' | 'diaper'; loggedByName: string; note: string | null },
): HandoffLog | null {
  try {
    const list = safeJson<HandoffSession[]>(HANDOFF_SESSIONS_KEY, []);
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx < 0) return null;
    const entry: HandoffLog = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: log.type,
      loggedAt: new Date().toISOString(),
      loggedByName: log.loggedByName,
      note: log.note,
    };
    list[idx] = { ...list[idx], logs: [...(list[idx].logs || []), entry] };
    localStorage.setItem(HANDOFF_SESSIONS_KEY, JSON.stringify(list));
    return entry;
  } catch {
    return null;
  }
}

/**
 * Merge new handoff logs into main localStorage histories. Only merges if session not expired and baby name matches.
 * Returns the merged logs for showing toasts.
 */
export function mergeHandoffLogsIntoMain(
  session: HandoffSession,
  fetchedLogs: HandoffLog[],
  currentBabyName: string,
): HandoffLog[] {
  if (isHandoffSessionExpired(session)) return [];
  const nameMatch = (session.babyName || '').trim() === (currentBabyName || '').trim();
  if (!nameMatch) return [];
  const existingIds = new Set((session.logs || []).map((l) => l.id));
  const newLogs = fetchedLogs.filter((l) => !existingIds.has(l.id));
  if (newLogs.length === 0) return [];

  const ts = (iso: string) => new Date(iso).getTime();
  try {
    const feedHistory = safeJson<unknown[]>('feedingHistory', []);
    const sleepHistory = safeJson<unknown[]>('sleepHistory', []);
    const diaperHistory = safeJson<unknown[]>('diaperHistory', []);
    for (const log of newLogs) {
      const timeMs = ts(log.loggedAt);
      if (log.type === 'feed') {
        feedHistory.push({ id: `handoff_${log.id}`, timestamp: timeMs, endTime: timeMs, durationMs: 0 });
      } else if (log.type === 'sleep') {
        sleepHistory.push({ id: `handoff_${log.id}`, position: 'Back', startTime: timeMs, endTime: timeMs });
      } else if (log.type === 'diaper') {
        diaperHistory.push({ id: `handoff_${log.id}`, type: 'both', timestamp: timeMs });
      }
    }
    localStorage.setItem('feedingHistory', JSON.stringify(feedHistory));
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
    localStorage.setItem('diaperHistory', JSON.stringify(diaperHistory));
    updateHandoffSessionLogs(session.id, [...(session.logs || []), ...newLogs]);
  } catch {
    // ignore
  }
  return newLogs;
}
