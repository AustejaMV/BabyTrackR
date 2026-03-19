import { sendNotification } from './notifications';

export const CHANNELS = {
  feeds: 'HIGH',
  nap: 'HIGH',
  warnings: 'MAX',
  sync: 'LOW',
} as const;

type TimerId = ReturnType<typeof setTimeout>;

const timers: Record<string, TimerId> = {};

function scheduleTimer(
  key: string,
  delayMs: number,
  title: string,
  body: string,
): void {
  cancelTimer(key);

  if (delayMs <= 0) {
    sendNotification(title, { body });
    return;
  }

  timers[key] = setTimeout(() => {
    sendNotification(title, { body });
    delete timers[key];
  }, delayMs);
}

function cancelTimer(key: string): void {
  if (timers[key] != null) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
}

export function scheduleFeedOverdue(
  lastFeedEndTime: number,
  averageIntervalMs: number,
  bufferMinutes: number,
): void {
  const fireAt = lastFeedEndTime + averageIntervalMs + bufferMinutes * 60_000;
  const delayMs = fireAt - Date.now();

  scheduleTimer(
    'feed_overdue',
    delayMs,
    'Feed reminder',
    "It's been a while since the last feed — your baby might be getting hungry.",
  );
}

export function scheduleNapWindow(napWindowOpensAt: number): void {
  const FIFTEEN_MIN = 15 * 60_000;
  const fireAt = napWindowOpensAt - FIFTEEN_MIN;
  const delayMs = fireAt - Date.now();

  scheduleTimer(
    'nap_window',
    delayMs,
    'Nap window opening soon',
    'Your baby\'s nap window opens in about 15 minutes.',
  );
}

export function schedulePainReliefSafe(
  lastMedTime: number,
  safeIntervalHours: number,
): void {
  const fireAt = lastMedTime + safeIntervalHours * 3_600_000;
  const delayMs = fireAt - Date.now();

  scheduleTimer(
    'pain_relief',
    delayMs,
    'Pain relief available',
    'The safe interval has passed — you can give the next dose if needed.',
  );
}

export function scheduleVaccinationDue(vaccinationDate: number): void {
  const SEVEN_DAYS = 7 * 24 * 60 * 60_000;
  const fireAt = vaccinationDate - SEVEN_DAYS;
  const delayMs = fireAt - Date.now();

  scheduleTimer(
    'vaccination_due',
    delayMs,
    'Vaccination coming up',
    'Your baby has a vaccination due in 7 days.',
  );
}

export function cancelAllScheduled(): void {
  for (const key of Object.keys(timers)) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
}
