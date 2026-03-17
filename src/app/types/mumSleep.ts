/**
 * Mum's sleep debt tracker — local only or synced per your SYNCED_DATA_KEYS choice.
 */

export type MumSleepRange = "under_2h" | "2_to_4h" | "4_to_6h" | "6h_plus";

export interface MumSleepEntry {
  id: string;
  date: string; // YYYY-MM-DD
  sleepRange: MumSleepRange;
  loggedAt: string; // ISO
}
