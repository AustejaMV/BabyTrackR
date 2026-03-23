import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { LocalErrorBoundary } from "../components/LocalErrorBoundary";
import { useDesktop } from "../components/AppLayout";
import { DesktopLayout } from "../components/DesktopLayout";
import { StatsRow } from "../components/StatsRow";
import { SleepSweetSpot } from "../components/SleepSweetSpot";
import { IfUnsettledCard } from "../components/IfUnsettledCard";
import { CradlNoticedSection, type NoticeCard } from "../components/CradlNoticedSection";
import { CradlNoticedCollapsed } from "../components/CradlNoticedCollapsed";
import { DailySignOffCard } from "../components/DailySignOffCard";
import { getLeapAtWeek, getNextLeap } from "../data/leaps";
import { DailyGoodEnoughCard } from "../components/DailyGoodEnoughCard";
import { HandoffCardCompact } from "../components/HandoffCardCompact";
import { LogDrawer } from "../components/LogDrawer";
import { HealthLogDrawer } from "../components/HealthLogDrawer";
import { SolidFoodDrawer } from "../components/SolidFoodDrawer";
import { ActivityDrawer } from "../components/ActivityDrawer";
import { SpitUpDrawer } from "../components/SpitUpDrawer";
import { TodayTimelineModal } from "../components/TodayTimelineModal";
import { LogEditSheet } from "../components/LogEditSheet";
import { CreateCustomTrackerSheet } from "../components/CreateCustomTrackerSheet";
import { CustomTrackerDrawer } from "../components/CustomTrackerDrawer";
import { useAuth } from "../contexts/AuthContext";
import { usePremium } from "../contexts/PremiumContext";
import { useBaby } from "../contexts/BabyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useFeedTimer } from "../contexts/FeedTimerContext";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import { isNightHours, getNightRotatingMessage, advanceNightMessageIndex } from "../utils/nightMode";
import { BreathingExerciseModal } from "../components/BreathingExerciseModal";
import { ReturnToWorkCountdown } from "../components/ReturnToWorkCountdown";
import { BabySwitcher } from "../components/BabySwitcher";
import { getLastFeedSide } from "../utils/lastFeedSideStorage";
import { getSweetSpotPrediction } from "../utils/napPrediction";
import { generateCryingReasons } from "../utils/cryingDiagnostic";
import { getCustomTrackers, getLogsForTracker } from "../utils/customTrackerStorage";
import { getIconDisplay } from "../data/customTrackerIcons";
import { readStoredArray } from "../utils/warningUtils";
import { loadAllDataFromServer, saveData, applyServerSnapshotToLocalStorage, flushPendingSaves, getPendingSavesCount } from "../utils/dataSync";
import { requestNotificationPermission } from "../utils/notifications";
import { rescheduleCareNotifications } from "../utils/careNotifications";
import { scheduleNextMedicationReminder } from "../utils/medicationReminderScheduler";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { detectSleepRegression } from "../utils/sleepRegression";
import { generateReadinessCards } from "../utils/readinessUtils";
import { formatDurationMsProse, formatIntervalMinutesProse, formatTimeAndAgo, TIME_DISPLAY } from "../utils/dateUtils";
import { buildActiveTriggers, checkArticleTriggers } from "../utils/articleTrigger";
import { ContextualArticleCard } from "../components/ContextualArticleCard";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BottleRecord, PainkillerDose, ActiveFeedingSession, BabyProfile, TimelineEvent } from "../types";
import { generateInsights, type Insight } from "../utils/insights";
import { ColicSection } from "../components/ColicSection";
import { CradlLoadingAnimation } from "../components/CradlLoadingAnimation";
import { HoldToLogButton } from "../components/HoldToLogButton";
import type { CustomTrackerDefinition } from "../types/customTracker";
import { syncWidgetData } from "../plugins/CapacitorBridge";
import { quickLogFeed, quickLogSleep, quickLogDiaper, quickLogTummy, quickEndFeed, quickEndSleep, quickEndTummy } from "../utils/quickLog";
import { getTimerThresholdState } from "../utils/activeTimerThresholds";
import { averageMinutesBetweenFeedsInRange } from "../utils/feedingPatternUtils";

type DrawerType = "feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump" | "health" | "solids" | "activity" | "spitup" | null;

const F = "system-ui, sans-serif";
const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase",
  letterSpacing: 0.8, padding: "10px 16px 4px", fontFamily: F,
};
const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #ede0d4", borderRadius: 14,
  margin: "0 12px 8px", padding: 14,
};

import { IconNursing, IconBottle, IconMoon, IconDroplet, IconHand, IconThermo, IconPump, IconSpoon, IconBaby } from "../components/BrandIcons";
import { HelpCircle, ClipboardList } from "lucide-react";

const LOG_ITEM_CONFIG = [
  { type: "feed" as const, labelKey: "today.feed", color: "#c05030" },
  { type: "sleep" as const, labelKey: "today.sleep", color: "#4080a0" },
  { type: "diaper" as const, labelKey: "today.nappy", color: "#4a8a4a" },
  { type: "tummy" as const, labelKey: "today.tummy", color: "#7a4ab4" },
  { type: "bottle" as const, labelKey: "today.bottle", color: "#c05030" },
] as const;

const LOG_ICON_MAP: Record<string, (color: string, size: number) => React.ReactNode> = {
  feed: (c, s) => <IconNursing size={s} color={c} />,
  sleep: (c, s) => <IconMoon size={s} color={c} />,
  diaper: (c, s) => <IconDroplet size={s} color={c} />,
  tummy: (c, s) => <IconHand size={s} color={c} />,
  bottle: (c, s) => <IconBottle size={s} color={c} />,
  health: (c, s) => <IconThermo size={s} color={c} />,
  pump: (c, s) => <IconPump size={s} color={c} />,
  solids: (c, s) => <IconSpoon size={s} color={c} />,
};

function growthSpurtContextSentence(weeks: number): string {
  if (weeks >= 2 && weeks <= 4) return ` At ${weeks} weeks, cluster feeding during an early growth spurt is common.`;
  if (weeks >= 5 && weeks <= 8) return ` Around ${weeks} weeks is a well-known growth-spurt window — extra feeds are normal.`;
  if (weeks >= 10 && weeks <= 18) return ` Many babies feed more between roughly 3–5 months during a growth spurt.`;
  if (weeks >= 24 && weeks <= 36) return ` Some babies ramp up feeds again around 6–9 months — often normal.`;
  return "";
}

