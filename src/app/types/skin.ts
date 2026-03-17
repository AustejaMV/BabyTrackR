/**
 * Skin / eczema tracker types.
 */

export type BodyArea =
  | "face"
  | "scalp"
  | "neck"
  | "chest"
  | "back"
  | "arms"
  | "hands"
  | "legs"
  | "feet"
  | "nappy_area"
  | "behind_knees"
  | "inside_elbows";

export type SkinAppearance =
  | "red"
  | "dry"
  | "scaly"
  | "weeping"
  | "cracked"
  | "swollen"
  | "hives";

export interface SkinFlareEntry {
  id: string;
  timestamp: string;
  bodyAreas: BodyArea[];
  severity: 1 | 2 | 3 | 4 | 5;
  appearance: SkinAppearance[];
  photo: string | null;
  note: string | null;
}

export interface SkinCreamEntry {
  id: string;
  timestamp: string;
  product: string;
  bodyAreas: BodyArea[];
  note: string | null;
}

export type TriggerType =
  | "food"
  | "product"
  | "fabric"
  | "weather"
  | "detergent"
  | "animal"
  | "stress"
  | "other";

export interface SkinTriggerEntry {
  id: string;
  timestamp: string;
  triggerType: TriggerType;
  description: string;
  note: string | null;
}

export type CorrelationLikelihood = "likely" | "possible" | "coincidental";

export interface SkinCorrelation {
  trigger: SkinTriggerEntry;
  subsequentFlare: SkinFlareEntry | null;
  hoursToFlare: number | null;
  likelihood: CorrelationLikelihood;
}
