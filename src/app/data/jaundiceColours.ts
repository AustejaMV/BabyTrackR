/**
 * Jaundice colour options for skin check (hex swatches + labels).
 */

import type { JaundiceColour, JaundiceArea } from "../types/jaundice";

export interface JaundiceColourOption {
  id: JaundiceColour;
  label: string;
  hex: string;
  areas: JaundiceArea[];
}

export const JAUNDICE_COLOUR_OPTIONS: JaundiceColourOption[] = [
  { id: "no_yellow", label: "No yellowing", hex: "#f5f0e6", areas: [] },
  { id: "slight_face", label: "Slight — face only", hex: "#f5e6c8", areas: ["face"] },
  { id: "slight_chest", label: "Slight — face & chest", hex: "#f0dcb0", areas: ["face", "chest"] },
  { id: "slight_belly", label: "Slight — down to belly", hex: "#e8d090", areas: ["face", "chest", "belly"] },
  { id: "yellow_arms_legs", label: "Yellow — arms/legs", hex: "#d4c060", areas: ["face", "chest", "belly", "arms_legs"] },
  { id: "yellow_palms_soles", label: "Yellow — palms or soles", hex: "#c4a830", areas: ["face", "chest", "belly", "arms_legs", "palms_soles"] },
];
