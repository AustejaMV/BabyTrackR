/**
 * Ends the current sleep session if one is active (e.g. when the user starts feeding).
 * Returns true if a session was ended.
 *
 * Guards against corrupt localStorage data by catching JSON parse errors.
 */
export function endCurrentSleepIfActive(
  onSaved?: (sleepHistory: { id: string; position: string; startTime: number; endTime?: number }[]) => void
): boolean {
  try {
    const raw = localStorage.getItem('currentSleep');
    if (!raw) return false;

    const currentSleep = JSON.parse(raw) as { id: string; position: string; startTime: number };
    if (!currentSleep?.id) return false; // guard against unexpected shapes

    const completed = { ...currentSleep, endTime: Date.now() };

    const historyRaw = localStorage.getItem('sleepHistory');
    const sleepHistory = historyRaw ? JSON.parse(historyRaw) : [];
    sleepHistory.push(completed);
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
    localStorage.removeItem('currentSleep');

    onSaved?.(sleepHistory);
    return true;
  } catch {
    // Corrupt localStorage data — fail silently so the app keeps running
    return false;
  }
}
