import { ShoppingCart, Plus, Trash2, Check, ChevronDown, X, ChevronLeft, ChevronRight, LogOut, MessageCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Navigation } from "../components/Navigation";
import { WarningIndicators } from "../components/WarningIndicators";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { requestNotificationPermission, scheduleNotification } from "../utils/notifications";
import { scheduleNextMedicationReminder } from "../utils/medicationReminderScheduler";
import { useAuth } from "../contexts/AuthContext";
import { loadAllDataFromServer, saveData, clearSyncedDataFromLocalStorage, getPendingSavesCount, SYNCED_DATA_KEYS, SYNCED_DATA_DEFAULTS, POLL_MS_ACTIVE, POLL_MS_IDLE } from "../utils/dataSync";
import { getTimeSince } from "../utils/dateUtils";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, PainkillerDose, ActiveFeedingSession, ShoppingItem, BabyProfile } from "../types";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import { LogDrawer } from "../components/LogDrawer";
import { TodayTimelineModal } from "../components/TodayTimelineModal";
import { LogEditSheet } from "../components/LogEditSheet";
import { getLastFeedSide } from "../utils/lastFeedSideStorage";
import { WellbeingCard } from "../components/WellbeingCard";
import { LeapsCard } from "../components/LeapsCard";
import { NapPredictionCard } from "../components/NapPredictionCard";
import { WhyIsCryingCard } from "../components/WhyIsCryingCard";
import { HealthLogDrawer } from "../components/HealthLogDrawer";
import { SolidFoodDrawer } from "../components/SolidFoodDrawer";
import { ActivityDrawer } from "../components/ActivityDrawer";
import { usePremium } from "../contexts/PremiumContext";
import { useBaby } from "../contexts/BabyContext";
import { BabySwitcher } from "../components/BabySwitcher";
import { generateCryingReasons } from "../utils/cryingDiagnostic";
import type { TimelineEvent } from "../types";
import { readStoredArray, computeWarnings, readFeedingInterval } from "../utils/warningUtils";
import { readAlertThresholds } from "../utils/alertThresholdsStorage";
import { detectSleepRegression } from "../utils/sleepRegression";
import { buildActiveTriggers, checkArticleTriggers } from "../utils/articleTrigger";
import { loadArticle } from "../utils/articleLoader";
import { ArticleCard } from "../components/ArticleCard";
import { ArticleModal } from "../components/ArticleModal";
import { getJaundiceAgeDays, isJaundiceMonitoringActive } from "../utils/jaundiceAssessment";
import { getJaundiceChecks } from "../utils/jaundiceStorage";
import { generateHandoffSession, getHandoffShareUrl, getHandoffSessionsFromLocal, isHandoffSessionExpired, mergeHandoffLogsIntoMain } from "../utils/handoffGenerator";
import { saveHandoffSessionToServer, fetchHandoffLogs } from "../utils/handoffApi";
import { isNightHours, getNightMessage } from "../utils/nightMode";
import { NightModeOverlay } from "../components/NightModeOverlay";
import { useFeedTimer } from "../contexts/FeedTimerContext";
import { RegressionCard } from "../components/RegressionCard";
import { ReadinessCard } from "../components/ReadinessCard";
import { DailySummaryCard } from "../components/DailySummaryCard";
import { getGreeting } from "../utils/personalAddress";
import { MumSleepPrompt } from "../components/MumSleepPrompt";
import { getTimeCapsuleTrigger, getTimeCapsuleShowBack } from "../utils/timeCapsuleTrigger";
import { TimeCapsulePromptCard } from "../components/TimeCapsulePromptCard";
import { TimeCapsuleShowBackCard } from "../components/TimeCapsuleShowBackCard";
import { EmptyState } from "../components/EmptyState";
import { ReturnToWorkCountdownCard } from "../components/ReturnToWorkPlanner";
import { getReturnToWorkPlan } from "../utils/returnToWorkStorage";
import { isReturnWithinSevenDays } from "../utils/returnToWorkGenerator";
import { getCustomTrackers } from "../utils/customTrackerStorage";
import { CreateCustomTrackerSheet } from "../components/CreateCustomTrackerSheet";
import { CustomTrackerDrawer } from "../components/CustomTrackerDrawer";
import { getIconEmoji } from "../data/customTrackerIcons";
import type { CustomTrackerDefinition } from "../types/customTracker";
import { AskCradlSheet } from "../components/AskCradlSheet";
import { getSymptomHistory } from "../utils/healthStorage";

const VISIBILITY_REFETCH_MIN_MS = 2_000;

const QUICK_ADD_ITEMS = [
  { emoji: "🧷", label: "Diapers" },
  { emoji: "🧻", label: "Wipes" },
  { emoji: "🍼", label: "Formula" },
  { emoji: "🧴", label: "Diaper Cream" },
  { emoji: "🧴", label: "Baby Shampoo" },
  { emoji: "🧴", label: "Baby Lotion" },
  { emoji: "🛁", label: "Baby Wash" },
  { emoji: "🧣", label: "Burp Cloths" },
  { emoji: "👕", label: "Onesies" },
  { emoji: "🧦", label: "Baby Socks" },
  { emoji: "🛏️", label: "Swaddle Blankets" },
  { emoji: "😴", label: "Sleep Sack" },
  { emoji: "🤱", label: "Nursing Pads" },
  { emoji: "🍶", label: "Breast Pump Bags" },
  { emoji: "🌡️", label: "Thermometer" },
  { emoji: "💨", label: "Nasal Aspirator" },
  { emoji: "💧", label: "Gripe Water" },
  { emoji: "💊", label: "Gas Drops" },
  { emoji: "☀️", label: "Vitamin D Drops" },
  { emoji: "✂️", label: "Nail Clippers" },
  { emoji: "🧸", label: "Pacifier" },
  { emoji: "🎵", label: "White Noise Machine" },
  { emoji: "🛡️", label: "Changing Pads" },
  { emoji: "🎽", label: "Baby Mittens" },
  { emoji: "🧺", label: "Baby Detergent" },
];

function hasActiveSession(data: Record<string, unknown>): boolean {
  return data?.feedingActiveSession != null || data?.currentSleep != null || data?.currentTummyTime != null;
}

const LOG_PAGES: readonly (readonly ("feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump" | "health" | "solids" | "activity")[])[] = [
  ["feed", "sleep", "diaper", "tummy"],
  ["bottle", "pump", "health", "solids"],
  ["activity"],
];

