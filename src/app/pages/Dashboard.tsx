import { useEffect, useMemo, useRef, useState } from "react";
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
import { PainReliefCard } from "../components/PainReliefCard";
import { DailyGoodEnoughCard } from "../components/DailyGoodEnoughCard";
import { LeapWarningBanner } from "../components/LeapWarningBanner";
import { HandoffCardCompact } from "../components/HandoffCardCompact";
import { AppointmentsSection } from "../components/AppointmentsSection";
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
import { useFeedTimer } from "../contexts/FeedTimerContext";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import { getGreeting } from "../utils/personalAddress";
import { isNightHours, getNightMessage } from "../utils/nightMode";
import { BreathingExerciseModal } from "../components/BreathingExerciseModal";
import { ReturnToWorkCountdown } from "../components/ReturnToWorkCountdown";
import { BabySwitcher } from "../components/BabySwitcher";
import { getLastFeedSide } from "../utils/lastFeedSideStorage";
import { getSweetSpotPrediction } from "../utils/napPrediction";
import { generateCryingReasons } from "../utils/cryingDiagnostic";
import { getCustomTrackers, getLogsForTracker } from "../utils/customTrackerStorage";
import { getIconDisplay } from "../data/customTrackerIcons";
import { readStoredArray } from "../utils/warningUtils";
import { loadAllDataFromServer, saveData, clearSyncedDataFromLocalStorage, SYNCED_DATA_KEYS, SYNCED_DATA_DEFAULTS } from "../utils/dataSync";
import { requestNotificationPermission, scheduleNotification } from "../utils/notifications";
import { scheduleNextMedicationReminder } from "../utils/medicationReminderScheduler";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { detectSleepRegression } from "../utils/sleepRegression";
import { generateReadinessCards } from "../utils/readinessUtils";
import { formatTimeAndAgo, TIME_DISPLAY } from "../utils/dateUtils";
import { buildActiveTriggers, checkArticleTriggers } from "../utils/articleTrigger";
import { ContextualArticleCard } from "../components/ContextualArticleCard";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BottleRecord, PainkillerDose, ActiveFeedingSession, BabyProfile, TimelineEvent } from "../types";
import { generateInsights, type Insight } from "../utils/insights";
import { HealthHistorySection } from "../components/HealthHistorySection";
import { ColicSection } from "../components/ColicSection";
import type { CustomTrackerDefinition } from "../types/customTracker";
import { syncWidgetData } from "../plugins/CapacitorBridge";

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

