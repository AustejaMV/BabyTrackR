/**
 * Tooth eruption record.
 */

export interface ToothRecord {
  toothId: string;
  eruptedAt: string; // ISO date string
  note: string | null;
}
