/**
 * Hand-drawn-feeling SVG line icons in brand colours.
 * Every icon is a thin stroke with rounded caps — no fill, no emoji.
 */
import type { CSSProperties } from "react";

interface P {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

const d = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: "1.6",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/* ─── Navigation / tabs ─── */

export const IconSun = ({ size = 20, color = "#d4604a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const IconBook = ({ size = 20, color = "#d4604a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    <path d="M8 7h8M8 11h5" />
  </svg>
);

export const IconVillage = ({ size = 20, color = "#d4604a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="9" cy="7" r="3" />
    <path d="M2 21v-2a5 5 0 0110 0v2" />
    <circle cx="17" cy="8" r="2.5" />
    <path d="M17 13a3.5 3.5 0 013.5 3.5V21" />
  </svg>
);

export const IconHeart = ({ size = 20, color = "#d4604a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
  </svg>
);

/* ─── Log grid icons (shown inside colored-dot backgrounds) ─── */

export const IconNursing = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M4 8c0-3 3-5 8-5s8 2 8 5c0 4-3 8-8 10C7 16 4 12 4 8z" />
    <circle cx="12" cy="13" r="1.2" fill={color} stroke="none" />
  </svg>
);

export const IconBottle = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M9 2h6v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z" />
    <path d="M8 6h8l1 4v9a2 2 0 01-2 2H9a2 2 0 01-2-2v-9l1-4z" />
    <path d="M7 14h10" />
  </svg>
);

export const IconMoon = ({ size = 20, color = "#4080a0", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

export const IconDroplet = ({ size = 20, color = "#4a8a4a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
  </svg>
);

export const IconHand = ({ size = 20, color = "#7a4ab4", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M18 11V6a2 2 0 00-4 0v1" />
    <path d="M14 10V4a2 2 0 00-4 0v6" />
    <path d="M10 10.5V6a2 2 0 00-4 0v8a8 8 0 0016 0v-4a2 2 0 00-4 0" />
  </svg>
);

export const IconThermo = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
    <circle cx="11.5" cy="17.5" r="1.5" fill={color} stroke="none" />
  </svg>
);

export const IconPump = ({ size = 20, color = "#9a7060", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="12" cy="15" r="5" />
    <path d="M12 10V6M9 6h6" />
    <path d="M9 15a3 3 0 016 0" />
  </svg>
);

export const IconSpoon = ({ size = 20, color = "#4a8a4a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M15 2a4 4 0 01-4 4H8a4 4 0 014-4" />
    <path d="M11 6v16" />
  </svg>
);

export const IconStar = ({ size = 20, color = "#b08040", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
  </svg>
);

export const IconDropletSmall = ({ size = 20, color = "#9a8080", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
  </svg>
);

/* ─── Me screen section icons ─── */

export const IconLeaf = ({ size = 20, color = "#4a8a4a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M11 20A7 7 0 015 7c4.4 0 8.3 1.2 11.3 4.2A15.4 15.4 0 0120 20h-9z" />
    <path d="M5 7c3 0 6.5 1 9 4" />
  </svg>
);

export const IconHeartPulse = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
    <path d="M3.5 12h3l2-4 3 8 2-4h3.5" />
  </svg>
);

export const IconPill = ({ size = 20, color = "#7a4ab4", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M10.5 1.5l-8 8a5.66 5.66 0 008 8l8-8a5.66 5.66 0 00-8-8z" />
    <path d="M6.5 13.5l8-8" />
  </svg>
);

export const IconStethoscope = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M4.8 2.3A2 2 0 004 4v4a4 4 0 008 0V4a2 2 0 00-.8-1.7" />
    <path d="M8 12v2a6 6 0 0012 0v-3" />
    <circle cx="20" cy="10" r="2" />
  </svg>
);

export const IconCrown = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M2 20h20L19 8l-4 5-3-7-3 7-4-5z" />
  </svg>
);

export const IconUsers = ({ size = 20, color = "#4a8a4a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export const IconExport = ({ size = 20, color = "#9a7060", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const IconShield = ({ size = 20, color = "#c05030", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconBaby = ({ size = 20, color = "#d4604a", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 00-16 0" />
  </svg>
);

export const IconCamera = ({ size = 20, color = "#9a8080", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const IconMoonStars = ({ size = 20, color = "#7a4ab4", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    <path d="M17 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" strokeWidth="1.2" />
  </svg>
);

export const IconGear = ({ size = 20, color = "#9a8080", style }: P) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
