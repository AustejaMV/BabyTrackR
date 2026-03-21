import { describe, it, expect } from "vitest";
import {
  nhsTypicalMaxFeedGapMs,
  getFeedEventTimeMs,
  planCareNotifications,
  CARE_NOTIF_IDS,
} from "./careNotificationPlanner";
import { DEFAULT_NOTIFICATION_SETTINGS } from "./notificationSettingsStorage";
import type { FeedingRecord } from "../types";

describe("nhsTypicalMaxFeedGapMs", () => {
  it("returns shorter gaps for younger babies", () => {
    expect(nhsTypicalMaxFeedGapMs(3)).toBe(2.5 * 60 * 60 * 1000);
    expect(nhsTypicalMaxFeedGapMs(200)).toBe(5 * 60 * 60 * 1000);
  });
});

describe("getFeedEventTimeMs", () => {
  it("prefers endTime", () => {
    const r: FeedingRecord = {
      id: "1",
      timestamp: 100,
      endTime: 500,
    };
    expect(getFeedEventTimeMs(r)).toBe(500);
  });
});

describe("planCareNotifications", () => {
  const dob = new Date("2024-01-01").getTime();
  const now = new Date("2024-02-01T12:00:00").getTime();

  it("skips nap opening when sleeping", () => {
    const opensAt = new Date(now + 30 * 60 * 1000);
    const closesAt = new Date(now + 90 * 60 * 1000);
    const planned = planCareNotifications({
      now,
      babyDobMs: dob,
      settings: DEFAULT_NOTIFICATION_SETTINGS,
      thresholds: {
        noPoopHours: 24,
        noSleepHours: 6,
        feedOverdueMinutes: 30,
        tummyLowMinutes: 20,
        tummyLowByHour: 16,
      },
      prediction: {
        opensAt,
        closesAt,
        personalisedTime: null,
        ageInWeeks: 4,
        hasPersonalisedData: false,
        status: "unknown",
      },
      isSleeping: true,
      feedInProgress: false,
      feedingHistory: [],
      bottleHistory: [],
      diaperHistory: [],
      lastPainkillerMs: null,
      vaccinationReminderAtMs: null,
    });
    expect(planned.find((p) => p.id === CARE_NOTIF_IDS.napOpening)).toBeUndefined();
  });

  it("includes feed reminder when next due time is in the future", () => {
    const lastFeed = now - 2 * 60 * 60 * 1000; // 2h ago; threshold ~3.5h at ~1mo → fires in ~1.5h
    const planned = planCareNotifications({
      now,
      babyDobMs: dob,
      settings: DEFAULT_NOTIFICATION_SETTINGS,
      thresholds: {
        noPoopHours: 24,
        noSleepHours: 6,
        feedOverdueMinutes: 0,
        tummyLowMinutes: 20,
        tummyLowByHour: 16,
      },
      prediction: null,
      isSleeping: false,
      feedInProgress: false,
      feedingHistory: [{ id: "1", timestamp: lastFeed, endTime: lastFeed }],
      bottleHistory: [],
      diaperHistory: [],
      lastPainkillerMs: null,
      vaccinationReminderAtMs: null,
    });
    const feed = planned.find((p) => p.id === CARE_NOTIF_IDS.feedOverdue);
    expect(feed).toBeDefined();
    expect(feed!.fireAt).toBeGreaterThan(now);
  });
});
