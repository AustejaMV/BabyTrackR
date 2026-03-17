/**
 * Tooth history storage with guards.
 */

import { TEETH, getToothById } from '../data/teethData';
import type { ToothRecord } from '../types/teeth';

const KEY = 'toothHistory';

function readHistory(): ToothRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ToothRecord[]) : [];
  } catch {
    return [];
  }
}

export function getToothHistory(): ToothRecord[] {
  return readHistory();
}

export function saveToothRecord(entry: unknown): ToothRecord {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid tooth record');
  const o = entry as Record<string, unknown>;
  const toothId = typeof o.toothId === 'string' ? o.toothId.trim() : '';
  if (!toothId) throw new Error('toothId required');
  const def = getToothById(toothId);
  if (!def) throw new Error(`Unknown tooth: ${toothId}`);
  const eruptedAt = typeof o.eruptedAt === 'string' ? o.eruptedAt.trim() : '';
  if (!eruptedAt) throw new Error('eruptedAt required');
  const ms = new Date(eruptedAt).getTime();
  if (!Number.isFinite(ms)) throw new Error('Invalid eruptedAt date');
  const note = o.note != null && typeof o.note === 'string' ? o.note : null;
  const record: ToothRecord = { toothId, eruptedAt: new Date(ms).toISOString().slice(0, 10), note };
  const history = readHistory();
  const idx = history.findIndex((r) => r.toothId === toothId);
  const next = idx >= 0 ? history.map((r, i) => (i === idx ? record : r)) : [...history, record];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error('Failed to save tooth record');
  }
  return record;
}

export function removeToothRecord(toothId: string): void {
  const def = getToothById(toothId);
  if (!def) throw new Error(`Unknown tooth: ${toothId}`);
  const history = readHistory().filter((r) => r.toothId !== toothId);
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    throw new Error('Failed to remove tooth record');
  }
}
