import { useState, useEffect } from "react";
import { DurationPicker, MAX_DURATION_HISTORY_MS } from "./DurationPicker";
import { saveData } from "../utils/dataSync";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { getLastFeedSide, saveLastFeedSide } from "../utils/lastFeedSideStorage";
import { format } from "date-fns";
import { getTimeSince } from "../utils/dateUtils";
import { useFeedTimer } from "../contexts/FeedTimerContext";
import { toast } from "sonner";
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord, BottleRecord, PumpRecord } from "../types";
import type { Session } from "@supabase/supabase-js";

type DrawerType = "feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump";

/** Parse date (yyyy-MM-dd) and time (HH:mm) from date/time pickers to epoch ms. */
function parsePastDatetimeFromPickers(dateStr: string, timeStr: string): number | null {
  if (!dateStr.trim()) return null;
  const [y, m, d] = dateStr.trim().split("-").map(Number);
  const [h = 0, min = 0] = (timeStr.trim() || "0:0").split(":").map(Number);
  if ([y, m, d].some(isNaN)) return null;
  const ms = new Date(y, m - 1, d, h, min).getTime();
  return Number.isFinite(ms) ? ms : null;
}

interface LogDrawerProps {
  type: DrawerType | null;
  onClose: () => void;
  onSaved: () => void;
  session: Session | null;
}

const BOTTLE_VOLUMES = Array.from({ length: 30 }, (_, i) => 10 + i * 10); // 10 to 300 step 10

