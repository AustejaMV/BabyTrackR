/**
 * Simple contrast ratio (relative luminance) for WCAG AA (4.5:1 for normal text).
 */

function sRGBToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  let s = hex.replace("#", "").toLowerCase();
  if (s.length === 3) {
    s = `${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  const m = s.match(/.{2}/g);
  if (!m || m.length !== 3) return 0;
  const r = sRGBToLinear(parseInt(m[0], 16));
  const g = sRGBToLinear(parseInt(m[1], 16));
  const b = sRGBToLinear(parseInt(m[2], 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns contrast ratio between two hex colors (1–21).
 */
export function getContrastRatio(foreground: string, background: string): number {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  /* WCAG: (L1 + 0.05) / (L2 + 0.05) with L1 >= L2; black (0) uses denominator 0.05 */
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA minimum ratio for normal text. */
export const WCAG_AA_MIN_RATIO = 4.5;

export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= WCAG_AA_MIN_RATIO;
}
