/**
 * Memory book: day entries (photo/note) and monthly recaps.
 */

export interface MemoryDayEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string | null;
  /** Base64 or data URL for photo */
  photoDataUrl?: string | null;
  createdAt: number;
}

export interface MemoryMonthlyRecap {
  id: string;
  /** YYYY-MM */
  yearMonth: string;
  note: string;
  createdAt: number;
}