export function LogDrawer({ type, onClose, onSaved, session }: LogDrawerProps) {
  const feedTimer = useFeedTimer();
  const [sleepPosition, setSleepPosition] = useState("Left side");
  const [diaperType, setDiaperType] = useState<"pee" | "poop" | "both">("pee");
  const [durationMs, setDurationMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [pastChecked, setPastChecked] = useState(false);
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");
  const [bottleVolumeMl, setBottleVolumeMl] = useState(60);
  const [bottleFeedType, setBottleFeedType] = useState<"formula" | "expressed" | "mixed">("expressed");
  const [pumpSide, setPumpSide] = useState<"left" | "right" | "both">("both");
  const [pumpVolumeLeft, setPumpVolumeLeft] = useState(0);
  const [pumpVolumeRight, setPumpVolumeRight] = useState(0);
  const [pumpDurationMs, setPumpDurationMs] = useState(0);
  const [pumpTimerRunning, setPumpTimerRunning] = useState(false);
  const [pumpElapsedMs, setPumpElapsedMs] = useState(0);

  useEffect(() => {
    if (!pumpTimerRunning) return;
    const id = setInterval(() => setPumpElapsedMs((e) => e + 1000), 1000);
    return () => clearInterval(id);
  }, [pumpTimerRunning]);

  const [lastFeedLabel, setLastFeedLabel] = useState<string | null>(null);
  useEffect(() => {
    if (type !== "feed" || !feedTimer) return;
    const { feedSegments: segs, timerRunning: running, setFeedSide: setSide } = feedTimer;
    if (segs.length === 0 && !running) {
      const last = getLastFeedSide();
      if (last === "left") setSide("Right");
      else if (last === "right") setSide("Left");
      else setSide("Left");
    }
    try {
      const raw = localStorage.getItem("feedingHistory");
      if (!raw) { setLastFeedLabel(null); return; }
      const arr: FeedingRecord[] = JSON.parse(raw);
      const lastRecord = arr[arr.length - 1];
      if (!lastRecord) { setLastFeedLabel(null); return; }
      const t = lastRecord.endTime ?? lastRecord.timestamp;
      const seg = lastRecord.segments?.[0];
      const side = seg?.type?.includes("Left") ? "Left" : seg?.type?.includes("Right") ? "Right" : "Both";
      setLastFeedLabel(`Last feed was ${side} breast · ${getTimeSince(t)}`);
    } catch {
      setLastFeedLabel(null);
    }
  }, [type, feedTimer]);

  /** Feed timer state from context (persists when drawer is closed) */
  const f = feedTimer;
  const totalFeedDurationMs = f
    ? f.feedSegments.reduce((s, seg) => s + seg.durationMs, 0) + (f.timerRunning || f.timerPaused ? f.elapsedMs : pastChecked ? durationMs : 0)
    : 0;
  const feedValueMs = f ? (f.timerRunning || f.timerPaused ? f.elapsedMs : durationMs) : durationMs;

  const handleSwitchBreast = () => {
    if (!f || f.elapsedMs <= 0) return;
    f.setFeedSegments((prev) => [...prev, { side: f.feedSide, durationMs: f.elapsedMs }]);
    f.setElapsedMs(0);
    f.setTimerPaused(false);
    f.setFeedSide(f.feedSide === "Left" ? "Right" : f.feedSide === "Right" ? "Left" : "Left");
  };

  const handleSaveFeed = () => {
    if (!f) return;
    const endTime = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
    const duration = pastChecked ? durationMs : totalFeedDurationMs;
    const startTime = endTime - duration;
    const segmentsToSave = [...f.feedSegments];
    if (f.timerRunning || f.timerPaused ? f.elapsedMs > 0 : !pastChecked && durationMs > 0) {
      const currentDur = pastChecked ? durationMs : (f.timerRunning || f.timerPaused ? f.elapsedMs : durationMs);
      segmentsToSave.push({ side: f.feedSide, durationMs: currentDur });
    }
    let runStart = startTime;
    let segmentRecords = segmentsToSave.map((seg) => {
      const segStart = runStart;
      runStart += seg.durationMs;
      const type = seg.side === "Both" ? "Both breasts" : `${seg.side} breast`;
      return { type, startTime: segStart, endTime: segStart + seg.durationMs, durationMs: seg.durationMs };
    });
    if (segmentRecords.length === 0) {
      const type = f.feedSide === "Both" ? "Both breasts" : `${f.feedSide} breast`;
      segmentRecords = [{ type, startTime, endTime, durationMs: duration }];
    }
    const record: FeedingRecord = {
      id: Date.now().toString(),
      timestamp: endTime,
      startTime,
      endTime,
      segments: segmentRecords,
    };
    let history: FeedingRecord[] = [];
    try {
      history = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
    } catch {}
    history.push(record);
    localStorage.setItem("feedingHistory", JSON.stringify(history));
    if (session?.access_token) saveData("feedingHistory", history, session.access_token);
    const lastSide = segmentsToSave.length > 0 ? segmentsToSave[segmentsToSave.length - 1].side : f.feedSide;
    if (lastSide === "Left") saveLastFeedSide("left");
    else if (lastSide === "Right") saveLastFeedSide("right");
    else saveLastFeedSide("both");
    f.resetFeedTimer();
    toast.success("Feed logged");
    onSaved();
    onClose();
  };

  const handleSaveSleep = () => {
    const endTime = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
    const duration = pastChecked ? durationMs : (timerRunning ? elapsedMs : durationMs);
    const startTime = endTime - duration;
    const record: SleepRecord = {
      id: Date.now().toString(),
      position: sleepPosition,
      startTime,
      endTime,
    };
    let history: SleepRecord[] = [];
    try {
      history = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
    } catch {}
    history.push(record);
    localStorage.setItem("sleepHistory", JSON.stringify(history));
    toast.success("Sleep logged");
    onSaved();
    onClose();
  };

  const handleSaveDiaper = () => {
    endCurrentSleepIfActive((sleepHistory) => {
      try {
        localStorage.setItem("sleepHistory", JSON.stringify(sleepHistory));
        if (session?.access_token) {
          saveData("sleepHistory", sleepHistory, session.access_token);
          saveData("currentSleep", null, session.access_token);
        }
      } catch {}
    });
    const timestamp = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
    const record: DiaperRecord = { id: Date.now().toString(), type: diaperType, timestamp };
    let history: DiaperRecord[] = [];
    try {
      history = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
    } catch {}
    history.push(record);
    localStorage.setItem("diaperHistory", JSON.stringify(history));
    if (session?.access_token) saveData("diaperHistory", history, session.access_token);
    toast.success("Diaper change logged");
    onSaved();
    onClose();
  };

  const handleSaveTummy = () => {
    const endTime = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
    const duration = pastChecked ? durationMs : (timerRunning ? elapsedMs : durationMs);
    const startTime = endTime - duration;
    const record: TummyTimeRecord = { id: Date.now().toString(), startTime, endTime };
    let history: TummyTimeRecord[] = [];
    try {
      history = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
    } catch {}
    history.push(record);
    localStorage.setItem("tummyTimeHistory", JSON.stringify(history));
    if (session?.access_token) saveData("tummyTimeHistory", history, session.access_token);
    toast.success("Tummy time logged");
    onSaved();
    onClose();
  };

  const handleSaveBottle = () => {
    const timestamp = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
    const record: BottleRecord = {
      id: Date.now().toString(),
      timestamp,
      volumeMl: bottleVolumeMl,
      feedType: bottleFeedType,
    };
    let history: BottleRecord[] = [];
    try {
      history = JSON.parse(localStorage.getItem("bottleHistory") || "[]");
    } catch {}
    history.push(record);
    localStorage.setItem("bottleHistory", JSON.stringify(history));
    if (session?.access_token) saveData("bottleHistory", history, session.access_token);
    toast.success("Bottle logged");
    onSaved();
    onClose();
  };

  const handleSavePump = () => {
    const timestamp = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
    const duration = pastChecked ? pumpDurationMs : (pumpTimerRunning ? pumpElapsedMs : pumpDurationMs);
    const record: PumpRecord = {
      id: Date.now().toString(),
      timestamp,
      side: pumpSide,
      volumeLeftMl: pumpSide === "left" || pumpSide === "both" ? pumpVolumeLeft : undefined,
      volumeRightMl: pumpSide === "right" || pumpSide === "both" ? pumpVolumeRight : undefined,
      durationMs: duration,
    };
    let history: PumpRecord[] = [];
    try {
      history = JSON.parse(localStorage.getItem("pumpHistory") || "[]");
    } catch {}
    history.push(record);
    localStorage.setItem("pumpHistory", JSON.stringify(history));
    if (session?.access_token) saveData("pumpHistory", history, session.access_token);
    toast.success("Pump session logged");
    onSaved();
    onClose();
  };

  const accent = type === "feed" || type === "bottle" ? "var(--coral)" : type === "sleep" ? "var(--blue)" : type === "diaper" ? "var(--grn)" : type === "tummy" ? "var(--purp)" : "var(--pink)";
  const pill = (label: string, value: string, current: string, set: (v: string) => void) => (
    <button
      key={label}
      type="button"
      onClick={() => set(value)}
      className="px-3 py-1.5 rounded-[20px] border text-[10px] transition-all"
      style={{
        borderColor: current === value ? "var(--ro)" : "var(--bd)",
        background: current === value ? "var(--pe)" : "var(--card)",
        color: "var(--tx)",
        fontFamily: "system-ui, sans-serif",
        fontWeight: current === value ? 500 : 400,
      }}
    >
      {label}
    </button>
  );

  if (!type) return null;

  return (
    <div
      className="border border-t-0 rounded-b-[20px] px-4 pt-3 pb-4 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
    >
      {type === "feed" && f && (
        <>
          {lastFeedLabel && (
            <p className="text-[9px] mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{lastFeedLabel}</p>
          )}
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Which breast?</p>
          <div className="flex gap-1.5 justify-center mb-2.5">
            {(["Left", "Right", "Both"] as const).map((s) => pill(s, s, f.feedSide, (v) => f.setFeedSide(v as "Left" | "Right" | "Both")))}
          </div>
          <div className="mb-2 flex justify-center">
            <DurationPicker
              valueMs={feedValueMs}
              maxMs={59 * 60 * 1000 + 59 * 1000}
              onChange={(ms) => { if (f.timerRunning || f.timerPaused) f.setElapsedMs(ms); else setDurationMs(ms); }}
              showSeconds
              showHours={false}
              liveSync={f.timerRunning && !f.timerPaused}
              className="min-h-[96px] max-w-[180px]"
            />
          </div>
          {f.feedSegments.length > 0 && (
            <p className="text-[9px] mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              So far: {f.feedSegments.map((s) => `${s.side} ${Math.round(s.durationMs / 60000)}m`).join(" → ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                if (!f.timerRunning) { f.setTimerRunning(true); f.setElapsedMs(0); f.setTimerPaused(false); }
                else if (f.timerPaused) f.setTimerPaused(false);
                else f.setTimerPaused(true);
              }}
              className="py-2.5 px-4 rounded-[14px] text-[12px] font-medium text-white border-none cursor-pointer"
              style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}
            >
              {!f.timerRunning ? "Start" : f.timerPaused ? "Resume" : "Pause"}
            </button>
            {(f.timerRunning || f.timerPaused) && f.elapsedMs > 0 && (
              <button
                type="button"
                onClick={handleSwitchBreast}
                className="py-2.5 px-3 rounded-[14px] text-[12px] font-medium border cursor-pointer"
                style={{ borderColor: "var(--pink)", color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
              >
                Switch breast
              </button>
            )}
            {(f.timerRunning || f.timerPaused) && (
              <button
                type="button"
                onClick={() => f.resetFeedTimer()}
                className="py-2.5 px-3 rounded-[14px] text-[11px] font-medium border cursor-pointer"
                style={{ borderColor: "var(--bd)", color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
              >
                Stop timer
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
            <input type="checkbox" checked={pastChecked} onChange={(e) => setPastChecked(e.target.checked)} className="accent-[var(--pink)] w-3 h-3" />
            <span className="text-[10px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Log a past feed instead</span>
          </label>
          {pastChecked && (
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={pastDate}
                onChange={(e) => setPastDate(e.target.value)}
                className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]"
                style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              />
              <input
                type="time"
                value={pastTime}
                onChange={(e) => setPastTime(e.target.value)}
                className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]"
                style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              />
            </div>
          )}
          <button type="button" onClick={handleSaveFeed} className="w-full py-2 rounded-[13px] text-[11px] font-medium text-white border-none cursor-pointer" style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}>Save feed</button>
        </>
      )}

      {type === "sleep" && (
        <>
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Sleep position</p>
          <div className="flex gap-1.5 justify-center mb-2.5">
            {["Left side", "Right side", "On back"].map((p) => pill(p, p, sleepPosition, setSleepPosition))}
          </div>
          <div className="mb-2 flex justify-center">
            <DurationPicker valueMs={valueMs} maxMs={MAX_DURATION_HISTORY_MS} onChange={(ms) => { if (timerRunning) setElapsedMs(ms); else setDurationMs(ms); }} liveSync={timerRunning} className="min-h-[96px] max-w-[180px]" />
          </div>
          <button
            type="button"
            onClick={() => { setTimerRunning(!timerRunning); if (!timerRunning) setElapsedMs(0); }}
            className="w-full py-2.5 rounded-[14px] text-[12px] font-medium text-white border-none cursor-pointer mb-2"
            style={{ background: "var(--blue)", fontFamily: "system-ui, sans-serif" }}
          >
            {timerRunning ? "Stop" : "Start"}
          </button>
          <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
            <input type="checkbox" checked={pastChecked} onChange={(e) => setPastChecked(e.target.checked)} className="accent-[var(--pink)] w-3 h-3" />
            <span className="text-[10px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Log a past sleep instead</span>
          </label>
          {pastChecked && (
            <div className="flex gap-2 mb-2">
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
            </div>
          )}
          <button type="button" onClick={handleSaveSleep} className="w-full py-2 rounded-[13px] text-[11px] font-medium text-white border-none cursor-pointer" style={{ background: "var(--blue)", fontFamily: "system-ui, sans-serif" }}>Save sleep</button>
        </>
      )}

      {type === "diaper" && (
        <>
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>What kind?</p>
          <div className="flex gap-1.5 justify-center mb-2.5">
            {(["Wet", "Dirty", "Both"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setDiaperType(l.toLowerCase() as "pee" | "poop" | "both")}
                className="px-3 py-1.5 rounded-[20px] border text-[10px] transition-all"
                style={{
                  borderColor: diaperType === (l === "Both" ? "both" : l === "Wet" ? "pee" : "poop") ? "var(--ro)" : "var(--bd)",
                  background: diaperType === (l === "Both" ? "both" : l === "Wet" ? "pee" : "poop") ? "var(--pe)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: diaperType === (l === "Both" ? "both" : l === "Wet" ? "pee" : "poop") ? 500 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
            <input type="checkbox" checked={pastChecked} onChange={(e) => setPastChecked(e.target.checked)} className="accent-[var(--pink)] w-3 h-3" />
            <span className="text-[10px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Log a past change instead</span>
          </label>
          {pastChecked && (
            <div className="flex gap-2 mb-2">
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
            </div>
          )}
          <button type="button" onClick={handleSaveDiaper} className="w-full py-2 rounded-[13px] text-[11px] font-medium text-white border-none cursor-pointer" style={{ background: "var(--grn)", fontFamily: "system-ui, sans-serif" }}>Save change</button>
        </>
      )}

      {type === "tummy" && (
        <>
          <div className="mb-2 flex justify-center">
            <DurationPicker valueMs={valueMs} maxMs={60 * 60 * 1000} onChange={(ms) => { if (timerRunning) setElapsedMs(ms); else setDurationMs(ms); }} liveSync={timerRunning} className="min-h-[96px] max-w-[120px]" />
          </div>
          <button
            type="button"
            onClick={() => { setTimerRunning(!timerRunning); if (!timerRunning) setElapsedMs(0); }}
            className="w-full py-2.5 rounded-[14px] text-[12px] font-medium text-white border-none cursor-pointer mb-2"
            style={{ background: "var(--purp)", fontFamily: "system-ui, sans-serif" }}
          >
            {timerRunning ? "Stop" : "Start"}
          </button>
          <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
            <input type="checkbox" checked={pastChecked} onChange={(e) => setPastChecked(e.target.checked)} className="accent-[var(--pink)] w-3 h-3" />
            <span className="text-[10px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Log a past session instead</span>
          </label>
          {pastChecked && (
            <div className="flex gap-2 mb-2">
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
            </div>
          )}
          <button type="button" onClick={handleSaveTummy} className="w-full py-2 rounded-[13px] text-[11px] font-medium text-white border-none cursor-pointer" style={{ background: "var(--purp)", fontFamily: "system-ui, sans-serif" }}>Save session</button>
        </>
      )}

      {type === "bottle" && (
        <>
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Volume (ml)</p>
          <div className="flex flex-wrap gap-1.5 justify-center mb-2">
            {BOTTLE_VOLUMES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBottleVolumeMl(v)}
                className="px-2.5 py-1 rounded-lg border text-[11px]"
                style={{
                  borderColor: bottleVolumeMl === v ? "var(--coral)" : "var(--bd)",
                  background: bottleVolumeMl === v ? "var(--pe)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Type</p>
          <div className="flex gap-1.5 justify-center mb-2.5">
            {(["Formula", "Expressed milk", "Mixed"] as const).map((l) => {
              const v = l === "Formula" ? "formula" : l === "Expressed milk" ? "expressed" : "mixed";
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBottleFeedType(v)}
                  className="px-3 py-1.5 rounded-[20px] border text-[10px]"
                  style={{
                    borderColor: bottleFeedType === v ? "var(--ro)" : "var(--bd)",
                    background: bottleFeedType === v ? "var(--pe)" : "var(--card)",
                    color: "var(--tx)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-1.5 mb-2 cursor-pointer">
            <input type="checkbox" checked={pastChecked} onChange={(e) => setPastChecked(e.target.checked)} className="accent-[var(--pink)] w-3 h-3" />
            <span className="text-[10px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Log a past bottle</span>
          </label>
          {pastChecked && (
            <div className="flex gap-2 mb-2">
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
            </div>
          )}
          <button type="button" onClick={handleSaveBottle} className="w-full py-2 rounded-[13px] text-[11px] font-medium text-white border-none cursor-pointer" style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}>Save bottle</button>
        </>
      )}

      {type === "pump" && (
        <>
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Side</p>
          <div className="flex gap-1.5 justify-center mb-2">
            {(["Left", "Right", "Both"] as const).map((l) => {
              const v = l.toLowerCase() as "left" | "right" | "both";
              return (
                <button key={v} type="button" onClick={() => setPumpSide(v)} className="px-3 py-1.5 rounded-[20px] border text-[10px]" style={{ borderColor: pumpSide === v ? "var(--ro)" : "var(--bd)", background: pumpSide === v ? "var(--pe)" : "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                  {l}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mb-2">
            {(pumpSide === "left" || pumpSide === "both") && (
              <div>
                <label className="block text-[9px] text-[var(--mu)] mb-0.5">Left (ml)</label>
                <input type="number" min={0} max={500} value={pumpVolumeLeft} onChange={(e) => setPumpVolumeLeft(Number(e.target.value) || 0)} className="w-20 rounded-lg border px-2 py-1.5 text-[11px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
              </div>
            )}
            {(pumpSide === "right" || pumpSide === "both") && (
              <div>
                <label className="block text-[9px] text-[var(--mu)] mb-0.5">Right (ml)</label>
                <input type="number" min={0} max={500} value={pumpVolumeRight} onChange={(e) => setPumpVolumeRight(Number(e.target.value) || 0)} className="w-20 rounded-lg border px-2 py-1.5 text-[11px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
              </div>
            )}
          </div>
          <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Duration</p>
          <div className="mb-2 flex justify-center">
            <DurationPicker valueMs={pumpTimerRunning ? pumpElapsedMs : pumpDurationMs} maxMs={MAX_DURATION_HISTORY_MS} onChange={(ms) => { if (pumpTimerRunning) setPumpElapsedMs(ms); else setPumpDurationMs(ms); }} showSeconds showHours={false} liveSync={pumpTimerRunning} className="min-h-[96px] max-w-[180px]" />
          </div>
          <button type="button" onClick={() => { setPumpTimerRunning(!pumpTimerRunning); if (!pumpTimerRunning) setPumpElapsedMs(0); }} className="w-full py-2 rounded-[14px] text-[11px] font-medium text-white border-none cursor-pointer mb-2" style={{ background: "var(--pink)", fontFamily: "system-ui, sans-serif" }}>{pumpTimerRunning ? "Stop" : "Start"} timer</button>
          <label className="flex items-center gap-1.5 mb-2 cursor-pointer">
            <input type="checkbox" checked={pastChecked} onChange={(e) => setPastChecked(e.target.checked)} className="accent-[var(--pink)] w-3 h-3" />
            <span className="text-[10px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Log a past session</span>
          </label>
          {pastChecked && (
            <div className="flex gap-2 mb-2">
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none min-h-[36px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
            </div>
          )}
          <button type="button" onClick={handleSavePump} className="w-full py-2 rounded-[13px] text-[11px] font-medium text-white border-none cursor-pointer" style={{ background: "var(--pink)", fontFamily: "system-ui, sans-serif" }}>Save pump</button>
        </>
      )}
    </div>
  );
}
