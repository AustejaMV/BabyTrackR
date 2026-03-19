/**
 * Icon set for custom trackers (SVG icons + label for picker).
 */

import type { ReactNode } from "react";
import type { CustomTrackerIcon } from "../types/customTracker";

const svgProps = { width: 22, height: 22, viewBox: "0 0 24 24" as const, fill: "none" as const, stroke: "currentColor" as const, strokeWidth: "2" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICON_SVGS: Record<CustomTrackerIcon, ReactNode> = {
  star: <svg {...svgProps}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  heart: <svg {...svgProps}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
  drop: <svg {...svgProps}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>,
  pill: <svg {...svgProps}><path d="M4.5 16.5c-1.5 1.5 0 4 1.5 5.5s4 3 5.5 1.5L20 12" /><path d="m15 9 6-6" /><path d="m21 3-6 6" /></svg>,
  apple: <svg {...svgProps}><circle cx="12" cy="10" r="5" /><path d="M12 4v2m0 0c.5 0 1 .5 1 1.5" /></svg>,
  sun: <svg {...svgProps}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  moon: <svg {...svgProps}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  flower: <svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /></svg>,
  book: <svg {...svgProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M8 7h8" /><path d="M8 11h8" /></svg>,
  coffee: <svg {...svgProps}><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" /></svg>,
};

export const CUSTOM_TRACKER_ICONS: { id: CustomTrackerIcon; label: string; icon: ReactNode }[] = [
  { id: "star", label: "Star", icon: ICON_SVGS.star },
  { id: "heart", label: "Heart", icon: ICON_SVGS.heart },
  { id: "drop", label: "Drop", icon: ICON_SVGS.drop },
  { id: "pill", label: "Pill", icon: ICON_SVGS.pill },
  { id: "apple", label: "Apple", icon: ICON_SVGS.apple },
  { id: "sun", label: "Sun", icon: ICON_SVGS.sun },
  { id: "moon", label: "Moon", icon: ICON_SVGS.moon },
  { id: "flower", label: "Flower", icon: ICON_SVGS.flower },
  { id: "book", label: "Book", icon: ICON_SVGS.book },
  { id: "coffee", label: "Coffee", icon: ICON_SVGS.coffee },
];

/** Returns SVG icon for UI display. */
export function getIconDisplay(icon: CustomTrackerIcon): ReactNode {
  return ICON_SVGS[icon] ?? <span style={{ fontSize: 14 }}>•</span>;
}

/** Returns text label for plain-text contexts (e.g. timeline descriptions). */
export function getIconLabel(icon: CustomTrackerIcon): string {
  return CUSTOM_TRACKER_ICONS.find((i) => i.id === icon)?.label ?? "•";
}
