/**
 * Colic episode storage — CRUD for crying episodes logged by the parent.
 */

export interface ColicEpisode {
  id: string;
  startTime: number;
  endTime: number;
  /** 1–5 scale */
  intensity: number;
  /** What soothing was tried */
  soothing?: string[];
  /** Free-text note */
  note?: string;
  /** Was a feed within 30 min before? (auto-populated) */
  postFeed?: boolean;
  /** Was baby in a nap window? (auto-populated) */
  inNapWindow?: boolean;
}

const KEY = "cradl-colic-episodes";

function read(): ColicEpisode[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(episodes: ColicEpisode[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(episodes));
  } catch { /* ignore */ }
}

export function getColicEpisodes(): ColicEpisode[] {
  return read().sort((a, b) => b.startTime - a.startTime);
}

export function addColicEpisode(ep: ColicEpisode): void {
  const list = read();
  list.push(ep);
  write(list);
}

export function removeColicEpisode(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function clearColicEpisodes(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
