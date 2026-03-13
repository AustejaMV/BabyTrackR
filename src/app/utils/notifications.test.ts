/**
 * Notifications — what the user experiences when warnings fire.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maybeNotifyForWarning, scheduleNotification, sendNotification } from './notifications';

const store: Record<string, string> = {};
const notificationCtor = vi.fn();

function stubGranted() {
  vi.stubGlobal('Notification', Object.assign(notificationCtor, { permission: 'granted' }));
}

function stubDenied() {
  vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'denied' }));
}

function stubMobile() {
  const ctor = vi.fn().mockImplementation(() => {
    throw new TypeError('Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead.');
  });
  vi.stubGlobal('Notification', Object.assign(ctor, { permission: 'granted' }));
  const showNotification = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ showNotification }) } });
  return { showNotification };
}

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  notificationCtor.mockClear();
  vi.stubGlobal('localStorage', {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});
afterEach(() => vi.unstubAllGlobals());

// ─── Receiving a notification ──────────────────────────────────────────────────

describe('When the app sends a notification', () => {
  it('the user sees the notification when they have granted permission', async () => {
    stubGranted();
    await sendNotification('Feeding due', { body: 'Time for the next feeding.' });
    expect(notificationCtor).toHaveBeenCalledWith('Feeding due', expect.objectContaining({ body: 'Time for the next feeding.' }));
  });

  it('nothing happens when the user has denied notifications', async () => {
    stubDenied();
    await sendNotification('Feeding due');
    expect(notificationCtor).not.toHaveBeenCalled();
  });

  it('nothing happens and the app does not crash when notifications are unavailable', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(sendNotification('Test')).resolves.not.toThrow();
  });

  it('on mobile (where direct Notification is blocked) the service worker delivers it instead', async () => {
    const { showNotification } = stubMobile();
    await sendNotification('Mobile alert', { body: 'via SW' });
    expect(showNotification).toHaveBeenCalledWith('Mobile alert', expect.objectContaining({ body: 'via SW' }));
  });
});

describe('Scheduled notifications (e.g. remind me in X minutes)', () => {
  afterEach(() => vi.useRealTimers());

  it('fires after the specified delay, not before', async () => {
    vi.useFakeTimers();
    stubGranted();
    scheduleNotification('Reminder', 'Check baby', 2_000);
    expect(notificationCtor).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_999);
    expect(notificationCtor).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(notificationCtor).toHaveBeenCalledOnce();
  });
});

// ─── Warning notifications (feeding due, painkiller, etc.) ───────────────────

describe('Warning notifications — the user is not spammed', () => {
  it('fires the first time a warning appears', async () => {
    stubGranted();
    await maybeNotifyForWarning('feeding-due', 'Feeding overdue', 'Time for the next feeding.');
    expect(notificationCtor).toHaveBeenCalledOnce();
  });

  it('does NOT fire again within 4 hours of the same warning', async () => {
    vi.useFakeTimers();
    stubGranted();
    await maybeNotifyForWarning('feeding-due', 'T', 'M');
    notificationCtor.mockClear();
    vi.advanceTimersByTime(4 * 60 * 60 * 1_000 - 1);
    await maybeNotifyForWarning('feeding-due', 'T', 'M');
    expect(notificationCtor).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fires again once 4 hours have passed', async () => {
    vi.useFakeTimers();
    stubGranted();
    await maybeNotifyForWarning('feeding-due', 'T', 'M');
    notificationCtor.mockClear();
    vi.advanceTimersByTime(4 * 60 * 60 * 1_000);
    await maybeNotifyForWarning('feeding-due', 'T', 'M');
    expect(notificationCtor).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('different warning types fire independently (feeding-due does not suppress painkiller-due)', async () => {
    stubGranted();
    await maybeNotifyForWarning('feeding-due',    'Feeding',    'Feed now');
    await maybeNotifyForWarning('painkiller-due', 'Painkiller', 'You can take another');
    expect(notificationCtor).toHaveBeenCalledTimes(2);
  });

  it('does not fire when notifications have been denied', async () => {
    stubDenied();
    await maybeNotifyForWarning('feeding-due', 'T', 'M');
    expect(notificationCtor).not.toHaveBeenCalled();
  });

  it('does not crash when notifications are unavailable (e.g. unsupported browser)', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(maybeNotifyForWarning('feeding-due', 'T', 'M')).resolves.not.toThrow();
  });

  it('still works on mobile via service worker', async () => {
    const { showNotification } = stubMobile();
    await maybeNotifyForWarning('feeding-due', 'Feeding', 'Body');
    expect(showNotification).toHaveBeenCalledOnce();
  });
});