const LOG_ITEMS = [
  { type: "feed" as const, label: "Feed", color: "#c05030" },
  { type: "sleep" as const, label: "Sleep", color: "#4080a0" },
  { type: "diaper" as const, label: "Nappy", color: "#4a8a4a" },
  { type: "tummy" as const, label: "Tummy", color: "#7a4ab4" },
  { type: "bottle" as const, label: "Bottle", color: "#c05030" },
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

export function Dashboard() {
  const [sleepHistory, setSleepHistory] = useState<SleepRecord[]>([]);
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [diaperHistory, setDiaperHistory] = useState<DiaperRecord[]>([]);
  const [tummyTimeHistory, setTummyTimeHistory] = useState<TummyTimeRecord[]>([]);
  const [bottleHistory, setBottleHistory] = useState<BottleRecord[]>([]);
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [lastFeeding, setLastFeeding] = useState<FeedingRecord | null>(null);
  const [lastPainkiller, setLastPainkiller] = useState<PainkillerDose | null>(null);
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [todayFilter, setTodayFilter] = useState<"feed" | "sleep" | "diaper" | "tummy" | null>(null);
  const [editEvent, setEditEvent] = useState<TimelineEvent | null>(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [customTrackers, setCustomTrackers] = useState<CustomTrackerDefinition[]>([]);
  const [customTrackerDrawerId, setCustomTrackerDrawerId] = useState<string | null>(null);
  const [showCreateTrackerSheet, setShowCreateTrackerSheet] = useState(false);
  const [showMoreDrawers, setShowMoreDrawers] = useState(false);
  const [statsToday, setStatsToday] = useState({ feeds: 0, sleepH: "0h", diapers: 0, tummyM: 0, totalMl: 0 });
  const [showBreathingModal, setShowBreathingModal] = useState(false);


  const nightMode = isNightHours();

  const { user, session, loading, familyId } = useAuth();
  const { isPremium } = usePremium();
  const { activeBaby } = useBaby();
  const feedTimer = useFeedTimer();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const babyProfile: BabyProfile | null = activeBaby
    ? { birthDate: activeBaby.birthDate, name: activeBaby.name, parentName: activeBaby.parentName, photoDataUrl: activeBaby.photoDataUrl, weight: activeBaby.weight, height: activeBaby.height }
    : null;

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

  useEffect(() => {
    if (!user || !session) { loadLocalData(); return; }
    if (familyId) {
      loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
        if (ok && Object.keys(data).length > 0) {
          clearSyncedDataFromLocalStorage();
          Object.entries(data).forEach(([k, v]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} });
          for (const key of SYNCED_DATA_KEYS) { if (!(key in data)) try { localStorage.setItem(key, JSON.stringify(SYNCED_DATA_DEFAULTS[key])); } catch {} }
        }
        loadLocalDataRef.current();
      });
    }
    requestNotificationPermission();
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
  }, [searchParams]);

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
    const remaining = 8 * 3600000 - 0;
    if (remaining > 0) scheduleNotification("Painkiller reminder", "It has been 8 hours since your last dose.", remaining);
    toast.success("Dose logged");
  };

  const prediction = useMemo(
    () => getSweetSpotPrediction(sleepHistory, babyProfile?.birthDate ?? null),
    [sleepHistory, babyProfile?.birthDate]
  );

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

  const insights = useMemo<Insight[]>(() => {
    try {
      return generateInsights({
        sleepHistory, feedingHistory, diaperHistory,
        tummyHistory: tummyTimeHistory, bottleHistory,
        babyProfile: babyProfile ?? null, ageInWeeks: ageInWeeks ?? 0,
      }).slice(0, 3);
    } catch { return []; }
  }, [sleepHistory, feedingHistory, diaperHistory, tummyTimeHistory, bottleHistory, babyProfile, ageInWeeks]);

  const notices = useMemo<NoticeCard[]>(() => {
    const cards: NoticeCard[] = [];
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= todayStart);
    const weekAgo = Date.now() - 7 * 86400000;
    const weekFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= weekAgo);
    const avgDailyFeeds = weekFeeds.length > 0 ? weekFeeds.length / 7 : 0;

    if (todayFeeds.length > avgDailyFeeds * 1.3 && todayFeeds.length >= 3 && avgDailyFeeds > 0) {
      cards.push({
        id: "more-feeds", color: "amber",
        title: "More feeds than usual today",
        body: `${todayFeeds.length} feeds so far vs ${Math.round(avgDailyFeeds)} average. Could be a growth spurt, or she may just be hungrier than usual — both are normal.`,
      });
    }

    const recentSleeps = sleepHistory.filter((s) => s.endTime && s.endTime >= weekAgo);
    if (recentSleeps.length >= 3) {
      const avgDur = recentSleeps.reduce((s, r) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0) / recentSleeps.length;
      if (avgDur < 40 * 60000 && avgDur > 0) {
        cards.push({
          id: "short-naps", color: "amber",
          title: "Short naps — she may be overtired going down",
          body: `Average nap is ${Math.round(avgDur / 60000)} minutes this week. Try putting her down 10 minutes earlier.`,
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
        cards.push({
          id: "feed-spacing", color: "green",
          title: "Feeds spacing out — a good sign",
          body: `Average ${Math.round(avgGap)} minutes between feeds today. She's settling into a rhythm.`,
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
  }, [feedingHistory, sleepHistory, ageInWeeks, babyProfile?.birthDate]);

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
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", color: "#9a8080", fontFamily: F, fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  const sharedModals = (
    <>
      {openDrawer && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setOpenDrawer(null)}
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
              <LogDrawer type={openDrawer as "feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump"} onClose={() => setOpenDrawer(null)} onSaved={() => { loadLocalDataRef.current(); syncWidgetData(); setOpenDrawer(null); }} onSwitchType={(t) => setOpenDrawer(t as DrawerType)} session={session} />
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
      const t = f.endTime ?? f.timestamp ?? 0;
      if (t >= todayStart) timelineEvents.push({ time: format(t, TIME_DISPLAY()), desc: "Feed", color: "#c05030" });
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
      { type: "feed", label: "Feed", sub: lastFeeding ? formatTimeAndAgo(lastFeeding.endTime ?? lastFeeding.timestamp).ago : "—", bg: "#feeae4", color: "#c05030" },
      { type: "sleep", label: "Sleep", sub: currentSleep ? "Now" : "Awake", bg: "#e4eef8", color: "#4080a0" },
      { type: "diaper", label: "Nappy", sub: `${statsToday.diapers} today`, bg: "#e4f4e4", color: "#4a8a4a" },
      { type: "tummy", label: "Tummy", sub: `${statsToday.tummyM}m`, bg: "#f0eafe", color: "#7a4ab4" },
      { type: "bottle", label: "Bottle", sub: statsToday.totalMl > 0 ? `${statsToday.totalMl}ml` : "—", bg: "#feeae4", color: "#c05030" },
      { type: "health", label: "Health", sub: "Log", bg: "#ffd4c8", color: "#c05030" },
      { type: "pump", label: "Pump", sub: "Log", bg: "#f4ece8", color: "#9a7060" },
      { type: "solids", label: "Solids", sub: "Log", bg: "#e8f4e0", color: "#4a8a4a" },
    ];

    const nm = nightMode;
    const dBg = nm ? "rgba(255,255,255,0.06)" : "#fff";
    const dBd = nm ? "rgba(255,255,255,0.1)" : "#ede0d4";
    const dTx = nm ? "rgba(255,255,255,0.85)" : "#2c1f1f";
    const dMu = nm ? "rgba(255,255,255,0.4)" : "#9a8080";

    const leftColumn = (
      <>
        {/* Night companion hero (desktop) */}
        {nm && (
          <div style={{
            padding: "20px 16px", marginBottom: 12, borderRadius: 14, textAlign: "center",
            background: "linear-gradient(135deg, #1a1428, #1e1832)",
            border: "1px solid rgba(196,160,212,0.2)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", margin: "0 auto 12px",
              background: "radial-gradient(circle, rgba(196,160,212,0.3), rgba(122,179,212,0.15))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(196,160,212,0.8)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.9)", marginBottom: 14 }}>
              {getNightMessage()}
            </div>
            <button type="button" onClick={() => setShowBreathingModal(true)} style={{
              background: "rgba(196,160,212,0.2)", border: "1px solid rgba(196,160,212,0.3)",
              borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 600,
              color: "rgba(255,255,255,0.85)", cursor: "pointer", fontFamily: F,
            }}>
              I need a moment
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
              {getGreeting(babyProfile?.parentName ?? null, babyProfile?.name ?? null, new Date().getHours())}
              <BabySwitcher />
            </div>
            <div style={{ fontSize: 12, color: dMu }}>{babyProfile?.name ?? "Baby"} · {ageStr || "add birth date"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {statPill(statsToday.feeds, "Feeds", "#c05030")}
          {statPill(statsToday.sleepH, "Sleep", "#4080a0")}
          {statPill(statsToday.diapers, "Nappies", "#4a8a4a")}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {statPill(getLastFeedSide() === "left" ? "L" : getLastFeedSide() === "right" ? "R" : "—", "Side", "#9a7060")}
          {statPill(`${statsToday.tummyM}m`, "Tummy", "#7a4ab4")}
          {statPill(awakeTimeSince, "Awake", "#b08040")}
        </div>
        <LocalErrorBoundary>
          <SleepSweetSpot prediction={prediction} onStartSleep={() => setOpenDrawer("sleep")} babyName={babyProfile?.name} compact />
        </LocalErrorBoundary>
        <IfUnsettledCard reasons={unsettledReasons} compact nightMode={nm} />
        <LocalErrorBoundary>
          <ColicSection ageInWeeks={ageInWeeks ?? 0} compact />
        </LocalErrorBoundary>
        <LocalErrorBoundary>
          <PainReliefCard hoursSinceLastDose={hoursSinceLastDose} onLog={logPainkiller} compact />
        </LocalErrorBoundary>

        {/* Handoff card */}
        <LocalErrorBoundary>
          <HandoffCardCompact />
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
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f" }}>I need a moment</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>60-second breathing exercise</div>
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

        {/* Leap warning */}
        <LocalErrorBoundary>
          <LeapWarningBanner />
        </LocalErrorBoundary>

        <div style={dLabel}>Log</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          {logButtons.map((btn) => (
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
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={dLabel}>Custom trackers</span>
          <span onClick={() => setShowCreateTrackerSheet(true)} style={{ fontSize: 12, fontWeight: 600, color: nm ? "rgba(196,160,212,0.8)" : "#d4604a", cursor: "pointer" }}>+ Add</span>
        </div>
        <div style={dSmall}>
          {customTrackers.length === 0 ? (
            <div style={{ fontSize: 13, color: dMu }}>Track anything — vitamins, medicine, etc.</div>
          ) : (
            customTrackers.map((t) => {
              const logs = getLogsForTracker(t.id);
              const lastLog = logs.length > 0 ? logs[0] : null;
              const lastAgo = lastLog ? formatTimeAndAgo(lastLog.timestamp).ago : null;
              return (
                <div key={t.id} onClick={() => setCustomTrackerDrawerId(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4604a", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: dTx }} className="inline-flex items-center gap-1">{getIconDisplay(t.icon)} {t.name}</span>
                    {lastAgo && <span style={{ fontSize: 12, color: dMu, marginLeft: 6 }}>{lastAgo}</span>}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setCustomTrackerDrawerId(t.id); }} style={{ fontSize: 12, fontWeight: 600, color: nm ? "rgba(196,160,212,0.8)" : "#d4604a", background: "none", border: "none", cursor: "pointer" }}>Log</button>
                </div>
              );
            })
          )}
        </div>
        <div style={dLabel}>Today&apos;s timeline</div>
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
          {recentTimeline.length === 0 && <div style={{ fontSize: 13, color: dMu, padding: "6px 0" }}>No events logged today</div>}
        </div>

        {/* Pattern insights */}
        <div style={{ ...dSmall, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: dTx, fontFamily: "Georgia, serif", marginBottom: 8 }}>Patterns</div>
          {insights.length === 0 ? (
            <div style={{ fontSize: 11, color: dMu, fontFamily: F, lineHeight: 1.5 }}>
              Keep logging for a few days and Cradl will spot patterns like
              &ldquo;longest sleeps follow 20+ min feeds&rdquo;. The more you log, the smarter this gets.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.map((ins) => (
                <div key={ins.id} style={{ padding: "8px 10px", borderRadius: 10, background: nm ? "rgba(255,255,255,0.04)" : "#faf7f4", border: `1px solid ${nm ? "rgba(255,255,255,0.06)" : "#f0ece4"}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: dTx, fontFamily: F, marginBottom: 2 }}>{ins.message}</div>
                  {ins.detail && <div style={{ fontSize: 10, color: dMu, fontFamily: F, lineHeight: 1.4 }}>{ins.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <LocalErrorBoundary>
          <CradlNoticedSection notices={notices} compact />
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

    const rightColumn = (
      <>
        <LocalErrorBoundary>
          <AppointmentsSection />
        </LocalErrorBoundary>

        {/* Health history section */}
        <div style={{ margin: "8px 0" }}>
          <LocalErrorBoundary>
            <HealthHistorySection />
          </LocalErrorBoundary>
        </div>

        {/* Return to work countdown */}
        <LocalErrorBoundary>
          <ReturnToWorkCountdown />
        </LocalErrorBoundary>

        {notices.length > 0 && (
          <>
            <div style={dLabel}>This week</div>
            {notices.slice(0, 1).map((n) => (
              <div
                key={n.id}
                style={{
                  borderLeft: `3px solid ${noticeColor(n.color)}`,
                  borderRadius: "0 12px 12px 0", padding: "12px 14px", marginBottom: 9,
                  background: dBg, borderTop: `1px solid ${dBd}`, borderBottom: `1px solid ${dBd}`, borderRight: `1px solid ${dBd}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: dTx, marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: dMu, lineHeight: 1.5 }}>{n.body}</div>
              </div>
            ))}
          </>
        )}
      </>
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
          {/* ── 3am companion hero ── */}
          <div style={{
            padding: "32px 20px 16px", textAlign: "center",
            background: "linear-gradient(180deg, #1a1428 0%, #110e1a 100%)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
              background: "radial-gradient(circle, rgba(196,160,212,0.3), rgba(122,179,212,0.15))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(196,160,212,0.8)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </div>
            <div style={{
              fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.6,
              color: "rgba(255,255,255,0.9)", maxWidth: 300, margin: "0 auto 20px",
            }}>
              {getNightMessage()}
            </div>
            <button
              type="button"
              onClick={() => setShowBreathingModal(true)}
              style={{
                background: "rgba(196,160,212,0.2)",
                border: "1px solid rgba(196,160,212,0.3)", borderRadius: 14,
                padding: "12px 24px", fontSize: 14, fontWeight: 600,
                color: "rgba(255,255,255,0.85)", cursor: "pointer",
                fontFamily: F, letterSpacing: 0.2,
              }}
            >
              I need a moment
            </button>
          </div>

          {/* Night-mode greeting (compact) */}
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
                {babyProfile?.name ?? "Baby"} <BabySwitcher />
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: F }}>
                {ageStr || "add birth date in settings"}
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
                {getGreeting(babyProfile?.parentName ?? null, babyProfile?.name ?? null, new Date().getHours())}
                <BabySwitcher />
              </div>
              <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: F }}>
                {babyProfile?.name ?? "Baby"} · {ageStr || "add birth date in settings"}
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

      {/* 3. Sleep sweet spot hero */}
      <LocalErrorBoundary>
      <SleepSweetSpot
        prediction={prediction}
        onStartSleep={() => setOpenDrawer("sleep")}
        babyName={babyProfile?.name}
      />
      </LocalErrorBoundary>

      {/* 3b. Leap warning */}
      <LocalErrorBoundary>
      <LeapWarningBanner />
      </LocalErrorBoundary>

      {/* 4. Why is she crying? */}
      <IfUnsettledCard reasons={unsettledReasons} nightMode={nightMode} />

      {/* 4b. Colic tracker */}
      <LocalErrorBoundary>
        <ColicSection ageInWeeks={ageInWeeks ?? 0} />
      </LocalErrorBoundary>

      {/* 5. Log section */}
      <div style={{ ...SECTION_LABEL, ...(nightMode ? { color: "rgba(255,255,255,0.35)" } : {}) }}>Log</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "0 12px 8px" }}>
        {LOG_ITEMS.map((item) => (
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
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: nightMode ? `color-mix(in srgb, ${item.color} 20%, transparent)` : `color-mix(in srgb, ${item.color} 15%, #fff)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {LOG_ICON_MAP[item.type]?.(item.color, 16)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: nightMode ? "rgba(255,255,255,0.8)" : "#2c1f1f" }}>{item.label}</div>
            <div style={{ fontSize: 10, color: nightMode ? "rgba(255,255,255,0.35)" : "var(--mu)" }}>
              {item.type === "feed" && (lastFeeding ? (() => { const { time, ago } = formatTimeAndAgo(lastFeeding.endTime ?? lastFeeding.timestamp); return `${time} · ${ago}`; })() : "No feed yet")}
              {item.type === "sleep" && (currentSleep ? "Sleeping now" : "Awake")}
              {item.type === "diaper" && `${statsToday.diapers} today`}
              {item.type === "tummy" && `${statsToday.tummyM}m today`}
              {item.type === "bottle" && (statsToday.totalMl > 0 ? `${statsToday.totalMl}ml` : "No bottle")}
            </div>
          </button>
        ))}
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
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f" }}>More</div>
          <div style={{ fontSize: 10, color: "var(--mu)" }}>pump · health</div>
        </button>
      </div>

      {showMoreDrawers && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowMoreDrawers(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 512, background: "#fff", borderRadius: "16px 16px 0 0", padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2c1f1f", marginBottom: 12, fontFamily: F }}>More log types</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {([
                { type: "pump" as const, label: "Pump", color: "#9a7060", bg: "#f4ece8" },
                { type: "health" as const, label: "Health", color: "#c05030", bg: "#ffd4c8" },
                { type: "solids" as const, label: "Solids", color: "#4a8a4a", bg: "#e8f4e0" },
                { type: "activity" as const, label: "Activity", color: "#b08040", bg: "#fef4e4" },
                { type: "spitup" as const, label: "Spit-up", color: "#9a8080", bg: "#f0ece8" },
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
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f" }}>{item.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowMoreDrawers(false)}
              style={{ width: "100%", padding: "10px 0", marginTop: 12, fontSize: 12, color: "var(--mu)", background: "none", border: "none", cursor: "pointer", fontFamily: F }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 6b. Handoff card */}
      <LocalErrorBoundary>
      <HandoffCardCompact />
      </LocalErrorBoundary>

      {/* 7. Custom trackers */}
      <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: F }}>Custom trackers</span>
          <span
            onClick={() => setShowCreateTrackerSheet(true)}
            style={{ fontSize: 11, fontWeight: 600, color: "#d4604a", cursor: "pointer", fontFamily: F }}
          >
            + Add
          </span>
        </div>
        {customTrackers.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: F }}>Track anything — vitamins, medicine, etc.</div>
        ) : (
          customTrackers.map((t) => {
            const logs = getLogsForTracker(t.id);
            const lastLog = logs.length > 0 ? logs[0] : null;
            const lastAgo = lastLog ? formatTimeAndAgo(lastLog.timestamp).ago : null;
            return (
              <div
                key={t.id}
                onClick={() => setCustomTrackerDrawerId(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4604a", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#2c1f1f", fontFamily: F }} className="inline-flex items-center gap-1">{getIconDisplay(t.icon)} {t.name}</span>
                  {lastAgo && <span style={{ fontSize: 10, color: "var(--mu)", fontFamily: F, marginLeft: 6 }}>{lastAgo}</span>}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCustomTrackerDrawerId(t.id); }}
                  style={{ fontSize: 10, fontWeight: 600, color: "#d4604a", background: "none", border: "none", cursor: "pointer", fontFamily: F }}
                >
                  Log
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 8. Cradl noticed */}
      <LocalErrorBoundary>
      <CradlNoticedSection notices={notices} />
      </LocalErrorBoundary>

      {/* 8b. Pattern insights */}
      <div style={{ ...CARD, ...(nightMode ? { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" } : {}) }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: nightMode ? "rgba(255,255,255,0.85)" : "#2c1f1f", fontFamily: "Georgia, serif", marginBottom: 8 }}>
          Patterns
        </div>
        {insights.length === 0 ? (
          <div style={{ fontSize: 11, color: nightMode ? "rgba(255,255,255,0.4)" : "var(--mu)", fontFamily: F, lineHeight: 1.5 }}>
            Keep logging for a few days and Cradl will spot patterns like
            "longest sleeps follow 20+ min feeds" or "nap quality drops after short tummy time".
            The more you log, the smarter this gets.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((ins) => (
              <div key={ins.id} style={{
                padding: "8px 10px", borderRadius: 10,
                background: nightMode ? "rgba(255,255,255,0.04)" : "#faf7f4",
                border: nightMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f0ece4",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: nightMode ? "rgba(255,255,255,0.8)" : "#2c1f1f", fontFamily: F, marginBottom: 2 }}>
                  {ins.message}
                </div>
                {ins.detail && (
                  <div style={{ fontSize: 10, color: nightMode ? "rgba(255,255,255,0.4)" : "var(--mu)", fontFamily: F, lineHeight: 1.4 }}>
                    {ins.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8c. Health history */}
      <div style={{ margin: "0 12px" }}>
        <LocalErrorBoundary>
          <HealthHistorySection />
        </LocalErrorBoundary>
      </div>

      {/* 9. Contextual articles */}
      {triggeredArticles.length > 0 && (
        <LocalErrorBoundary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "0 12px 8px" }}>
            {triggeredArticles.slice(0, 2).map((article) => (
              <ContextualArticleCard
                key={article.id}
                article={article}
                onDismiss={handleDismissArticle}
                onTap={() => navigate(`/library`)}
              />
            ))}
          </div>
        </LocalErrorBoundary>
      )}

      {/* 9b. Breathing button (always available) */}
      {!nightMode && (
        <div style={{ margin: "4px 12px 8px" }}>
          <button
            type="button"
            onClick={() => setShowBreathingModal(true)}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 14,
              background: "linear-gradient(135deg, #f0eef4, #f4ecf8)",
              border: "1px solid #e4d8ec", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              fontFamily: F,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(122,74,180,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h0" />
              </svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f" }}>I need a moment</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>60-second breathing exercise</div>
            </div>
          </button>
        </div>
      )}

      {/* 10. Calendar events */}
      <LocalErrorBoundary>
      <div style={SECTION_LABEL}>Today</div>
      <div style={CARD}>
        <AppointmentsSection />
      </div>
      </LocalErrorBoundary>

      {/* 12. Pain relief */}
      <LocalErrorBoundary>
      <PainReliefCard hoursSinceLastDose={hoursSinceLastDose} onLog={logPainkiller} />
      </LocalErrorBoundary>

      {sharedModals}
    </div>
  );
}
