import { useState, useEffect } from "react";
import { Utensils, ChevronRight, Moon, Baby, Activity, Milk, Droplets } from "lucide-react";
import { NappyGuideSheet } from "./NappyGuideSheet";
import { DurationPicker, MAX_DURATION_HISTORY_MS } from "./DurationPicker";
import { saveData } from "../utils/dataSync";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { getLastFeedSide, saveLastFeedSide } from "../utils/lastFeedSideStorage";
import { format } from "date-fns";
import { formatTimeAndAgo } from "../utils/dateUtils";
import { useFeedTimer } from "../contexts/FeedTimerContext";
import { toast } from "sonner";
import { timerToA11yLabel } from "../utils/a11y";
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
  onSwitchType?: (newType: DrawerType) => void;
  session: Session | null;
}

const BOTTLE_PRESETS = [60, 90, 120, 150, 180];

/** Shared drawer header: icon + title + optional subtitle */
function DrawerHeader({ icon: Icon, title, subtitle, accentVar = "var(--coral)" }: { icon: React.ElementType; title: string; subtitle?: string | null; accentVar?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--pe)" }}>
        <Icon className="w-6 h-6" style={{ color: accentVar }} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold mb-0.5" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{title}</h2>
        {subtitle && <p className="text-[13px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/** Shared "Log a past X instead" expandable panel */
function PastPanel({ label, expanded, onToggle, children }: { label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-[14px] border px-4 py-3.5 mb-3 text-left min-h-[48px]"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      >
        <span className="text-[14px]">{label}</span>
        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} style={{ color: "var(--mu)" }} />
      </button>
      {expanded && children}
    </>
  );
}

const sectionLabelClass = "text-[11px] uppercase tracking-wider mb-2";
const sectionLabelStyle: React.CSSProperties = { color: "var(--mu)", fontFamily: "system-ui, sans-serif" };
const inputBlockStyle = "flex gap-2 p-3 rounded-[14px] mb-3";
const inputBlockStyleBg = { background: "var(--bg2)", border: "1px solid var(--bd)" };
const inputStyle = "flex-1 rounded-lg border px-3 py-2.5 text-[15px] outline-none min-h-[44px]";
const inputStyleObj: React.CSSProperties = { borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" };
const saveBtnClass = "w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[52px]";
const saveBtnStyle: React.CSSProperties = { fontFamily: "system-ui, sans-serif" };
const stickyFooterStyle: React.CSSProperties = { position: "sticky", bottom: 0, paddingTop: 8, paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", background: "var(--card)", zIndex: 2 };

export function LogDrawer({ type, onClose, onSaved, onSwitchType, session }: LogDrawerProps) {
  const feedTimer = useFeedTimer();
  const [sleepPosition, setSleepPosition] = useState("Left side");
  const [diaperType, setDiaperType] = useState<"pee" | "poop" | "both">("pee");
  const [showNappyGuide, setShowNappyGuide] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  /** Sleep timer runs in background (keeps counting when drawer closed) until stopped by feed/tummy/diaper/bottle */
  const [sleepTimerRunning, setSleepTimerRunning] = useState(false);
  const [sleepElapsedMs, setSleepElapsedMs] = useState(0);
  const [sleepDurationMs, setSleepDurationMs] = useState(0);
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
  const [feedNotes, setFeedNotes] = useState("");
  const [diaperNotes, setDiaperNotes] = useState("");
  const [bottleNotes, setBottleNotes] = useState("");
  const [bottleManualVolume, setBottleManualVolume] = useState("");
  /** Sleep mood / environment (optional) */
  const [fallAsleepMethod, setFallAsleepMethod] = useState<string>("");
  const [wakeUpMood, setWakeUpMood] = useState<string>("");
  const [sleepLocation, setSleepLocation] = useState<string>("");
  const [whiteNoise, setWhiteNoise] = useState<boolean | null>(null);
  const [roomTempC, setRoomTempC] = useState<string>("");
  const [lightLevel, setLightLevel] = useState<string>("");
  const [sleepAid, setSleepAid] = useState<string>("");

  useEffect(() => {
    if (!pumpTimerRunning) return;
    const id = setInterval(() => setPumpElapsedMs((e) => e + 1000), 1000);
    return () => clearInterval(id);
  }, [pumpTimerRunning]);

  /** Sleep timer: keep counting when drawer is closed */
  useEffect(() => {
    if (!sleepTimerRunning) return;
    const id = setInterval(() => setSleepElapsedMs((e) => e + 1000), 1000);
    return () => clearInterval(id);
  }, [sleepTimerRunning]);

  /** Tummy timer: tick when running (only while drawer open or component mounted) */
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setElapsedMs((e) => e + 1000), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

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
      const { time, ago } = formatTimeAndAgo(t);
      setLastFeedLabel(`Last: ${side} breast - ${time} · ${ago}`);
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
    try {
      if (pastChecked) {
        if (!pastDate.trim()) { toast.error("Please fill in the date."); return; }
        if (durationMs <= 0) { toast.error("Please set a duration."); return; }
      }
      const endTime = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
      const duration = pastChecked ? durationMs : totalFeedDurationMs;
      const startTime = endTime - duration;
      const segmentsToSave = [...f.feedSegments];
      const currentSegDur = pastChecked ? durationMs : (f.timerRunning || f.timerPaused ? f.elapsedMs : durationMs);
      if (currentSegDur > 0) {
        segmentsToSave.push({ side: f.feedSide, durationMs: currentSegDur });
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
        ...(feedNotes.trim() && { note: feedNotes.trim().slice(0, 300) }),
      };
      let history: FeedingRecord[] = [];
      try {
        history = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
      } catch {
        history = [];
      }
      history.push(record);
      try {
        localStorage.setItem("feedingHistory", JSON.stringify(history));
      } catch (e) {
        console.warn("[LogDrawer] feedingHistory setItem failed", e);
      }
      if (session?.access_token) saveData("feedingHistory", history, session.access_token);
      const lastSide = segmentsToSave.length > 0 ? segmentsToSave[segmentsToSave.length - 1].side : f.feedSide;
      if (lastSide === "Left") saveLastFeedSide("left");
      else if (lastSide === "Right") saveLastFeedSide("right");
      else saveLastFeedSide("both");
      f.resetFeedTimer();
      setFeedNotes("");
      toast.success("Feed logged");
      onSaved();
      onClose();
    } catch (e) {
      console.warn("[LogDrawer] handleSaveFeed failed", e);
      toast.error("Could not save feed. Try again.");
    }
  };

  const [sleepDurationWarning, setSleepDurationWarning] = useState("");
  const [showSleepDetails, setShowSleepDetails] = useState(false);

  const handleSaveSleep = () => {
    try {
      let endTime: number;
      let startTime: number;
      let duration: number;

      if (pastChecked && pastDate.trim()) {
        const parsedStart = parsePastDatetimeFromPickers(pastDate, pastTime);
        if (!parsedStart) { toast.error("Please fill in the start time."); return; }
        if (parsedStart > Date.now()) { toast.error("Start time cannot be in the future."); return; }
        duration = sleepDurationMs;
        if (duration <= 0) { toast.error("Please set a duration."); return; }
        if (duration > 16 * 60 * 60 * 1000) {
          if (!sleepDurationWarning) { setSleepDurationWarning("This seems like a long sleep — is the duration correct?"); return; }
        }
        startTime = parsedStart;
        endTime = parsedStart + duration;
        if (endTime > Date.now()) { toast.error("Sleep end time would be in the future. Adjust start or duration."); return; }
      } else {
        endTime = Date.now();
        duration = sleepTimerRunning ? sleepElapsedMs : sleepDurationMs;
        startTime = endTime - duration;
      }
      setSleepTimerRunning(false);
      const record: SleepRecord = {
        id: Date.now().toString(),
        position: sleepPosition,
        startTime,
        endTime,
        ...(fallAsleepMethod?.trim() && { fallAsleepMethod: fallAsleepMethod.trim() }),
        ...(wakeUpMood?.trim() && { wakeUpMood: wakeUpMood.trim() }),
        ...(sleepLocation?.trim() && { sleepLocation: sleepLocation.trim() }),
        ...(whiteNoise !== null && { whiteNoise }),
        ...(roomTempC.trim() && (() => { const n = parseFloat(roomTempC); return Number.isFinite(n) && n >= 10 && n <= 35 ? { roomTempC: n } : {}; })()),
        ...(lightLevel === "dark" || lightLevel === "dim" || lightLevel === "light" ? { lightLevel: lightLevel as "dark" | "dim" | "light" } : {}),
        ...(sleepAid?.trim() && { sleepAid: sleepAid.trim() }),
      };
      let history: SleepRecord[] = [];
      try {
        history = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
      } catch {
        history = [];
      }
      history.push(record);
      try {
        localStorage.setItem("sleepHistory", JSON.stringify(history));
      } catch (e) {
        console.warn("[LogDrawer] sleepHistory setItem failed", e);
      }
      toast.success("Sleep logged");
      onSaved();
      onClose();
    } catch (e) {
      console.warn("[LogDrawer] handleSaveSleep failed", e);
      toast.error("Could not save sleep. Try again.");
    }
  };

  const handleSaveDiaper = () => {
    try {
      setSleepTimerRunning(false);
      setTimerRunning(false);
      if (feedTimer) feedTimer.resetFeedTimer();
      endCurrentSleepIfActive((sleepHistory) => {
        try {
          localStorage.setItem("sleepHistory", JSON.stringify(sleepHistory));
          if (session?.access_token) {
            saveData("sleepHistory", sleepHistory, session.access_token);
            saveData("currentSleep", null, session.access_token);
          }
        } catch {
          // best effort
        }
      });
      const timestamp = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
      const record: DiaperRecord = { id: Date.now().toString(), type: diaperType, timestamp, ...(diaperNotes.trim() && { notes: diaperNotes.trim() }) };
      let history: DiaperRecord[] = [];
      try {
        history = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
      } catch {
        history = [];
      }
      history.push(record);
      try {
        localStorage.setItem("diaperHistory", JSON.stringify(history));
      } catch (e) {
        console.warn("[LogDrawer] diaperHistory setItem failed", e);
      }
      if (session?.access_token) saveData("diaperHistory", history, session.access_token);
      toast.success("Diaper change logged");
      onSaved();
      onClose();
    } catch (e) {
      console.warn("[LogDrawer] handleSaveDiaper failed", e);
      toast.error("Could not save diaper change. Try again.");
    }
  };

  const handleSaveTummy = () => {
    try {
      if (pastChecked) {
        if (!pastDate.trim()) { toast.error("Please fill in the date."); return; }
        if (durationMs <= 0) { toast.error("Please set a duration."); return; }
      }
      const endTime = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
      const duration = pastChecked ? durationMs : (timerRunning ? elapsedMs : durationMs);
      const startTime = endTime - duration;
      const record: TummyTimeRecord = { id: Date.now().toString(), startTime, endTime };
      let history: TummyTimeRecord[] = [];
      try {
        history = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
      } catch {
        history = [];
      }
      history.push(record);
      try {
        localStorage.setItem("tummyTimeHistory", JSON.stringify(history));
      } catch (e) {
        console.warn("[LogDrawer] tummyTimeHistory setItem failed", e);
      }
      if (session?.access_token) saveData("tummyTimeHistory", history, session.access_token);
      toast.success("Tummy time logged");
      onSaved();
      onClose();
    } catch (e) {
      console.warn("[LogDrawer] handleSaveTummy failed", e);
      toast.error("Could not save tummy time. Try again.");
    }
  };

  const handleSaveBottle = () => {
    try {
      setSleepTimerRunning(false);
      setTimerRunning(false);
      if (feedTimer) feedTimer.resetFeedTimer();
      const timestamp = pastChecked && pastDate.trim() ? parsePastDatetimeFromPickers(pastDate, pastTime) ?? Date.now() : Date.now();
      const record: BottleRecord = {
        id: Date.now().toString(),
        timestamp,
        volumeMl: Math.max(1, Math.min(500, bottleVolumeMl)),
        feedType: bottleFeedType,
        ...(bottleNotes.trim() && { note: bottleNotes.trim() }),
      };
      let history: BottleRecord[] = [];
      try {
        history = JSON.parse(localStorage.getItem("bottleHistory") || "[]");
      } catch {
        history = [];
      }
      history.push(record);
      try {
        localStorage.setItem("bottleHistory", JSON.stringify(history));
      } catch (e) {
        console.warn("[LogDrawer] bottleHistory setItem failed", e);
      }
      if (session?.access_token) saveData("bottleHistory", history, session.access_token);
      toast.success("Bottle logged");
      onSaved();
      onClose();
    } catch (e) {
      console.warn("[LogDrawer] handleSaveBottle failed", e);
      toast.error("Could not save bottle. Try again.");
    }
  };

  const handleSavePump = () => {
    try {
      if (pastChecked) {
        if (!pastDate.trim()) { toast.error("Please fill in the date."); return; }
        if (pumpDurationMs <= 0) { toast.error("Please set a duration."); return; }
      }
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
      } catch {
        history = [];
      }
      history.push(record);
      try {
        localStorage.setItem("pumpHistory", JSON.stringify(history));
      } catch (e) {
        console.warn("[LogDrawer] pumpHistory setItem failed", e);
      }
      if (session?.access_token) saveData("pumpHistory", history, session.access_token);
      toast.success("Pump session logged");
      onSaved();
      onClose();
    } catch (e) {
      console.warn("[LogDrawer] handleSavePump failed", e);
      toast.error("Could not save pump session. Try again.");
    }
  };

  const accent = type === "feed" || type === "bottle" ? "var(--coral)" : type === "sleep" ? "var(--blue)" : type === "diaper" ? "var(--grn)" : type === "tummy" ? "var(--purp)" : "var(--pink)";
  const pill = (label: string, value: string, current: string, set: (v: string) => void) => (
    <button
      key={label}
      type="button"
      role="radio"
      aria-checked={current === value}
      aria-label={label}
      onClick={() => set(value)}
      className="px-4 py-2.5 rounded-[20px] border text-[13px] min-h-[44px] transition-all"
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

  /** Which side to show "next up" on (recommended): opposite of last feed. */
  const nextUpSide = (() => {
    try {
      const raw = localStorage.getItem("feedingHistory");
      if (!raw) return null;
      const arr: FeedingRecord[] = JSON.parse(raw);
      const last = arr[arr.length - 1];
      if (!last?.segments?.[0]) return null;
      const side = last.segments[0].type;
      if (side?.includes("Left")) return "Right";
      if (side?.includes("Right")) return "Left";
      return null;
    } catch {
      return null;
    }
  })();

  if (!type) return null;

  return (
    <div
      className="px-4 pt-3 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ background: "var(--card)" }}
    >
      {type === "feed" && f && (
        <>
          <p className={sectionLabelClass} style={sectionLabelStyle}>Which breast?</p>
          <div className="flex gap-2 mb-4" role="radiogroup" aria-label="Breast side">
            {(["Left", "Right", "Both"] as const).map((s) => (
              <div key={s} className="flex-1 relative">
                <button
                  type="button"
                  role="radio"
                  aria-checked={f.feedSide === s}
                  aria-label={`Select ${s.toLowerCase()} breast`}
                  onClick={() => f.setFeedSide(s)}
                  className="w-full px-3 py-3.5 rounded-[14px] border text-[15px] font-medium min-h-[48px] transition-all"
                  style={{
                    borderColor: f.feedSide === s ? "var(--ro)" : "var(--bd)",
                    background: f.feedSide === s ? "var(--pe)" : "var(--card)",
                    color: "var(--tx)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {s}
                </button>
                {nextUpSide === s && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "var(--coral)", color: "white" }}>next up</span>
                )}
              </div>
            ))}
          </div>

          <p className={sectionLabelClass} style={sectionLabelStyle}>Duration</p>
          {!pastChecked && <p className="text-[12px] mb-2" style={sectionLabelStyle}>Tap Start when you begin feeding</p>}
          {pastChecked && <p className="text-[12px] mb-2" style={sectionLabelStyle}>How long was the feed?</p>}
          <div className="mb-3 flex justify-center" aria-live="polite" aria-label={`Feed timer: ${timerToA11yLabel(feedValueMs)}`}>
            <DurationPicker
              valueMs={pastChecked ? durationMs : feedValueMs}
              maxMs={59 * 60 * 1000 + 59 * 1000}
              onChange={(ms) => { if (!pastChecked && (f.timerRunning || f.timerPaused)) f.setElapsedMs(ms); else setDurationMs(ms); }}
              showSeconds
              showHours={false}
              liveSync={!pastChecked && f.timerRunning && !f.timerPaused}
              className="min-h-[120px] max-w-[220px]"
            />
          </div>
          {!pastChecked && (
            <>
              <div className="flex gap-2 justify-center items-stretch mb-3 min-h-[48px]">
                <button
                  type="button"
                  onClick={() => {
                    if (!f.timerRunning) { setSleepTimerRunning(false); setTimerRunning(false); f.setElapsedMs(feedValueMs); f.setTimerRunning(true); f.setTimerPaused(false); }
                    else if (f.timerPaused) f.setTimerPaused(false);
                    else f.setTimerPaused(true);
                  }}
                  className="py-3.5 px-6 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[48px] flex-shrink-0"
                  style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}
                >
                  {!f.timerRunning ? "Start" : f.timerPaused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchBreast}
                  disabled={!(f.timerRunning || f.timerPaused) || f.elapsedMs <= 0}
                  className="py-3 px-4 rounded-[14px] text-[14px] font-medium border cursor-pointer min-h-[48px] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  style={{ borderColor: "var(--pink)", color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
                >
                  Switch breast
                </button>
                <button
                  type="button"
                  onClick={() => { f.resetFeedTimer(); setDurationMs(0); }}
                  disabled={!(f.timerRunning || f.timerPaused)}
                  className="py-3 px-4 rounded-[14px] text-[14px] font-medium border cursor-pointer min-h-[48px] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  style={{ borderColor: "var(--bd)", color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
                >
                  Stop timer
                </button>
              </div>

              {f.feedSegments.length > 0 && (
                <p className="text-[12px] mb-3" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                  So far: {f.feedSegments.map((s) => `${s.side} ${Math.round(s.durationMs / 60000)}m`).join(" → ")}
                </p>
              )}
            </>
          )}

          <PastPanel label="Log a past feed instead" expanded={pastChecked} onToggle={() => setPastChecked((c) => !c)}>
            <div className={inputBlockStyle} style={inputBlockStyleBg}>
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className={inputStyle} style={inputStyleObj} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className={inputStyle} style={inputStyleObj} />
            </div>
          </PastPanel>

          <button
            type="button"
            onClick={() => { if (onSwitchType) onSwitchType("bottle"); else onClose(); }}
            className="text-[13px] mb-3 block w-full text-left"
            style={{ color: "var(--coral)" }}
          >
            Log as bottle instead →
          </button>

          <textarea
            value={feedNotes}
            onChange={(e) => setFeedNotes(e.target.value.slice(0, 300))}
            placeholder="Any notes (e.g. fussy, distracted)"
            maxLength={300}
            rows={2}
            className="w-full rounded-[14px] border px-4 py-3 text-[14px] outline-none resize-none mb-1"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />
          <p className="text-[11px] mb-4 text-right" style={{ color: "var(--mu)" }}>{feedNotes.length}/300</p>

          <div style={stickyFooterStyle}>
            <button type="button" onClick={handleSaveFeed} className={saveBtnClass} style={{ ...saveBtnStyle, background: "var(--coral)" }}>Save feed</button>
          </div>
        </>
      )}

      {type === "sleep" && (
        <>
        <p className={sectionLabelClass} style={sectionLabelStyle}>Sleep position</p>
          <div className="flex gap-2 justify-center mb-4" role="radiogroup" aria-label="Sleep position">
            {["Left side", "Right side", "On back"].map((p) => pill(p, p, sleepPosition, setSleepPosition))}
          </div>
          <p className={sectionLabelClass} style={sectionLabelStyle}>Duration</p>
          {pastChecked && <p className="text-[12px] mb-2" style={sectionLabelStyle}>How long did the sleep last?</p>}
          <div className="mb-3 flex justify-center" aria-live="polite" aria-label={`Sleep timer: ${timerToA11yLabel(pastChecked ? sleepDurationMs : (sleepTimerRunning ? sleepElapsedMs : sleepDurationMs))}`}>
            <DurationPicker valueMs={pastChecked ? sleepDurationMs : (sleepTimerRunning ? sleepElapsedMs : sleepDurationMs)} maxMs={MAX_DURATION_HISTORY_MS} showSeconds onChange={(ms) => { if (!pastChecked && sleepTimerRunning) setSleepElapsedMs(ms); else setSleepDurationMs(ms); }} liveSync={!pastChecked && sleepTimerRunning} className="min-h-[120px] max-w-[220px]" />
          </div>
          {!pastChecked && (
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!sleepTimerRunning) { if (f) f.resetFeedTimer(); setTimerRunning(false); setSleepElapsedMs(sleepDurationMs); setSleepTimerRunning(true); }
                  else setSleepTimerRunning(false);
                }}
                className="py-3.5 px-8 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[48px]"
                style={{ background: "var(--blue)", ...saveBtnStyle }}
              >
                {sleepTimerRunning ? "Stop" : "Start"}
            </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSleepDetails((v) => !v)}
            className="flex items-center gap-1 text-[13px] mb-3"
            style={{ color: "var(--blue)" }}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${showSleepDetails ? "rotate-90" : ""}`} />
            {showSleepDetails ? "Hide details" : "+ Add details"}
          </button>
          {showSleepDetails && (
            <>
              <p className={sectionLabelClass} style={sectionLabelStyle}>How did she fall asleep?</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {["—", "Independent", "Nursing", "Rocking", "Dummy", "Car", "Pram", "Being held", "Co-sleeping"].map((opt) => pill(opt === "—" ? "—" : opt, opt === "—" ? "" : opt, fallAsleepMethod, setFallAsleepMethod))}
              </div>
              <p className={sectionLabelClass} style={sectionLabelStyle}>Where did she sleep?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {["—", "Cot", "Pram", "Car seat", "Arms", "Co-sleeping", "Floor"].map((opt) => pill(opt === "—" ? "—" : opt, opt === "—" ? "" : opt, sleepLocation, setSleepLocation))}
              </div>
              <p className={sectionLabelClass} style={sectionLabelStyle}>Sleep environment</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[12px] mr-2" style={{ color: "var(--mu)" }}>White noise?</span>
                {(["Yes", "No", "—"] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => setWhiteNoise(opt === "Yes" ? true : opt === "No" ? false : null)} className="px-3 py-2 rounded-[20px] border text-[13px] min-h-[40px]" style={{ borderColor: (whiteNoise === true && opt === "Yes") || (whiteNoise === false && opt === "No") || (whiteNoise === null && opt === "—") ? "var(--ro)" : "var(--bd)", background: (whiteNoise === true && opt === "Yes") || (whiteNoise === false && opt === "No") || (whiteNoise === null && opt === "—") ? "var(--pe)" : "var(--card)", color: "var(--tx)" }}>{opt}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[12px]" style={{ color: "var(--mu)" }}>Room temp (°C)</label>
                <input type="number" inputMode="decimal" min={10} max={35} step={0.5} value={roomTempC} onChange={(e) => setRoomTempC(e.target.value)} placeholder="—" className="w-16 rounded-lg border px-2 py-2 text-[14px] outline-none" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[12px] mr-2" style={{ color: "var(--mu)" }}>Light</span>
                {["—", "dark", "dim", "light"].map((opt) => pill(opt === "—" ? "—" : opt, opt === "—" ? "" : opt, lightLevel, setLightLevel))}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[12px] mr-2 w-full" style={{ color: "var(--mu)" }}>Sleep aid</span>
                {["—", "Dummy", "Swaddle", "Sleeping bag", "Nothing"].map((opt) => pill(opt === "—" ? "—" : opt, opt === "—" ? "" : opt, sleepAid, setSleepAid))}
              </div>
            </>
          )}
          {!sleepTimerRunning && sleepElapsedMs > 0 && (
            <>
              <p className={sectionLabelClass} style={sectionLabelStyle}>How did she wake up?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {["Happy", "Calm", "Grumpy", "Crying", "Still tired"].map((opt) => (
                  <button key={opt} type="button" onClick={() => setWakeUpMood(opt)} className="w-14 h-14 rounded-full border flex items-center justify-center text-[11px] text-center leading-tight" style={{ borderColor: wakeUpMood === opt ? "var(--ro)" : "var(--bd)", background: wakeUpMood === opt ? "var(--pe)" : "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{opt}</button>
                ))}
              </div>
            </>
          )}

          <PastPanel label="Log a past sleep instead" expanded={pastChecked} onToggle={() => { setPastChecked((c) => !c); setSleepDurationWarning(""); }}>
            <p className="text-[12px] mb-1" style={sectionLabelStyle}>Fell asleep at</p>
            <div className={inputBlockStyle} style={inputBlockStyleBg}>
              <input type="date" value={pastDate} onChange={(e) => { setPastDate(e.target.value); setSleepDurationWarning(""); }} className={inputStyle} style={inputStyleObj} />
              <input type="time" value={pastTime} onChange={(e) => { setPastTime(e.target.value); setSleepDurationWarning(""); }} className={inputStyle} style={inputStyleObj} />
            </div>
            <p className="text-[12px] mb-1" style={sectionLabelStyle}>Use the duration picker above to set how long the sleep lasted</p>
            {sleepDurationWarning && <p className="text-[12px] mb-2 px-1" style={{ color: "var(--coral)" }}>{sleepDurationWarning}</p>}
          </PastPanel>
          <div style={stickyFooterStyle}>
            <button type="button" onClick={handleSaveSleep} className={saveBtnClass} style={{ ...saveBtnStyle, background: "var(--blue)" }}>Save sleep</button>
          </div>
        </>
      )}

      {type === "diaper" && (
        <>
          <p className={sectionLabelClass} style={sectionLabelStyle}>What kind?</p>
          <div className="flex gap-2 justify-center mb-4" role="radiogroup" aria-label="Diaper type">
            {(["Wet", "Dirty", "Both"] as const).map((l) => {
              const isSelected = diaperType === (l === "Both" ? "both" : l === "Wet" ? "pee" : "poop");
              return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Select ${l.toLowerCase()}`}
                onClick={() => setDiaperType(l.toLowerCase() as "pee" | "poop" | "both")}
                className="flex-1 px-3 py-3.5 rounded-[14px] border text-[15px] font-medium min-h-[48px] transition-all"
                style={{
                  borderColor: isSelected ? "var(--ro)" : "var(--bd)",
                  background: isSelected ? "var(--pe)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {l}
              </button>
              );
            })}
          </div>
          {(diaperType === "poop" || diaperType === "both") && (
            <button
              type="button"
              onClick={() => setShowNappyGuide(true)}
              className="text-[12px] mb-3 block w-full text-left"
              style={{ color: "var(--pink)" }}
            >
              Not sure what you&apos;re seeing? Check the nappy guide →
            </button>
          )}
          <textarea
            value={diaperNotes}
            onChange={(e) => setDiaperNotes(e.target.value.slice(0, 300))}
            placeholder="Any notes..."
            maxLength={300}
            rows={2}
            className="w-full rounded-[14px] border px-4 py-3 text-[14px] outline-none resize-none mb-3"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />

          <PastPanel label="Log a past change instead" expanded={pastChecked} onToggle={() => setPastChecked((c) => !c)}>
            <div className={inputBlockStyle} style={inputBlockStyleBg}>
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className={inputStyle} style={inputStyleObj} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className={inputStyle} style={inputStyleObj} />
            </div>
          </PastPanel>
          <div style={stickyFooterStyle}>
            <button type="button" onClick={handleSaveDiaper} className={saveBtnClass} style={{ ...saveBtnStyle, background: "var(--grn)" }}>Save change</button>
          </div>
        </>
      )}

      {showNappyGuide && <NappyGuideSheet onClose={() => setShowNappyGuide(false)} />}

      {type === "tummy" && (
        <>
          {(() => {
            try {
              const raw = localStorage.getItem("tummyTimeHistory");
              if (!raw) return null;
              const hist: TummyTimeRecord[] = JSON.parse(raw);
              const today = new Date(); today.setHours(0,0,0,0);
              const todayMs = today.getTime();
              const totalMin = hist.filter(t => t.startTime >= todayMs).reduce((sum, t) => sum + ((t.endTime || Date.now()) - t.startTime) / 60000, 0);
              return <p className="text-[13px] mb-3 font-medium" style={{ color: "var(--purp)" }}>{Math.round(totalMin)} min today</p>;
            } catch { return null; }
          })()}
          <p className={sectionLabelClass} style={sectionLabelStyle}>Duration</p>
          {pastChecked && <p className="text-[12px] mb-2" style={sectionLabelStyle}>How long was the session?</p>}
          <div className="mb-3 flex justify-center" aria-live="polite" aria-label={`Tummy time timer: ${timerToA11yLabel(pastChecked ? durationMs : (timerRunning ? elapsedMs : durationMs))}`}>
            <DurationPicker valueMs={pastChecked ? durationMs : (timerRunning ? elapsedMs : durationMs)} maxMs={60 * 60 * 1000} showSeconds onChange={(ms) => { if (!pastChecked && timerRunning) setElapsedMs(ms); else setDurationMs(ms); }} liveSync={!pastChecked && timerRunning} className="min-h-[120px] max-w-[220px]" />
          </div>
          {!pastChecked && (
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!timerRunning) { if (f) f.resetFeedTimer(); setSleepTimerRunning(false); setElapsedMs(durationMs); setTimerRunning(true); }
                  else setTimerRunning(false);
                }}
                className="py-3.5 px-8 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[48px]"
                style={{ background: "var(--purp)", ...saveBtnStyle }}
              >
                {timerRunning ? "Stop" : "Start"}
            </button>
            </div>
          )}
          <PastPanel label="Log a past session instead" expanded={pastChecked} onToggle={() => setPastChecked((c) => !c)}>
            <div className={inputBlockStyle} style={inputBlockStyleBg}>
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className={inputStyle} style={inputStyleObj} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className={inputStyle} style={inputStyleObj} />
            </div>
          </PastPanel>
          <div style={stickyFooterStyle}>
            <button type="button" onClick={handleSaveTummy} className={saveBtnClass} style={{ ...saveBtnStyle, background: "var(--purp)" }}>Save session</button>
          </div>
        </>
      )}

      {type === "bottle" && (
        <>
          <p className={sectionLabelClass} style={sectionLabelStyle}>Volume (ml)</p>
          <div className="flex gap-2 justify-center mb-3" role="radiogroup" aria-label="Bottle volume">
            {BOTTLE_PRESETS.map((v) => {
              const isSelected = bottleVolumeMl === v && !bottleManualVolume;
              return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${v} millilitres`}
                onClick={() => { setBottleVolumeMl(v); setBottleManualVolume(""); }}
                className="px-3 py-2.5 rounded-[14px] border text-[14px] min-h-[44px]"
                style={{
                  borderColor: isSelected ? "var(--coral)" : "var(--bd)",
                  background: isSelected ? "var(--pe)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {v}ml
              </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-[12px] whitespace-nowrap" style={{ color: "var(--mu)" }}>Or enter:</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={bottleManualVolume}
              onChange={(e) => {
                const v = e.target.value;
                setBottleManualVolume(v);
                const n = parseInt(v, 10);
                if (n >= 1 && n <= 500) setBottleVolumeMl(n);
              }}
              placeholder="ml"
              className="w-20 rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px]"
              style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            />
            <span className="text-[13px]" style={{ color: "var(--mu)" }}>ml</span>
          </div>
          <p className={sectionLabelClass} style={sectionLabelStyle}>Type</p>
          <div className="flex gap-2 justify-center mb-4" role="radiogroup" aria-label="Bottle feed type">
            {(["Formula", "Expressed milk", "Mixed"] as const).map((l) => {
              const v = l === "Formula" ? "formula" : l === "Expressed milk" ? "expressed" : "mixed";
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={bottleFeedType === v}
                  aria-label={`Select ${l.toLowerCase()}`}
                  onClick={() => setBottleFeedType(v)}
                  className="flex-1 px-3 py-3.5 rounded-[14px] border text-[14px] font-medium min-h-[48px]"
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
          <textarea
            value={bottleNotes}
            onChange={(e) => setBottleNotes(e.target.value.slice(0, 300))}
            placeholder="Any notes..."
            maxLength={300}
            rows={2}
            className="w-full rounded-[14px] border px-4 py-3 text-[14px] outline-none resize-none mb-3"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />

          <PastPanel label="Log a past bottle" expanded={pastChecked} onToggle={() => setPastChecked((c) => !c)}>
            <div className={inputBlockStyle} style={inputBlockStyleBg}>
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className={inputStyle} style={inputStyleObj} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className={inputStyle} style={inputStyleObj} />
            </div>
          </PastPanel>
          <div style={stickyFooterStyle}>
            <button type="button" onClick={handleSaveBottle} className={saveBtnClass} style={{ ...saveBtnStyle, background: "var(--coral)" }}>Save bottle</button>
          </div>
        </>
      )}

      {type === "pump" && (
        <>
          <p className={sectionLabelClass} style={sectionLabelStyle}>Side</p>
          <div className="flex gap-2 justify-center mb-4" role="radiogroup" aria-label="Pump side">
            {(["Left", "Right", "Both"] as const).map((l) => {
              const v = l.toLowerCase() as "left" | "right" | "both";
              return (
                <button key={v} type="button" role="radio" aria-checked={pumpSide === v} aria-label={`Select ${l.toLowerCase()} side`} onClick={() => setPumpSide(v)} className="flex-1 px-3 py-3.5 rounded-[14px] border text-[15px] font-medium min-h-[48px]" style={{ borderColor: pumpSide === v ? "var(--ro)" : "var(--bd)", background: pumpSide === v ? "var(--pe)" : "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                  {l}
                </button>
              );
            })}
          </div>
          <p className={sectionLabelClass} style={sectionLabelStyle}>Volume (ml)</p>
          <div className="flex gap-2 mb-4">
            {(pumpSide === "left" || pumpSide === "both") && (
              <div className="flex-1">
                <label className="block text-[12px] mb-1" style={sectionLabelStyle}>Left</label>
                <input type="number" min={0} max={500} value={pumpVolumeLeft} onChange={(e) => setPumpVolumeLeft(Number(e.target.value) || 0)} className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              </div>
            )}
            {(pumpSide === "right" || pumpSide === "both") && (
              <div className="flex-1">
                <label className="block text-[12px] mb-1" style={sectionLabelStyle}>Right</label>
                <input type="number" min={0} max={500} value={pumpVolumeRight} onChange={(e) => setPumpVolumeRight(Number(e.target.value) || 0)} className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }} />
              </div>
            )}
          </div>
          {pumpSide === "both" && (pumpVolumeLeft > 0 || pumpVolumeRight > 0) && (
            <p className="text-[14px] font-medium mb-3" style={{ color: "var(--pink)" }}>Total: {pumpVolumeLeft + pumpVolumeRight}ml</p>
          )}
          <p className={sectionLabelClass} style={sectionLabelStyle}>Duration</p>
          {pastChecked && <p className="text-[12px] mb-2" style={sectionLabelStyle}>How long was the session?</p>}
          <div className="mb-3 flex justify-center" aria-live="polite" aria-label={`Pump timer: ${timerToA11yLabel(pastChecked ? pumpDurationMs : (pumpTimerRunning ? pumpElapsedMs : pumpDurationMs))}`}>
            <DurationPicker valueMs={pastChecked ? pumpDurationMs : (pumpTimerRunning ? pumpElapsedMs : pumpDurationMs)} maxMs={MAX_DURATION_HISTORY_MS} onChange={(ms) => { if (!pastChecked && pumpTimerRunning) setPumpElapsedMs(ms); else setPumpDurationMs(ms); }} showSeconds showHours={false} liveSync={!pastChecked && pumpTimerRunning} className="min-h-[120px] max-w-[220px]" />
          </div>
          {!pastChecked && (
            <div className="flex justify-center mb-3">
              <button type="button" onClick={() => { if (!pumpTimerRunning) setPumpElapsedMs(pumpDurationMs); setPumpTimerRunning(!pumpTimerRunning); }} className="py-3.5 px-8 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[48px]" style={{ background: "var(--pink)", ...saveBtnStyle }}>{pumpTimerRunning ? "Stop" : "Start"} timer</button>
            </div>
          )}
          <PastPanel label="Log a past session" expanded={pastChecked} onToggle={() => setPastChecked((c) => !c)}>
            <div className={inputBlockStyle} style={inputBlockStyleBg}>
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className={inputStyle} style={inputStyleObj} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className={inputStyle} style={inputStyleObj} />
            </div>
          </PastPanel>
          <div style={stickyFooterStyle}>
            <button type="button" onClick={handleSavePump} className={saveBtnClass} style={{ ...saveBtnStyle, background: "var(--pink)" }}>Save pump</button>
          </div>
        </>
      )}
    </div>
  );
}
