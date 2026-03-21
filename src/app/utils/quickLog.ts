/**
 * Hold-to-log: quick log with smart defaults (Prompt 4).
 * Timer types: hold = start if not running, stop if running. Counter (nappy): single log.
 */

import { endCurrentSleepIfActive } from "./sleepUtils";
import { persistActiveBabyCopy } from "../data/babiesStorage";

/** End in-progress sleep and sync sleepHistory + clear currentSleep on server. */
export function endActiveSleepAndSync(
  saveDataFn: (key: string, data: unknown, token: string) => void,
  accessToken: string | undefined,
): boolean {
  return endCurrentSleepIfActive((history) => {
    try {
      if (accessToken) {
        saveDataFn("sleepHistory", history, accessToken);
        saveDataFn("currentSleep", null, accessToken);
      }
    } catch {
      /* ignore */
    }
  });
}
import { getLastFeedSide, saveLastFeedSide } from "./lastFeedSideStorage";
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord } from "../types";
import type { FeedSegment } from "../contexts/FeedTimerContext";

export type QuickLogType = "feed" | "sleep" | "diaper" | "tummy";

export interface QuickLogResult {
  toastMessage: string;
  /** If set, open this drawer after (e.g. "feed" to edit/stop). */
  openDrawer?: QuickLogType;
  /** For feed: call to start timer in FeedTimerContext. */
  startFeedTimer?: (side: "Left" | "Right") => void;
}

/** 19:00–06:00 = night sleep, else nap */
function isNightWindow(): boolean {
  const h = new Date().getHours();
  return h >= 19 || h < 6;
}

/** Quick-log feed: start timer with opposite side. No record until user stops. Ends active sleep first (baby woke to feed). */
export function quickLogFeed(
  startFeedTimer: (side: "Left" | "Right") => void,
  saveDataFn?: (key: string, data: unknown, token: string) => void,
  accessToken?: string | undefined,
): QuickLogResult {
  if (saveDataFn) {
    endActiveSleepAndSync(saveDataFn, accessToken);
  } else {
    endCurrentSleepIfActive(() => {});
  }
  const last = getLastFeedSide();
  const side: "Left" | "Right" = last === "right" ? "Left" : last === "left" ? "Right" : "Left";
  saveLastFeedSide(side === "Left" ? "left" : "right");
  startFeedTimer(side);
  const sideLabel = side === "Left" ? "Left" : "Right";
  return {
    toastMessage: `${sideLabel} breast started — tap to edit`,
    openDrawer: "feed",
  };
}

/** Quick-log sleep: create currentSleep (in progress). */
export function quickLogSleep(saveDataFn: (key: string, data: unknown, token: string) => void, accessToken: string | undefined): QuickLogResult {
  endCurrentSleepIfActive((history) => {
    try {
      localStorage.setItem("sleepHistory", JSON.stringify(history));
      if (accessToken) saveDataFn("sleepHistory", history, accessToken);
      else persistActiveBabyCopy("sleepHistory");
    } catch {}
  });
  const now = Date.now();
  const record: SleepRecord = {
    id: now.toString(),
    position: "Left side",
    startTime: now,
  };
  try {
    localStorage.setItem("currentSleep", JSON.stringify(record));
    if (accessToken) saveDataFn("currentSleep", record, accessToken);
    else persistActiveBabyCopy("currentSleep");
  } catch {}
  const label = isNightWindow() ? "Night sleep" : "Nap";
  return {
    toastMessage: `${label} started — tap to stop`,
    openDrawer: "sleep",
  };
}

/** End current sleep (hold when already running). Does not start a new one. Returns null if no active sleep. */
export function quickEndSleep(saveDataFn: (key: string, data: unknown, token: string) => void, accessToken: string | undefined): QuickLogResult | null {
  let ended = false;
  const didEnd = endCurrentSleepIfActive((history) => {
    try {
      localStorage.setItem("sleepHistory", JSON.stringify(history));
      if (accessToken) saveDataFn("sleepHistory", history, accessToken);
      ended = true;
    } catch {}
  });
  if (!didEnd || !ended) return null;
  const label = isNightWindow() ? "Night sleep" : "Nap";
  return {
    toastMessage: `${label} ended — tap to edit`,
    openDrawer: "sleep",
  };
}

