/**
 * Primary teeth data: 20 teeth with typical eruption ages (weeks).
 * Order: upper row L→R, then lower row L→R (as viewed in mouth diagram).
 */

export interface ToothDef {
  id: string;
  label: string;
  position: 'upper' | 'lower';
  side: 'left' | 'right' | 'centre';
  typicalWeeksMin: number;
  typicalWeeksMax: number;
}

export const TEETH: ToothDef[] = [
  // Upper: left to right (viewer's left = baby's right)
  { id: 'upper-right-lateral', label: 'Upper right lateral incisor', position: 'upper', side: 'right', typicalWeeksMin: 37, typicalWeeksMax: 48 },
  { id: 'upper-right-central', label: 'Upper right central incisor', position: 'upper', side: 'right', typicalWeeksMin: 25, typicalWeeksMax: 35 },
  { id: 'upper-left-central', label: 'Upper left central incisor', position: 'upper', side: 'left', typicalWeeksMin: 25, typicalWeeksMax: 35 },
  { id: 'upper-left-lateral', label: 'Upper left lateral incisor', position: 'upper', side: 'left', typicalWeeksMin: 37, typicalWeeksMax: 48 },
  { id: 'upper-right-canine', label: 'Upper right canine', position: 'upper', side: 'right', typicalWeeksMin: 65, typicalWeeksMax: 78 },
  { id: 'upper-right-first-molar', label: 'Upper right first molar', position: 'upper', side: 'right', typicalWeeksMin: 52, typicalWeeksMax: 65 },
  { id: 'upper-left-first-molar', label: 'Upper left first molar', position: 'upper', side: 'left', typicalWeeksMin: 52, typicalWeeksMax: 65 },
  { id: 'upper-left-canine', label: 'Upper left canine', position: 'upper', side: 'left', typicalWeeksMin: 65, typicalWeeksMax: 78 },
  { id: 'upper-right-second-molar', label: 'Upper right second molar', position: 'upper', side: 'right', typicalWeeksMin: 104, typicalWeeksMax: 130 },
  { id: 'upper-left-second-molar', label: 'Upper left second molar', position: 'upper', side: 'left', typicalWeeksMin: 104, typicalWeeksMax: 130 },
  // Lower: left to right
  { id: 'lower-right-lateral', label: 'Lower right lateral incisor', position: 'lower', side: 'right', typicalWeeksMin: 37, typicalWeeksMax: 48 },
  { id: 'lower-right-central', label: 'Lower right central incisor', position: 'lower', side: 'right', typicalWeeksMin: 25, typicalWeeksMax: 35 },
  { id: 'lower-left-central', label: 'Lower left central incisor', position: 'lower', side: 'left', typicalWeeksMin: 25, typicalWeeksMax: 35 },
  { id: 'lower-left-lateral', label: 'Lower left lateral incisor', position: 'lower', side: 'left', typicalWeeksMin: 37, typicalWeeksMax: 48 },
  { id: 'lower-right-canine', label: 'Lower right canine', position: 'lower', side: 'right', typicalWeeksMin: 65, typicalWeeksMax: 78 },
  { id: 'lower-right-first-molar', label: 'Lower right first molar', position: 'lower', side: 'right', typicalWeeksMin: 52, typicalWeeksMax: 65 },
  { id: 'lower-left-first-molar', label: 'Lower left first molar', position: 'lower', side: 'left', typicalWeeksMin: 52, typicalWeeksMax: 65 },
  { id: 'lower-left-canine', label: 'Lower left canine', position: 'lower', side: 'left', typicalWeeksMin: 65, typicalWeeksMax: 78 },
  { id: 'lower-right-second-molar', label: 'Lower right second molar', position: 'lower', side: 'right', typicalWeeksMin: 104, typicalWeeksMax: 130 },
  { id: 'lower-left-second-molar', label: 'Lower left second molar', position: 'lower', side: 'left', typicalWeeksMin: 104, typicalWeeksMax: 130 },
];

export function getToothById(id: string): ToothDef | undefined {
  return TEETH.find((t) => t.id === id);
}

export function getExpectedTeeth(ageInWeeks: number): ToothDef[] {
  if (ageInWeeks < 0 || !Number.isFinite(ageInWeeks)) return [];
  const within4Weeks = (t: ToothDef) =>
    t.typicalWeeksMin > ageInWeeks && t.typicalWeeksMin - ageInWeeks <= 4;
  return TEETH.filter(within4Weeks);
}
