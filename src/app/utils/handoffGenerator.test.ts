import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateHandoffSession,
  getHandoffShareUrl,
  getHandoffSessionFromLocal,
  isHandoffSessionExpired,
  mergeHandoffLogsIntoMain,
  getHandoffSessionsFromLocal,
} from "./handoffGenerator";
import type { HandoffLog } from "../types/handoff";

const HANDOFF_SESSIONS_KEY = "cradl-handoff-sessions";

describe("handoffGenerator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("window", { location: { origin: "https://example.com" } });
  });

  it("generateHandoffSession with empty history returns safe defaults", () => {
    const session = generateHandoffSession("Baby", null);
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.expiresAt).toBeDefined();
    expect(session.babyName).toBe("Baby");
    expect(session.lastFeed).toBeNull();
    expect(session.nextFeedEta).toBeNull();
    expect(session.lastNap).toBeNull();
    expect(session.napWindowStatus).toBe("unknown");
    expect(session.lastDiaper).toBeNull();
    expect(session.headsUp).toBeNull();
    expect(session.logs).toEqual([]);
  });

  it("generateHandoffSession with full history populates last feed, nap, diaper", () => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    localStorage.setItem(
      "feedingHistory",
      JSON.stringify([
        { id: "f1", timestamp: oneHourAgo - 10000, endTime: oneHourAgo, durationMs: 300000, type: "left" },
      ])
    );
    localStorage.setItem(
      "sleepHistory",
      JSON.stringify([
        { id: "s1", startTime: oneHourAgo - 7200000, endTime: oneHourAgo - 3600000, position: "Back" },
      ])
    );
    localStorage.setItem(
      "diaperHistory",
      JSON.stringify([{ id: "d1", timestamp: oneHourAgo - 1800000, type: "both" }])
    );
    localStorage.setItem("babyProfile", JSON.stringify({ birthDate: now - 30 * 24 * 3600000, name: "Audrone" }));

    const session = generateHandoffSession("Audrone", "She's been fussy");
    expect(session.babyName).toBe("Audrone");
    expect(session.lastFeed).not.toBeNull();
    expect(session.lastFeed?.time).toBeDefined();
    expect(session.lastNap).not.toBeNull();
    expect(session.lastDiaper).not.toBeNull();
    expect(session.headsUp).toBe("She's been fussy");
  });

  it("generateHandoffSession never throws", () => {
    localStorage.setItem("feedingHistory", "invalid");
    expect(() => generateHandoffSession("B", null)).not.toThrow();
  });

  it("getHandoffShareUrl returns origin + /handoff/:id", () => {
    const session = generateHandoffSession("B", null);
    const url = getHandoffShareUrl(session);
    expect(url).toContain("/handoff/");
    expect(url).toContain(session.id);
    expect(url).toMatch(/^https?:\/\//);
  });

  it("saves session to localStorage", () => {
    const session = generateHandoffSession("Baby", null);
    const list = JSON.parse(localStorage.getItem(HANDOFF_SESSIONS_KEY) || "[]");
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].id).toBe(session.id);
  });

  it("getHandoffSessionFromLocal returns session by id", () => {
    const session = generateHandoffSession("Baby", null);
    const found = getHandoffSessionFromLocal(session.id);
    expect(found?.id).toBe(session.id);
    expect(getHandoffSessionFromLocal("nonexistent")).toBeNull();
  });

  it("isHandoffSessionExpired returns true for past expiresAt", () => {
    const session = generateHandoffSession("B", null);
    const expired = { ...session, expiresAt: new Date(Date.now() - 1000).toISOString() };
    expect(isHandoffSessionExpired(expired)).toBe(true);
  });

  it("isHandoffSessionExpired returns false for future expiresAt", () => {
    const session = generateHandoffSession("B", null);
    expect(isHandoffSessionExpired(session)).toBe(false);
  });

  it("mergeHandoffLogsIntoMain does nothing if session expired", () => {
    const session = generateHandoffSession("B", null);
    const expired = { ...session, expiresAt: new Date(Date.now() - 1000).toISOString() };
    const merged = mergeHandoffLogsIntoMain(expired, [{ id: "l1", type: "feed", loggedAt: new Date().toISOString(), loggedByName: "X", note: null }], "B");
    expect(merged).toHaveLength(0);
  });

  it("mergeHandoffLogsIntoMain does nothing if baby name mismatch", () => {
    const session = generateHandoffSession("Baby", null);
    const merged = mergeHandoffLogsIntoMain(session, [{ id: "l1", type: "feed", loggedAt: new Date().toISOString(), loggedByName: "X", note: null }], "Other");
    expect(merged).toHaveLength(0);
  });

  it("mergeHandoffLogsIntoMain merges new logs and updates localStorage", () => {
    const session = generateHandoffSession("Baby", null);
    const log: HandoffLog = { id: "log1", type: "diaper", loggedAt: new Date().toISOString(), loggedByName: "Dad", note: null };
    const merged = mergeHandoffLogsIntoMain(session, [log], "Baby");
    expect(merged).toHaveLength(1);
    const diaperHistory = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
    expect(diaperHistory.some((e: { id: string }) => e.id === "handoff_log1")).toBe(true);
  });

  it("getHandoffSessionsFromLocal returns all saved sessions", () => {
    generateHandoffSession("B1", null);
    generateHandoffSession("B2", null);
    const list = getHandoffSessionsFromLocal();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});