export function Dashboard() {
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [lastFeeding, setLastFeeding] = useState<FeedingRecord | null>(null);
  const [activeFeedingSession, setActiveFeedingSession] = useState<ActiveFeedingSession | null>(null);
  const [recentDiapers, setRecentDiapers] = useState<DiaperRecord[]>([]);
  const [lastPainkiller, setLastPainkiller] = useState<PainkillerDose | null>(null);
  const [lastDataDebug, setLastDataDebug] = useState<{ familyId: string | null; rowsReturned?: number } | null>(null);
  const [, setFeedingTick] = useState(0);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [shoppingInput, setShoppingInput] = useState("");
  const { activeBaby, babies, setActiveBabyId } = useBaby();
  const babyProfile: BabyProfile | null = activeBaby
    ? {
        birthDate: activeBaby.birthDate,
        name: activeBaby.name,
        parentName: activeBaby.parentName,
        photoDataUrl: activeBaby.photoDataUrl,
        weight: activeBaby.weight,
        height: activeBaby.height,
      }
    : null;
  const [statsToday, setStatsToday] = useState<{ feeds: number; sleepH: string; diapers: number; tummyM: number; totalMl: number; activityM: number }>({ feeds: 0, sleepH: "0h", diapers: 0, tummyM: 0, totalMl: 0, activityM: 0 });
  const [openDrawer, setOpenDrawer] = useState<"feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump" | "health" | "solids" | "activity" | null>(null);
  const [sleepHistory, setSleepHistory] = useState<SleepRecord[]>([]);
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [diaperHistory, setDiaperHistory] = useState<DiaperRecord[]>([]);
  const [tummyTimeHistory, setTummyTimeHistory] = useState<TummyTimeRecord[]>([]);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [todayFilter, setTodayFilter] = useState<"feed" | "sleep" | "diaper" | "tummy" | null>(null);
  const [editEvent, setEditEvent] = useState<TimelineEvent | null>(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [nurseryEssentialsOpen, setNurseryEssentialsOpen] = useState(false);
  const [logPageIndex, setLogPageIndex] = useState(0);
  const logCarouselRef = useRef<HTMLDivElement>(null);
  const logTouchStartX = useRef(0);
  const [handoffSheetOpen, setHandoffSheetOpen] = useState(false);
  const [handoffHeadsUp, setHandoffHeadsUp] = useState("");
  const [timeCapsuleKey, setTimeCapsuleKey] = useState(0);
  const [handoffCaregiverName, setHandoffCaregiverName] = useState("");
  const [handoffGeneratedUrl, setHandoffGeneratedUrl] = useState<string | null>(null);
  const [handoffGenerating, setHandoffGenerating] = useState(false);
  const [articleModalId, setArticleModalId] = useState<string | null>(null);
  const [jaundiceCardDismissedDate, setJaundiceCardDismissedDate] = useState<string | null>(() => {
    try {
      return localStorage.getItem("cradl-jaundice-card-dismissed");
    } catch {
      return null;
    }
  });
  const [welcomeBannerShown, setWelcomeBannerShown] = useState(() => {
    try {
      return localStorage.getItem("cradl-welcome-banner-shown") === "true";
    } catch {
      return true;
    }
  });
  const [customTrackers, setCustomTrackers] = useState<CustomTrackerDefinition[]>([]);
  const [customTrackerDrawerId, setCustomTrackerDrawerId] = useState<string | null>(null);
  const [showCreateTrackerSheet, setShowCreateTrackerSheet] = useState(false);
  const [askCradlOpen, setAskCradlOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const { user, session, loading, familyId } = useAuth();
  const { isPremium } = usePremium();
  const feedTimer = useFeedTimer();
  const hasActiveTimer = (openDrawer === "feed" && feedTimer?.timerRunning) || openDrawer === "sleep" || openDrawer === "tummy";
  const showNightOverlay = isNightHours() && !hasActiveTimer;
  const prevFamilyIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const ageInWeeksForArticles =
    babyProfile?.birthDate != null
      ? (Date.now() - (typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime())) /
        (7 * 24 * 60 * 60 * 1000)
      : null;

  const triggeredArticles = useMemo(() => {
    const painkillerHistory = readStoredArray<{ id: string; timestamp: number }>("painkillerHistory");
    const thresholds = readAlertThresholds();
    const warnings = computeWarnings({
      feedingHistory,
      sleepHistory,
      diaperHistory,
      tummyTimeHistory,
      painkillerHistory,
      thresholds,
      feedingIntervalHours: readFeedingInterval(),
    });
    const reg = detectSleepRegression(sleepHistory, ageInWeeksForArticles ?? null);
    const activeTriggers = buildActiveTriggers({
      warnings,
      sleepRegressionDetected: reg?.detected ?? false,
    });
    return checkArticleTriggers({ activeTriggers, ageInWeeks: ageInWeeksForArticles });
  }, [feedingHistory, sleepHistory, diaperHistory, tummyTimeHistory, ageInWeeksForArticles]);

  // Live tick for active timers
  useEffect(() => {
    if (!activeFeedingSession && !currentSleep) return;
    const id = setInterval(() => setFeedingTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeFeedingSession, currentSleep]);

  // Pending sync count for offline-queue indicator
  useEffect(() => {
    if (!user || !session?.access_token) return;
    setPendingSyncCount(getPendingSavesCount());
    const t = setInterval(() => setPendingSyncCount(getPendingSavesCount()), 3000);
    return () => clearInterval(t);
  }, [user, session?.access_token]);

  // PWA quick actions
  useEffect(() => {
    const action = searchParams.get("action");
    if (action && user) handleQuickAction(action);
  }, [searchParams, user]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadLocalDataRef = useRef<() => void>(() => {});

  const loadLocalData = () => {
    const sleepData = localStorage.getItem("currentSleep");
    try { setCurrentSleep(sleepData ? JSON.parse(sleepData) : null); } catch { setCurrentSleep(null); }

    let activeFeeding: ActiveFeedingSession | null = null;
    try {
      const raw = localStorage.getItem("feedingActiveSession");
      if (raw && raw !== "null") {
        const parsed = JSON.parse(raw);
        const hasStart = parsed?.session?.sessionStartTime != null || parsed?.serverStartTime != null;
        if (hasStart && parsed?.session && Array.isArray(parsed?.session?.segments)) {
          activeFeeding = parsed;
        }
      }
    } catch { /* ignore */ }
    setActiveFeedingSession(activeFeeding);

    try {
      const feedingHistory = localStorage.getItem("feedingHistory");
      if (feedingHistory) {
        const feedings: FeedingRecord[] = JSON.parse(feedingHistory);
        if (feedings.length > 0) setLastFeeding(feedings[feedings.length - 1]);
      }
    } catch { /* corrupt data — skip */ }

    try {
      const diaperHistory = localStorage.getItem("diaperHistory");
      if (diaperHistory) {
        const diapers = JSON.parse(diaperHistory);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        setRecentDiapers(diapers.filter((d: DiaperRecord) => d.timestamp > oneDayAgo));
      }
    } catch { /* corrupt data — skip */ }

    const shoppingData = localStorage.getItem("shoppingList");
    if (shoppingData) {
      try { setShoppingList(JSON.parse(shoppingData)); } catch { /* ignore */ }
    }
    try {
      setSleepHistory(readStoredArray<SleepRecord>("sleepHistory"));
      setFeedingHistory(readStoredArray<FeedingRecord>("feedingHistory"));
      setDiaperHistory(readStoredArray<DiaperRecord>("diaperHistory"));
      setTummyTimeHistory(readStoredArray<TummyTimeRecord>("tummyTimeHistory"));
    } catch {
      setSleepHistory([]);
      setFeedingHistory([]);
      setDiaperHistory([]);
      setTummyTimeHistory([]);
    }

    const todayStart = new Date().setHours(0, 0, 0, 0);
    let feeds = 0,
      sleepMs = 0,
      diapers = 0,
      tummyM = 0,
      totalMl = 0;
    try {
      const fh = localStorage.getItem("feedingHistory");
      if (fh) {
        const arr: { endTime?: number; timestamp?: number }[] = JSON.parse(fh);
        feeds = arr.filter((r) => (r.endTime ?? r.timestamp ?? 0) >= todayStart).length;
      }
    } catch {}
    try {
      const bh = localStorage.getItem("bottleHistory");
      if (bh) {
        const arr: { timestamp?: number; volumeMl?: number }[] = JSON.parse(bh);
        totalMl = arr.filter((r) => (r.timestamp ?? 0) >= todayStart).reduce((s, r) => s + (r.volumeMl ?? 0), 0);
      }
    } catch {}
    try {
      const sh = localStorage.getItem("sleepHistory");
      if (sh) {
        const arr: { startTime?: number; endTime?: number }[] = JSON.parse(sh);
        arr.forEach((s) => {
          const start = s.startTime ?? 0;
          const end = s.endTime ?? 0;
          if (end >= todayStart && start < todayStart + 24 * 60 * 60 * 1000) {
            sleepMs += Math.max(0, end - Math.max(start, todayStart));
          } else if (start >= todayStart && end) {
            sleepMs += end - start;
          }
        });
      }
    } catch {}
    try {
      const dh = localStorage.getItem("diaperHistory");
      if (dh) {
        const arr: { timestamp?: number }[] = JSON.parse(dh);
        diapers = arr.filter((r) => (r.timestamp ?? 0) >= todayStart).length;
      }
    } catch {}
    try {
      const th = localStorage.getItem("tummyTimeHistory");
      if (th) {
        const arr: { startTime?: number; endTime?: number }[] = JSON.parse(th);
        arr.forEach((t) => {
          const start = t.startTime ?? 0;
          const end = t.endTime ?? 0;
          if (start >= todayStart && end) tummyM += Math.round((end - start) / 60000);
        });
      }
    } catch {}
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
    let activityM = 0;
    try {
      const ah = localStorage.getItem("activityHistory");
      if (ah) {
        const arr: { timestamp?: string; durationMinutes?: number }[] = JSON.parse(ah);
        arr.forEach((r) => {
          const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
          if (ts >= todayStart && ts <= todayEnd) activityM += r.durationMinutes ?? 0;
        });
      }
    } catch {}
    const sleepH = sleepMs >= 3600000 ? `${Math.round(sleepMs / 3600000)}h` : sleepMs >= 60000 ? `${Math.round(sleepMs / 60000)}m` : "0m";
    setStatsToday({ feeds, sleepH, diapers, tummyM, totalMl, activityM });

    try {
      setCustomTrackers(getCustomTrackers());
    } catch {
      setCustomTrackers([]);
    }

    scheduleNextMedicationReminder();

    try {
      const painkillerHistory = localStorage.getItem("painkillerHistory");
      if (painkillerHistory) {
        const doses: PainkillerDose[] = JSON.parse(painkillerHistory);
        if (doses.length > 0) {
          const last = doses[doses.length - 1];
          setLastPainkiller(last);
          const remaining = 8 * 60 * 60 * 1000 - (Date.now() - last.timestamp);
          if (remaining > 0) {
            scheduleNotification("Painkiller reminder", "It has been 8 hours since your last painkiller dose.", remaining);
          }
        }
      }
    } catch { /* corrupt data — skip */ }
  };
  loadLocalDataRef.current = loadLocalData;

  const hasBabyProfile = babyProfile && babyProfile.birthDate;

  useEffect(() => {
    if (activeBaby?.id) loadLocalData();
  }, [activeBaby?.id]);

  useEffect(() => {
    const sessions = getHandoffSessionsFromLocal().filter((s) => !isHandoffSessionExpired(s));
    if (sessions.length === 0) return;
    const babyName = activeBaby?.name?.trim() || babyProfile?.name?.trim() || "";
    const poll = async () => {
      for (const sess of sessions) {
        const logs = await fetchHandoffLogs(sess.id);
        const merged = mergeHandoffLogsIntoMain(sess, logs, babyName);
        for (const log of merged) {
          const timeStr = format(new Date(log.loggedAt), "HH:mm");
          toast.success(`${log.loggedByName} logged a ${log.type} at ${timeStr}`);
          loadLocalDataRef.current?.();
        }
      }
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, [activeBaby?.name, babyProfile?.name]);

  const applyServerData = (serverData: Record<string, unknown>, _debug?: { familyId: string | null; rowsReturned?: number }) => {
    try {
      if (!serverData || typeof serverData !== "object") return;
      const keyCount = Object.keys(serverData).length;
      if (keyCount === 0) {
        if (_debug) {
          console.warn("[Cradl] Server returned 0 keys. familyId =", _debug.familyId, "| DB rowsReturned =", _debug.rowsReturned);
          setLastDataDebug({ familyId: _debug.familyId ?? null, rowsReturned: _debug.rowsReturned });
        }
        loadLocalDataRef.current();
        return;
      }
      setLastDataDebug(null);
      clearSyncedDataFromLocalStorage();
      Object.entries(serverData).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // ignore per-key (quota, private mode)
        }
      });
      for (const key of SYNCED_DATA_KEYS) {
        if (!(key in serverData)) {
          try {
            localStorage.setItem(key, JSON.stringify(SYNCED_DATA_DEFAULTS[key]));
          } catch {
            // ignore
          }
        }
      }
      loadLocalDataRef.current();
    } catch (e) {
      console.warn("[Cradl] applyServerData failed", e);
      loadLocalDataRef.current();
    }
  };

  // ─── Auth / initial load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) { navigate("/login"); return; }
    if (!user || !session) { loadLocalData(); return; }

    if (familyId && (prevFamilyIdRef.current == null || prevFamilyIdRef.current !== familyId)) {
      clearSyncedDataFromLocalStorage();
    }
    if (familyId) prevFamilyIdRef.current = familyId;

    console.log("[Cradl] Dashboard: initial fetch", { familyId: familyId ?? "none" });
    loadAllDataFromServer(session.access_token).then(({ ok, data: serverData, _debug }) => {
      if (!ok) {
        console.warn("[Cradl] Dashboard: initial fetch failed — keeping local data");
        loadLocalDataRef.current();
        return;
      }
      applyServerData(serverData, _debug);
    });

    requestNotificationPermission();
  }, [user, loading, session, navigate, familyId]);

  // ─── Polling interval (separate from initial load — avoids double-fire) ────
  useEffect(() => {
    if (!user || !session?.access_token || !familyId) return;

    const pollMsRef = { current: POLL_MS_IDLE };
    const timerRef = { current: 0 as unknown as ReturnType<typeof setInterval> };
    const lastRefetchAt = { current: 0 };

    const reschedule = () => {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(refetchAndApply, pollMsRef.current);
    };

    const refetchAndApply = () => {
      loadAllDataFromServer(session!.access_token!).then(({ ok, data: serverData }) => {
        if (!ok || Object.keys(serverData).length === 0) return;
        const next = hasActiveSession(serverData) ? POLL_MS_ACTIVE : POLL_MS_IDLE;
        if (next !== pollMsRef.current) { pollMsRef.current = next; reschedule(); }
        applyServerData(serverData);
        lastRefetchAt.current = Date.now();
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastRefetchAt.current >= VISIBILITY_REFETCH_MIN_MS) refetchAndApply();
        clearInterval(timerRef.current);
        timerRef.current = setInterval(refetchAndApply, pollMsRef.current);
      } else {
        clearInterval(timerRef.current);
      }
    };

    // Start interval but do NOT fire immediately — initial load effect handles first fetch
    timerRef.current = setInterval(refetchAndApply, pollMsRef.current);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, session?.access_token, familyId]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const persistShoppingList = (list: ShoppingItem[]) => {
    localStorage.setItem("shoppingList", JSON.stringify(list));
    if (session?.access_token) saveData("shoppingList", list, session.access_token);
  };

  const addShoppingItem = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...shoppingList, { id: Date.now().toString(), name: trimmed, checked: false }];
    setShoppingList(updated);
    persistShoppingList(updated);
  };

  const toggleShoppingItem = (id: string) => {
    const updated = shoppingList.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setShoppingList(updated);
    persistShoppingList(updated);
  };

  const removeShoppingItem = (id: string) => {
    const updated = shoppingList.filter((item) => item.id !== id);
    setShoppingList(updated);
    persistShoppingList(updated);
  };

  const handleShoppingInputAdd = () => {
    addShoppingItem(shoppingInput);
    setShoppingInput("");
  };

  const logPainkiller = () => {
    let history: PainkillerDose[] = [];
    try { history = JSON.parse(localStorage.getItem("painkillerHistory") || "[]"); } catch { /* start fresh */ }
    const now = Date.now();
    const newDose: PainkillerDose = { id: now.toString(), timestamp: now };
    history.push(newDose);
    localStorage.setItem("painkillerHistory", JSON.stringify(history));
    if (session?.access_token) saveData("painkillerHistory", history, session.access_token);
    setLastPainkiller(newDose);
    scheduleNextMedicationReminder();
    toast.success("Painkiller dose logged. We'll remind you at the next scheduled time.");
  };

  const logDiaper = (type: "pee" | "poop") => {
    endCurrentSleepIfActive((sleepHistory) => {
      if (session?.access_token) {
        saveData("sleepHistory", sleepHistory, session.access_token);
        saveData("currentSleep", null, session.access_token);
      }
    });
    let diaperHistory: DiaperRecord[] = [];
    try { diaperHistory = JSON.parse(localStorage.getItem("diaperHistory") || "[]"); } catch { /* start fresh */ }
    const newDiaper: DiaperRecord = { id: Date.now().toString(), type, timestamp: Date.now() };
    diaperHistory.push(newDiaper);
    localStorage.setItem("diaperHistory", JSON.stringify(diaperHistory));
    if (session?.access_token) saveData("diaperHistory", diaperHistory, session.access_token);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged!`);
    loadLocalData();
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "pee": logDiaper("pee"); break;
      case "poop": logDiaper("poop"); break;
      case "feed": setOpenDrawer("feed"); break;
      case "sleep": setOpenDrawer("sleep"); break;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const nightDimming = isNightHours();
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <NightModeOverlay shouldShow={showNightOverlay} message={getNightMessage()} accessToken={session?.access_token ?? null} />
      <div
        className={nightDimming ? "transition-opacity duration-300" : ""}
        style={
          nightDimming
            ? { opacity: 0.92, background: "rgba(255, 200, 150, 0.04)", minHeight: "100%", margin: -1, padding: 1 }
            : undefined
        }
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Baby name and switcher (dots) at top */}
          <BabySwitcher babies={babies} activeBaby={activeBaby} onSwitch={setActiveBabyId} />
        <MumSleepPrompt />
        {/* First-time welcome banner (once per install) */}
        {!welcomeBannerShown && (
          <div className="mb-3 rounded-2xl border p-4 flex items-center justify-between gap-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
            <p className="text-[14px]" style={{ color: "var(--tx)" }}>Welcome to Cradl! You&apos;re all set.</p>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem("cradl-welcome-banner-shown", "true");
                } catch {}
                setWelcomeBannerShown(true);
              }}
              className="py-2 px-3 rounded-xl text-[13px] font-medium"
              style={{ background: "var(--pink)", color: "white" }}
            >
              Got it
            </button>
          </div>
        )}
        {/* Greeting card: link to settings */}
        <div className="mb-2.5">
          {activeBaby && (
            <Link to="/settings" className="block">
              <div
                className="rounded-[22px] p-4 flex gap-4 items-center border min-h-[100px]"
                style={{
                  background: "linear-gradient(135deg, var(--hello1), var(--hello2))",
                  borderColor: "var(--ro)",
                }}
              >
                <div
                  className="w-[64px] h-[64px] rounded-full border-[2.5px] flex flex-col items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ borderColor: "rgba(255,255,255,0.8)", background: "var(--bg2)" }}
                >
                  {babyProfile?.photoDataUrl ? (
                    <img src={babyProfile.photoDataUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : activeBaby?.icon ? (
                    <span className="text-3xl">{activeBaby.icon}</span>
                  ) : (
                    <>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5" className="opacity-70">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-[10px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Add photo</span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[20px] leading-tight font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
                    {getGreeting(babyProfile?.parentName ?? null, babyProfile?.name ?? null, new Date().getHours())}
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                    {babyProfile?.birthDate ? `${getAgeMonthsWeeks(babyProfile.birthDate)} · tap photo to change` : "Tap to add birth date"}
                  </div>
                  {(babyProfile?.weight != null || babyProfile?.height != null) && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {babyProfile?.weight != null && (
                        <span className="rounded-[10px] px-2.5 py-1 text-[11px]" style={{ background: "rgba(255,255,255,0.7)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                          {babyProfile.weight} kg
                        </span>
                      )}
                      {babyProfile?.height != null && (
                        <span className="rounded-[10px] px-2.5 py-1 text-[11px]" style={{ background: "rgba(255,255,255,0.7)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                          {babyProfile.height} cm
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Sync status: show when pending saves (e.g. after offline) */}
        {user && session?.access_token && pendingSyncCount > 0 && (
          <div className="mb-2 py-1.5 px-3 rounded-lg text-[12px] flex items-center gap-2" style={{ background: "var(--la)", color: "var(--tx)" }} role="status" aria-label="Syncing data">
            <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
            Syncing… {pendingSyncCount} pending
          </div>
        )}
        {/* Alert pills: horizontal scroll below greeting (Prompt 3) */}
        <WarningIndicators />

        {/* Reminder card (example style) */}
        <div
          className="rounded-2xl border py-3.5 px-4 mb-3 flex items-center gap-3"
          style={{ background: "var(--rem-bg)", borderColor: "var(--bd)" }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--pe)" }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v3M5.5 3.5A3.5 3.5 0 0 0 8 11a3.5 3.5 0 0 0 2.5-7.5" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6.5 5.5h3" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
              {lastFeeding ? "Next feed due soon" : "Log a feed when ready"}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {lastFeeding ? `${getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp)} · usually every 3h` : "Tap Feed below to start"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setTodayFilter(null); setTodayModalOpen(true); }}
            className="flex-shrink-0 py-2.5 px-4 rounded-[20px] text-[13px] font-medium border min-h-[44px]"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
          >
            See today
          </button>
        </div>

        {/* No logs today: gentle nudge (when DOB set so we're past onboarding) */}
        {activeBaby && babyProfile?.birthDate && (() => {
          const hasLogsToday = statsToday.feeds > 0 || statsToday.diapers > 0 || statsToday.tummyM > 0 || statsToday.totalMl > 0 || statsToday.activityM > 0 || (statsToday.sleepH !== "0h" && statsToday.sleepH !== "" && !statsToday.sleepH.startsWith("0h 0m"));
          return !hasLogsToday ? (
            <div className="mb-3">
              <EmptyState
                compact
                illustration="✨"
                title="No logs yet today"
                body="Tap a button below to log your first feed, sleep, or nappy change."
                primaryAction={{ label: "Log a feed", onClick: () => setOpenDrawer("feed") }}
                secondaryAction={{ label: "Log sleep", onClick: () => setOpenDrawer("sleep") }}
              />
            </div>
          ) : null;
        })()}

        {/* Return to work: countdown when within 7 days */}
        {(() => {
          const rtwPlan = getReturnToWorkPlan();
          return rtwPlan && isReturnWithinSevenDays(rtwPlan) ? (
            <ReturnToWorkCountdownCard plan={rtwPlan} dismissKey="cradl-rtw-countdown-dismissed" />
          ) : null;
        })()}

        {/* Return to work: proactive card at 26 weeks */}
        {activeBaby && babyProfile?.birthDate && (() => {
          const birthMs = typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime();
          const ageInWeeks = (Date.now() - birthMs) / (7 * 24 * 60 * 60 * 1000);
          const plan = getReturnToWorkPlan();
          if (ageInWeeks < 26 || plan != null) return null;
          return (
            <Link to="/return-to-work" className="block mb-3">
              <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                <p className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>Thinking about returning to work?</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--mu)" }}>Cradl can help you plan the transition — feeding, sleep, and handing over to your nursery or childminder.</p>
                <span className="inline-block mt-2 text-[13px] font-medium" style={{ color: "var(--pink)" }}>Start planning →</span>
              </div>
            </Link>
          );
        })()}

        {/* Daily summary */}
        <DailySummaryCard
          sleepHistory={sleepHistory}
          feedingHistory={feedingHistory}
          diaperHistory={diaperHistory}
          tummyHistory={tummyTimeHistory}
          parentName={babyProfile?.parentName ?? null}
        />

        {/* No DOB: prompt to set birth date */}
        {activeBaby && !babyProfile?.birthDate && (
          <div className="mb-3">
            <EmptyState
              illustration="📅"
              title="Set birth date for personalised insights"
              body="Add your baby's birth date in Settings to see nap windows, age-based comparisons, and developmental leaps."
              primaryAction={{ label: "Open Settings", onClick: () => navigate("/settings") }}
            />
          </div>
        )}

        {/* Jaundice watch — when baby &lt; 21 days, dismissible for today */}
        {activeBaby &&
          babyProfile?.birthDate &&
          isJaundiceMonitoringActive(babyProfile.birthDate) &&
          jaundiceCardDismissedDate !== format(new Date(), "yyyy-MM-dd") && (() => {
            const ageDays = getJaundiceAgeDays(babyProfile.birthDate);
            const checks = getJaundiceChecks();
            const lastCheck = checks[0];
            return (
              <div className="mb-3 rounded-2xl border p-4 flex items-center justify-between gap-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>
                    Jaundice watch — day {ageDays ?? "—"}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--mu)" }}>
                    {lastCheck ? `Last check ${format(new Date(lastCheck.date), "d MMM")}` : "Track skin checks in good daylight"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to="/jaundice" className="py-2 px-3 rounded-xl text-[13px] font-medium" style={{ background: "var(--pink)", color: "white" }}>
                    Check now
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const today = format(new Date(), "yyyy-MM-dd");
                      try {
                        localStorage.setItem("cradl-jaundice-card-dismissed", today);
                      } catch {}
                      setJaundiceCardDismissedDate(today);
                    }}
                    className="p-2 rounded-lg"
                    style={{ color: "var(--mu)" }}
                    aria-label="Dismiss for today"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

        {/* Contextual articles (up to 2) */}
        {triggeredArticles.length > 0 && (
          <div className="mb-3">
            {triggeredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onRead={() => setArticleModalId(article.id)}
              />
            ))}
          </div>
        )}

        {/* Nap window / sweet spot prediction */}
        {hasBabyProfile && (
          <NapPredictionCard
            sleepHistory={sleepHistory}
            babyDob={babyProfile?.birthDate ?? null}
            babyName={babyProfile?.name}
          />
        )}

        {/* Why might she be crying? — only when awake and we have context */}
        {(babyProfile?.birthDate != null || (feedingHistory?.length ?? 0) > 0) && (
          <>
            <RegressionCard />
            <ReadinessCard />
            <WhyIsCryingCard
              reasons={generateCryingReasons({
                feedingHistory,
                sleepHistory,
                diaperHistory,
                babyDob: babyProfile?.birthDate ?? null,
              })}
              isBabyAwake={!currentSleep}
              onOpenDrawer={setOpenDrawer}
            />
          </>
        )}

        {/* What to expect — Wonder Weeks (Prompt 8) */}
        {hasBabyProfile && babyProfile?.birthDate && <LeapsCard birthDateMs={babyProfile.birthDate} />}

        {/* Log buttons — 4 per page with dots, swipe/scroll */}
        {(() => {
          const labels: Record<string, { title: string; sub: string; dot: string; iconBg: string; icon: React.ReactNode }> = {
            feed: { title: "Log a feed", sub: lastFeeding ? getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp) : "No feed yet", dot: "var(--coral)", iconBg: "var(--pe)", icon: <><path d="M8 3v2.5M6 3.5A3 3 0 0 0 8 10a3 3 0 0 0 2-6.5" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 5.5h3" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /></> },
            sleep: { title: "Log sleep", sub: currentSleep ? getTimeSince(currentSleep.startTime ?? 0) : "Awake", dot: "var(--blue)", iconBg: "var(--sk)", icon: <><path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z" stroke="var(--blue)" strokeWidth="1.4" /><path d="M8 6v3l1.5 1" stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round" /></> },
            diaper: { title: "Diaper change", sub: recentDiapers.length > 0 ? getTimeSince(recentDiapers[recentDiapers.length - 1].timestamp) + " ago" : "No changes yet", dot: "var(--grn)", iconBg: "var(--sa)", icon: <><path d="M4 8c0-2 8-2 8 0s-.5 4.5-4 4.5S4 10 4 8z" stroke="var(--grn)" strokeWidth="1.4" /><path d="M8 8V5.5" stroke="var(--grn)" strokeWidth="1.4" strokeLinecap="round" /></> },
            tummy: { title: "Tummy time", sub: statsToday.tummyM > 0 ? `${statsToday.tummyM} min today` : "No session today", dot: "var(--purp)", iconBg: "var(--la)", icon: <><rect x="3" y="8" width="10" height="5.5" rx="2" stroke="var(--purp)" strokeWidth="1.4" /><path d="M6 8V6.5a2 2 0 0 1 4 0V8" stroke="var(--purp)" strokeWidth="1.4" /></> },
            bottle: { title: "Bottle feed", sub: statsToday.totalMl > 0 ? `${statsToday.totalMl} ml today` : "No bottle yet", dot: "var(--coral)", iconBg: "var(--pe)", icon: <><path d="M5 4v6a3 3 0 0 0 6 0V4M6 3h2" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /></> },
            pump: { title: "Pump", sub: "Log session", dot: "var(--pink)", iconBg: "var(--med-bg)", icon: <><rect x="7" y="2" width="4" height="14" rx="2" stroke="var(--pink)" strokeWidth="1.5" /><rect x="2" y="7" width="14" height="4" rx="2" stroke="var(--pink)" strokeWidth="1.5" /></> },
            health: { title: "Health", sub: "Temperature, symptoms, meds", dot: "#e87474", iconBg: "color-mix(in srgb, #e87474 25%, var(--card))", icon: <><path d="M8 2v3M8 11v3M5 5l2.5 2.5M10.5 10.5L8 13M5 11L7.5 8.5M10.5 6.5L8 4" stroke="#e87474" strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="8" r="2.5" stroke="#e87474" strokeWidth="1.4" fill="none" /></> },
            solids: { title: "Solids", sub: "First tastes & reactions", dot: "#7ab87a", iconBg: "color-mix(in srgb, #7ab87a 25%, var(--card))", icon: <><path d="M4 10h8M6 8v4M10 8v4" stroke="#7ab87a" strokeWidth="1.4" strokeLinecap="round" /><ellipse cx="8" cy="6" rx="3" ry="2" stroke="#7ab87a" strokeWidth="1.4" fill="none" /></> },
            activity: { title: "Activity", sub: statsToday.activityM > 0 ? `${statsToday.activityM}m play` : "Play, walk, bath…", dot: "#f5a623", iconBg: "color-mix(in srgb, #f5a623 25%, var(--card))", icon: <><path d="M8 3l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 3z" stroke="#f5a623" strokeWidth="1.4" fill="none" strokeLinejoin="round" /></> },
          };
          const headerClass = "w-full rounded-[18px] p-4 pt-3.5 pb-3.5 text-center border relative transition-colors";
          const renderButton = (drawerType: typeof LOG_PAGES[number][number]) => {
            const isOpen = openDrawer === drawerType;
            const L = labels[drawerType];
            const headerStyle: CSSProperties = {
              background: isOpen ? "var(--card2)" : "var(--card)",
              borderColor: "var(--bd)",
              borderWidth: "1.5px",
              borderBottomLeftRadius: isOpen ? 0 : 18,
              borderBottomRightRadius: isOpen ? 0 : 18,
              borderBottomStyle: isOpen ? "none" : "solid",
            };
            const headerContent = (
              <>
                {!isOpen && <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full" style={{ background: L.dot }} aria-hidden />}
                <div className="w-9 h-9 mx-auto mb-1.5 rounded-full flex items-center justify-center" style={{ background: L.iconBg }}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">{L.icon}</svg>
                </div>
                <div className="text-[14px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{L.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{L.sub}</div>
              </>
            );
            return (
              <button key={drawerType} type="button" onClick={() => setOpenDrawer(drawerType)} className={headerClass} style={headerStyle}>{headerContent}</button>
            );
          };
          const handleScroll = () => {
            const el = logCarouselRef.current;
            if (!el) return;
            const page = Math.round(el.scrollLeft / el.clientWidth);
            setLogPageIndex(Math.min(page, LOG_PAGES.length - 1));
          };
          const goToPage = (i: number) => {
            setLogPageIndex(i);
            logCarouselRef.current?.scrollTo({ left: i * (logCarouselRef.current?.clientWidth ?? 0), behavior: "smooth" });
          };
          return (
            <div className="mb-2.5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => goToPage(Math.max(0, logPageIndex - 1))} className="p-2 rounded-full border flex-shrink-0" style={{ borderColor: "var(--bd)", background: "var(--card)" }} aria-label="Previous page">
                  <ChevronLeft className="w-5 h-5" style={{ color: "var(--tx)" }} />
                </button>
                <div
                  ref={logCarouselRef}
                  className="flex overflow-x-auto gap-0 flex-1 min-w-0 snap-x snap-mandatory scroll-smooth"
                  style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                  onScroll={handleScroll}
                  onTouchStart={(e) => { logTouchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const dx = e.changedTouches[0].clientX - logTouchStartX.current;
                    if (Math.abs(dx) > 50) goToPage(dx > 0 ? Math.max(0, logPageIndex - 1) : Math.min(LOG_PAGES.length - 1, logPageIndex + 1));
                  }}
                >
                  {LOG_PAGES.map((pageTypes, pageIdx) => (
                    <div key={pageIdx} className="flex-shrink-0 w-full grid gap-2 px-0.5 snap-start" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      {pageTypes.map((drawerType) => renderButton(drawerType))}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => goToPage(Math.min(LOG_PAGES.length - 1, logPageIndex + 1))} className="p-2 rounded-full border flex-shrink-0" style={{ borderColor: "var(--bd)", background: "var(--card)" }} aria-label="Next page">
                  <ChevronRight className="w-5 h-5" style={{ color: "var(--tx)" }} />
                </button>
              </div>
              <div className="flex justify-center gap-1.5 mt-2" aria-hidden="true">
                {LOG_PAGES.map((_, i) => (
                  <button key={i} type="button" onClick={() => goToPage(i)} className="w-2.5 h-2.5 rounded-full transition-all duration-200" style={{ background: i === logPageIndex ? "var(--pink)" : "var(--bd)", opacity: i === logPageIndex ? 1 : 0.5 }} aria-label={`Log page ${i + 1}`} />
                ))}
              </div>
              {/* Open drawer panel (full width below carousel) */}
              {openDrawer && (
                <div className="mt-2">
                  <div className={headerClass} style={{ background: "var(--card2)", borderColor: "var(--bd)", borderWidth: "1.5px", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomStyle: "solid" }}>
                    <button type="button" onClick={() => setOpenDrawer(null)} className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center border" style={{ background: "var(--bg2)", borderColor: "var(--bd)", color: "var(--tx)" }} aria-label="Close">
                      <X className="w-5 h-5" strokeWidth="2" />
                    </button>
                    <div className="w-9 h-9 mx-auto mb-1.5 rounded-full flex items-center justify-center" style={{ background: labels[openDrawer].iconBg }}>
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">{labels[openDrawer].icon}</svg>
                    </div>
                    <div className="text-[14px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{labels[openDrawer].title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{labels[openDrawer].sub}</div>
                  </div>
                  {openDrawer === "health" && <HealthLogDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); setOpenDrawer(null); }} />}
                  {openDrawer === "solids" && <SolidFoodDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); setOpenDrawer(null); }} />}
                  {openDrawer === "activity" && <ActivityDrawer onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); setOpenDrawer(null); }} />}
                  {openDrawer !== "health" && openDrawer !== "solids" && openDrawer !== "activity" && <LogDrawer type={openDrawer} onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); setOpenDrawer(null); }} session={session} />}
                </div>
              )}
            </div>
          );
        })()}

        {/* Custom trackers */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium" style={{ color: "var(--mu)" }}>Custom trackers</span>
            <button
              type="button"
              onClick={() => setShowCreateTrackerSheet(true)}
              className="text-[13px] font-medium flex items-center gap-1"
              style={{ color: "var(--pink)" }}
            >
              <Plus className="w-4 h-4" /> Add tracker
            </button>
          </div>
          {customTrackers.length === 0 ? (
            <p className="text-[13px] py-2" style={{ color: "var(--mu)" }}>Track anything — vitamins, medicine, etc.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {customTrackers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCustomTrackerDrawerId(t.id)}
                  className="rounded-xl border py-2.5 px-3 flex items-center gap-2 min-h-[44px]"
                  style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                >
                  <span className="text-lg" aria-hidden>{getIconEmoji(t.icon)}</span>
                  <span className="text-[14px] font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          )}
          {customTrackerDrawerId && (() => {
            const tracker = customTrackers.find((t) => t.id === customTrackerDrawerId);
            if (!tracker) return null;
            return (
              <div className="mt-2 rounded-[18px] border overflow-hidden" style={{ borderColor: "var(--bd)", background: "var(--card2)" }}>
                <CustomTrackerDrawer
                  tracker={tracker}
                  onClose={() => setCustomTrackerDrawerId(null)}
                  onSaved={() => { loadLocalDataRef.current(); setCustomTrackerDrawerId(null); setTimelineRefreshKey((k) => k + 1); }}
                />
              </div>
            );
          })()}
        </div>

        {showCreateTrackerSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowCreateTrackerSheet(false)}>
            <div className="w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col border" style={{ background: "var(--card)", borderColor: "var(--bd)" }} onClick={(e) => e.stopPropagation()}>
              <CreateCustomTrackerSheet
                onClose={() => setShowCreateTrackerSheet(false)}
                onSaved={() => { setCustomTrackers(getCustomTrackers()); setShowCreateTrackerSheet(false); }}
              />
            </div>
          </div>
        )}

        {/* Mum — You matter too */}
        <Link
          to="/mum"
          className="block w-full rounded-xl border py-3.5 px-4 flex flex-col items-center justify-center gap-0.5 mb-3"
          style={{ borderColor: "var(--pink)", background: "color-mix(in srgb, var(--pink) 12%, var(--card))", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
        >
          <span className="text-[15px] font-medium">You matter too</span>
          <span className="text-[12px]" style={{ color: "var(--mu)" }}>Recovery · pelvic floor · mood check</span>
        </Link>

        {/* Leaving now — handoff card */}
        <button
          type="button"
          onClick={() => { setHandoffSheetOpen(true); setHandoffGeneratedUrl(null); }}
          className="w-full rounded-xl border py-3.5 px-4 flex items-center justify-center gap-2 mb-3"
          style={{ borderColor: "var(--ro)", background: "color-mix(in srgb, var(--coral) 12%, var(--card))", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
        >
          <LogOut className="w-5 h-5" style={{ color: "var(--coral)" }} />
          <span className="text-[15px] font-medium">Leaving now</span>
        </button>

        {handoffSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setHandoffSheetOpen(false)}>
            <div className="w-full max-w-lg rounded-t-2xl p-6 pb-10 border-t max-h-[85vh] overflow-y-auto" style={{ background: "var(--card)", borderColor: "var(--bd)" }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-medium mb-4" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Caregiver handoff</h3>
              {handoffGeneratedUrl == null ? (
                <>
                  <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Heads up</label>
                  <textarea value={handoffHeadsUp} onChange={(e) => setHandoffHeadsUp(e.target.value)} placeholder="Anything they should know? e.g. she's been fussy, try white noise" rows={3} className="w-full rounded-lg border px-3 py-2.5 mb-3 text-[15px] resize-none" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
                  <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Caregiver's name</label>
                  <input type="text" value={handoffCaregiverName} onChange={(e) => setHandoffCaregiverName(e.target.value)} placeholder="Who's taking over?" className="w-full rounded-lg border px-3 py-2.5 mb-4 text-[15px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
                  <Button type="button" onClick={async () => {
                    setHandoffGenerating(true);
                    try {
                      const babyName = activeBaby?.name?.trim() || babyProfile?.name?.trim() || "Baby";
                      const handoffSession = generateHandoffSession(babyName, handoffHeadsUp.trim() || null);
                      if (session?.access_token) await saveHandoffSessionToServer(handoffSession, session.access_token).catch(() => {});
                      setHandoffGeneratedUrl(getHandoffShareUrl(handoffSession));
                      toast.success("Handoff card ready — share the link");
                    } finally {
                      setHandoffGenerating(false);
                    }
                  }} disabled={handoffGenerating} className="w-full min-h-[48px]" style={{ background: "var(--coral)" }}>{handoffGenerating ? "Generating…" : "Generate handoff card"}</Button>
                </>
              ) : (
                <>
                  <p className="text-[13px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Share this link with the caregiver (WhatsApp, iMessage, etc.)</p>
                  <div className="flex gap-2 mb-3">
                    <input type="text" readOnly value={handoffGeneratedUrl} className="flex-1 rounded-lg border px-3 py-2.5 text-[13px] bg-[var(--bg2)]" style={{ borderColor: "var(--bd)", color: "var(--tx)" }} />
                    <Button type="button" onClick={() => { navigator.clipboard?.writeText(handoffGeneratedUrl ?? ""); toast.success("Link copied"); }} className="shrink-0">Copy link</Button>
                  </div>
                  {typeof navigator !== "undefined" && navigator.share && (
                    <Button type="button" variant="outline" onClick={() => navigator.share({ title: "Handoff", text: "Baby handoff card", url: handoffGeneratedUrl ?? "" }).catch(() => {})} className="w-full mb-2">Share via…</Button>
                  )}
                  <button type="button" onClick={() => setHandoffSheetOpen(false)} className="w-full py-2.5 text-sm" style={{ color: "var(--mu)" }}>Done</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Time capsule: show-back first (priority), then prompt to write */}
        {babyProfile?.birthDate && (() => {
          const birthMs = new Date(babyProfile.birthDate).getTime();
          const ageInWeeks = (Date.now() - birthMs) / (7 * 24 * 60 * 60 * 1000);
          const showBack = getTimeCapsuleShowBack(ageInWeeks);
          const trigger = getTimeCapsuleTrigger(ageInWeeks);
          if (showBack) {
            return (
              <TimeCapsuleShowBackCard
                key={`${showBack.id}-${timeCapsuleKey}`}
                entry={showBack}
                onDismiss={() => setTimeCapsuleKey((k) => k + 1)}
              />
            );
          }
          if (trigger) return <TimeCapsulePromptCard key="tc-prompt" trigger={trigger} />;
          return null;
        })()}

        {/* Mum's wellbeing (Prompt 6) */}
        <WellbeingCard />

        {/* Pain relief card (example med-card style) */}
        <div
          className="rounded-2xl border p-4 mb-3 flex items-center gap-4"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--med-bg)" }}>
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <rect x="7" y="2" width="4" height="14" rx="2" stroke="var(--pink)" strokeWidth="1.5" />
              <rect x="2" y="7" width="14" height="4" rx="2" stroke="var(--pink)" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Pain relief</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {lastPainkiller
                ? `Last taken: ${format(new Date(lastPainkiller.timestamp), "dd/MM/yyyy")} at ${format(new Date(lastPainkiller.timestamp), "HH:mm")}`
                : "No doses logged yet"}
            </div>
          </div>
          <button
            type="button"
            onClick={logPainkiller}
            className="py-2.5 px-4 rounded-[20px] text-[13px] font-medium border-none cursor-pointer flex-shrink-0 min-h-[44px]"
            style={{ background: "var(--med-bg)", color: "var(--med-col)", fontFamily: "system-ui, sans-serif" }}
          >
            Log it
          </button>
        </div>

        {/* Stats bar: 5 pills, tap opens Today timeline filtered (Prompt 9) */}
        <div
          className="sticky bottom-[72px] z-10 flex gap-2 mb-4 py-3 -mx-4 px-4 border-t"
          style={{ background: "var(--bg)", borderColor: "var(--bd)" }}
        >
          <button type="button" onClick={() => { setTodayFilter("feed"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--coral) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.feeds}</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>feeds</span>
            {statsToday.totalMl > 0 && <span className="text-[11px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{statsToday.totalMl} ml</span>}
          </button>
          <button type="button" onClick={() => { setTodayFilter("sleep"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--blue) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.sleepH}</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>sleep</span>
          </button>
          <button type="button" onClick={() => { setTodayFilter("diaper"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--grn) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.diapers}</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>diapers</span>
          </button>
          <button type="button" onClick={() => { setTodayFilter("tummy"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--purp) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.tummyM}m</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>tummy</span>
          </button>
          <button type="button" onClick={() => setTodayModalOpen(true)} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, #f5a623 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.activityM}m</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>play</span>
          </button>
          <button type="button" onClick={() => { setTodayFilter("feed"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "var(--stat-bg)", borderColor: "var(--bd)" }} title="Last feed side">
            <span className="text-[26px] font-serif flex items-center gap-0.5" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
              {getLastFeedSide() === "left" ? "L" : getLastFeedSide() === "right" ? "R" : "—"}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80"><path d="M8 3v2.5M6 3.5A3 3 0 0 0 8 10a3 3 0 0 0 2-6.5" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 5.5h3" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>last side</span>
          </button>
        </div>

        {familyId && !activeFeedingSession && !lastFeeding && recentDiapers.length === 0 && !currentSleep && !lastPainkiller && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm space-y-1">
            <p>No shared logs yet. Ask the inviter to open Settings and tap &quot;Sync my data to family&quot;.</p>
            {lastDataDebug?.familyId != null && (
              <p className="text-xs opacity-90 mt-1">Your familyId: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">{lastDataDebug.familyId}</code></p>
            )}
            {lastDataDebug?.rowsReturned === 0 && (
              <p className="text-xs opacity-90">Server has 0 rows for this family — inviter must sync first.</p>
            )}
          </div>
        )}

        {/* Nursery Essentials Shopping List (accordion, closed by default) */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setNurseryEssentialsOpen((o) => !o)}
            className="w-full flex items-center gap-2 p-4 sm:p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-pink-500 dark:text-pink-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-medium dark:text-white flex-1">Nursery Essentials</h2>
            {shoppingList.filter((i) => !i.checked).length > 0 && (
              <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-full px-2 py-0.5">
                {shoppingList.filter((i) => !i.checked).length} left
              </span>
            )}
            <span className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${nurseryEssentialsOpen ? "rotate-180" : ""}`}>
              <ChevronDown className="w-5 h-5" />
            </span>
          </button>

          {nurseryEssentialsOpen && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-gray-100 dark:border-gray-700">
              {/* Quick-add chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {QUICK_ADD_ITEMS.map(({ emoji, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => addShoppingItem(label)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:border-pink-400 hover:bg-pink-50 dark:hover:border-pink-500 dark:hover:bg-pink-900/30 transition-colors"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex gap-2 mb-4">
            <Input
              value={shoppingInput}
              onChange={(e) => setShoppingInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleShoppingInputAdd(); }}
              placeholder="Add a custom item…"
              className="flex-1"
            />
            <Button
              onClick={handleShoppingInputAdd}
              size="icon"
              variant="outline"
              className="shrink-0 border-pink-300 text-pink-600 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/30"
              disabled={!shoppingInput.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* List */}
          {shoppingList.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
              Tap a chip above or type a custom item to start your list.
            </p>
          ) : (
            <ul className="space-y-1">
              {shoppingList.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleShoppingItem(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.checked
                        ? "bg-pink-500 border-pink-500"
                        : "border-gray-300 dark:border-gray-500 hover:border-pink-400"
                    }`}
                  >
                    {item.checked && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span
                    className={`flex-1 text-sm transition-colors ${
                      item.checked
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeShoppingItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-0.5 rounded"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {shoppingList.some((i) => i.checked) && (
            <button
              type="button"
              onClick={() => {
                const updated = shoppingList.filter((i) => !i.checked);
                setShoppingList(updated);
                persistShoppingList(updated);
              }}
              className="mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear checked items
            </button>
          )}
            </div>
          )}
        </div>

        {hasBabyProfile && (
          <Link to="/journey" className="block mt-4">
            <div
              className="rounded-2xl p-5 border flex items-center justify-between min-h-[72px]"
              style={{ background: "var(--card)", borderColor: "var(--bd)" }}
            >
              <div>
                <h2 className="text-lg font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                  {babyProfile?.name ? `${babyProfile.name}'s story` : "Journey"}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                  Milestones & how they&apos;re doing
                </p>
              </div>
              <span className="text-base font-medium" style={{ color: "var(--pink)" }}>View →</span>
            </div>
          </Link>
        )}
        </div>
      </div>

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

      {articleModalId && (() => {
        const content = loadArticle(articleModalId);
        return content ? (
          <ArticleModal
            article={content}
            onClose={() => setArticleModalId(null)}
          />
        ) : null;
      })()}

      {/* Ask Cradl — floating button (premium: open sheet; free: open sheet which shows paywall) */}
      <button
        type="button"
        onClick={() => setAskCradlOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg flex items-center gap-2 py-2.5 px-4 min-h-[44px] min-w-[44px]"
        style={{ background: "var(--pink)", color: "white" }}
        aria-label="Ask Cradl"
      >
        <MessageCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-[14px] font-medium hidden sm:inline">Ask</span>
      </button>

      {askCradlOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setAskCradlOpen(false)}>
          <div className="w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col border" style={{ background: "var(--card)", borderColor: "var(--bd)" }} onClick={(e) => e.stopPropagation()}>
            <AskCradlSheet
              onClose={() => setAskCradlOpen(false)}
              babyAgeWeeks={ageInWeeksForArticles}
              recentContext={{
                lastFeedHoursAgo: lastFeeding ? (Date.now() - (lastFeeding.endTime ?? lastFeeding.timestamp)) / (60 * 60 * 1000) : null,
                lastSleepHoursAgo: currentSleep ? (Date.now() - (currentSleep.startTime ?? 0)) / (60 * 60 * 1000) : null,
                lastDiaperHoursAgo: recentDiapers.length > 0 ? (Date.now() - recentDiapers[recentDiapers.length - 1].timestamp) / (60 * 60 * 1000) : null,
                currentAlerts: computeWarnings({
                  feedingHistory,
                  sleepHistory,
                  diaperHistory,
                  tummyTimeHistory,
                  painkillerHistory: readStoredArray<{ id: string; timestamp: number }>("painkillerHistory"),
                  thresholds: readAlertThresholds(),
                  feedingIntervalHours: readFeedingInterval(),
                }),
                recentSymptoms: getSymptomHistory().slice(0, 5).flatMap((s) => s.symptoms ?? []),
              }}
              accessToken={session?.access_token ?? null}
            />
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