/** Quick-log nappy: wet, now. */
export function quickLogDiaper(saveDataFn: (key: string, data: unknown, token: string) => void, accessToken: string | undefined): QuickLogResult {
  endCurrentSleepIfActive((history) => {
    try {
      localStorage.setItem("sleepHistory", JSON.stringify(history));
      if (accessToken) saveDataFn("sleepHistory", history, accessToken);
    } catch {}
  });
  const record: DiaperRecord = { id: Date.now().toString(), type: "pee", timestamp: Date.now() };
  let history: DiaperRecord[] = [];
  try {
    history = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
  } catch {}
  history.push(record);
  try {
    localStorage.setItem("diaperHistory", JSON.stringify(history));
    if (accessToken) saveDataFn("diaperHistory", history, accessToken);
  } catch {}
  return {
    toastMessage: "Wet nappy logged — tap to edit",
    openDrawer: "diaper",
  };
}

/** Quick-log tummy: started now (no endTime). */
export function quickLogTummy(saveDataFn: (key: string, data: unknown, token: string) => void, accessToken: string | undefined): QuickLogResult {
  const now = Date.now();
  const record: TummyTimeRecord = { id: now.toString(), startTime: now };
  let history: TummyTimeRecord[] = [];
  try {
    history = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
  } catch {}
  history.push(record);
  try {
    localStorage.setItem("tummyTimeHistory", JSON.stringify(history));
    if (accessToken) saveDataFn("tummyTimeHistory", history, accessToken);
  } catch {}
  return {
    toastMessage: "Tummy time started — tap to stop",
    openDrawer: "tummy",
  };
}

/** End active tummy time (hold when already running). Returns null if none active. */
export function quickEndTummy(saveDataFn: (key: string, data: unknown, token: string) => void, accessToken: string | undefined): QuickLogResult | null {
  let history: TummyTimeRecord[] = [];
  try {
    history = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
  } catch {}
  const active = history.filter((r) => !("endTime" in r) || r.endTime == null).pop();
  if (!active) return null;
  const now = Date.now();
  const updated = history.map((r) =>
    r.id === active.id ? { ...r, endTime: now } as TummyTimeRecord : r
  );
  try {
    localStorage.setItem("tummyTimeHistory", JSON.stringify(updated));
    if (accessToken) saveDataFn("tummyTimeHistory", updated, accessToken);
  } catch {}
  return {
    toastMessage: "Tummy time ended — tap to edit",
    openDrawer: "tummy",
  };
}

/** End current feed timer and save as FeedingRecord. */
export function quickEndFeed(
  elapsedMs: number,
  feedSegments: FeedSegment[],
  feedSide: "Left" | "Right" | "Both",
  saveDataFn: (key: string, data: unknown, token: string) => void,
  accessToken: string | undefined
): QuickLogResult {
  const segmentsToSave = [...feedSegments];
  if (elapsedMs > 0) {
    segmentsToSave.push({ side: feedSide, durationMs: elapsedMs });
  }
  const endTime = Date.now();
  let runStart = endTime - segmentsToSave.reduce((s, seg) => s + seg.durationMs, 0);
  const segmentRecords = segmentsToSave.map((seg) => {
    const segStart = runStart;
    runStart += seg.durationMs;
    const type = seg.side === "Both" ? "Both breasts" : `${seg.side} breast`;
    return { type, startTime: segStart, endTime: segStart + seg.durationMs, durationMs: seg.durationMs };
  });
  const duration = segmentsToSave.reduce((s, seg) => s + seg.durationMs, 0);
  const startTime = endTime - duration;
  const record: FeedingRecord = {
    id: Date.now().toString(),
    timestamp: endTime,
    startTime,
    endTime,
    ...(segmentRecords.length > 0
      ? { segments: segmentRecords }
      : { type: feedSide === "Both" ? "Both breasts" : `${feedSide} breast`, durationMs: duration }),
  };
  let history: FeedingRecord[] = [];
  try {
    history = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
  } catch {}
  history.push(record);
  try {
    localStorage.setItem("feedingHistory", JSON.stringify(history));
    if (accessToken) saveDataFn("feedingHistory", history, accessToken);
  } catch {}
  const lastSide = segmentsToSave.length > 0 ? segmentsToSave[segmentsToSave.length - 1].side : feedSide;
  if (lastSide === "Left") saveLastFeedSide("left");
  else if (lastSide === "Right") saveLastFeedSide("right");
  else saveLastFeedSide("both");
  return {
    toastMessage: "Feed ended — tap to edit",
    openDrawer: "feed",
  };
}
