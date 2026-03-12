import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maybeNotifyForWarning, scheduleNotification, sendNotification } from './notifications';

// ─── helpers ─────────────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const notificationCtor = vi.fn();

/** Stub Notification with "granted" permission and a working constructor. */
function stubGranted() {
  vi.stubGlobal('Notification', Object.assign(notificationCtor, { permission: 'granted' }));
}

/** Stub Notification with "denied" permission. */
function stubDenied() {
  vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'denied' }));
}

/**
 * Stub Notification so the constructor throws "Illegal constructor"
 * (mobile browser behaviour).  A service-worker fallback is also stubbed.
 */
function stubMobileIllegalConstructor() {
  const ctor = vi.fn().mockImplementation(() => {
    throw new TypeError('Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead.');
  });
  vi.stubGlobal('Notification', Object.assign(ctor, { permission: 'granted' }));

  const showNotification = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', {
    serviceWorker: {
      ready: Promise.resolve({ showNotification }),
    },
  });
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

// ─── sendNotification ─────────────────────────────────────────────────────────

describe('sendNotification', () => {
  it('constructs a Notification when permission is granted', async () => {
    stubGranted();
    await sendNotification('Test title', { body: 'hello' });
    expect(notificationCtor).toHaveBeenCalledOnce();
    expect(notificationCtor).toHaveBeenCalledWith('Test title', expect.objectContaining({ body: 'hello' }));
  });

  it('does nothing when permission is denied', async () => {
    stubDenied();
    await sendNotification('Test title');
    expect(notificationCtor).not.toHaveBeenCalled();
  });

  it('falls back to ServiceWorkerRegistration.showNotification() on mobile', async () => {
    const { showNotification } = stubMobileIllegalConstructor();
    await sendNotification('Mobile title', { body: 'via SW' });
    expect(showNotification).toHaveBeenCalledOnce();
    expect(showNotification).toHaveBeenCalledWith('Mobile title', expect.objectContaining({ body: 'via SW' }));
  });

  it('does not crash when Notification is absent from window', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(sendNotification('Test')).resolves.not.toThrow();
  });
});

// ─── scheduleNotification ─────────────────────────────────────────────────────

describe('scheduleNotification', () => {
  afterEach(() => vi.useRealTimers());

  it('fires the notification after the specified delay', async () => {
    vi.useFakeTimers();
    stubGranted();
    scheduleNotification('Title', 'Body', 2_000);
    expect(notificationCtor).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(notificationCtor).toHaveBeenCalledOnce();
  });

  it('does not fire before the delay elapses', async () => {
    vi.useFakeTimers();
    stubGranted();
    scheduleNotification('Title', 'Body', 5_000);
    vi.advanceTimersByTime(4_999);
    expect(notificationCtor).not.toHaveBeenCalled();
  });
});

// ─── maybeNotifyForWarning ────────────────────────────────────────────────────

describe('maybeNotifyForWarning', () => {
  const FOUR_HOURS = 4 * 60 * 60 * 1_000;

  it('does not fire when Notification is not in window', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(maybeNotifyForWarning('test', 'T', 'M')).resolves.not.toThrow();
  });

  it('does not fire when permission is denied', async () => {
    stubDenied();
    await maybeNotifyForWarning('warn1', 'Title', 'Msg');
    expect(notificationCtor).not.toHaveBeenCalled();
  });

  it('fires on the first call (no previous timestamp)', async () => {
    stubGranted();
    await maybeNotifyForWarning('warn1', 'Title', 'Msg');
    expect(notificationCtor).toHaveBeenCalledOnce();
  });

  it('stores the notification timestamp in localStorage', async () => {
    stubGranted();
    const before = Date.now();
    await maybeNotifyForWarning('warn1', 'Title', 'Msg');
    const stored = parseInt(store['lastWarningNotify:warn1'], 10);
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(Date.now());
  });

  it('does NOT fire within the 4-hour cooldown window', async () => {
    vi.useFakeTimers();
    stubGranted();
    await maybeNotifyForWarning('warn2', 'T', 'M');   // first fire
    notificationCtor.mockClear();
    vi.advanceTimersByTime(FOUR_HOURS - 1);
    await maybeNotifyForWarning('warn2', 'T', 'M');   // should be blocked
    expect(notificationCtor).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fires again after the 4-hour cooldown expires', async () => {
    vi.useFakeTimers();
    stubGranted();
    await maybeNotifyForWarning('warn3', 'T', 'M');   // first fire
    notificationCtor.mockClear();
    vi.advanceTimersByTime(FOUR_HOURS);               // exactly at expiry
    await maybeNotifyForWarning('warn3', 'T', 'M');   // should fire
    expect(notificationCtor).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('different warning keys are tracked independently', async () => {
    stubGranted();
    await maybeNotifyForWarning('keyA', 'A', 'a');
    await maybeNotifyForWarning('keyB', 'B', 'b');
    expect(notificationCtor).toHaveBeenCalledTimes(2);
    expect(store['lastWarningNotify:keyA']).toBeDefined();
    expect(store['lastWarningNotify:keyB']).toBeDefined();
  });

  it('uses service worker fallback on mobile without crashing', async () => {
    const { showNotification } = stubMobileIllegalConstructor();
    await maybeNotifyForWarning('mobileKey', 'Title', 'Body');
    expect(showNotification).toHaveBeenCalledOnce();
  });
});
