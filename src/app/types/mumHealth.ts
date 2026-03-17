/**
 * Mum's recovery and wellbeing tracking types.
 */

export type WoundArea = "caesarean" | "perineal" | "other";

export interface WoundCareEntry {
  id: string;
  timestamp: string;
  area: WoundArea;
  notes: string | null;
  hasRedness: boolean;
  hasPain: boolean;
  painLevel: 1 | 2 | 3 | 4 | 5 | null;
}

export interface PelvicFloorEntry {
  id: string;
  date: string;
  completed: boolean;
  repsCompleted: number | null;
}

export type BreastPainSide = "left" | "right" | "both";

export interface BreastPainEntry {
  id: string;
  timestamp: string;
  side: BreastPainSide;
  severity: 1 | 2 | 3 | 4 | 5;
  warmth: boolean;
  redness: boolean;
  notes: string | null;
}

export interface EPDSResponse {
  id: string;
  completedAt: string;
  answers: number[];
  totalScore: number;
  flagged: boolean;
}
