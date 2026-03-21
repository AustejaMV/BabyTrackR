import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CradlNoticedSection, type NoticeCard } from "../components/CradlNoticedSection";
import { LocalErrorBoundary } from "../components/LocalErrorBoundary";
import { useBaby } from "../contexts/BabyContext";
import { detectOverwhelmedPattern, type MoodEntry } from "../utils/ragePattern";
import { getTimeCapsuleTrigger } from "../utils/timeCapsuleTrigger";
import { saveTimeCapsule } from "../utils/timeCapsuleStorage";
import {
  getQuestionForWeek,
  getSavedReflectionForWeek,
  saveWeeklyReflection,
} from "../utils/weeklyReflectionStorage";
import { useDesktop } from "../components/AppLayout";
import { DesktopLayout } from "../components/DesktopLayout";
import { generateAllCSVs, downloadBlob } from "../utils/csvExport";
import { generatePediatricReport } from "../utils/pdfExport";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { IconLeaf, IconHeartPulse, IconStethoscope, IconHeart, IconPill, IconCrown, IconUsers, IconExport, IconShield } from "../components/BrandIcons";
import { PregnancyToolsSection } from "../components/PregnancyToolsSection";
import { BreathingExerciseModal } from "../components/BreathingExerciseModal";

const ICON_MAP: Record<string, (size: number) => React.ReactNode> = {
  leaf: (s) => <IconLeaf size={s} />,
  "heart-pulse": (s) => <IconHeartPulse size={s} />,
  stethoscope: (s) => <IconStethoscope size={s} />,
  heart: (s) => <IconHeart size={s} />,
  pill: (s) => <IconPill size={s} />,
  crown: (s) => <IconCrown size={s} />,
  users: (s) => <IconUsers size={s} />,
  export: (s) => <IconExport size={s} />,
  shield: (s) => <IconShield size={s} />,
};

const MOOD_KEY_PREFIX = "cradl-mood-today-";
const MOOD_LOG_KEY = "cradl-mood-log";
const OVERWHELMED_NOTICE_KEY = "cradl-overwhelmed-notice-shown";
const SLEEP_PROMPT_DATE_KEY = "cradl-mum-sleep-prompt-date";
const SLEEP_LOG_KEY = "cradl-mum-sleep-log";

const MoodFace = ({ type, color }: { type: string; color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    {type === "good" && <><circle cx="9" cy="10" r="1" fill={color} stroke="none"/><circle cx="15" cy="10" r="1" fill={color} stroke="none"/><path d="M8 14c1 2 3 3 4 3s3-1 4-3"/></>}
    {type === "okay" && <><circle cx="9" cy="10" r="1" fill={color} stroke="none"/><circle cx="15" cy="10" r="1" fill={color} stroke="none"/><path d="M9 15h6"/></>}
    {type === "struggling" && <><circle cx="9" cy="10" r="1" fill={color} stroke="none"/><circle cx="15" cy="10" r="1" fill={color} stroke="none"/><path d="M8 16c1-2 3-3 4-3s3 1 4 3"/></>}
    {type === "overwhelmed" && <><circle cx="9" cy="10" r="1" fill={color} stroke="none"/><circle cx="15" cy="10" r="1" fill={color} stroke="none"/><path d="M8 16c1-2 3-3 4-3s3 1 4 3"/><path d="M16 10c.5-1 1.5-2 1.5-3"/></>}
    {type === "rage" && <><path d="M7 8l4 2M17 8l-4 2"/><circle cx="9" cy="12" r="1" fill={color} stroke="none"/><circle cx="15" cy="12" r="1" fill={color} stroke="none"/><path d="M8 17c1-2 3-3 4-3s3 1 4 3"/></>}
  </svg>
);

const MOODS = [
  { key: "good", label: "Good", bg: "#feeae4", color: "#c05030" },
  { key: "okay", label: "Okay", bg: "#f4f0ec", color: "#9a8080" },
  { key: "struggling", label: "Struggling", bg: "#f0eef4", color: "#7a4ab4" },
  { key: "overwhelmed", label: "Overwhelmed", bg: "#f4ecec", color: "#c05030" },
  { key: "rage", label: "Rage", bg: "#fce8e8", color: "#a02020" },
] as const;

const SLEEP_RANGES = [
  { label: "Less than 2h", value: "0-2" },
  { label: "2–4 hours", value: "2-4" },
  { label: "4–6 hours", value: "4-6" },
  { label: "6 or more hours", value: "6+" },
] as const;

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MAX_SLEEP = 8;

/** Prompt 8: Skin tracker and Medication moved to Health tab */
const TOOLS: readonly { label: string; path: string; isSafety?: boolean; isExport?: boolean }[] = [
  { label: "Export data", path: "#export", isExport: true },
  { label: "Memory book", path: "/memories" },
  { label: "GP summary", path: "/gp-summary" },
  { label: "Shopping list", path: "/shopping-list" },
  { label: "Handoff", path: "/settings" },
  { label: "Return to work", path: "/return-to-work" },
  { label: "Library", path: "/library" },
  { label: "My notes to myself", path: "/time-capsule/write" },
  { label: "Quick notes", path: "/notes" },
  { label: "Safety", path: "/safety", isSafety: true },
];

const RECOVERY_ROWS = [
  {
    iconBg: "#e4f4e4",
    iconKey: "leaf",
    title: "Body recovery",
    subtitle: "Your body is healing — track movement at your pace",
    action: "Log exercise →",
    actionHref: "/mum-health?tab=body",
  },
  {
    iconBg: "#f0eafe",
    iconKey: "heart-pulse",
    title: "Pelvic floor",
    subtitle: "Small daily exercises, big difference",
    action: "Log today →",
    actionHref: "/mum-health?tab=pelvic",
  },
  {
    iconBg: "#fce8e8",
    iconKey: "stethoscope",
    title: "Postnatal check-up",
    subtitle: "Schedule with your GP when you're ready",
    tag: "Due",
    tagBg: "#fce8e8",
    tagColor: "#8a2020",
    action: "Check in →",
    actionHref: "/mum-health?tab=postnatal",
  },
  {
    iconBg: "#f0eafe",
    iconKey: "heart",
    title: "Relationship check-in",
    subtitle: "Weekly · completely private · just for you",
    action: "Check in →",
    actionHref: "/mum-health?tab=relationship",
  },
] as const;

const DESKTOP_RECOVERY = [
  { iconBg: "#e4f4e4", iconKey: "leaf", title: "Body recovery", subtitle: "Move at your own pace", action: "Log exercise →", actionHref: "/mum-health?tab=body" },
  { iconBg: "#fce8e8", iconKey: "stethoscope", title: "Postnatal check", subtitle: "When you're ready", action: "Check in →", actionHref: "/mum-health?tab=postnatal", tag: "Due", tagBg: "#fce8e8", tagColor: "#8a2020" },
  { iconBg: "#f0eafe", iconKey: "heart", title: "Relationship check-in", subtitle: "Completely private", action: "Check in →", actionHref: "/mum-health?tab=relationship" },
  { iconBg: "#e4f4e4", iconKey: "pill", title: "Pain relief", subtitle: "Track medications", action: "Log", actionHref: "/mum-health", isButton: true },
];

const DESKTOP_TOOLS_CHIPS = [
  { label: "GP visit prep", path: "/gp-summary" },
  { label: "Handoff card", path: "/settings" },
  { label: "Return to work", path: "/return-to-work" },
  { label: "Health log", path: "/mum-health" },
  { label: "Memory book", path: "/memories" },
  { label: "Knowledge library", path: "/library" },
  { label: "Jaundice watch", path: "/jaundice" },
  { label: "Quick notes", path: "/notes" },
  { label: "Shopping list", path: "/shopping-list" },
];

const ACCOUNT_ROWS = [
  { iconKey: "crown", iconBg: "#feeae4", title: "Premium", subtitle: "Manage subscription", path: "/premium" },
  { iconKey: "users", iconBg: "#f0f0e8", title: "Family sharing", subtitle: "Manage your family", path: "/settings#section-family", tag: "Active", tagBg: "#e4f4e4", tagColor: "#2a6a2a" },
  { iconKey: "export", iconBg: "#f0f0e8", title: "Export data", subtitle: "PDF · CSV", path: "#export", isExport: true },
  { iconKey: "shield", iconBg: "#fce8e8", title: "Safety", subtitle: "Quick exit · helplines", path: "/safety" },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getGreetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 5) return "You're up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function weeksPostpartum(birthDateMs: number): number {
  const diff = Date.now() - birthDateMs;
  return Math.max(0, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)));
}

