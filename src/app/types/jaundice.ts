/**
 * Jaundice monitoring types (NICE NG98–aligned, simplified for parent tracking).
 */

export type JaundiceColour =
  | "no_yellow"
  | "slight_face"
  | "slight_chest"
  | "slight_belly"
  | "yellow_arms_legs"
  | "yellow_palms_soles";

export type JaundiceArea =
  | "face"
  | "chest"
  | "belly"
  | "arms_legs"
  | "palms_soles";

export interface JaundiceSkinCheck {
  id: string;
  /** ISO date string (YYYY-MM-DD) or timestamp for when check was done */
  date: string;
  /** Time of check (ISO or HH:mm) */
  time?: string;
  /** Most distal (advanced) colour seen */
  colour: JaundiceColour;
  /** Areas that appeared yellow (for assessment) */
  areas: JaundiceArea[];
  /** Feeds in last 24h (for context) */
  feedsLast24h?: number;
  /** Note (optional) */
  note?: string | null;
}

export type JaundiceAlertLevel =
  | "none"
  | "monitor"
  | "call_midwife"
  | "urgent";

export interface JaundiceAlert {
  level: JaundiceAlertLevel;
  message: string;
  /** If true, show 111 / call midwife CTA; min 3s before dismiss */
  showDialler: boolean;
  /** Daylight warning: check in good natural light */
  daylightWarning?: boolean;
}
