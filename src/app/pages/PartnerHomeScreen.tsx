/**
 * Simplified caregiver/partner view: log feed, sleep, diaper, bottle + see today + switch to full view.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useRole } from "../contexts/RoleContext";
import { useBaby } from "../contexts/BabyContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { LogDrawer } from "../components/LogDrawer";
import { TodayTimelineModal } from "../components/TodayTimelineModal";
import { getTimeSince } from "../utils/dateUtils";
import type { SleepRecord, FeedingRecord, DiaperRecord } from "../types";
import { LayoutDashboard } from "lucide-react";

export function PartnerHomeScreen() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const { activeBaby } = useBaby();
  const { session } = useAuth();
  const [openDrawer, setOpenDrawer] = useState<"feed" | "sleep" | "diaper" | "bottle" | null>(null);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [lastFeeding, setLastFeeding] = useState<FeedingRecord | null>(null);
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [recentDiapers, setRecentDiapers] = useState<DiaperRecord[]>([]);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const loadLocalDataRef = useRef<() => void>(() => {});

  const loadLocalData = () => {
    try {
      const sleepData = localStorage.getItem("currentSleep");
      setCurrentSleep(sleepData ? JSON.parse(sleepData) : null);
    } catch {
      setCurrentSleep(null);
    }
    try {
      const raw = localStorage.getItem("feedingHistory");
      if (raw) {
        const arr: FeedingRecord[] = JSON.parse(raw);
        if (arr.length > 0) setLastFeeding(arr[arr.length - 1]!);
      }
    } catch {}
    try {
      const raw = localStorage.getItem("diaperHistory");
      if (raw) setRecentDiapers(JSON.parse(raw));
    } catch {
      setRecentDiapers([]);
    }
  };

  loadLocalDataRef.current = loadLocalData;

  useEffect(() => {
    loadLocalData();
  }, []);

  const handleSaved = () => {
    loadLocalDataRef.current();
    setOpenDrawer(null);
    setTimelineRefreshKey((k) => k + 1);
  };

  const handleSwitchToFullView = () => {
    setRole("primary");
    navigate("/");
  };

  const babyName = activeBaby?.name ?? "Baby";

  const logButtons = [
    { type: "feed" as const, label: "Feed", sub: lastFeeding ? getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp) : "No feed yet", dot: "var(--coral)" },
    { type: "sleep" as const, label: "Sleep", sub: currentSleep ? getTimeSince(currentSleep.startTime ?? 0) : "Awake", dot: "var(--blue)" },
    { type: "diaper" as const, label: "Diaper", sub: recentDiapers.length > 0 ? getTimeSince(recentDiapers[recentDiapers.length - 1]!.timestamp) + " ago" : "No changes yet", dot: "var(--grn)" },
    { type: "bottle" as const, label: "Bottle", sub: "Log bottle", dot: "var(--coral)" },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>{babyName}</h1>
          <button
            type="button"
            onClick={handleSwitchToFullView}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border text-sm"
            style={{ borderColor: "var(--bd)", color: "var(--tx)", background: "var(--card)" }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Switch to full view
          </button>
        </div>

        <p className="text-[13px] mb-4" style={{ color: "var(--mu)" }}>
          Quick log for {babyName}. Changes sync to the main app.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {logButtons.map(({ type, label, sub, dot }) => (
            <button
              key={type}
              type="button"
              onClick={() => setOpenDrawer(type)}
              className="rounded-[18px] p-4 border text-center min-h-[100px] flex flex-col items-center justify-center"
              style={{ background: "var(--card)", borderColor: "var(--bd)", color: "var(--tx)" }}
            >
              <div className="w-3 h-3 rounded-full mb-2" style={{ background: dot }} aria-hidden />
              <span className="text-[15px] font-medium">{label}</span>
              <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)" }}>{sub}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setTodayModalOpen(true)}
          className="w-full py-3.5 px-4 rounded-xl border font-medium text-sm"
          style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
        >
          See today&apos;s timeline
        </button>

        {openDrawer && (
          <div className="mt-4 rounded-2xl border overflow-hidden" style={{ background: "var(--card2)", borderColor: "var(--bd)" }}>
            <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "var(--bd)" }}>
              <span className="font-medium" style={{ color: "var(--tx)" }}>{logButtons.find((b) => b.type === openDrawer)?.label ?? openDrawer}</span>
              <button type="button" onClick={() => setOpenDrawer(null)} className="py-2 px-3 rounded-lg text-sm" style={{ color: "var(--mu)" }}>Close</button>
            </div>
            <LogDrawer type={openDrawer} onClose={() => setOpenDrawer(null)} onSaved={handleSaved} session={session} />
          </div>
        )}

        {todayModalOpen && (
          <TodayTimelineModal
            open={todayModalOpen}
            onClose={() => setTodayModalOpen(false)}
            filter={null}
            refreshKey={timelineRefreshKey}
          />
        )}
      </div>
      <Navigation />
    </div>
  );
}
