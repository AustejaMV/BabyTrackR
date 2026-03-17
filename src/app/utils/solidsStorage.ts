/**
 * Solid food history storage with guards.
 */

import type { SolidFoodEntry, SolidReaction, AllergenType } from '../types/solids';

const REACTIONS: SolidReaction[] = ['none', 'liked', 'disliked', 'allergic_reaction', 'unsure'];
const ALLERGENS: AllergenType[] = ['milk', 'eggs', 'gluten', 'nuts', 'fish', 'shellfish', 'sesame', 'soy', 'none'];

function readJson<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultVal;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : defaultVal;
  } catch {
    return defaultVal;
  }
}

export function getSolidHistory(): SolidFoodEntry[] {
  return readJson<SolidFoodEntry[]>('solidFoodHistory', []);
}

function isValidReaction(r: unknown): r is SolidReaction {
  return typeof r === 'string' && REACTIONS.includes(r as SolidReaction);
}

function isValidAllergen(a: unknown): a is AllergenType {
  return typeof a === 'string' && ALLERGENS.includes(a as AllergenType);
}

export function saveSolidEntry(entry: unknown): SolidFoodEntry {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid solid food entry');
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : `solid-${Date.now()}`;
  const timestamp = typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString();
  const food = typeof o.food === 'string' ? o.food.trim() : '';
  if (!food || food.length > 60) throw new Error('Food name must be 1–60 characters');
  const reaction = isValidReaction(o.reaction) ? o.reaction : 'none';
  const isFirstTime = o.isFirstTime === true;
  const note = o.note != null && typeof o.note === 'string' ? o.note : null;
  const rawFlags = Array.isArray(o.allergenFlags) ? o.allergenFlags : [];
  const allergenFlags = rawFlags.filter(isValidAllergen);
  const out: SolidFoodEntry = { id, timestamp, food, isFirstTime, reaction, note, allergenFlags };
  const history = getSolidHistory();
  const idx = history.findIndex((e) => e.id === id);
  const next = idx >= 0 ? history.map((e, i) => (i === idx ? out : e)) : [...history, out];
  try {
    localStorage.setItem('solidFoodHistory', JSON.stringify(next));
  } catch {
    throw new Error('Failed to save solid food');
  }
  return out;
}
