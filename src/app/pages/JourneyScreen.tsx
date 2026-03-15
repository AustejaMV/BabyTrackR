import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Link } from "react-router";
import { Navigation } from "../components/Navigation";
import { ThemeToggle } from "../components/ThemeToggle";
import { RangeBar } from "../components/RangeBar";
import { GrowthChartSection } from "../components/GrowthChartSection";
import { JOURNEY_MILESTONES, CUSTOM_MILESTONE_ID } from "../data/journeyMilestones";
import { DEFAULT_MILESTONES } from "../utils/babyUtils";
import { useAuth } from "../contexts/AuthContext";
import { saveData } from "../utils/dataSync";
import type { BabyProfile, Milestone } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatAchieved(ms: number): string {
  const d = new Date(ms);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function JourneyScreen() {
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editName, setEditName] = useState("");
  const [feedingCount, setFeedingCount] = useState(0);
  const [sleepCount, setSleepCount] = useState(0);
  const [diaperCount, setDiaperCount] = useState(0);
  const [tummyMinutes, setTummyMinutes] = useState(0);
  const { session } = useAuth();

  useEffect(() => {
    try {
      const bp = localStorage.getItem("babyProfile");
      setBabyProfile(bp ? JSON.parse(bp) : null);
    } catch {
      setBabyProfile(null);
    }
    try {
      const raw = localStorage.getItem("milestones");
      const saved: Milestone[] = raw ? JSON.parse(raw) : [];
      const merged = DEFAULT_MILESTONES.map((d) => {
        const s = saved.find((x) => x.id === d.id);
        return { ...d, achievedAt: s?.achievedAt };
      });
      const custom = saved.filter((s) => s.id.startsWith("custom-"));
      setMilestones([...merged, ...custom]);
    } catch {
      setMilestones(DEFAULT_MILESTONES.map((m) => ({ ...m, achievedAt: undefined })));
    }
    const todayStart = new Date().setHours(0, 0, 0, 0);
    try {
      const logs = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
      const bottle = JSON.parse(localStorage.getItem("bottleHistory") || "[]");
      const feedCount = logs.filter((l: { endTime?: number; timestamp?: number }) => (l.endTime ?? l.timestamp) >= todayStart).length;
      const bottleCount = bottle.filter((b: { timestamp: number }) => b.timestamp >= todayStart).length;
      setFeedingCount(feedCount + bottleCount);
    } catch {
      setFeedingCount(0);
    }
    try {
      const sleeps = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
      const count = sleeps.filter((s: { startTime: number }) => s.startTime >= todayStart).length;
      setSleepCount(count);
    } catch {
      setSleepCount(0);
    }
    try {
      const diapers = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
      const count = diapers.filter((d: { timestamp: number }) => d.timestamp >= todayStart).length;
      setDiaperCount(count);
    } catch {
      setDiaperCount(0);
    }
    try {
      const tummy = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
      const totalMs = tummy
        .filter((t: { startTime: number }) => t.startTime >= todayStart)
        .reduce((sum: number, t: { startTime: number; endTime?: number; excludedMs?: number }) => {
          if (t.endTime == null) return sum;
          const dur = t.endTime - t.startTime - (t.excludedMs ?? 0);
          return sum + Math.max(0, dur);
        }, 0);
      setTummyMinutes(Math.round(totalMs / 60000));
    } catch {
      setTummyMinutes(0);
    }
  }, []);

  const getAchieved = (id: string) => milestones.find((m) => m.id === id)?.achievedAt;
  const birthMs = babyProfile?.birthDate ? new Date(babyProfile.birthDate).setHours(0, 0, 0, 0) : null;

  const nodes = [...JOURNEY_MILESTONES.map((j) => ({ ...j, achievedAt: getAchieved(j.id) })), { id: CUSTOM_MILESTONE_ID, label: "Add your own", typicalLabel: "", typicalWeeksMin: 0, typicalWeeksMax: 0, achievedAt: undefined as number | undefined }];

  const firstUnachievedIndex = nodes.findIndex((n) => n.id !== CUSTOM_MILESTONE_ID && !n.achievedAt);
  const activeIndex = firstUnachievedIndex >= 0 ? firstUnachievedIndex : nodes.length - 1;

  const saveMilestone = (id: string, dateStr: string, timeStr: string, name?: string) => {
    if (!dateStr.trim()) return;
    const ymd = dateStr.trim().split("-").map(Number);
    const isPicker = ymd.length === 3 && ymd.every((n) => !isNaN(n));
    let ms = isPicker
      ? new Date(ymd[0], ymd[1] - 1, ymd[2]).getTime()
      : new Date(dateStr).getTime();
    if (timeStr.trim()) {
      const [h, m] = timeStr.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date(ms);
        d.setHours(h, m, 0, 0);
        ms = d.getTime();
      }
    }
    const storageId = id === CUSTOM_MILESTONE_ID ? `custom-${Date.now()}` : id;
    const existing = milestones.find((m) => m.id === storageId);
    const def = DEFAULT_MILESTONES.find((d) => d.id === id);
    const next =
      id === CUSTOM_MILESTONE_ID
        ? [...milestones, { id: storageId, label: name || "Custom", typicalDaysMin: 0, typicalDaysMax: 365, achievedAt: ms }]
        : existing
          ? milestones.map((m) => (m.id === id ? { ...m, achievedAt: ms, label: name || m.label } : m))
          : [...milestones, { ...(def ?? { id: storageId, label: name || "Custom", typicalDaysMin: 0, typicalDaysMax: 365 }), achievedAt: ms }];
    setMilestones(next);
    try {
      localStorage.setItem("milestones", JSON.stringify(next));
    } catch {}
    if (session?.access_token) saveData("milestones", next, session.access_token);
    setEditId(null);
    setEditDate("");
    setEditTime("");
    setEditName("");
  };

  const openEdit = (id: string) => {
    setEditId(id);
    if (id === CUSTOM_MILESTONE_ID) {
      const now = new Date();
      setEditDate(format(now, "yyyy-MM-dd"));
      setEditTime(format(now, "HH:mm"));
      setEditName("");
    } else {
      const achieved = getAchieved(id);
      if (achieved) {
        const d = new Date(achieved);
        setEditDate(`${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`);
        setEditTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
      } else {
        setEditDate("");
        setEditTime("");
      }
      setEditName("");
    }
  };

  const weeksFromBirth = (ms: number) => (birthMs ? Math.round((ms - birthMs) / (7 * MS_PER_DAY)) : 0);
  const firstSmileAchieved = getAchieved("first-smile");
  const crawlingAchieved = getAchieved("crawls");
  const babyWeeksFirstSmile = firstSmileAchieved && birthMs ? weeksFromBirth(firstSmileAchieved) : 0;
  const babyMonthsCrawling = crawlingAchieved && birthMs ? Math.round((crawlingAchieved - birthMs) / (30 * MS_PER_DAY)) : 0;

  const firstSmileMinW = 4,
    firstSmileMaxW = 13;
  const firstSmilePct =
    babyWeeksFirstSmile > 0
      ? Math.max(0, Math.min(100, ((babyWeeksFirstSmile - firstSmileMinW) / (firstSmileMaxW - firstSmileMinW)) * 100))
      : 11;
  const crawlMinW = 24,
    crawlMaxW = 52;
  const crawlPct =
    crawlingAchieved && birthMs
      ? Math.max(0, Math.min(100, ((weeksFromBirth(crawlingAchieved) - crawlMinW) / (crawlMaxW - crawlMinW)) * 100))
      : 60;

  const feedsMin = 5,
    feedsMax = 9;
  const feedsPct = Math.max(0, Math.min(100, (feedingCount / 12) * 100));
  const feedsInRange = feedingCount >= feedsMin && feedingCount <= feedsMax;

  const sleepMin = 3,
    sleepMax = 6;
  const sleepPct = Math.max(0, Math.min(100, (sleepCount / 8) * 100));
  const sleepInRange = sleepCount >= sleepMin && sleepCount <= sleepMax;

  const diaperMin = 4,
    diaperMax = 10;
  const diaperPct = Math.max(0, Math.min(100, (diaperCount / 14) * 100));
  const diaperInRange = diaperCount >= diaperMin && diaperCount <= diaperMax;

  const tummyMin = 10,
    tummyMax = 30;
  const tummyPct = Math.max(0, Math.min(100, (tummyMinutes / 45) * 100));
  const tummyInRange = tummyMinutes >= tummyMin && tummyMinutes <= tummyMax;

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="p-2 -ml-2 rounded-lg hover:opacity-80" style={{ color: "var(--mu)" }} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10H5M5 10l5 5M5 10l5-5" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-[18px] mb-0.5 font-serif" style={{ color: "var(--tx)" }}>
          {babyProfile?.name ? `${babyProfile.name}'s story` : "Journey"}
        </h1>
        <p className="text-[10px] mb-2.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Tap any milestone to set when it happened
        </p>

        <div className="overflow-x-auto py-1.5 pb-4 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          <div className="flex items-start gap-0 min-w-[640px] px-1 py-1">
            {nodes.map((node, i) => {
              const isDone = node.achievedAt != null && node.id !== CUSTOM_MILESTONE_ID;
              const isNow = i === activeIndex && node.id !== CUSTOM_MILESTONE_ID;
              const isSoon = !isDone && !isNow && node.id !== CUSTOM_MILESTONE_ID;
              const isCustom = node.id === CUSTOM_MILESTONE_ID;
              const state = isDone ? "done" : isNow ? "now" : isSoon ? "soon" : "custom";

              return (
                <div key={node.id} className="flex items-start flex-shrink-0">
                  {i > 0 && (
                    <div
                      className="flex-1 min-w-[20px] h-0.5 mt-6 flex-shrink-0"
                      style={{
                        background:
                          i < activeIndex ? "var(--ro)" : i === activeIndex ? "linear-gradient(90deg, var(--ro), #d4a0d4)" : "var(--bd)",
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(node.id)}
                    className={`flex flex-col items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.07] ${isSoon ? "opacity-60" : isCustom ? "" : i === 4 ? "opacity-[0.45]" : i === 5 ? "opacity-40" : ""}`}
                  >
                    <div
                      className="w-[50px] h-[50px] rounded-full flex items-center justify-center border-[2.5px]"
                      style={
                        state === "done"
                          ? { borderColor: "var(--ro)", background: "var(--ro-bub)" }
                          : state === "now"
                            ? { borderColor: "#d4a0d4", boxShadow: "0 0 0 5px rgba(212,160,212,0.14)", background: "var(--la)" }
                            : state === "soon"
                              ? { borderColor: "var(--bd)", background: "var(--bg2)" }
                              : { borderColor: "#a8d498", background: "var(--sa)", opacity: 0.3 }
                      }
                    >
                      {state === "done" && (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <path d="M7 11c1-2 8-2 8 0" stroke="var(--ro)" strokeWidth="1.8" strokeLinecap="round" />
                          <circle cx="8.5" cy="9.2" r="1.2" fill="var(--ro)" />
                          <circle cx="13.5" cy="9.2" r="1.2" fill="var(--ro)" />
                          <circle cx="11" cy="11" r="8.5" stroke="var(--ro)" strokeWidth="1.5" />
                        </svg>
                      )}
                      {state === "now" && (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <circle cx="17" cy="5" r="2.5" stroke="#c080d4" strokeWidth="1.6" />
                          <path d="M4 17c2-4 13-7 14-4" stroke="#c080d4" strokeWidth="1.6" strokeLinecap="round" />
                          <circle cx="5" cy="18" r="2" stroke="#c080d4" strokeWidth="1.6" />
                          <circle cx="11" cy="18" r="2" stroke="#c080d4" strokeWidth="1.6" />
                        </svg>
                      )}
                      {(state === "soon" || state === "custom") && (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <circle cx="11" cy="11" r="8.5" stroke="var(--mu)" strokeWidth="1.5" />
                        </svg>
                      )}
                      {state === "custom" && (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <circle cx="11" cy="11" r="8.5" stroke="#a8d498" strokeWidth="1.5" strokeDasharray="3 2" />
                          <path d="M11 7v8M7 11h8" stroke="#a8d498" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <div
                      className="text-[8px] text-center max-w-[56px] leading-tight"
                      style={{
                        color: state === "done" ? "var(--ro)" : state === "now" ? "#9060b0" : state === "custom" ? "var(--grn)" : "var(--mu)",
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {node.label.replace(" ", "\n")}
                      <br />
                      <span style={{ fontSize: "7px" }}>
                        {node.achievedAt ? formatAchieved(node.achievedAt) : node.typicalLabel || "Add"}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[8px] text-center mb-2.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          ← scroll the timeline →
        </p>

        {editId && (
          <div
            className="border rounded-2xl p-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ background: "var(--card)", borderColor: "var(--bd)" }}
          >
            <p className="text-[13px] font-medium mb-2" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
              {editId === CUSTOM_MILESTONE_ID ? "Custom milestone" : nodes.find((n) => n.id === editId)?.label}
            </p>
            <p className="text-[9px] mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              When did this happen for {babyProfile?.name || "your baby"}?
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]"
                style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              />
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]"
                style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              />
            </div>
            {editId === CUSTOM_MILESTONE_ID && (
              <input
                type="text"
                placeholder="Name this milestone..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border px-2 py-1.5 text-[10px] outline-none mb-2"
                style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              />
            )}
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => { setEditId(null); setEditDate(""); setEditTime(""); setEditName(""); }}
                className="flex-1 py-2 rounded-xl text-[11px] border"
                style={{ background: "var(--btn-row)", color: "var(--mu)", borderColor: "var(--bd)", fontFamily: "system-ui, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMilestone(editId, editDate, editTime, editName || undefined)}
                className="flex-[2] py-2 rounded-xl text-[11px] text-white"
                style={{ background: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
              >
                Save milestone
              </button>
            </div>
          </div>
        )}

        <p className="text-[9px] uppercase tracking-widest mt-4 mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          how is she doing?
        </p>
        <div
          className="border rounded-2xl p-3 mb-2"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <RangeBar
            label="Feeds today"
            value={feedsInRange ? `${feedingCount} — in range` : `${feedingCount}`}
            valueColour={feedsInRange ? "var(--grn)" : "var(--pink)"}
            showValueInHeader={false}
            rangeStart={((feedsMin - 0) / 12) * 100}
            rangeWidth={((feedsMax - feedsMin) / 12) * 100}
            babyValue={feedsPct}
            barColour="#c8e0c4"
            captionLeft={`${feedsMin}+`}
            captionRight={`~${feedsMax}`}
          />
          <RangeBar
            label="Sleeps today"
            value={sleepInRange ? `${sleepCount} naps — in range` : `${sleepCount} naps`}
            valueColour={sleepInRange ? "var(--grn)" : "var(--blue)"}
            showValueInHeader={false}
            rangeStart={((sleepMin - 0) / 8) * 100}
            rangeWidth={((sleepMax - sleepMin) / 8) * 100}
            babyValue={sleepPct}
            barColour="#c8dce8"
            captionLeft={`${sleepMin}+`}
            captionRight={`~${sleepMax}`}
          />
          <RangeBar
            label="Diapers today"
            value={diaperInRange ? `${diaperCount} — in range` : `${diaperCount}`}
            valueColour={diaperInRange ? "var(--grn)" : "var(--grn)"}
            showValueInHeader={false}
            rangeStart={((diaperMin - 0) / 14) * 100}
            rangeWidth={((diaperMax - diaperMin) / 14) * 100}
            babyValue={diaperPct}
            barColour="#c8e0c4"
            captionLeft={`${diaperMin}+`}
            captionRight={`~${diaperMax}`}
          />
          <RangeBar
            label="Tummy time today"
            value={tummyInRange ? `${tummyMinutes}m — in range` : `${tummyMinutes}m`}
            valueColour={tummyInRange ? "var(--grn)" : "var(--purp)"}
            showValueInHeader={false}
            rangeStart={((tummyMin - 0) / 45) * 100}
            rangeWidth={((tummyMax - tummyMin) / 45) * 100}
            babyValue={tummyPct}
            barColour="#e0d8f0"
            captionLeft={`${tummyMin}m+`}
            captionRight={`~${tummyMax}m`}
          />
          {firstSmileAchieved != null && (
            <RangeBar
              label="First smile"
              value={babyWeeksFirstSmile ? `Wk ${babyWeeksFirstSmile} — ${babyWeeksFirstSmile < 6 ? "early!" : "on track"}` : "—"}
              rangeStart={((4 - firstSmileMinW) / (firstSmileMaxW - firstSmileMinW)) * 100}
              rangeWidth={((13 - 4) / (firstSmileMaxW - firstSmileMinW)) * 100}
              babyValue={firstSmilePct}
              barColour="#fdd0c0"
              captionLeft="Earliest 4 wks"
              captionRight="Latest 3 mo"
            />
          )}
          {crawlingAchieved != null && (
            <RangeBar
              label="Crawling"
              value={babyMonthsCrawling ? `Month ${babyMonthsCrawling}` : "—"}
              rangeStart={((24 - crawlMinW) / (crawlMaxW - crawlMinW)) * 100}
              rangeWidth={((44 - 24) / (crawlMaxW - crawlMinW)) * 100}
              babyValue={crawlPct}
              barColour="#fdd0c0"
              captionLeft="Earliest 6 mo"
              captionRight="Latest 12 mo"
            />
          )}
        </div>

        {birthMs != null && (
          <>
            <p className="text-[9px] uppercase tracking-widest mt-4 mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              growth
            </p>
            <GrowthChartSection birthDateMs={birthMs} sex="girls" />
          </>
        )}
      </div>
      <Navigation />
    </div>
  );
}