/** Wall-clock elapsed for active sleep; supports string timestamps from JSON/sync. */
function getSleepTrackingStartMs(record: SleepRecord | null): number {
  if (!record) return 0;
  const raw = record.startTime ?? record.serverStartTime;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function Dashboard() {
  const { t } = useLanguage();
  const [sleepHistory, setSleepHistory] = useState<SleepRecord[]>([]);
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [diaperHistory, setDiaperHistory] = useState<DiaperRecord[]>([]);
  const [tummyTimeHistory, setTummyTimeHistory] = useState<TummyTimeRecord[]>([]);
  const [bottleHistory, setBottleHistory] = useState<BottleRecord[]>([]);
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [lastFeeding, setLastFeeding] = useState<FeedingRecord | null>(null);
  const [lastPainkiller, setLastPainkiller] = useState<PainkillerDose | null>(null);
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
  /** Bumped when sleep/tummy session changes in LogDrawer so hold-to-log RAF/progress resets and colors sync immediately */
  const [logButtonUiEpoch, setLogButtonUiEpoch] = useState(0);
  /** Live elapsed for sleep/tummy tiles; bumped on load and every second while a session runs */
  const [timerTick, setTimerTick] = useState(0);
  const [logHelpOpen, setLogHelpOpen] = useState(false);
  const logHelpRef = useRef<HTMLDivElement>(null);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [todayFilter, setTodayFilter] = useState<"feed" | "sleep" | "diaper" | "tummy" | null>(null);
  const [editEvent, setEditEvent] = useState<TimelineEvent | null>(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [customTrackers, setCustomTrackers] = useState<CustomTrackerDefinition[]>([]);
  const [customTrackerDrawerId, setCustomTrackerDrawerId] = useState<string | null>(null);
  const [showCreateTrackerSheet, setShowCreateTrackerSheet] = useState(false);
  const [showMoreDrawers, setShowMoreDrawers] = useState(false);
  const [thisWeekHelpOpen, setThisWeekHelpOpen] = useState(false);
  const [statsToday, setStatsToday] = useState({ feeds: 0, sleepH: "0h", diapers: 0, tummyM: 0, totalMl: 0 });
  const [showBreathingModal, setShowBreathingModal] = useState(false);


  const nightMode = isNightHours();

  const LOG_ITEMS = useMemo(
    () => LOG_ITEM_CONFIG.map((c) => ({ ...c, label: t(c.labelKey) })),
    [t]
  );

  const { user, session, loading, familyId } = useAuth();
  const { isPremium } = usePremium();
  const { activeBaby } = useBaby();
  const feedTimer = useFeedTimer();
  const navigate = useNavigate();

  const handleHoldToLog = useCallback(
    (type: "feed" | "sleep" | "diaper" | "tummy") => {
      const token = session?.access_token ?? "";
      let result: { toastMessage: string; openDrawer?: "feed" | "sleep" | "diaper" | "tummy" } | null = null;
      if (type === "feed") {
        if (feedTimer?.timerRunning || feedTimer?.timerPaused) {
          result = quickEndFeed(feedTimer.elapsedMs, feedTimer.feedSegments, feedTimer.feedSide, saveData, token);
          feedTimer.resetFeedTimer();
        } else {
          result = quickLogFeed(
            (side) => {
              feedTimer?.setFeedSide(side);
              feedTimer?.setTimerRunning(true);
            },
            saveData,
            token,
          );
        }
      } else if (type === "sleep") {
        let hasCurrent = false;
        try {
          const raw = localStorage.getItem("currentSleep");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.id) hasCurrent = true;
          }
        } catch {}
        // Starting sleep ends an active nurse session (can't sleep + feed at once).
        if (
          !hasCurrent &&
          feedTimer &&
          (feedTimer.timerRunning || feedTimer.timerPaused)
        ) {
          quickEndFeed(
            feedTimer.elapsedMs,
            feedTimer.feedSegments,
            feedTimer.feedSide,
            saveData,
            token,
          );
          feedTimer.resetFeedTimer();
        }
        result = hasCurrent ? quickEndSleep(saveData, token) : quickLogSleep(saveData, token);
        if (!result) result = quickLogSleep(saveData, token);
      } else if (type === "diaper") {
        result = quickLogDiaper(saveData, token);
      } else {
        result = quickEndTummy(saveData, token) ?? quickLogTummy(saveData, token);
      }
      if (!result) return;
      loadLocalDataRef.current();
      syncWidgetData();
      setLogButtonUiEpoch((e) => e + 1);
      setTimerTick((n) => n + 1);
      toast.success(result.toastMessage, {
        duration: 3000,
        action: result.openDrawer ? { label: t("today.tapToEdit"), onClick: () => setOpenDrawer(result.openDrawer!) } : undefined,
      });
      // Do not auto-open drawer on hold — user can tap "Tap to edit" in the toast if they want the form
    },
    [session?.access_token, feedTimer]
  );
  const [searchParams] = useSearchParams();

  const babyProfile: BabyProfile | null = activeBaby
    ? { birthDate: activeBaby.birthDate, name: activeBaby.name, parentName: activeBaby.parentName, photoDataUrl: activeBaby.photoDataUrl, weight: activeBaby.weight, height: activeBaby.height }
    : null;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = (babyProfile?.parentName ?? "").trim();
    const baby = (babyProfile?.name ?? "").trim();
    let timeOfDay = t("today.goodMorning");
    if (hour >= 12 && hour < 18) timeOfDay = t("today.goodAfternoon");
    else if (hour >= 18 && hour < 23) timeOfDay = t("today.goodEvening");
    else if (hour >= 23 || hour < 5) timeOfDay = t("today.greetingHi");
    if (name && baby) return t("today.greetingWithNameBaby", { timeOfDay, name, baby });
    if (baby) return t("today.greetingWithBaby", { timeOfDay, baby });
    return t("today.greetingSolo", { timeOfDay });
  }, [t, babyProfile?.parentName, babyProfile?.name]);

  const loadLocalDataRef = useRef<() => void>(() => {});

  const loadLocalData = () => {
    try { setCurrentSleep(JSON.parse(localStorage.getItem("currentSleep") || "null")); } catch { setCurrentSleep(null); }
    try {
      const fh = JSON.parse(localStorage.getItem("feedingHistory") || "[]") as FeedingRecord[];
      setFeedingHistory(fh);
      setLastFeeding(fh.length > 0 ? fh[fh.length - 1] : null);
    } catch { setFeedingHistory([]); setLastFeeding(null); }
    try { setSleepHistory(readStoredArray<SleepRecord>("sleepHistory")); } catch { setSleepHistory([]); }
    try { setDiaperHistory(readStoredArray<DiaperRecord>("diaperHistory")); } catch { setDiaperHistory([]); }
    try { setTummyTimeHistory(readStoredArray<TummyTimeRecord>("tummyTimeHistory")); } catch { setTummyTimeHistory([]); }
    try { setBottleHistory(readStoredArray<BottleRecord>("bottleHistory")); } catch { setBottleHistory([]); }
    try { setCustomTrackers(getCustomTrackers()); } catch { setCustomTrackers([]); }
    try {
      const raw = localStorage.getItem("painkillerHistory");
      if (raw) { const doses = JSON.parse(raw) as PainkillerDose[]; setLastPainkiller(doses.length > 0 ? doses[doses.length - 1] : null); }
    } catch { setLastPainkiller(null); }

    const todayStart = new Date().setHours(0, 0, 0, 0);
    let feeds = 0, sleepMs = 0, diapers = 0, tummyM = 0, totalMl = 0;
    try { const fh = JSON.parse(localStorage.getItem("feedingHistory") || "[]"); feeds = fh.filter((r: any) => (r.endTime ?? r.timestamp ?? 0) >= todayStart).length; } catch {}
    try { const bh = JSON.parse(localStorage.getItem("bottleHistory") || "[]"); totalMl = bh.filter((r: any) => (r.timestamp ?? 0) >= todayStart).reduce((s: number, r: any) => s + (r.volumeMl ?? 0), 0); } catch {}
    try {
      const sh = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
      sh.forEach((s: any) => {
        const start = s.startTime ?? 0; const end = s.endTime ?? 0;
        if (end >= todayStart && start < todayStart + 86400000) sleepMs += Math.max(0, end - Math.max(start, todayStart));
        else if (start >= todayStart && end) sleepMs += end - start;
      });
    } catch {}
    try { const dh = JSON.parse(localStorage.getItem("diaperHistory") || "[]"); diapers = dh.filter((r: any) => (r.timestamp ?? 0) >= todayStart).length; } catch {}
    try {
      const th = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
      th.forEach((t: any) => { if ((t.startTime ?? 0) >= todayStart && t.endTime) tummyM += Math.round((t.endTime - t.startTime) / 60000); });
    } catch {}
    const sleepH = sleepMs >= 3600000 ? `${Math.round(sleepMs / 3600000)}h` : sleepMs >= 60000 ? `${Math.round(sleepMs / 60000)}m` : "0m";
    setStatsToday({ feeds, sleepH, diapers, tummyM, totalMl });
    scheduleNextMedicationReminder();
  };
  loadLocalDataRef.current = loadLocalData;

  useEffect(() => { if (activeBaby?.id) { loadLocalData(); syncWidgetData(); } }, [activeBaby?.id]);

  const prevDrawerRef = useRef<DrawerType>(null);
  useEffect(() => {
    if (prevDrawerRef.current !== null && openDrawer === null) window.scrollTo(0, 0);
    prevDrawerRef.current = openDrawer;
  }, [openDrawer]);

  const refreshLogButtonsNow = useCallback(() => {
    loadLocalDataRef.current();
    syncWidgetData();
    setLogButtonUiEpoch((e) => e + 1);
    setTimerTick((n) => n + 1);
  }, []);

  // Any drawer visibility change should immediately cancel stale hold animations
  // and recompute active timer visuals rather than waiting for the next second tick.
  useEffect(() => {
    setLogButtonUiEpoch((e) => e + 1);
    setTimerTick((n) => n + 1);
  }, [openDrawer]);

  useEffect(() => {
    if (!logHelpOpen) return;
    const close = (e: MouseEvent) => {
      if (logHelpRef.current && !logHelpRef.current.contains(e.target as Node)) setLogHelpOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [logHelpOpen]);

  useEffect(() => {
    if (!thisWeekHelpOpen) return;
    const close = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && !el.closest("[data-thisweek-help-wrap]")) setThisWeekHelpOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [thisWeekHelpOpen]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (nightMode) advanceNightMessageIndex();
    };
  }, [nightMode]);

  useEffect(() => {
    if (!user || !session) {
      loadLocalData();
      requestNotificationPermission();
      return;
    }
    // Show local/cached data immediately so dashboard doesn't feel stuck loading
    loadLocalData();
    requestNotificationPermission();
    if (familyId) {
      // Prevent stale server snapshots from overwriting fresh local logs.
      // saveData() batches writes; if we fetch too soon after logging, server may still be behind.
      flushPendingSaves(session.access_token);
      if (getPendingSavesCount() > 0) {
        return;
      }
      loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
        // If saves are currently pending, don't clobber local state with older remote data.
        if (getPendingSavesCount() > 0) {
          return;
        }
        if (ok && Object.keys(data).length > 0) {
          applyServerSnapshotToLocalStorage(data);
        }
        loadLocalDataRef.current();
      });
    }
  }, [user, loading, session, navigate, familyId]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;
    if (action === "feed") setOpenDrawer("feed");
    else if (action === "sleep") setOpenDrawer("sleep");
    else if (action === "diaper" || action === "nappy") setOpenDrawer("diaper");
    else if (action === "bottle") setOpenDrawer("bottle");
    else if (action === "tummy") setOpenDrawer("tummy");
    else if (action === "pump") setOpenDrawer("pump");
    else if (action === "timeline") setTodayModalOpen(true);
    else if (action === "pee") logDiaper("pee");
    else if (action === "health") navigate("/health");
  }, [searchParams, navigate]);

  const logDiaper = (type: "pee" | "poop") => {
    endCurrentSleepIfActive((sl) => { if (session?.access_token) { saveData("sleepHistory", sl, session.access_token); saveData("currentSleep", null, session.access_token); } });
    let history: DiaperRecord[] = [];
    try { history = JSON.parse(localStorage.getItem("diaperHistory") || "[]"); } catch {}
    const entry: DiaperRecord = { id: Date.now().toString(), type, timestamp: Date.now() };
    history.push(entry);
    localStorage.setItem("diaperHistory", JSON.stringify(history));
    if (session?.access_token) saveData("diaperHistory", history, session.access_token);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged!`);
    loadLocalData();
  };

  const logPainkiller = () => {
    let history: PainkillerDose[] = [];
    try { history = JSON.parse(localStorage.getItem("painkillerHistory") || "[]"); } catch {}
    const now = Date.now();
    const dose: PainkillerDose = { id: now.toString(), timestamp: now };
    history.push(dose);
    localStorage.setItem("painkillerHistory", JSON.stringify(history));
    if (session?.access_token) saveData("painkillerHistory", history, session.access_token);
    setLastPainkiller(dose);
    scheduleNextMedicationReminder();
    toast.success("Dose logged");
  };

  const prediction = useMemo(
    () => getSweetSpotPrediction(sleepHistory, babyProfile?.birthDate ?? null),
    [sleepHistory, babyProfile?.birthDate]
  );

  useEffect(() => {
    if (!babyProfile?.birthDate) return;
    const handle = window.setTimeout(() => {
      void rescheduleCareNotifications({
        babyDob: babyProfile.birthDate,
        sleepHistory,
        feedingHistory,
        bottleHistory,
        diaperHistory,
        currentSleep,
        prediction,
        lastPainkiller,
        feedInProgress: Boolean(feedTimer?.timerRunning && !feedTimer?.timerPaused),
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [
    babyProfile?.birthDate,
    sleepHistory,
    feedingHistory,
    bottleHistory,
    diaperHistory,
    currentSleep,
    prediction,
    lastPainkiller,
    feedTimer?.timerRunning,
    feedTimer?.timerPaused,
  ]);

  const cryReasons = useMemo(
    () => generateCryingReasons({ feedingHistory, sleepHistory, diaperHistory, babyDob: babyProfile?.birthDate ?? null }),
    [feedingHistory, sleepHistory, diaperHistory, babyProfile?.birthDate]
  );

  const unsettledReasons = useMemo(() => {
    if (currentSleep) return [];
    return cryReasons.slice(0, 5).map((r) => ({
      likelihood: r.likelihood,
      text: r.detail,
      cta: r.action,
      onAction: () => {
        if (r.drawer) {
          setOpenDrawer(r.drawer);
        } else if (r.reason === "Wind") {
          toast(
            "Hold her upright against your shoulder or sit her on your lap leaning slightly forward. Gently rub or pat her back. Try for 2–3 minutes after each feed.",
            { duration: 8000 },
          );
        } else if (r.reason === "Developmental leap") {
          toast(
            "Extra cuddles, skin-to-skin, and a calm environment help during leaps. This phase is temporary — she's learning something new.",
            { duration: 8000 },
          );
        }
      },
    }));
  }, [cryReasons, currentSleep]);

  const ageInWeeks = useMemo(() => {
    const dob = babyProfile?.birthDate;
    if (!dob) return null;
    const dobMs = typeof dob === "number" ? dob : new Date(dob).getTime();
    return Math.floor((Date.now() - dobMs) / (7 * 24 * 60 * 60 * 1000));
  }, [babyProfile?.birthDate]);

  const birthDateMs = babyProfile?.birthDate != null ? (typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime()) : null;
  const feedActive = !!(feedTimer?.timerRunning && !feedTimer?.timerPaused);
  const feedElapsedMs = feedTimer?.elapsedMs ?? 0;
  const sleepElapsedMs = useMemo(() => {
    if (!currentSleep) return 0;
    const t0 = getSleepTrackingStartMs(currentSleep);
    if (t0 <= 0) return 0;
    return Math.max(0, Date.now() - t0);
  }, [currentSleep, timerTick]);
  const activeTummy = useMemo(() => {
    const withoutEnd = tummyTimeHistory.filter((r) => r.endTime == null);
    return withoutEnd.length > 0 ? withoutEnd[withoutEnd.length - 1]! : null;
  }, [tummyTimeHistory]);
  const tummyElapsedMs = useMemo(() => {
    if (!activeTummy) return 0;
    const t0 = typeof activeTummy.startTime === "number" && Number.isFinite(activeTummy.startTime)
      ? activeTummy.startTime
      : Number(activeTummy.startTime);
    if (!Number.isFinite(t0) || t0 <= 0) return 0;
    return Math.max(0, Date.now() - t0);
  }, [activeTummy, timerTick]);
  useEffect(() => {
    if (!currentSleep && !activeTummy) return;
    const id = setInterval(() => setTimerTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [currentSleep?.id, activeTummy?.id]);

  const feedThresholdState = getTimerThresholdState("feed", feedElapsedMs, {});
  const sleepThresholdState = getTimerThresholdState("sleep", sleepElapsedMs, { sleepHistory, birthDateMs });
  const tummyThresholdState = getTimerThresholdState("tummy", tummyElapsedMs, {});
  const anyOtherInAlert = (currentSleep && sleepThresholdState === "alert") || (activeTummy && tummyThresholdState === "alert");

  const activeSubLabelFor = (timerType: "feed" | "sleep" | "tummy", state: "normal" | "warning" | "alert") => {
    if (state === "alert") return t("today.runningVeryLong");
    if (state === "warning") {
      if (timerType === "sleep") return t("today.napRunningLong");
      if (timerType === "feed") return t("today.feedRunningLong");
      return t("today.tummyRunningLong");
    }
    return t("today.holdToStop");
  };

  const insights = useMemo<Insight[]>(() => {
    try {
      return generateInsights({
        sleepHistory, feedingHistory, diaperHistory,
        tummyHistory: tummyTimeHistory, bottleHistory,
        babyProfile: babyProfile ?? null, ageInWeeks: ageInWeeks ?? 0,
      }).slice(0, 5);
    } catch { return []; }
  }, [sleepHistory, feedingHistory, diaperHistory, tummyTimeHistory, bottleHistory, babyProfile, ageInWeeks]);

  const leapText = useMemo(() => {
    const weeks = ageInWeeks ?? 0;
    const current = getLeapAtWeek(weeks);
    if (current) return `Leap ${current.leapNumber} is happening now — extra fussiness is normal`;
    const next = getNextLeap(weeks);
    if (next && next.inDays <= 3) return `Leap ${next.leap.leapNumber} starts in ${next.inDays} day${next.inDays === 1 ? "" : "s"} — extra fussiness is normal`;
    return null;
  }, [ageInWeeks]);

  const notices = useMemo<NoticeCard[]>(() => {
    const cards: NoticeCard[] = [];
    const nm = babyProfile?.name?.trim() || "Baby";
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= todayStart);
    const weekAgo = Date.now() - 7 * 86400000;
    const prevWeekStart = weekAgo - 7 * 86400000;
    const weekFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= weekAgo);
    const avgDailyFeeds = weekFeeds.length > 0 ? weekFeeds.length / 7 : 0;
    const wks = ageInWeeks ?? 0;

    if (todayFeeds.length > avgDailyFeeds * 1.3 && todayFeeds.length >= 3 && avgDailyFeeds > 0) {
      const spurt = growthSpurtContextSentence(Math.floor(wks));
      cards.push({
        id: "more-feeds",
        color: "amber",
        title: "More feeds than usual today",
        dismissible: true,
        body: `${nm} has fed ${todayFeeds.length} times today — her usual is about ${Math.round(avgDailyFeeds)} per day.${spurt}\n\nShe may also be cluster feeding before a longer sleep. Both are normal — let her lead.`,
      });
    }

    const recentSleeps = sleepHistory.filter((s) => s.endTime && s.endTime >= weekAgo);
    if (recentSleeps.length >= 3) {
      const avgDur = recentSleeps.reduce((s, r) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0) / recentSleeps.length;
      if (avgDur < 40 * 60000 && avgDur > 0) {
        cards.push({
          id: "short-naps",
          color: "amber",
          title: "Short naps — she may be overtired going down",
          body: `Average nap is ${formatDurationMsProse(avgDur)} this week. Short naps at this age often mean she's overtired before the nap even starts.\n\nTry this tomorrow: start the nap routine 10–15 minutes earlier than usual. One day can show a difference.`,
        });
      }
    }

    if (todayFeeds.length >= 2) {
      const sorted = [...todayFeeds].sort((a, b) => (a.endTime ?? a.timestamp ?? 0) - (b.endTime ?? b.timestamp ?? 0));
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push(((sorted[i].endTime ?? sorted[i].timestamp ?? 0) - (sorted[i - 1].endTime ?? sorted[i - 1].timestamp ?? 0)) / 60000);
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      if (avgGap > 150 && weekFeeds.length > 10) {
        const prevWeekGap = averageMinutesBetweenFeedsInRange(feedingHistory, prevWeekStart, weekAgo);
        let body = `Average ${formatIntervalMinutesProse(avgGap)} between feeds today. She's settling into a rhythm.`;
        if (prevWeekGap != null && avgGap > prevWeekGap + 15) {
          body += `\n\nThat's wider than last week's average (${formatIntervalMinutesProse(prevWeekGap)} between feeds) — she's likely taking more at each feed.`;
        } else {
          body += "\n\nNo action needed — she's leading the change.";
        }
        cards.push({
          id: "feed-spacing",
          color: "green",
          title: "Feeds spacing out — a good sign",
          body,
        });
      }
    }

    const regression = detectSleepRegression(sleepHistory, ageInWeeks);
    if (regression?.detected) {
      cards.push({
        id: `regression-${regression.type}`,
        color: "purple",
        title: `Possible ${regression.type.replace("_", "-")} sleep regression`,
        body: regression.message,
        dismissible: true,
      });
    }

    const dobMs = babyProfile?.birthDate
      ? typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime()
      : null;
    const readiness = generateReadinessCards(dobMs, {
      napCount: recentSleeps.filter((s) => {
        const dur = (s.endTime ?? 0) - s.startTime;
        return dur > 0 && dur < 4 * 3600000;
      }).length,
    });
    for (const rc of readiness) {
      if (!rc.ready) {
        cards.push({
          id: `readiness-${rc.id}`,
          color: "blue",
          title: rc.title,
          body: rc.body,
          dismissible: true,
        });
      }
    }

    return cards;
  }, [feedingHistory, sleepHistory, ageInWeeks, babyProfile?.birthDate, babyProfile?.name]);

  const [dismissedArticleIds, setDismissedArticleIds] = useState<Set<string>>(new Set());

  const triggeredArticles = useMemo(() => {
    const regression = detectSleepRegression(sleepHistory, ageInWeeks);
    const activeTriggers = buildActiveTriggers({
      sleepRegressionDetected: regression?.detected ?? false,
    });
    return checkArticleTriggers({ activeTriggers, ageInWeeks })
      .filter((a) => !dismissedArticleIds.has(a.id));
  }, [sleepHistory, ageInWeeks, dismissedArticleIds]);

  const handleDismissArticle = (id: string) => {
    setDismissedArticleIds((prev) => new Set(prev).add(id));
  };

  const awakeTimeSince = useMemo(() => {
    if (!sleepHistory.length) return "—";
    const last = [...sleepHistory].sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0))[0];
    if (!last?.endTime) return "—";
    const mins = Math.round((Date.now() - last.endTime) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`;
  }, [sleepHistory]);

  const { isDesktop } = useDesktop();

  const ageStr = babyProfile?.birthDate ? getAgeMonthsWeeks(typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime()) : "";

  const hoursSinceLastDose = lastPainkiller ? Math.round((Date.now() - lastPainkiller.timestamp) / 3600000) : null;

  if (loading) {
    return <CradlLoadingAnimation fullScreen />;
  }

  const sharedModals = (
    <>
      {openDrawer && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => {
            refreshLogButtonsNow();
            setOpenDrawer(null);
          }}
        >
          <div
            style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "#fff", borderRadius: "16px 16px 0 0", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
          >
            {openDrawer === "health" && <HealthLogDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); syncWidgetData(); setOpenDrawer(null); }} />}
            {openDrawer === "solids" && <SolidFoodDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); syncWidgetData(); setOpenDrawer(null); }} />}
            {openDrawer === "activity" && <ActivityDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); syncWidgetData(); setOpenDrawer(null); }} />}
            {openDrawer === "spitup" && <SpitUpDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); syncWidgetData(); setOpenDrawer(null); }} session={session} />}
            {openDrawer && !["health", "solids", "activity", "spitup"].includes(openDrawer) && (
              <LogDrawer
                type={openDrawer as "feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump"}
                onClose={() => {
                  refreshLogButtonsNow();
                  setOpenDrawer(null);
                }}
                onSaved={() => {
                  refreshLogButtonsNow();
                  setOpenDrawer(null);
                }}
                onSessionChange={() => {
                  refreshLogButtonsNow();
                }}
                onSwitchType={(t) => setOpenDrawer(t as DrawerType)}
                session={session}
              />
            )}
          </div>
        </div>
      )}

      <TodayTimelineModal
        open={todayModalOpen}
        onClose={() => { setTodayModalOpen(false); setTodayFilter(null); }}
        filter={todayFilter}
        onEdit={(ev) => setEditEvent(ev)}
        refreshKey={timelineRefreshKey}
        isPremium={isPremium}
      />

      <LogEditSheet
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onSaved={() => { loadLocalDataRef.current(); setTimelineRefreshKey((k) => k + 1); }}
        session={session}
      />

      {showCreateTrackerSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowCreateTrackerSheet(false)}>
          <div style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "#fff", borderRadius: "16px 16px 0 0", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
            <CreateCustomTrackerSheet onClose={() => setShowCreateTrackerSheet(false)} onSaved={() => { setCustomTrackers(getCustomTrackers()); setShowCreateTrackerSheet(false); }} />
          </div>
        </div>
      )}

      {customTrackerDrawerId && (() => {
        const tracker = customTrackers.find((t) => t.id === customTrackerDrawerId);
        if (!tracker) return null;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setCustomTrackerDrawerId(null)}>
            <div style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "#fff", borderRadius: "16px 16px 0 0", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
              <CustomTrackerDrawer tracker={tracker} onClose={() => { setCustomTrackerDrawerId(null); loadLocalDataRef.current(); setTimelineRefreshKey((k) => k + 1); }} onSaved={() => { loadLocalDataRef.current(); setTimelineRefreshKey((k) => k + 1); }} />
            </div>
          </div>
        );
      })()}

      <BreathingExerciseModal open={showBreathingModal} onClose={() => setShowBreathingModal(false)} />
    </>
  );

  if (isDesktop) {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const timelineEvents: { time: string; desc: string; color: string }[] = [];
    for (const f of feedingHistory) {
      const ts = f.endTime ?? f.timestamp ?? 0;
      if (ts >= todayStart) timelineEvents.push({ time: format(ts, TIME_DISPLAY()), desc: t("today.feed"), color: "#c05030" });
    }
    for (const s of sleepHistory) {
      if (s.endTime && s.endTime >= todayStart) {
        timelineEvents.push({ time: format(s.startTime, TIME_DISPLAY()), desc: `Sleep ${Math.round((s.endTime - s.startTime) / 60000)}m`, color: "#4080a0" });
      }
    }
    for (const d of diaperHistory) {
      if ((d.timestamp ?? 0) >= todayStart) timelineEvents.push({ time: format(d.timestamp, TIME_DISPLAY()), desc: `Nappy (${d.type})`, color: "#4a8a4a" });
    }
    timelineEvents.sort((a, b) => b.time.localeCompare(a.time));
    const recentTimeline = timelineEvents.slice(0, 5);

    const dSmall: React.CSSProperties = { background: nightMode ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "#ede0d4"}`, borderRadius: 12, padding: "12px 14px", marginBottom: 9 };
    const dLabel: React.CSSProperties = { fontSize: 12, color: nightMode ? "rgba(255,255,255,0.35)" : "#b09080", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, margin: "12px 0 8px" };

    const statPill = (value: string | number, label: string, color: string) => (
      <div style={{ background: nightMode ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "#ede0d4"}`, borderRadius: 16, padding: "8px 10px", textAlign: "center", flex: 1, minWidth: 48 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 11, color: nightMode ? "rgba(255,255,255,0.4)" : "#9a8080", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      </div>
    );

    const noticeColor = (c: string) => c === "amber" ? "#e8a040" : c === "green" ? "#4a8a4a" : c === "purple" ? "#7a4ab4" : "#4080a0";

    const logButtons: { type: DrawerType; label: string; sub: string; bg: string; color: string }[] = [
      { type: "feed", label: t("today.feed"), sub: lastFeeding ? formatTimeAndAgo(lastFeeding.endTime ?? lastFeeding.timestamp).ago : "—", bg: "#feeae4", color: "#c05030" },
      { type: "sleep", label: t("today.sleep"), sub: currentSleep ? t("today.now") : t("today.awake"), bg: "#e4eef8", color: "#4080a0" },
      { type: "diaper", label: t("today.nappy"), sub: `${statsToday.diapers} today`, bg: "#e4f4e4", color: "#4a8a4a" },
      { type: "tummy", label: t("today.tummy"), sub: `${statsToday.tummyM}m`, bg: "#f0eafe", color: "#7a4ab4" },
      { type: "bottle", label: t("today.bottle"), sub: statsToday.totalMl > 0 ? `${statsToday.totalMl}ml` : "—", bg: "#feeae4", color: "#c05030" },
      { type: "health", label: t("today.health"), sub: t("today.logSection"), bg: "#ffd4c8", color: "#c05030" },
      { type: "pump", label: t("today.pump"), sub: t("today.logSection"), bg: "#f4ece8", color: "#9a7060" },
      { type: "solids", label: t("today.solids"), sub: t("today.logSection"), bg: "#e8f4e0", color: "#4a8a4a" },
      { type: "activity", label: t("today.activity"), sub: t("today.logSection"), bg: "#fef4e4", color: "#b08040" },
      { type: "spitup", label: t("today.spitup"), sub: t("today.logSection"), bg: "#f0ece8", color: "#9a8080" },
    ];

    const nm = nightMode;
    const dBg = nm ? "rgba(255,255,255,0.06)" : "#fff";
    const dBd = nm ? "rgba(255,255,255,0.1)" : "#ede0d4";
    const dTx = nm ? "rgba(255,255,255,0.85)" : "#2c1f1f";
    const dMu = nm ? "rgba(255,255,255,0.4)" : "#9a8080";

    const leftColumn = (
      <>
        {/* P14 desktop: 3am — "You're not alone" + rotating message */}
        {nm && (
          <div style={{
            padding: "20px 16px", marginBottom: 12, borderRadius: 14, textAlign: "center",
            background: "linear-gradient(135deg, #1a1428, #1e1832)",
            border: "1px solid rgba(196,160,212,0.2)",
          }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.95)", marginBottom: 8 }}>
              {t("today.youreNotAlone")}
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", marginBottom: 14 }}>
              {getNightRotatingMessage()}
            </div>
            <button type="button" onClick={() => setShowBreathingModal(true)} style={{
              background: "rgba(196,160,212,0.2)", border: "1px solid rgba(196,160,212,0.3)",
              borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600,
              color: "rgba(255,255,255,0.85)", cursor: "pointer", fontFamily: F,
            }}>
              {t("today.needMoment")}
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: nm ? "rgba(196,160,212,0.15)" : "linear-gradient(135deg, #fde8d8, #e8d4f5)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {babyProfile?.photoDataUrl
              ? <img src={babyProfile.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : <IconBaby size={22} color={nm ? "rgba(196,160,212,0.7)" : "#c4a0a0"} />}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: dTx, display: "flex", alignItems: "center", gap: 6 }}>
              {greeting}
              <BabySwitcher />
            </div>
            <div style={{ fontSize: 12, color: dMu }}>{babyProfile?.name ?? t("common.baby")} · {ageStr || t("today.addBirthDate")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {statPill(statsToday.feeds, t("today.statsRow.feeds"), "#c05030")}
          {statPill(statsToday.sleepH, t("today.statsRow.sleep"), "#4080a0")}
          {statPill(statsToday.diapers, t("today.statsRow.nappies"), "#4a8a4a")}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {statPill(getLastFeedSide() === "left" ? "L" : getLastFeedSide() === "right" ? "R" : "—", t("today.side"), "#9a7060")}
          {statPill(`${statsToday.tummyM}m`, t("today.tummy"), "#7a4ab4")}
          {statPill(awakeTimeSince, t("today.awake"), "#b08040")}
        </div>
        <LocalErrorBoundary>
          <SleepSweetSpot prediction={prediction} onStartSleep={() => setOpenDrawer("sleep")} babyName={babyProfile?.name} compact />
        </LocalErrorBoundary>
        <IfUnsettledCard reasons={unsettledReasons} compact nightMode={nm} />
        <LocalErrorBoundary>
          <ColicSection ageInWeeks={ageInWeeks ?? 0} compact collapsedRow />
        </LocalErrorBoundary>

        {/* Handoff card */}
        <LocalErrorBoundary>
          <HandoffCardCompact compact />
        </LocalErrorBoundary>

        {/* P9 desktop: Daily sign-off */}
        <LocalErrorBoundary>
          <DailySignOffCard
            feedsToday={statsToday.feeds}
            nappiesToday={statsToday.diapers}
            tummyMinutesToday={statsToday.tummyM}
            parentName={babyProfile?.parentName}
          />
        </LocalErrorBoundary>

        {/* Breathing button (daytime desktop) */}
        {!nm && (
          <button type="button" onClick={() => setShowBreathingModal(true)} style={{
            width: "100%", padding: "10px 14px", borderRadius: 12, marginBottom: 8,
            background: "linear-gradient(135deg, #f0eef4, #f4ecf8)",
            border: "1px solid #e4d8ec", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontFamily: F,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h0" />
            </svg>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f" }}>{t("today.needMoment")}</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>{t("today.breathingSubtitle")}</div>
            </div>
          </button>
        )}
      </>
    );

    const centerColumn = (
      <>
        {/* Good-enough card (desktop, daytime only) */}
        {!nm && (
          <LocalErrorBoundary>
            <DailyGoodEnoughCard />
          </LocalErrorBoundary>
        )}

        {/* P4 desktop: hold-to-log for Feed/Sleep/Nappy/Tummy; P6: Leap folded into CradlNoticedCollapsed below; P8: Custom trackers moved to Health tab */}
        <div ref={logHelpRef} style={{ ...dLabel, position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
          <span>{t("today.logSection")}</span>
          <button
            type="button"
            onClick={() => setLogHelpOpen((o) => !o)}
            aria-label="What is the log area and hold-to-log?"
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--mu)", display: "flex" }}
          >
            <HelpCircle size={14} />
          </button>
          {logHelpOpen && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "100%",
                marginTop: 4,
                maxWidth: 280,
                padding: "10px 12px",
                background: "var(--card)",
                border: "1px solid var(--bd)",
                borderRadius: 12,
                fontSize: 12,
                lineHeight: 1.5,
                fontWeight: 400,
                letterSpacing: "normal",
                textTransform: "none",
                color: "var(--tx)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 100,
              }}
            >
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{t("today.logHelp.areaTitle")}</p>
              <p style={{ margin: 0 }}>{t("today.logHelp.areaDesc")}</p>
              <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{t("today.logHelp.holdTitle")}</p>
              <p style={{ margin: 0 }}>{t("today.logHelp.holdDesc")}</p>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          {logButtons.map((btn) => {
            const isHold = btn.type === "feed" || btn.type === "sleep" || btn.type === "diaper" || btn.type === "tummy";
            if (isHold) {
              const holdType = btn.type as "feed" | "sleep" | "diaper" | "tummy";
              const isFeed = holdType === "feed";
              const isSleep = holdType === "sleep";
              const isTummy = holdType === "tummy";
              const active = isFeed ? feedActive : isSleep ? !!currentSleep : isTummy ? !!activeTummy : false;
              const elapsed = isFeed ? feedElapsedMs : isSleep ? sleepElapsedMs : isTummy ? tummyElapsedMs : 0;
              const thState = isFeed ? feedThresholdState : isSleep ? sleepThresholdState : isTummy ? tummyThresholdState : "normal";
              const timerType = isFeed ? "feed" : isSleep ? "sleep" : "tummy";
              const iconColor = active ? (thState === "alert" ? "#C17D5E" : "#0F6E56") : (isFeed && anyOtherInAlert && !active ? "#E8C9B8" : btn.color);
              return (
                <HoldToLogButton
                  key={btn.label}
                  type={holdType}
                  color={btn.color}
                  icon={LOG_ICON_MAP[btn.type ?? ""]?.(iconColor, 20) ?? <IconBaby size={20} color={btn.color} />}
                  label={btn.label}
                  subLabel={btn.sub}
                  onTap={() => setOpenDrawer(btn.type)}
                  onHoldComplete={() => handleHoldToLog(holdType)}
                  nightMode={nm}
                  style={{ background: dBg, border: `1px solid ${dBd}`, borderRadius: 14, padding: "14px 8px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", transition: "border-color 0.15s", minHeight: 72 }}
                  isActive={active}
                  activeElapsedMs={elapsed}
                  thresholdState={thState}
                  activeSubLabel={activeSubLabelFor(timerType, thState)}
                  muteRestColor={isFeed && !feedActive && anyOtherInAlert}
                  uiEpoch={logButtonUiEpoch}
                />
              );
            }
            return (
              <div
                key={btn.label}
                onClick={() => setOpenDrawer(btn.type)}
                style={{ background: dBg, border: `1px solid ${dBd}`, borderRadius: 14, padding: "14px 8px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d4604a")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = nm ? "rgba(255,255,255,0.1)" : "#ede0d4")}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: nm ? `color-mix(in srgb, ${btn.color} 20%, transparent)` : btn.bg }}>
                  {LOG_ICON_MAP[btn.type ?? ""]?.(btn.color, 20) ?? <IconBaby size={20} color={btn.color} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: dTx }}>{btn.label}</span>
                <span style={{ fontSize: 11, color: dMu, textAlign: "center", lineHeight: 1.3 }}>{btn.sub}</span>
              </div>
            );
          })}
        </div>
        <div style={dLabel}>{t("today.timeline")}</div>
        <div style={dSmall}>
          <div style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "#f4ece4"}` }}>
            <span style={{ fontSize: 12, color: "#d4604a", fontWeight: 700, minWidth: 42, flexShrink: 0 }}>NOW</span>
            <div style={{ width: 3, background: "#d4604a", borderRadius: 2, flexShrink: 0, alignSelf: "stretch" }} />
            <span style={{ fontSize: 13, color: dTx }}>—</span>
          </div>
          {recentTimeline.map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "#f4ece4"}` }}>
              <span style={{ fontSize: 12, color: dMu, minWidth: 42, flexShrink: 0 }}>{ev.time}</span>
              <div style={{ width: 3, background: ev.color, borderRadius: 2, flexShrink: 0, alignSelf: "stretch" }} />
              <span style={{ fontSize: 13, color: dTx }}>{ev.desc}</span>
            </div>
          ))}
          {recentTimeline.length === 0 && (
            <div style={{ padding: "16px 12px 18px", textAlign: "center" }}>
              <ClipboardList
                size={28}
                strokeWidth={1.25}
                style={{ color: nm ? "rgba(255,255,255,0.2)" : "#d4c8b8", margin: "0 auto 10px", display: "block" }}
                aria-hidden
              />
              <div style={{ fontSize: 14, fontWeight: 600, color: dTx, marginBottom: 6 }}>{t("today.desktopTimelineTitle")}</div>
              <div style={{ fontSize: 12, color: dMu, lineHeight: 1.55, maxWidth: 300, margin: "0 auto" }}>{t("today.desktopTimelineHint")}</div>
            </div>
          )}
        </div>

        {/* P6 desktop: Cradl noticed + Patterns + Leap in one collapsed row */}
        <LocalErrorBoundary>
          <CradlNoticedCollapsed notices={notices} insights={insights} leapText={leapText} nightMode={nm} />
        </LocalErrorBoundary>

        {/* Contextual articles */}
        {triggeredArticles.length > 0 && (
          <LocalErrorBoundary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
              {triggeredArticles.slice(0, 2).map((article) => (
                <ContextualArticleCard key={article.id} article={article} onDismiss={handleDismissArticle} onTap={() => navigate("/library")} />
              ))}
            </div>
          </LocalErrorBoundary>
        )}
      </>
    );

    const desktopQuickLink = (path: string, label: string) => (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path)}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          border: `1px solid ${dBd}`,
          background: nm ? "rgba(255,255,255,0.04)" : "#fff",
          color: dTx,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: F,
        }}
      >
        {label}
      </button>
    );

    const desktopQuickLinksRow = (
      <div style={{ marginTop: 4 }}>
        <div style={{ ...dLabel, marginTop: 0, marginBottom: 8 }}>{t("today.desktopQuickLinks")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {desktopQuickLink("/health", t("common.nav.health"))}
          {desktopQuickLink("/journey", t("common.nav.journey"))}
          {desktopQuickLink("/library", t("today.desktopLinkLibrary"))}
          {desktopQuickLink("/more", t("common.nav.me"))}
        </div>
      </div>
    );

    const rightColumn = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 200 }}>
        {/* P8: Appointments & Health log moved to Health tab */}
        <LocalErrorBoundary>
          <ReturnToWorkCountdown />
        </LocalErrorBoundary>

        {notices.length > 0 ? (
          <>
            <div data-thisweek-help-wrap style={{ ...dLabel, display: "flex", alignItems: "center", gap: 4, position: "relative", marginTop: 0 }}>
              <span>{t("today.thisWeek")}</span>
              <button
                type="button"
                aria-label="What does this week mean?"
                onClick={() => setThisWeekHelpOpen((v) => !v)}
                style={{ background: "none", border: "none", padding: 1, cursor: "pointer", color: dMu, display: "flex" }}
              >
                <HelpCircle size={13} />
              </button>
              {thisWeekHelpOpen && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "100%",
                    marginTop: 4,
                    maxWidth: 280,
                    padding: "10px 12px",
                    background: "var(--card)",
                    border: "1px solid var(--bd)",
                    borderRadius: 12,
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontWeight: 400,
                    letterSpacing: "normal",
                    textTransform: "none",
                    color: "var(--tx)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 120,
                  }}
                >
                  Weekly pattern highlights from recent logs so you can spot changes early.
                </div>
              )}
            </div>
            {notices.slice(0, 1).map((n) => (
              <div
                key={n.id}
                style={{
                  borderLeft: `3px solid ${noticeColor(n.color)}`,
                  borderRadius: "0 12px 12px 0", padding: "12px 14px", marginBottom: 0,
                  background: dBg, borderTop: `1px solid ${dBd}`, borderBottom: `1px solid ${dBd}`, borderRight: `1px solid ${dBd}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: dTx, marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: dMu, lineHeight: 1.5 }}>{n.body}</div>
              </div>
            ))}
          </>
        ) : (
          <div
            style={{
              borderRadius: 12,
              padding: "14px 14px 16px",
              background: dBg,
              border: `1px solid ${dBd}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: dMu, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              {t("today.desktopPatternsTitle")}
            </div>
            <div style={{ fontSize: 13, color: dTx, lineHeight: 1.55, marginBottom: 4 }}>{t("today.desktopPatternsEmpty")}</div>
          </div>
        )}

        {desktopQuickLinksRow}
      </div>
    );

    return (
      <div style={{ minHeight: "100vh", background: nm ? "#110e1a" : undefined, transition: "background 0.6s" }}>
        <DesktopLayout left={leftColumn} center={centerColumn} right={rightColumn} nightMode={nm} />
        {sharedModals}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80, background: nightMode ? "#110e1a" : "var(--bg)" }}>
      {nightMode && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(26,20,40,0.15) 0%, transparent 40%)",
          }}
        />
      )}

      {/* 0. Good-enough card (evening / early morning) */}
      {!nightMode && (
        <LocalErrorBoundary>
        <DailyGoodEnoughCard />
        </LocalErrorBoundary>
      )}

      {nightMode ? (
        <>
          {/* ── 3am companion (Prompt 14): "You're not alone" + rotating message ── */}
          <div style={{
            padding: "32px 20px 16px", textAlign: "center",
            background: "linear-gradient(180deg, #1a1428 0%, #110e1a 100%)",
          }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.95)", marginBottom: 12 }}>
              {t("today.youreNotAlone")}
            </div>
            <div style={{
              fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.6,
              color: "rgba(255,255,255,0.85)", maxWidth: 320, margin: "0 auto",
            }}>
              {getNightRotatingMessage()}
            </div>
          </div>

          {/* Night-mode greeting row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 8px" }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: "rgba(196,160,212,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {babyProfile?.photoDataUrl ? (
                <img src={babyProfile.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                <IconBaby size={18} color="rgba(196,160,212,0.7)" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", fontFamily: F, display: "flex", alignItems: "center", gap: 6 }}>
                {t("today.youreNotAlone")} <BabySwitcher />
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: F }}>
                {babyProfile?.name ?? t("common.baby")} · {ageStr || t("today.addBirthDateSettings")}
              </div>
            </div>
            <div
              onClick={() => { setTodayFilter(null); setTodayModalOpen(true); }}
              style={{ cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="14" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <path d="M3 8h14M7 2v3M13 2v3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 1. Daytime greeting */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
            <div
              style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #fde8d8, #e8d4f5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {babyProfile?.photoDataUrl ? (
                <img src={babyProfile.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                <IconBaby size={22} color="#c4a0a0" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#2c1f1f", fontFamily: F, overflowWrap: "break-word", display: "flex", alignItems: "center", gap: 6 }}>
                {greeting}
                <BabySwitcher />
              </div>
              <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: F }}>
                {babyProfile?.name ?? t("common.baby")} · {ageStr || t("today.addBirthDateSettings")}
              </div>
            </div>
            <div
              onClick={() => { setTodayFilter(null); setTodayModalOpen(true); }}
              style={{ cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="14" rx="2" stroke="#8a6b5b" strokeWidth="1.5" />
                <path d="M3 8h14M7 2v3M13 2v3" stroke="#8a6b5b" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* 1c. Return to work countdown */}
      <LocalErrorBoundary>
      <ReturnToWorkCountdown />
      </LocalErrorBoundary>

      {/* 2. Stats row */}
      <LocalErrorBoundary>
      <StatsRow
        feeds={statsToday.feeds}
        sleepHours={statsToday.sleepH}
        nappies={statsToday.diapers}
        lastSide={getLastFeedSide() === "left" ? "L" : getLastFeedSide() === "right" ? "R" : "—"}
        tummyMin={statsToday.tummyM}
        awakeTime={awakeTimeSince}
      />
      </LocalErrorBoundary>

      {/* 3. Log grid — above the fold (Prompt 1); hold-to-log for Feed/Sleep/Nappy/Tummy (Prompt 4) */}
      <div ref={logHelpRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, ...SECTION_LABEL, ...(nightMode ? { color: "rgba(255,255,255,0.35)" } : {}) }}>
        <span>{t("today.logSection")}</span>
        <button
          type="button"
          onClick={() => setLogHelpOpen((o) => !o)}
          aria-label="What is the log area and hold-to-log?"
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--mu)", display: "flex" }}
        >
          <HelpCircle size={14} />
        </button>
        {logHelpOpen && (
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "100%",
              marginTop: 4,
              maxWidth: 280,
              padding: "10px 12px",
              background: "var(--card)",
              border: "1px solid var(--bd)",
              borderRadius: 12,
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 400,
              letterSpacing: "normal",
              textTransform: "none",
              color: "var(--tx)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 100,
            }}
          >
<p style={{ margin: "0 0 6px", fontWeight: 600 }}>{t("today.logHelp.areaTitle")}</p>
              <p style={{ margin: 0 }}>{t("today.logHelp.areaDesc")}</p>
              <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{t("today.logHelp.holdTitle")}</p>
              <p style={{ margin: 0 }}>{t("today.logHelp.holdDesc")}</p>
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "0 12px 8px" }}>
        {LOG_ITEMS.map((item) => {
          const isHoldType = item.type === "feed" || item.type === "sleep" || item.type === "diaper" || item.type === "tummy";
          const subLabel =
            item.type === "feed" && (lastFeeding ? (() => { const { time, ago } = formatTimeAndAgo(lastFeeding.endTime ?? lastFeeding.timestamp); return `${time} · ${ago}`; })() : t("today.noFeedYet"))
            || (item.type === "sleep" && (currentSleep ? t("today.sleepingNow") : t("today.awake")))
            || (item.type === "diaper" && `${statsToday.diapers} today`)
            || (item.type === "tummy" && `${statsToday.tummyM}m today`)
            || (item.type === "bottle" && (statsToday.totalMl > 0 ? `${statsToday.totalMl}ml` : t("today.noBottle")));
          if (isHoldType) {
            const isFeed = item.type === "feed";
            const isSleep = item.type === "sleep";
            const isTummy = item.type === "tummy";
            const active = isFeed ? feedActive : isSleep ? !!currentSleep : isTummy ? !!activeTummy : false;
            const elapsed = isFeed ? feedElapsedMs : isSleep ? sleepElapsedMs : isTummy ? tummyElapsedMs : 0;
            const thState = isFeed ? feedThresholdState : isSleep ? sleepThresholdState : isTummy ? tummyThresholdState : "normal";
            const timerType = isFeed ? "feed" : isSleep ? "sleep" : "tummy";
            const iconColor = active ? (thState === "alert" ? "#C17D5E" : "#0F6E56") : (isFeed && anyOtherInAlert && !active ? "#E8C9B8" : item.color);
            return (
              <HoldToLogButton
                key={item.type}
                type={item.type}
                color={item.color}
                icon={LOG_ICON_MAP[item.type]?.(iconColor, 16)}
                label={item.label}
                subLabel={subLabel}
                nightMode={nightMode}
                onTap={() => setOpenDrawer(item.type)}
                onHoldComplete={() => handleHoldToLog(item.type)}
                isActive={active}
                activeElapsedMs={elapsed}
                thresholdState={thState}
                activeSubLabel={activeSubLabelFor(timerType, thState)}
                muteRestColor={isFeed && !feedActive && anyOtherInAlert}
                uiEpoch={logButtonUiEpoch}
              />
            );
          }
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setOpenDrawer(item.type)}
              style={{
                border: openDrawer === item.type ? "1px solid #d4604a" : nightMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #ede0d4",
                background: openDrawer === item.type ? (nightMode ? "rgba(212,96,74,0.15)" : "#fff8f5") : (nightMode ? "rgba(255,255,255,0.06)" : "#fff"),
                borderRadius: 14, padding: "10px 6px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontFamily: F,
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: nightMode ? `color-mix(in srgb, ${item.color} 20%, transparent)` : `color-mix(in srgb, ${item.color} 15%, #fff)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {LOG_ICON_MAP[item.type]?.(item.color, 16)}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: nightMode ? "rgba(255,255,255,0.8)" : "#2c1f1f" }}>{item.label}</div>
              <div style={{ fontSize: 10, color: nightMode ? "rgba(255,255,255,0.35)" : "var(--mu)" }}>{subLabel}</div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowMoreDrawers(true)}
          style={{
            border: "1px solid #ede0d4", background: "#fff", borderRadius: 14,
            padding: "10px 6px", cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4, fontFamily: F,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8, background: "#f4ece4",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}
          >
            ＋
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f" }}>{t("today.more")}</div>
          <div style={{ fontSize: 10, color: "var(--mu)" }}>{t("today.pumpHealth")}</div>
        </button>
      </div>

      {/* Prompt 14: "I need a moment" prominent below log grid in 3am mode */}
      {nightMode && (
        <button
          type="button"
          onClick={() => setShowBreathingModal(true)}
          style={{
            width: "calc(100% - 24px)",
            margin: "0 12px 12px",
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(196,160,212,0.2)",
            border: "1px solid rgba(196,160,212,0.35)",
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: F,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h0" />
          </svg>
          I need a moment
        </button>
      )}

      {showMoreDrawers && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowMoreDrawers(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 512, background: "#fff", borderRadius: "16px 16px 0 0", padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2c1f1f", marginBottom: 12, fontFamily: F }}>{t("today.moreLogTypes")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {([
                { type: "pump" as const, labelKey: "today.pump", color: "#9a7060", bg: "#f4ece8" },
                { type: "health" as const, labelKey: "today.health", color: "#c05030", bg: "#ffd4c8" },
                { type: "solids" as const, labelKey: "today.solids", color: "#4a8a4a", bg: "#e8f4e0" },
                { type: "activity" as const, labelKey: "today.activity", color: "#b08040", bg: "#fef4e4" },
                { type: "spitup" as const, labelKey: "today.spitup", color: "#9a8080", bg: "#f0ece8" },
              ] as const).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => { setShowMoreDrawers(false); setOpenDrawer(item.type); }}
                  style={{
                    border: "1px solid #ede0d4", background: "#fff", borderRadius: 12,
                    padding: "12px 8px", cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: 4, fontFamily: F,
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {LOG_ICON_MAP[item.type]?.(item.color, 18) ?? <IconDroplet size={18} color={item.color} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f" }}>{t(item.labelKey)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowMoreDrawers(false)}
              style={{ width: "100%", padding: "10px 0", marginTop: 12, fontSize: 12, color: "var(--mu)", background: "none", border: "none", cursor: "pointer", fontFamily: F }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* 4. Sleep sweet spot (Prompt 1 order) */}
      <LocalErrorBoundary>
      <SleepSweetSpot
        prediction={prediction}
        onStartSleep={() => setOpenDrawer("sleep")}
        babyName={babyProfile?.name}
      />
      </LocalErrorBoundary>

      {/* 5. Why is she crying? (Leap folded into Cradl noticed row — Prompt 6) */}
      <IfUnsettledCard reasons={unsettledReasons} nightMode={nightMode} />

      {/* 7. Colic tracker (Prompt 5: collapsed row, only if ever logged) */}
      <LocalErrorBoundary>
        <ColicSection ageInWeeks={ageInWeeks ?? 0} collapsedRow />
      </LocalErrorBoundary>

      {/* 8. Cradl noticed + Patterns + Leap (Prompt 6: one collapsed row) */}
      <LocalErrorBoundary>
      <CradlNoticedCollapsed notices={notices} insights={insights} leapText={leapText} nightMode={nightMode} />
      </LocalErrorBoundary>

      {/* 9. Handoff strip */}
      <LocalErrorBoundary>
      <HandoffCardCompact />
      </LocalErrorBoundary>

      {/* 10. Daily sign-off (Prompt 9) */}
      <LocalErrorBoundary>
      <DailySignOffCard
        feedsToday={statsToday.feeds}
        nappiesToday={statsToday.diapers}
        tummyMinutesToday={statsToday.tummyM}
        parentName={babyProfile?.parentName}
      />
      </LocalErrorBoundary>

      {sharedModals}
    </div>
  );
}