function loadMoodLog(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(MOOD_LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveMoodEntry(mood: string): void {
  try {
    const log = loadMoodLog();
    const today = todayKey();
    const existing = log.findIndex((e) => e.date === today);
    const entry: MoodEntry = { date: today, mood: mood as MoodEntry["mood"] };
    if (existing >= 0) {
      log[existing] = entry;
    } else {
      log.push(entry);
    }
    localStorage.setItem(MOOD_LOG_KEY, JSON.stringify(log));
    localStorage.setItem(MOOD_KEY_PREFIX + today, mood);
  } catch {}
}

/** Prompt 19: 7-day cooldown after "I'm okay, thank you". */
function canShowOverwhelmedNotice(): boolean {
  try {
    const ts = localStorage.getItem(OVERWHELMED_NOTICE_KEY);
    if (!ts) return true;
    return Date.now() - Number(ts) > 7 * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function markOverwhelmedNoticeShown(): void {
  try {
    localStorage.setItem(OVERWHELMED_NOTICE_KEY, String(Date.now()));
  } catch {}
}

function shouldShowSleepPrompt(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  if (hour < 5 || (hour === 5 && minutes < 30)) return false;
  try {
    const shown = localStorage.getItem(SLEEP_PROMPT_DATE_KEY);
    return shown !== todayKey();
  } catch {
    return true;
  }
}

function loadSleepLog(): { date: string; range: string }[] {
  try {
    const raw = localStorage.getItem(SLEEP_LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function getSleepChartData(): number[] {
  const log = loadSleepLog();
  const rangeToHours: Record<string, number> = {
    "0-2": 1,
    "2-4": 3,
    "4-6": 5,
    "6+": 7,
  };
  const now = new Date();
  const result: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entry = log.find((e) => e.date === key);
    result.push(entry ? (rangeToHours[entry.range] ?? 0) : 0);
  }
  return result;
}

function getSleepAverage(): string | null {
  const data = getSleepChartData();
  const filled = data.filter((v) => v > 0);
  if (filled.length === 0) return null;
  return (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1);
}

const font = "system-ui, sans-serif";

export function MeScreen() {
  const { activeBaby, updateActiveBaby } = useBaby();
  const { isDesktop } = useDesktop();
  const meNavigate = useNavigate();

  if (activeBaby && activeBaby.birthDate > Date.now()) {
    return (
      <PregnancyToolsSection
        onBabyArrived={() => {
          updateActiveBaby({ birthDate: Date.now() });
          meNavigate("/");
        }}
      />
    );
  }

  const parentName = activeBaby?.parentName || null;
  const babyName = activeBaby?.name || "baby";
  const birthDate = activeBaby?.birthDate ?? null;
  const weeks = birthDate != null ? weeksPostpartum(birthDate) : null;

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showRageCard, setShowRageCard] = useState(false);
  const [rageMoodKey, setRageMoodKey] = useState<string>("overwhelmed");
  const [showSleepPrompt, setShowSleepPrompt] = useState(false);
  const [sleepSaved, setSleepSaved] = useState(false);
  const [sleepChartData, setSleepChartData] = useState<number[]>(() => getSleepChartData());
  const sleepConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [reflectionEditMode, setReflectionEditMode] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [overwhelmedAck, setOverwhelmedAck] = useState(0);

  const handleExportCSV = useCallback(() => {
    try {
      const items = generateAllCSVs(babyName);
      if (items.length === 0) {
        toast.info("No data to export yet. Log some feeds, sleep or diapers first.");
        return;
      }
      for (const item of items) {
        const blob = new Blob([item.content], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, item.filename);
      }
      toast.success(`Exported ${items.length} CSV file(s).`);
      setExportSheetOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }, [babyName]);

  const handleExportPDF = useCallback(() => {
    try {
      generatePediatricReport(false);
      toast.success("PDF report downloaded.");
      setExportSheetOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MOOD_KEY_PREFIX + todayKey());
      if (stored) setSelectedMood(stored);
    } catch {}
    if (shouldShowSleepPrompt()) setShowSleepPrompt(true);
  }, []);

  useEffect(() => {
    return () => {
      if (sleepConfirmTimer.current) clearTimeout(sleepConfirmTimer.current);
    };
  }, []);

  const handleMoodTap = useCallback((key: string) => {
    if (key === "overwhelmed" || key === "rage") {
      setRageMoodKey(key);
      setShowRageCard(true);
      return;
    }
    setSelectedMood(key);
    saveMoodEntry(key);
  }, []);

  const confirmOverwhelmed = useCallback(() => {
    setSelectedMood(rageMoodKey);
    saveMoodEntry(rageMoodKey);
    setShowRageCard(false);
  }, [rageMoodKey]);

  const currentWeekReflection = useMemo(() => {
    const w = weeks ?? 0;
    return w >= 1 && w <= 18 ? getSavedReflectionForWeek(w) : null;
  }, [weeks]);

  const weeklyQuestion = useMemo(
    () => getQuestionForWeek(weeks ?? 0),
    [weeks]
  );

  const handleSaveReflection = useCallback(() => {
    const body = reflectionText.trim();
    if (!body) {
      toast.error("Write something first");
      return;
    }
    try {
      const currentWeeks = weeks ?? 0;
      saveWeeklyReflection(currentWeeks, body);
      saveTimeCapsule({
        writtenAtWeeks: currentWeeks,
        writtenAt: new Date().toISOString(),
        body,
        showBackAtWeeks: currentWeeks + 26,
      });
      setReflectionText("");
      setReflectionSaved(true);
      setReflectionEditMode(false);
      toast.success("Saved to your notes");
      setTimeout(() => setReflectionSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }, [reflectionText, weeks]);

  const overwhelmedNotice = useMemo<NoticeCard | null>(() => {
    const log = loadMoodLog();
    if (log.length < 3) return null;
    const result = detectOverwhelmedPattern(log);
    if (!result?.shouldSuggestSupport) return null;
    if (!canShowOverwhelmedNotice()) return null;
    return {
      id: "overwhelmed-pattern",
      color: "amber" as const,
      title: "You\u2019ve logged \u2018overwhelmed\u2019 several times recently.",
      body: result.message,
      dismissible: true,
      onDismiss: () => { markOverwhelmedNoticeShown(); setOverwhelmedAck((c) => c + 1); },
    };
  }, [selectedMood, overwhelmedAck]);

  const overwhelmedElevated = useMemo(() => {
    const log = loadMoodLog();
    const last7 = log.filter((e) => {
      const t = new Date(e.date).getTime();
      return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
    });
    const count = last7.filter((e) => e.mood === "overwhelmed" || e.mood === "rage").length;
    return count >= 5;
  }, [selectedMood]);

  const timeCapsuleTrigger = useMemo(() => {
    if (weeks == null) return null;
    return getTimeCapsuleTrigger(weeks);
  }, [weeks]);

  const notices: NoticeCard[] = useMemo(() => {
    const list: NoticeCard[] = [];
    if (overwhelmedNotice && !overwhelmedElevated) list.push(overwhelmedNotice);
    return list;
  }, [overwhelmedNotice, overwhelmedElevated]);

  const handleSleepLog = useCallback((range: string) => {
    try {
      const log = loadSleepLog();
      const today = todayKey();
      const existing = log.findIndex((e) => e.date === today);
      const entry = { date: today, range };
      if (existing >= 0) {
        log[existing] = entry;
      } else {
        log.push(entry);
      }
      localStorage.setItem(SLEEP_LOG_KEY, JSON.stringify(log));
      localStorage.setItem(SLEEP_PROMPT_DATE_KEY, today);
    } catch {}
    setSleepSaved(true);
    setSleepChartData(getSleepChartData());
    sleepConfirmTimer.current = setTimeout(() => {
      setShowSleepPrompt(false);
      setSleepSaved(false);
    }, 1500);
  }, []);

  const skipSleepPrompt = useCallback(() => {
    try {
      localStorage.setItem(SLEEP_PROMPT_DATE_KEY, todayKey());
    } catch {}
    setShowSleepPrompt(false);
  }, []);

  const handleSendSleepMessage = useCallback(() => {
    const text = `Hey, I\u2019m really struggling with sleep today. Could you take ${babyName} for an hour or two so I can rest? \ud83d\ude4f`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`sms:?body=${encodeURIComponent(text)}`, "_self");
    }
  }, [babyName]);

  const sleepAvg = getSleepAverage();

  if (isDesktop) {
    const dkCard = { background: '#fff', border: '1px solid #ede0d4', borderRadius: 12, padding: '12px 14px', marginBottom: 8 } as const;
    const dkLabel = { fontSize: 10, color: '#b09080', textTransform: 'uppercase' as const, letterSpacing: 0.7, fontWeight: 600, margin: '10px 0 6px' } as const;

    return (
      <>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <BreathingExerciseModal open={showBreathing} onClose={() => setShowBreathing(false)} />
        <DesktopLayout
          left={
            <>
              {/* P13: I need a moment — first on Me (desktop) */}
              <button
                type="button"
                onClick={() => setShowBreathing(true)}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #f0eef4, #f4ecf8)",
                  border: "1px solid #e4d8ec",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  fontFamily: font,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(122,74,180,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h0" /></svg>
                </div>
                <div>
                  <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 13, fontWeight: 600, color: "#2c1f1f" }}>I need a moment</div>
                  <div style={{ fontSize: 10, color: "var(--mu)" }}>60-second breathing exercise</div>
                </div>
              </button>
              {/* Hero card */}
              <div
                style={{
                  background: "linear-gradient(150deg, #fde8d8, #ede0f8, #d4eaf7)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#2c1f1f",
                    marginBottom: 2,
                    overflowWrap: "break-word",
                  }}
                >
                  {getGreetingPrefix()}, {parentName || "you"}.
                </div>
                {weeks != null && (
                  <div style={{ fontSize: 10, color: "#7a6050", marginBottom: 4 }}>
                    {weeks} weeks postpartum
                  </div>
                )}
                <div
                  style={{
                    fontStyle: "italic",
                    fontSize: 11,
                    color: "#2c1f1f",
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >
                  If you had 45 minutes to yourself right now — what would you do?
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { label: "Your sleep", value: sleepAvg ? `${sleepAvg}h` : "—" },
                    { label: "Pelvic floor", value: "—" },
                    { label: "Mood", value: selectedMood ? MOODS.find((m) => m.key === selectedMood)?.label ?? "—" : "—" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,.65)",
                        borderRadius: 9,
                        padding: 7,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#2c1f1f" }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: 9, color: "#9a8080" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sleep prompt */}
              {showSleepPrompt && (
                <div style={{ ...dkCard, border: "1px solid #e4d4f4", position: "relative" as const }}>
                  {sleepSaved ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "12px 0",
                        animation: "fadeIn 0.4s ease-in",
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" style={{ opacity: 0.8 }}><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
                      <span style={{ fontSize: 13, color: "#7a4ab4", fontWeight: 500, fontFamily: font }}>
                        Got it. Take care of yourself.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", marginBottom: 4, fontFamily: font }}>
                        How did you sleep last night?
                      </div>
                      <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 10, fontFamily: font }}>
                        This is about you, not baby.
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                        {SLEEP_RANGES.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleSleepLog(r.value)}
                            style={{
                              flex: "1 1 45%",
                              padding: "10px 8px",
                              borderRadius: 12,
                              border: "1.5px solid #e4d4f4",
                              background: "#faf6ff",
                              fontSize: 12,
                              fontWeight: 500,
                              color: "#4a2a9a",
                              cursor: "pointer",
                              fontFamily: font,
                              textAlign: "center" as const,
                            }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <div
                        onClick={skipSleepPrompt}
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "var(--mu)",
                          cursor: "pointer",
                          textAlign: "center" as const,
                          fontFamily: font,
                        }}
                      >
                        Skip today
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mood check */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ede0d4",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", marginBottom: 10, fontFamily: font }}>
                  How are you feeling today?
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" as const }}>
                  {MOODS.map((m) => (
                    <div
                      key={m.key}
                      onClick={() => handleMoodTap(m.key)}
                      style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        alignItems: "center" as const,
                        cursor: "pointer",
                        minWidth: 0,
                        flex: "0 1 auto",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: m.bg,
                          display: "flex",
                          alignItems: "center" as const,
                          justifyContent: "center" as const,
                          border: selectedMood === m.key ? "2px solid #d4604a" : "2px solid transparent",
                          boxSizing: "border-box" as const,
                        }}
                      >
                        <MoodFace type={m.key} color={m.color} />
                      </div>
                      <div style={{ fontSize: 9, color: "#2c1f1f", marginTop: 3, fontFamily: font, whiteSpace: "nowrap" as const }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                {showRageCard && (
                  <div
                    style={{
                      marginTop: 12,
                      background: "#fef4f0",
                      border: "1px solid #f4d4cc",
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#5a2a1a",
                        lineHeight: 1.5,
                        fontFamily: font,
                        marginBottom: 12,
                      }}
                    >
                      Postnatal rage is real and it's common. Sudden intense anger after
                      having a baby is a recognised hormonal response, not a character flaw.
                      You are not a bad parent.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={confirmOverwhelmed}
                        style={{
                          flex: 1,
                          padding: "9px 10px",
                          borderRadius: 10,
                          border: "none",
                          background: "#d4604a",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: font,
                        }}
                      >
                        Thanks — save this
                      </button>
                      <button
                        onClick={() => {
                          setShowRageCard(false);
                          window.location.href = "/library";
                        }}
                        style={{
                          flex: 1,
                          padding: "9px 10px",
                          borderRadius: 10,
                          border: "1.5px solid #d4604a",
                          background: "transparent",
                          color: "#d4604a",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: font,
                        }}
                      >
                        Tell me more
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sleep this week */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ede0d4",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: font }}>
                    Your sleep this week
                  </div>
                  <span
                    onClick={() => setShowSleepPrompt(true)}
                    style={{ fontSize: 11, color: "#d4604a", cursor: "pointer", fontFamily: font }}
                  >
                    Log →
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    height: 32,
                    marginBottom: 4,
                  }}
                >
                  {sleepChartData.map((hrs, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        background: hrs > 0 ? "#7a4ab4" : "transparent",
                        border: i === 6 && hrs <= 0 ? "1.5px dashed #c4a8f4" : "none",
                        borderRadius: 3,
                        opacity: hrs > 0 ? 0.6 : 0.3,
                        height: hrs > 0 ? `${(hrs / MAX_SLEEP) * 100}%` : "8%",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        textAlign: "center" as const,
                        fontSize: 9,
                        color: "var(--mu)",
                        fontFamily: font,
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {sleepAvg && (
                  <div style={{ fontSize: 11, color: "#9a8080", marginTop: 8, fontFamily: font }}>
                    You averaged {sleepAvg} hours this week
                  </div>
                )}
                <div style={{ marginTop: 8, background: "#fef4e4", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: "#8a5a00", fontFamily: font, lineHeight: 1.4 }}>
                    Ask someone to cover today
                  </div>
                  <span
                    onClick={handleSendSleepMessage}
                    style={{ fontSize: 10, color: "#d4904a", fontWeight: 600, cursor: "pointer", fontFamily: font }}
                  >
                    Send →
                  </span>
                </div>
              </div>
            </>
          }
          center={
            <>
              {notices.length > 0 && <CradlNoticedSection notices={notices} compact />}

              <div style={dkLabel}>Recovery</div>
              <div style={dkCard}>
                {DESKTOP_RECOVERY.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 0",
                      borderBottom: idx < DESKTOP_RECOVERY.length - 1 ? "1px solid #f4f0ec" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: row.iconBg,
                        display: "flex",
                        alignItems: "center" as const,
                        justifyContent: "center" as const,
                        flexShrink: 0,
                      }}
                    >
                      {ICON_MAP[row.iconKey]?.(14)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: font }}>
                        {row.title}
                        {"tag" in row && row.tag && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 600,
                              background: row.tagBg,
                              color: row.tagColor,
                              borderRadius: 4,
                              padding: "2px 5px",
                            }}
                          >
                            {row.tag}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#9a8080", fontFamily: font, marginTop: 1 }}>
                        {row.subtitle}
                      </div>
                    </div>
                    {"isButton" in row && row.isButton ? (
                      <span
                        onClick={() => (window.location.href = row.actionHref)}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          background: "#e4f4e4",
                          color: "#2a6a2a",
                          borderRadius: 6,
                          padding: "4px 10px",
                          cursor: "pointer",
                          fontFamily: font,
                        }}
                      >
                        {row.action}
                      </span>
                    ) : (
                      <span
                        onClick={() => (window.location.href = row.actionHref)}
                        style={{
                          fontSize: 10,
                          color: "#d4604a",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap" as const,
                          fontFamily: font,
                        }}
                      >
                        {row.action}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Time capsule */}
              <div
                style={{
                  background: "#faf6ff",
                  border: "1px solid #e4d4f4",
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 8,
                }}
              >
                {weeks != null && (
                  <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 4, fontFamily: font }}>
                    {weeks} weeks in
                  </div>
                )}
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#2c1f1f",
                    marginBottom: 6,
                    lineHeight: 1.4,
                    overflowWrap: "break-word",
                  }}
                >
                  {timeCapsuleTrigger ? timeCapsuleTrigger.message : weeklyQuestion}
                </div>
                {currentWeekReflection && !reflectionEditMode ? (
                  <>
                    <div style={{ fontSize: 11, color: "#5a4a40", lineHeight: 1.5, marginBottom: 6, whiteSpace: "pre-wrap" }}>{currentWeekReflection.body}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span onClick={() => { setReflectionText(currentWeekReflection?.body ?? ""); setReflectionEditMode(true); }} style={{ fontSize: 11, color: "#7a4ab4", fontWeight: 600, cursor: "pointer" }}>Edit</span>
                      {reflectionSaved && (
                        <a href="/memories" style={{ fontSize: 11, color: "#6a9a6a", fontWeight: 600 }}>Saved to your notes →</a>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      placeholder="Write something..."
                      maxLength={2000}
                      style={{
                        width: "100%",
                        border: "1px solid #e4d4f4",
                        borderRadius: 8,
                        padding: "9px 10px",
                        fontSize: 11,
                        height: 56,
                        resize: "none" as const,
                        fontFamily: font,
                        boxSizing: "border-box" as const,
                        background: "#fff",
                        outline: "none",
                      }}
                    />
                    <div style={{ textAlign: "right" as const, marginTop: 4 }}>
                      {reflectionSaved ? (
                        <a href="/memories" style={{ fontSize: 11, color: "#6a9a6a", fontWeight: 600 }}>Saved to your notes →</a>
                      ) : (
                        <span
                          onClick={handleSaveReflection}
                          style={{
                            fontSize: 11,
                            color: "#7a4ab4",
                            fontWeight: 600,
                            cursor: reflectionText.trim() ? "pointer" : "default",
                            fontFamily: font,
                            opacity: reflectionText.trim() ? 1 : 0.5,
                          }}
                        >
                          Save →
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          }
          right={
            <>
              <div style={{ ...dkLabel, marginTop: 0 }}>Tools</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 12 }}>
                {DESKTOP_TOOLS_CHIPS.map((t) => (
                  <span
                    key={t.label}
                    onClick={() => (window.location.href = t.path)}
                    style={{
                      background: "#fff",
                      border: "1px solid #ede0d4",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#2c1f1f",
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>

              <div style={dkLabel}>Account</div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #ede0d4",
                  borderRadius: 11,
                  overflow: "hidden",
                }}
              >
                {ACCOUNT_ROWS.map((row, idx) => (
                  <div
                    key={idx}
                    onClick={() => ("isExport" in row && row.isExport) ? setExportSheetOpen(true) : (window.location.href = row.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: idx < ACCOUNT_ROWS.length - 1 ? "1px solid #f4ece4" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: row.iconBg,
                        display: "flex",
                        alignItems: "center" as const,
                        justifyContent: "center" as const,
                        flexShrink: 0,
                      }}
                    >
                      {ICON_MAP[row.iconKey]?.(12)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: font }}>
                        {row.title}
                      </div>
                      <div style={{ fontSize: 10, color: "#9a8080", fontFamily: font }}>
                        {row.subtitle}
                      </div>
                    </div>
                    {"tag" in row && row.tag ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          background: row.tagBg,
                          color: row.tagColor,
                          borderRadius: 4,
                          padding: "2px 6px",
                        }}
                      >
                        {row.tag}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#c4a8a0" }}>›</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          }
        />

        {exportSheetOpen && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
            onClick={() => setExportSheetOpen(false)}
          >
            <div
              style={{ maxWidth: 400, width: "100%", background: "#fff", borderRadius: 18, padding: 28, border: "1px solid #ede0d4" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2c1f1f", marginBottom: 6, fontFamily: font }}>Export your data</h3>
              <p style={{ fontSize: 13, color: "#9a8080", marginBottom: 18, fontFamily: font }}>
                Download all tracking data as CSV files, or get a paediatrician-friendly PDF summary.
              </p>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #ede0d4", background: "#faf7f2", fontSize: 14, fontWeight: 600, color: "#2c1f1f", cursor: "pointer", marginBottom: 10, fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx)" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 2 5-6"/></svg>
                <span>
                  <span style={{ display: "block" }}>Export all as CSV</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#9a8080" }}>Feeds, sleep, diapers, tummy time, growth</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #ede0d4", background: "#faf7f2", fontSize: 14, fontWeight: 600, color: "#2c1f1f", cursor: "pointer", marginBottom: 14, fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx)" strokeWidth="1.6" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6M9 10h6M9 14h4"/></svg>
                <span>
                  <span style={{ display: "block" }}>GP / Paediatrician PDF</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#9a8080" }}>Summary report to share with your doctor</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setExportSheetOpen(false)}
                style={{ display: "block", margin: "0 auto", background: "none", border: "none", color: "#9a8080", fontSize: 13, cursor: "pointer", fontFamily: font }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: 80,
        background: "#faf8f6",
        fontFamily: font,
      }}
    >
      {/* Prompt 13: "I need a moment" first on Me — always accessible */}
      <LocalErrorBoundary>
        <button
          type="button"
          onClick={() => setShowBreathing(true)}
          style={{
            width: "calc(100% - 24px)",
            margin: "12px 12px 8px",
            padding: "14px 16px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #f0eef4, #f4ecf8)",
            border: "1px solid #e4d8ec",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            fontFamily: font,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(122,74,180,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h0" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 14, fontWeight: 600, color: "#2c1f1f" }}>I need a moment</div>
            <div style={{ fontSize: 11, color: "var(--mu)" }}>60-second breathing exercise</div>
          </div>
        </button>
      </LocalErrorBoundary>
      <BreathingExerciseModal open={showBreathing} onClose={() => setShowBreathing(false)} />

      {/* Hero card */}
      <LocalErrorBoundary>
        <div
          style={{
            background: "linear-gradient(150deg, #fde8d8, #ede0f8, #d4eaf7)",
            borderRadius: 20,
            padding: 16,
            margin: 12,
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 20,
              color: "#2c1f1f",
              marginBottom: 2,
              overflowWrap: "break-word",
            }}
          >
            {getGreetingPrefix()}, {parentName || "you"}.
          </div>
          {weeks != null && (
            <div style={{ fontSize: 11, color: "var(--mu)", marginBottom: 6 }}>
              {weeks} weeks postpartum
            </div>
          )}
          <div
            style={{
              fontStyle: "italic",
              fontSize: 11,
              color: "#9a8080",
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            If you had 45 minutes to yourself right now — what would you do?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Your sleep", value: sleepAvg ? `${sleepAvg}h` : "—" },
              { label: "Pelvic floor", value: "—" },
              { label: "Mood", value: selectedMood ? MOODS.find((m) => m.key === selectedMood)?.label ?? "—" : "—" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: 10,
                  padding: "8px 6px",
                  textAlign: "center" as const,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: "#2c1f1f" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, color: "#9a8080", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </LocalErrorBoundary>

      {/* Prompt 19: Elevated overwhelmed card (5+ of last 7 days) — above sleep question */}
      {overwhelmedNotice && overwhelmedElevated && (
        <LocalErrorBoundary>
          <div
            style={{
              background: "#fff",
              border: "2px solid rgba(122,74,180,0.35)",
              borderRadius: 14,
              margin: "0 12px 8px",
              padding: 14,
              fontFamily: font,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 4 }}>{overwhelmedNotice.title}</div>
            <div style={{ fontSize: 11, color: "#9a8080", lineHeight: 1.5, marginBottom: 8 }}>{overwhelmedNotice.body}</div>
            <button
              type="button"
              onClick={() => { markOverwhelmedNoticeShown(); setOverwhelmedAck((c) => c + 1); }}
              style={{ fontSize: 10, color: "var(--mu)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              I'm okay, thank you
            </button>
          </div>
        </LocalErrorBoundary>
      )}

      {/* Sleep logging prompt */}
      {showSleepPrompt && (
        <LocalErrorBoundary>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e4d4f4",
              margin: "0 12px 8px",
              padding: 14,
              position: "relative",
            }}
          >
            {sleepSaved ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 0",
                  animation: "fadeIn 0.4s ease-in",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" style={{ opacity: 0.8 }}><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
                <span style={{ fontSize: 13, color: "#7a4ab4", fontWeight: 500, fontFamily: font }}>
                  Got it. Take care of yourself.
                </span>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#2c1f1f",
                    marginBottom: 4,
                    fontFamily: font,
                  }}
                >
                  How did you sleep last night?
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9a8080",
                    marginBottom: 10,
                    fontFamily: font,
                  }}
                >
                  This is about you, not baby.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {SLEEP_RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => handleSleepLog(r.value)}
                      style={{
                        flex: "1 1 45%",
                        padding: "10px 8px",
                        borderRadius: 12,
                        border: "1.5px solid #e4d4f4",
                        background: "#faf6ff",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#4a2a9a",
                        cursor: "pointer",
                        fontFamily: font,
                        textAlign: "center" as const,
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div
                  onClick={skipSleepPrompt}
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "var(--mu)",
                    cursor: "pointer",
                    textAlign: "center" as const,
                    fontFamily: font,
                  }}
                >
                  Skip today
                </div>
              </>
            )}
          </div>
        </LocalErrorBoundary>
      )}

      {/* Mood check card */}
      <LocalErrorBoundary>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #ede0d4",
            margin: "0 12px 8px",
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#2c1f1f",
              marginBottom: 10,
              fontFamily: font,
            }}
          >
            How are you feeling today?
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" as const }}>
            {MOODS.map((m) => (
              <div
                key={m.key}
                onClick={() => handleMoodTap(m.key)}
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center" as const,
                  cursor: "pointer",
                  minWidth: 0,
                  flex: "0 1 auto",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: m.bg,
                    display: "flex",
                    alignItems: "center" as const,
                    justifyContent: "center" as const,
                    border:
                      selectedMood === m.key
                        ? "2px solid #d4604a"
                        : "2px solid transparent",
                    boxSizing: "border-box" as const,
                  }}
                >
                  <MoodFace type={m.key} color={m.color} />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#2c1f1f",
                    marginTop: 4,
                    fontFamily: font,
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Postnatal rage acknowledgment card (inline, not modal) */}
          {showRageCard && (
            <div
              style={{
                marginTop: 12,
                background: "#fef4f0",
                border: "1px solid #f4d4cc",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#5a2a1a",
                  lineHeight: 1.5,
                  fontFamily: font,
                  marginBottom: 12,
                }}
              >
                Postnatal rage is real and it's common. Sudden intense anger after
                having a baby is a recognised hormonal response, not a character flaw.
                You are not a bad parent.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={confirmOverwhelmed}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: "#d4604a",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Thanks — save this
                </button>
                <button
                  onClick={() => {
                    setShowRageCard(false);
                    window.location.href = "/library";
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: 10,
                    border: "1.5px solid #d4604a",
                    background: "transparent",
                    color: "#d4604a",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Tell me more
                </button>
              </div>
            </div>
          )}
        </div>
      </LocalErrorBoundary>

      {/* Your sleep this week */}
      <LocalErrorBoundary>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #ede0d4",
            margin: "0 12px 8px",
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#2c1f1f",
                fontFamily: font,
              }}
            >
              Your sleep this week
            </div>
            <span
              onClick={() => setShowSleepPrompt(true)}
              style={{
                fontSize: 11,
                color: "#d4604a",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Log tonight →
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 32,
              marginBottom: 4,
            }}
          >
            {sleepChartData.map((hrs, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: hrs > 0 ? "#7a4ab4" : "#e8e0f0",
                  borderRadius: 3,
                  opacity: hrs > 0 ? 0.6 : 0.3,
                  height: hrs > 0 ? `${(hrs / MAX_SLEEP) * 100}%` : "8%",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {DAY_LABELS.map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center" as const,
                  fontSize: 9,
                  color: "var(--mu)",
                  fontFamily: font,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          {sleepAvg && (
            <div
              style={{
                fontSize: 11,
                color: "#9a8080",
                marginTop: 8,
                fontFamily: font,
              }}
            >
              You averaged {sleepAvg} hours this week
            </div>
          )}
          <div
            style={{
              marginTop: 8,
              background: "#fef4e4",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#8a5a00",
                fontFamily: font,
                lineHeight: 1.4,
              }}
            >
              It's hard when you're running on empty
            </div>
            <span
              onClick={handleSendSleepMessage}
              style={{
                fontSize: 10,
                color: "#d4904a",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Send message →
            </span>
          </div>
        </div>
      </LocalErrorBoundary>

      {/* Cradl noticed */}
      {notices.length > 0 && (
        <LocalErrorBoundary>
          <CradlNoticedSection notices={notices} />
        </LocalErrorBoundary>
      )}

      {/* Recovery section */}
      <LocalErrorBoundary>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: 0.8,
            color: "var(--mu)",
            padding: "10px 16px 4px",
            fontFamily: font,
          }}
        >
          Recovery
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #ede0d4",
            margin: "0 12px 8px",
            padding: "4px 0",
          }}
        >
          {RECOVERY_ROWS.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderBottom:
                  idx < RECOVERY_ROWS.length - 1
                    ? "1px solid #f4f0ec"
                    : "none",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: row.iconBg,
                  display: "flex",
                  alignItems: "center" as const,
                  justifyContent: "center" as const,
                  flexShrink: 0,
                }}
              >
                {ICON_MAP[row.iconKey]?.(16)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#2c1f1f",
                    fontFamily: font,
                  }}
                >
                  {row.title}
                  {"tag" in row && row.tag && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 9,
                        fontWeight: 600,
                        background: row.tagBg,
                        color: row.tagColor,
                        borderRadius: 4,
                        padding: "2px 5px",
                      }}
                    >
                      {row.tag}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9a8080",
                    fontFamily: font,
                    marginTop: 1,
                  }}
                >
                  {row.subtitle}
                </div>
              </div>
              <span
                onClick={() => (window.location.href = row.actionHref)}
                style={{
                  fontSize: 10,
                  color: "#d4604a",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap" as const,
                  fontFamily: font,
                }}
              >
                {row.action}
              </span>
            </div>
          ))}
        </div>
      </LocalErrorBoundary>

      {/* Time capsule card */}
      <LocalErrorBoundary>
        <div
          style={{
            background: "#faf6ff",
            border: "1px solid #e4d4f4",
            borderRadius: 14,
            padding: 14,
            margin: "0 12px 8px",
          }}
        >
          {weeks != null && (
            <div
              style={{
                fontSize: 11,
                color: "#9a8080",
                marginBottom: 4,
                fontFamily: font,
              }}
            >
              Week {weeks}
            </div>
          )}
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#2c1f1f",
              marginBottom: 6,
              lineHeight: 1.4,
              overflowWrap: "break-word",
            }}
          >
            {timeCapsuleTrigger ? timeCapsuleTrigger.message : weeklyQuestion}
          </div>
          {currentWeekReflection && !reflectionEditMode ? (
            <>
              <div style={{ fontSize: 11, color: "#5a4a40", lineHeight: 1.5, marginBottom: 6, whiteSpace: "pre-wrap" }}>{currentWeekReflection.body}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span onClick={() => { setReflectionText(currentWeekReflection?.body ?? ""); setReflectionEditMode(true); }} style={{ fontSize: 11, color: "#7a4ab4", fontWeight: 600, cursor: "pointer" }}>Edit</span>
                {reflectionSaved && (
                  <a href="/memories" style={{ fontSize: 11, color: "#6a9a6a", fontWeight: 600 }}>Saved to your notes →</a>
                )}
              </div>
            </>
          ) : (
            <>
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Write something..."
                maxLength={2000}
                style={{
                  width: "100%",
                  border: "1px solid #e4d4f4",
                  borderRadius: 8,
                  padding: "9px 10px",
                  fontSize: 11,
                  height: 56,
                  resize: "none" as const,
                  fontFamily: font,
                  boxSizing: "border-box" as const,
                  background: "#fff",
                  outline: "none",
                }}
              />
              <div style={{ textAlign: "right" as const, marginTop: 4 }}>
                {reflectionSaved ? (
                  <a href="/memories" style={{ fontSize: 11, color: "#6a9a6a", fontWeight: 600 }}>Saved to your notes →</a>
                ) : (
                  <span
                    onClick={handleSaveReflection}
                    style={{
                      fontSize: 11,
                      color: "#7a4ab4",
                      fontWeight: 600,
                      cursor: reflectionText.trim() ? "pointer" : "default",
                      fontFamily: font,
                      opacity: reflectionText.trim() ? 1 : 0.5,
                    }}
                  >
                    Save →
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </LocalErrorBoundary>

      {/* Tools & admin */}
      <LocalErrorBoundary>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: 0.8,
            color: "#c4a8a0",
            padding: "10px 16px 4px",
            fontFamily: font,
          }}
        >
          Tools & admin
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap" as const,
            gap: 6,
            padding: "0 12px 8px",
          }}
        >
          {TOOLS.map((t) => (
            <span
              key={t.label}
              onClick={() => t.isExport ? setExportSheetOpen(true) : (window.location.href = t.path)}
              style={{
                background: "#fff",
                border: `1px solid ${t.isSafety ? "#f4d4d4" : "#ede0d4"}`,
                borderRadius: 10,
                padding: "7px 11px",
                fontSize: 11,
                fontWeight: 500,
                color: t.isSafety ? "#9a7070" : "#2c1f1f",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </LocalErrorBoundary>

      {/* Settings link */}
      <div
        style={{
          textAlign: "center" as const,
          padding: "8px 0 16px",
        }}
      >
        <span
          onClick={() => (window.location.href = "/settings")}
          style={{
            fontSize: 11,
            color: "var(--mu)",
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          Settings →
        </span>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {exportSheetOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setExportSheetOpen(false)}
        >
          <div
            style={{ maxWidth: 360, width: "100%", background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #ede0d4" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2c1f1f", marginBottom: 6, fontFamily: font }}>Export your data</h3>
            <p style={{ fontSize: 13, color: "#9a8080", marginBottom: 18, fontFamily: font }}>
              Download all tracking data as CSV files, or get a paediatrician-friendly PDF summary.
            </p>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #ede0d4", background: "#faf7f2", fontSize: 14, fontWeight: 600, color: "#2c1f1f", cursor: "pointer", marginBottom: 10, fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx)" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 2 5-6"/></svg>
              <span>
                <span style={{ display: "block" }}>Export all as CSV</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9a8080" }}>Feeds, sleep, diapers, tummy time, growth</span>
              </span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #ede0d4", background: "#faf7f2", fontSize: 14, fontWeight: 600, color: "#2c1f1f", cursor: "pointer", marginBottom: 14, fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx)" strokeWidth="1.6" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6M9 10h6M9 14h4"/></svg>
              <span>
                <span style={{ display: "block" }}>GP / Paediatrician PDF</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9a8080" }}>Summary report to share with your doctor</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setExportSheetOpen(false)}
              style={{ display: "block", margin: "0 auto", background: "none", border: "none", color: "#9a8080", fontSize: 13, cursor: "pointer", fontFamily: font }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
