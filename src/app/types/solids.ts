/**
 * Solid food tracking: first tastes, reactions, allergens.
 */

export type SolidReaction = 'none' | 'liked' | 'disliked' | 'allergic_reaction' | 'unsure';

export type AllergenType =
  | 'milk'
  | 'eggs'
  | 'gluten'
  | 'nuts'
  | 'fish'
  | 'shellfish'
  | 'sesame'
  | 'soy'
  | 'none';

export interface SolidFoodEntry {
  id: string;
  timestamp: string;
  food: string;
  isFirstTime: boolean;
  reaction: SolidReaction;
  note: string | null;
  allergenFlags: AllergenType[];
}
