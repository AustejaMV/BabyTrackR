import { describe, it, expect, beforeEach } from "vitest";
import {
  getCustomTrackers,
  saveCustomTracker,
  updateCustomTracker,
  deleteCustomTracker,
  getCustomTrackerLogs,
  getLogsForTracker,
  saveCustomTrackerLog,
  deleteCustomTrackerLog,
} from "./customTrackerStorage";

describe("customTrackerStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("trackers", () => {
    it("returns empty array when no trackers", () => {
      expect(getCustomTrackers()).toEqual([]);
    });

    it("saves a new tracker with id and createdAt", () => {
      const t = saveCustomTracker({ name: "Vitamins", icon: "pill", unit: "ml" });
      expect(t.id).toBeDefined();
      expect(t.id.startsWith("ct-")).toBe(true);
      expect(t.name).toBe("Vitamins");
      expect(t.icon).toBe("pill");
      expect(t.unit).toBe("ml");
      expect(t.createdAt).toBeDefined();
      expect(getCustomTrackers()).toHaveLength(1);
    });

    it("updates tracker name and unit", () => {
      const t = saveCustomTracker({ name: "Vitamins", icon: "pill" });
      updateCustomTracker(t.id, { name: "Vitamin D", unit: "drops" });
      const list = getCustomTrackers();
      expect(list[0].name).toBe("Vitamin D");
      expect(list[0].unit).toBe("drops");
    });

    it("deletes tracker and its logs", () => {
      const t = saveCustomTracker({ name: "Vitamins", icon: "pill" });
      saveCustomTrackerLog({ trackerId: t.id, timestamp: Date.now(), value: 1 });
      expect(getCustomTrackerLogs()).toHaveLength(1);
      deleteCustomTracker(t.id);
      expect(getCustomTrackers()).toHaveLength(0);
      expect(getCustomTrackerLogs()).toHaveLength(0);
    });
  });

  describe("logs", () => {
    it("returns empty when no logs", () => {
      expect(getCustomTrackerLogs()).toEqual([]);
    });

    it("saves a log with id and returns it", () => {
      const t = saveCustomTracker({ name: "Vitamins", icon: "pill" });
      const entry = saveCustomTrackerLog({
        trackerId: t.id,
        timestamp: 1000,
        value: 5,
        note: "Morning dose",
      });
      expect(entry.id).toBeDefined();
      expect(entry.trackerId).toBe(t.id);
      expect(entry.timestamp).toBe(1000);
      expect(entry.value).toBe(5);
      expect(entry.note).toBe("Morning dose");
      expect(getCustomTrackerLogs()).toHaveLength(1);
    });

    it("getLogsForTracker returns only that tracker logs sorted by timestamp desc", () => {
      const t1 = saveCustomTracker({ name: "A", icon: "star" });
      const t2 = saveCustomTracker({ name: "B", icon: "heart" });
      saveCustomTrackerLog({ trackerId: t1.id, timestamp: 100 });
      saveCustomTrackerLog({ trackerId: t2.id, timestamp: 200 });
      saveCustomTrackerLog({ trackerId: t1.id, timestamp: 300 });
      const logs = getLogsForTracker(t1.id);
      expect(logs).toHaveLength(2);
      expect(logs[0].timestamp).toBe(300);
      expect(logs[1].timestamp).toBe(100);
    });

    it("deleteCustomTrackerLog removes the entry", () => {
      const t = saveCustomTracker({ name: "A", icon: "star" });
      const e = saveCustomTrackerLog({ trackerId: t.id, timestamp: 100 });
      deleteCustomTrackerLog(e.id);
      expect(getCustomTrackerLogs()).toHaveLength(0);
    });
  });
});
