/**
 * Minimum touch target size (WCAG 2.5.5): at least 44x44 CSS pixels.
 */

export const MIN_TAP_SIZE = 44;

/**
 * Merges style with minWidth/minHeight (and minHeight if not set) to ensure at least MIN_TAP_SIZE.
 */
export function ensureTapTarget(style?: React.CSSProperties): React.CSSProperties {
  const base: React.CSSProperties = {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
  };
  if (!style) return base;
  return {
    ...style,
    minWidth: typeof style.minWidth === "number" ? Math.max(MIN_TAP_SIZE, style.minWidth) : MIN_TAP_SIZE,
    minHeight: typeof style.minHeight === "number" ? Math.max(MIN_TAP_SIZE, style.minHeight) : MIN_TAP_SIZE,
  };
}
