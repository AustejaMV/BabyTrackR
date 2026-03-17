/**
 * Accessible font scale from user preference (Larger text in Settings).
 * Cap at 2.0x to avoid overflow.
 */

const STORAGE_KEY = "cradl-larger-text";
const MIN_SCALE = 1;
const MAX_SCALE = 2;

function getStoredScale(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v == null) return 1;
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, n)) : 1;
  } catch {
    return 1;
  }
}

export function getAccessibleFontScale(): number {
  return getStoredScale();
}

export function setAccessibleFontScale(scale: number): void {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {}
}

/**
 * Returns font size in px for a given base (e.g. 14 -> 14 * scale, capped at 2x base).
 */
export function useAccessibleFontSize(basePx: number): number {
  const scale = getStoredScale();
  return Math.round(basePx * scale);
}
