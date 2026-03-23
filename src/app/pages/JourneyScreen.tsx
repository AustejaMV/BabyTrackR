import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { WeeklyNarrativeCard } from "../components/WeeklyNarrativeCard";
import { CradlNoticedSection, type NoticeCard } from "../components/CradlNoticedSection";
import { GrowthSection } from "../components/GrowthSection";
import { IsThisNormalCard, type NormalMetric } from "../components/IsThisNormalCard";
import { PremiumGate } from "../components/PremiumGate";
import { useBaby } from "../contexts/BabyContext";
import { getAgeMonthsWeeks, getAgeInDays } from "../utils/babyUtils";
import { getLeapAtWeek, getNextLeap } from "../data/leaps";
import { getNormalRange } from "../data/normalRanges";
import { JOURNEY_MILESTONES } from "../data/journeyMilestones";
import { readStoredArray } from "../utils/warningUtils";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord } from "../types";
import { PersonalPlaybook } from "../components/PersonalPlaybook";
import { LocalErrorBoundary } from "../components/LocalErrorBoundary";
import { useDesktop } from "../components/AppLayout";
import { DesktopLayout } from "../components/DesktopLayout";
import { getGrowthHistory, saveGrowthEntry } from "../utils/growthStorage";
import { toast } from "sonner";
import { PregnancyJourneyView } from "../components/PregnancyJourneyView";
import { ScheduleCreator } from "../components/ScheduleCreator";
import { useLanguage } from "../contexts/LanguageContext";
import { formatDurationMsProse, formatIntervalMinutesProse, formatDayMonthShort, formatDate } from "../utils/dateUtils";
import { averageMinutesBetweenFeedsInRange } from "../utils/feedingPatternUtils";

const F = "system-ui, sans-serif";
const SECTION: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase",
  letterSpacing: 0.8, padding: "10px 16px 4px", fontFamily: F,
};
const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #ede0d4", borderRadius: 14,
  margin: "0 12px 8px", padding: 14, fontFamily: F,
};

const LEAP_SOURCE_LINKS = [
  {
    label: "Wonder Weeks — mental leaps overview",
    url: "https://www.thewonderweeks.com/mental-leaps-and-wonder-weeks/",
  },
  {
    label: "NHS — baby development",
    url: "https://www.nhs.uk/baby/babys-development/",
  },
];

function readHistory<T>(key: string): T[] {
  try { return readStoredArray<T>(key); } catch { return []; }
}

const CUSTOM_MILESTONES_KEY = "cradl-custom-milestones";
interface CustomMilestone {
  id: string;
  label: string;
  date: number;
}

function loadCustomMilestones(): CustomMilestone[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MILESTONES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomMilestones(milestones: CustomMilestone[]) {
  try { localStorage.setItem(CUSTOM_MILESTONES_KEY, JSON.stringify(milestones)); } catch {}
}

export function JourneyScreen() {
  const { t, language } = useLanguage();
  const { activeBaby, updateActiveBaby } = useBaby();
  const navigate = useNavigate();

  if (activeBaby && activeBaby.birthDate > Date.now()) {
    return (
      <PregnancyJourneyView
        onBabyArrived={() => {
          updateActiveBaby({ birthDate: Date.now() });
          navigate("/");
        }}
      />
    );
  }

  const babyName = activeBaby?.name ?? "Baby";
  const birthDate = activeBaby?.birthDate ?? null;

  const birthMs = birthDate ? (typeof birthDate === "number" ? birthDate : new Date(birthDate).getTime()) : null;
  const ageInWeeks = birthMs ? (Date.now() - birthMs) / (7 * 86400000) : 0;
  const ageLabel = birthMs ? getAgeMonthsWeeks(birthMs) : "";
  const weekNumber = Math.floor(ageInWeeks);

  const sleepHistory = useMemo(() => readHistory<SleepRecord>("sleepHistory"), []);
  const feedingHistory = useMemo(() => readHistory<FeedingRecord>("feedingHistory"), []);
  const diaperHistory = useMemo(() => readHistory<DiaperRecord>("diaperHistory"), []);
  const tummyTimeHistory = useMemo(() => readHistory<TummyTimeRecord>("tummyTimeHistory"), []);

  // Measurement drawer
  const [measureOpen, setMeasureOpen] = useState(false);
  const [mWeight, setMWeight] = useState("");
  const [mHeight, setMHeight] = useState("");
  const [mHead, setMHead] = useState("");
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [growthRefreshKey, setGrowthRefreshKey] = useState(0);

  // Custom milestone form
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customMilestones, setCustomMilestones] = useState<CustomMilestone[]>(() => loadCustomMilestones());

  const growthData = useMemo(() => {
    const history = getGrowthHistory();
    if (history.length === 0) return { weight: null, length: null, headCirc: null, weightGainGrams: null, weeksSinceLastMeasure: null, weightHistory: [] };
    const latest = history[history.length - 1];
    const weight = latest.weightKg ? { value: latest.weightKg, percentile: 50 } : null;
    const length = latest.heightCm ? { value: latest.heightCm, percentile: 50 } : null;
    const headCirc = latest.headCircumferenceCm ? { value: latest.headCircumferenceCm, percentile: 50 } : null;
    let weightGainGrams: number | null = null;
    let weeksSinceLastMeasure: number | null = null;
    const withWeight = history.filter((h) => h.weightKg);
    if (withWeight.length >= 2) {
      const prev = withWeight[withWeight.length - 2];
      const curr = withWeight[withWeight.length - 1];
      weightGainGrams = Math.round(((curr.weightKg! - prev.weightKg!) * 1000));
      weeksSinceLastMeasure = Math.max(1, Math.round((curr.date - prev.date) / (7 * 86400000)));
    }
    const weightHistory = withWeight.map((h) => ({ date: h.date, weightKg: h.weightKg! }));
    return { weight, length, headCirc, weightGainGrams, weeksSinceLastMeasure, weightHistory };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growthRefreshKey]);

  const handleSaveMeasurement = useCallback(() => {
    try {
      saveGrowthEntry({
        date: mDate,
        weightKg: mWeight ? parseFloat(mWeight) : undefined,
        heightCm: mHeight ? parseFloat(mHeight) : undefined,
        headCircumferenceCm: mHead ? parseFloat(mHead) : undefined,
      });
      toast.success("Measurement saved");
      setMeasureOpen(false);
      setMWeight("");
      setMHeight("");
      setMHead("");
      setMDate(new Date().toISOString().slice(0, 10));
      setGrowthRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save measurement");
    }
  }, [mWeight, mHeight, mHead, mDate]);

  const handleAddCustomMilestone = useCallback(() => {
    const label = newMilestoneLabel.trim();
    if (!label) { toast.error("Please enter a milestone name"); return; }
    const ms: CustomMilestone = { id: `custom-${Date.now()}`, label, date: new Date(newMilestoneDate).getTime() };
    const updated = [...customMilestones, ms];
    setCustomMilestones(updated);
    saveCustomMilestones(updated);
    setNewMilestoneLabel("");
    setNewMilestoneDate(new Date().toISOString().slice(0, 10));
    setAddMilestoneOpen(false);
    toast.success("Milestone added");
  }, [newMilestoneLabel, newMilestoneDate, customMilestones]);

  const handleDeleteCustomMilestone = useCallback((id: string) => {
    const updated = customMilestones.filter((m) => m.id !== id);
    setCustomMilestones(updated);
    saveCustomMilestones(updated);
    toast.success("Milestone removed");
  }, [customMilestones]);

  const weekAgo = Date.now() - 7 * 86400000;

  const weeklyStats = useMemo(() => {
    const wFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= weekAgo);
    const wSleeps = sleepHistory.filter((s) => s.endTime && s.endTime >= weekAgo);
    const wDiapers = diaperHistory.filter((d) => (d.timestamp ?? 0) >= weekAgo);
    const sleepMs = wSleeps.reduce((s, r) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0);
    return {
      feedsPerDay: Math.round((wFeeds.length / 7) * 10) / 10,
      sleepPerDay: `${Math.round(sleepMs / 7 / 3600000)}h`,
      nappiesPerDay: Math.round((wDiapers.length / 7) * 10) / 10,
    };
  }, [feedingHistory, sleepHistory, diaperHistory]);

  const dailyBars = useMemo(() => {
    const bars: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date().setHours(0, 0, 0, 0) - i * 86400000;
      const dayEnd = dayStart + 86400000;
      const feeds = feedingHistory.filter((f) => { const t = f.endTime ?? f.timestamp ?? 0; return t >= dayStart && t < dayEnd; }).length;
      bars.push(Math.min(1, feeds / 10));
    }
    return bars;
  }, [feedingHistory]);

  const summaryText = useMemo(() => {
    if (weeklyStats.feedsPerDay === 0 && weeklyStats.nappiesPerDay === 0) return `Log feeds and sleeps this week to see ${babyName}'s weekly summary.`;
    return `${babyName} had ${weeklyStats.feedsPerDay} feeds a day and slept about ${weeklyStats.sleepPerDay} per day this week.`;
  }, [weeklyStats, babyName]);

  const storyNotices = useMemo<NoticeCard[]>(() => {
    const cards: NoticeCard[] = [];
    const prevWeekStart = weekAgo - 7 * 86400000;
    const thisWeekSleeps = sleepHistory.filter((s) => s.endTime && s.endTime >= weekAgo);
    const prevWeekSleeps = sleepHistory.filter((s) => s.endTime && s.endTime >= prevWeekStart && s.endTime! < weekAgo);

    if (thisWeekSleeps.length >= 3 && prevWeekSleeps.length >= 3) {
      const thisAvg = thisWeekSleeps.reduce((s, r) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0) / thisWeekSleeps.length;
      const prevAvg = prevWeekSleeps.reduce((s, r) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0) / prevWeekSleeps.length;
      if (thisAvg > prevAvg * 1.15) {
        const wk = Math.floor(ageInWeeks);
        const inLeap = getLeapAtWeek(wk);
        const next = !inLeap ? getNextLeap(wk) : null;
        let body = `This week, average nap length is about ${formatDurationMsProse(thisAvg)} — up from ${formatDurationMsProse(prevAvg)} last week.`;
        if (next && next.inDays > 0 && next.inDays <= 21) {
          body += `\n\nLeap ${next.leap.leapNumber} (${next.leap.name}) often stirs sleep around this age — roughly ${next.inDays} day${next.inDays === 1 ? "" : "s"} away. Enjoy calmer nights while you can.`;
        }
        cards.push({ id: "sleep-improving", color: "blue", title: "Sleep is getting better this week", body });
      }
    }

    const thisWeekFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= weekAgo);
    if (thisWeekFeeds.length >= 6) {
      const sorted = [...thisWeekFeeds].sort((a, b) => (a.endTime ?? a.timestamp ?? 0) - (b.endTime ?? b.timestamp ?? 0));
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push(((sorted[i].endTime ?? sorted[i].timestamp ?? 0) - (sorted[i - 1].endTime ?? sorted[i - 1].timestamp ?? 0)) / 60000);
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      if (avgGap > 120) {
        const prevWeekGap = averageMinutesBetweenFeedsInRange(feedingHistory, prevWeekStart, weekAgo);
        let body = `Average ${formatIntervalMinutesProse(avgGap)} between feeds this week. She's settling into a rhythm.`;
        if (prevWeekGap != null && avgGap > prevWeekGap + 15) {
          body += `\n\nThat's up from ${formatIntervalMinutesProse(prevWeekGap)} last week — her stomach is growing and she's taking more each feed.`;
        } else {
          body += "\n\nNo action needed — she's leading the change.";
        }
        cards.push({ id: "feed-rhythm", color: "green", title: "Feeds spacing out — a good sign", body });
      }
    }

    return cards;
  }, [sleepHistory, feedingHistory, ageInWeeks]);

  /** P18: Tag by SD — within 1 SD = "Within range", 1–2 SD = "A little low/high", >2 SD = "Speak to your GP" */
  function tagForValue(value: number, typicalMin: number, typicalMax: number): "Within range" | "A little low" | "A little high" | "Speak to your GP" {
    const range = typicalMax - typicalMin || 1;
    const sd = range / 4;
    const mid = (typicalMin + typicalMax) / 2;
    if (value >= mid - sd && value <= mid + sd) return "Within range";
    if (value < typicalMin - 2 * sd) return "Speak to your GP";
    if (value > typicalMax + 2 * sd) return "Speak to your GP";
    return value < typicalMin ? "A little low" : "A little high";
  }

  const normalMetrics = useMemo<NormalMetric[]>(() => {
    if (!ageInWeeks) return [];
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayFeeds = feedingHistory.filter((f) => (f.endTime ?? f.timestamp ?? 0) >= todayStart).length;
    const todayDiapers = diaperHistory.filter((d) => (d.timestamp ?? 0) >= todayStart).length;
    let todaySleepH = 0;
    try {
      sleepHistory.forEach((s) => {
        const start = s.startTime ?? 0; const end = s.endTime ?? 0;
        if (end >= todayStart && start < todayStart + 86400000) todaySleepH += Math.max(0, end - Math.max(start, todayStart)) / 3600000;
        else if (start >= todayStart && end) todaySleepH += (end - start) / 3600000;
      });
    } catch {}
    let todayTummy = 0;
    try {
      tummyTimeHistory.forEach((t) => {
        if ((t.startTime ?? 0) >= todayStart && t.endTime) todayTummy += Math.round((t.endTime - (t.startTime ?? 0)) / 60000);
      });
    } catch {}

    const wks = Math.floor(ageInWeeks);
    const metrics: NormalMetric[] = [];
    const feedRange = getNormalRange("feedsPerDay", wks);
    if (feedRange && todayFeeds > 0) {
      const tag = tagForValue(todayFeeds, feedRange.min, feedRange.max);
      metrics.push({
        name: "Feeds", value: todayFeeds, min: 0, max: feedRange.max + 4,
        typicalMin: feedRange.min, typicalMax: feedRange.max,
        metricKey: "feedsPerDay",
        description: `${todayFeeds} feeds — ${tag === "Within range" ? "right in the middle of the typical range" : tag === "Speak to your GP" ? "worth checking with your health visitor" : tag === "A little low" ? "fewer than most babies this age" : "more than most babies this age"}`,
        tag, suggestion: tag !== "Within range" ? "Some babies just need more or fewer. Check with your health visitor if you're worried." : undefined,
      });
    }
    const sleepRange = getNormalRange("sleepHoursPerDay", wks);
    if (sleepRange && todaySleepH > 0) {
      const tag = tagForValue(todaySleepH, sleepRange.min, sleepRange.max);
      metrics.push({
        name: "Sleep", value: Math.round(todaySleepH * 10) / 10, min: 0, max: sleepRange.max + 4,
        typicalMin: sleepRange.min, typicalMax: sleepRange.max,
        metricKey: "sleepHoursPerDay",
        description: `${Math.round(todaySleepH * 10) / 10}h — ${tag === "Within range" ? "healthy amount for this age" : tag === "Speak to your GP" ? "worth a chat with your GP if this continues" : "a bit " + (tag === "A little low" ? "less" : "more") + " than typical"}`,
        tag, suggestion: tag !== "Within range" ? "Every baby's sleep needs vary. Talk to your GP if sleep feels persistently off." : undefined,
      });
    }
    const diapRange = getNormalRange("diaperChangesPerDay", wks);
    if (diapRange && todayDiapers > 0) {
      const tag = tagForValue(todayDiapers, diapRange.min, diapRange.max);
      metrics.push({
        name: "Nappies", value: todayDiapers, min: 0, max: diapRange.max + 4,
        typicalMin: diapRange.min, typicalMax: diapRange.max,
        metricKey: "diaperChangesPerDay",
        description: `${todayDiapers} changes — ${tag === "Within range" ? "normal for this age" : tag === "A little low" ? "on the low side" : "quite a few changes"}`,
        tag,
      });
    }
    const tumRange = getNormalRange("tummyTimeMinPerDay", wks);
    if (tumRange && todayTummy > 0) {
      const tag = tagForValue(todayTummy, tumRange.min, tumRange.max);
      metrics.push({
        name: "Tummy time", value: todayTummy, min: 0, max: tumRange.max + 20,
        typicalMin: tumRange.min, typicalMax: tumRange.max,
        metricKey: "tummyTimeMinPerDay",
        description: `${todayTummy}min — ${tag === "Within range" ? "good amount" : tag === "A little low" ? "try adding a few more minutes" : "great job!"}`,
        tag, suggestion: tag === "A little low" ? "Even 2–3 extra minutes across the day helps build strength." : undefined,
      });
    }
    return metrics;
  }, [ageInWeeks, feedingHistory, sleepHistory, diaperHistory, tummyTimeHistory]);

  const { isDesktop } = useDesktop();

  const leap = ageInWeeks ? getLeapAtWeek(Math.floor(ageInWeeks)) : null;
  const nextLeap = ageInWeeks && !leap ? getNextLeap(Math.floor(ageInWeeks)) : null;

  const toggleMilestone = useCallback((milestoneId: string) => {
    try {
      let completed: Record<string, number> = {};
      try { completed = JSON.parse(localStorage.getItem("cradl-milestones") || "{}"); } catch {}
      if (completed[milestoneId]) {
        delete completed[milestoneId];
        toast.success("Milestone unmarked");
      } else {
        completed[milestoneId] = Date.now();
        toast.success("Milestone completed!");
      }
      localStorage.setItem("cradl-milestones", JSON.stringify(completed));
      setGrowthRefreshKey((k) => k + 1);
    } catch {}
  }, []);

  const milestoneData = useMemo(() => {
    let completed: Record<string, number> = {};
    try { completed = JSON.parse(localStorage.getItem("cradl-milestones") || "{}"); } catch {}
    const builtIn = JOURNEY_MILESTONES.map((m) => ({
      ...m, doneDate: completed[m.id] ? formatDayMonthShort(completed[m.id], language) : null,
      isCurrent: !completed[m.id] && ageInWeeks >= m.typicalWeeksMin && ageInWeeks <= m.typicalWeeksMax,
      isUpcoming: !completed[m.id] && ageInWeeks < m.typicalWeeksMin,
      isCustom: false,
    }));
    const custom = customMilestones.map((m) => ({
      id: m.id,
      label: m.label,
      typicalLabel: formatDayMonthShort(m.date, language),
      typicalWeeksMin: 0,
      typicalWeeksMax: 999,
      doneDate: formatDayMonthShort(m.date, language),
      isCurrent: false,
      isUpcoming: false,
      isCustom: true,
    }));
    return [...builtIn, ...custom];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageInWeeks, customMilestones, growthRefreshKey, language]);

  const DK_SECTION: React.CSSProperties = {
    fontSize: 10, color: "#b09080", textTransform: "uppercase",
    letterSpacing: 0.7, fontWeight: 600, margin: "10px 0 6px",
  };
  const DK_SECTION_FIRST: React.CSSProperties = { ...DK_SECTION, marginTop: 0 };
  const DK_CARD: React.CSSProperties = {
    background: "#fff", border: "1px solid #ede0d4", borderRadius: 12,
    padding: "12px 14px", marginBottom: 8,
  };
  const DK_SMALL: React.CSSProperties = {
    background: "#fff", border: "1px solid #ede0d4", borderRadius: 10,
    padding: "10px 12px", marginBottom: 7,
  };

  if (isDesktop) {
    const leftCol = (
      <>
        <div style={DK_SECTION_FIRST}>Growth</div>
        <LocalErrorBoundary>
          <GrowthSection
            babyName={babyName}
            weight={growthData.weight}
            length={growthData.length}
            headCirc={growthData.headCirc}
            weightGainGrams={growthData.weightGainGrams}
            weeksSinceLastMeasure={growthData.weeksSinceLastMeasure}
            ageWeeks={Math.floor(ageInWeeks)}
            weightHistory={growthData.weightHistory}
            onLogMeasurement={() => setMeasureOpen(true)}
            compact
          />
        </LocalErrorBoundary>

        <div style={{ ...DK_SECTION, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Milestones</span>
          <span
            onClick={() => setAddMilestoneOpen(true)}
            style={{ fontSize: 9, color: "#d4604a", fontWeight: 600, cursor: "pointer", textTransform: "none" as const, letterSpacing: 0 }}
          >+ Add custom</span>
        </div>
        <LocalErrorBoundary>
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none" as any, position: "relative" }}>
            <style>{`.ms-scroll::-webkit-scrollbar{display:none}`}</style>
            {milestoneData.map((m, i) => (
              <div
                key={m.id}
                onClick={() => m.isCustom ? handleDeleteCustomMilestone(m.id) : toggleMilestone(m.id)}
                style={{ width: 64, flexShrink: 0, textAlign: "center" as const, position: "relative", cursor: "pointer" }}
                title={m.isCustom ? "Click to remove" : m.doneDate ? "Click to unmark" : "Click to mark done"}
              >
                {i > 0 && <div style={{ position: "absolute", top: 10, left: -32, width: 64, height: 2, background: "#ede0d4" }} />}
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", margin: "0 auto 3px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 600,
                  ...(m.doneDate ? { background: m.isCustom ? "#6a6ab4" : "#4a8a4a", color: "#fff" } : m.isCurrent ? { background: "#d4604a", color: "#fff" } : { background: "#f0ece8", color: "#b09080" }),
                }}>
                  {m.doneDate ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> : m.isCurrent ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/></svg>}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: m.isCustom ? "#6a6ab4" : "#2c1f1f", fontFamily: F, overflowWrap: "break-word" as const }}>{m.label}</div>
                <div style={{ fontSize: 7, color: "#b09080", fontFamily: F }}>
                  {m.doneDate ? m.doneDate : m.isCurrent ? "Now" : `~${m.typicalLabel}`}
                </div>
              </div>
            ))}
          </div>
        </LocalErrorBoundary>

        <div style={DK_SECTION}>{t("journey.schedule.title")}</div>
        <LocalErrorBoundary>
          <ScheduleCreator birthDateMs={birthMs} babyName={babyName} compact />
        </LocalErrorBoundary>
      </>
    );

    const centerCol = (
      <>
        <LocalErrorBoundary>
          <WeeklyNarrativeCard
            babyName={babyName}
            weekNumber={weekNumber}
            summaryText={summaryText}
            stats={weeklyStats}
            dailyBars={dailyBars}
            compact
          />
        </LocalErrorBoundary>

        <div style={DK_SECTION}>Cradl noticed</div>
        <LocalErrorBoundary>
          <CradlNoticedSection notices={storyNotices} compact />
        </LocalErrorBoundary>

        <div style={DK_SECTION}>Is this normal?</div>
        <LocalErrorBoundary>
          {normalMetrics.length > 0 ? (
            <IsThisNormalCard ageLabel={`${Math.floor(ageInWeeks)}-week-olds`} metrics={normalMetrics} compact />
          ) : (
            <div style={{ ...DK_CARD, textAlign: "center" as const }}>
              <div style={{ fontSize: 11, color: "#b09080" }}>Log a few feeds and sleeps today to see how {babyName} compares.</div>
            </div>
          )}
        </LocalErrorBoundary>
      </>
    );

    const rightCol = (
      <>
        <div style={DK_SECTION_FIRST}>Development</div>
        {(leap || nextLeap) && (
          <LocalErrorBoundary>
            <div style={{ background: "#f8f4fc", border: "1px solid #e4d4f4", borderRadius: 11, padding: 11, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#7a4ab4" strokeWidth="1.5" /><path d="M8 5v3l2 1" stroke="#7a4ab4" strokeWidth="1.3" strokeLinecap="round" /></svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f", fontFamily: F }}>
                  {leap ? `Leap ${leap.leapNumber}: ${leap.name}` : nextLeap ? `Next: Leap ${nextLeap.leap.leapNumber}` : ""}
                </span>
              </div>
              <div style={{ fontSize: 9, color: "#9a8080", lineHeight: 1.4, fontFamily: F, overflowWrap: "break-word" }}>
                {leap ? `Weeks ${leap.startWeek}–${leap.endWeek} · ${leap.description}` : nextLeap ? `In about ${Math.round(nextLeap.inDays)} days · ${nextLeap.leap.description}` : ""}
              </div>
              <PremiumGate feature="See detailed leap signs and tips">
                <div style={{ marginTop: 6, fontSize: 9, color: "#5a4a40", lineHeight: 1.5, fontFamily: F }}>
                  {(leap?.signs ?? nextLeap?.leap.signs ?? []).map((s, i) => <div key={i}>• {s}</div>)}
                </div>
              </PremiumGate>
              <div style={{ marginTop: 6, fontSize: 8, color: "#9a8080", lineHeight: 1.45, fontFamily: F }}>
                <span style={{ fontWeight: 600 }}>Sources: </span>
                {LEAP_SOURCE_LINKS.map((src, i) => (
                  <span key={src.url}>
                    {i > 0 ? <span> · </span> : null}
                    <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4080a0", textDecoration: "underline", textUnderlineOffset: 2 }}>
                      {src.label}
                    </a>
                  </span>
                ))}
              </div>
            </div>
          </LocalErrorBoundary>
        )}

        <div style={DK_SECTION}>Memory book</div>
        <div
          onClick={() => navigate("/memories")}
          style={{ background: "#fffdf5", border: "1px solid #ede0d4", borderRadius: 11, padding: 11, marginBottom: 8, cursor: "pointer" }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f", fontFamily: F, marginBottom: 3 }}>
            Week {weekNumber} highlights
          </div>
          <div style={{ fontSize: 9, color: "#9a8080", fontFamily: F, lineHeight: 1.4, marginBottom: 8 }}>
            Capture the moments worth remembering — first smiles, funny faces, tiny milestones.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b09080" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate("/memories"); }}
              style={{
                background: "none", border: "1px dashed #cbb89d", borderRadius: 8,
                padding: "6px 10px", fontSize: 9, color: "#9a8080", fontFamily: F,
                cursor: "pointer",
              }}
            >
              + Add photo
            </button>
          </div>
          <div style={{ display: "inline-block", background: "#f0ece8", borderRadius: 4, padding: "2px 6px", fontSize: 8, fontWeight: 600, color: "#b09080", fontFamily: F }}>PRO</div>
        </div>

        <div style={DK_SECTION}>History</div>
        <div
          onClick={() => navigate("/?action=timeline")}
          style={{
            ...DK_SMALL, display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f", fontFamily: F }}>Browse all logs</span>
          <span style={{ fontSize: 14, color: "#b09080" }}>›</span>
        </div>
      </>
    );

    return (
      <>
        <DesktopLayout left={leftCol} center={centerCol} right={rightCol} />
        {measureOpen && <MeasurementDrawer
          mDate={mDate} setMDate={setMDate}
          mWeight={mWeight} setMWeight={setMWeight}
          mHeight={mHeight} setMHeight={setMHeight}
          mHead={mHead} setMHead={setMHead}
          onSave={handleSaveMeasurement}
          onClose={() => setMeasureOpen(false)}
        />}
        {addMilestoneOpen && <AddMilestoneDialog
          label={newMilestoneLabel} setLabel={setNewMilestoneLabel}
          date={newMilestoneDate} setDate={setNewMilestoneDate}
          onSave={handleAddCustomMilestone}
          onClose={() => setAddMilestoneOpen(false)}
        />}
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80, background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ fontSize: 20, fontFamily: "Georgia, serif", fontWeight: 600, color: "#2c1f1f", overflowWrap: "break-word" }}>
          {babyName}'s story
        </div>
        <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: F }}>{ageLabel}</div>
      </div>

      {/* Weekly narrative */}
      <LocalErrorBoundary>
      <WeeklyNarrativeCard
        babyName={babyName}
        weekNumber={weekNumber}
        summaryText={summaryText}
        stats={weeklyStats}
        dailyBars={dailyBars}
      />
      </LocalErrorBoundary>

      {/* Cradl noticed */}
      <LocalErrorBoundary>
      <CradlNoticedSection notices={storyNotices} />
      </LocalErrorBoundary>

      {/* Is this normal? (Prompt 11: above Growth) */}
      <div style={SECTION}>Is this normal?</div>
      <LocalErrorBoundary>
      {normalMetrics.length > 0 ? (
        <IsThisNormalCard ageLabel={`${Math.floor(ageInWeeks)}-week-olds`} metrics={normalMetrics} />
      ) : (
        <div style={{ ...CARD, textAlign: "center" as const }}>
          <div style={{ fontSize: 11, color: "var(--mu)" }}>Log a few feeds and sleeps today to see how {babyName} compares.</div>
        </div>
      )}
      </LocalErrorBoundary>

      {/* Growth */}
      <LocalErrorBoundary>
      <div style={SECTION}>Growth</div>
      <GrowthSection
        babyName={babyName}
        weight={growthData.weight}
        length={growthData.length}
        headCirc={growthData.headCirc}
        weightGainGrams={growthData.weightGainGrams}
        weeksSinceLastMeasure={growthData.weeksSinceLastMeasure}
        ageWeeks={Math.floor(ageInWeeks)}
        weightHistory={growthData.weightHistory}
        onLogMeasurement={() => setMeasureOpen(true)}
      />
      </LocalErrorBoundary>

      {/* Milestones */}
      <div style={{ ...SECTION, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Milestones</span>
        <span
          onClick={() => setAddMilestoneOpen(true)}
          style={{ fontSize: 10, color: "#d4604a", fontWeight: 600, cursor: "pointer", textTransform: "none" as const, letterSpacing: 0, paddingRight: 16 }}
        >+ Add custom</span>
      </div>
      <LocalErrorBoundary>
      <div style={{ display: "flex", gap: 0, padding: "0 12px 8px", overflowX: "auto", scrollbarWidth: "none" as any }}>
        <style>{`.ms-scroll::-webkit-scrollbar{display:none}`}</style>
        <div className="ms-scroll" style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none" as any, position: "relative" }}>
          {milestoneData.map((m, i) => (
            <div
              key={m.id}
              onClick={() => m.isCustom ? handleDeleteCustomMilestone(m.id) : toggleMilestone(m.id)}
              style={{ width: 72, flexShrink: 0, textAlign: "center" as const, position: "relative", cursor: "pointer" }}
            >
              {i > 0 && <div style={{ position: "absolute", top: 10, left: -36, width: 72, height: 2, background: "#ede0d4" }} />}
              <div style={{
                width: 22, height: 22, borderRadius: "50%", margin: "0 auto 4px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600,
                ...(m.doneDate ? { background: m.isCustom ? "#6a6ab4" : "#4a8a4a", color: "#fff" } : m.isCurrent ? { background: "#d4604a", color: "#fff" } : { background: "#f0ece8", color: "var(--mu)" }),
              }}>
                {m.doneDate ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> : m.isCurrent ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/></svg>}
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: m.isCustom ? "#6a6ab4" : "#2c1f1f", fontFamily: F, overflowWrap: "break-word" as const }}>{m.label}</div>
              <div style={{ fontSize: 8, color: "var(--mu)", fontFamily: F }}>
                {m.doneDate ? m.doneDate : m.isCurrent ? "Now" : `~${m.typicalLabel}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      </LocalErrorBoundary>

      {/* Leap */}
      {(leap || nextLeap) && (
        <LocalErrorBoundary>
          <div style={SECTION}>Developmental leap</div>
          <div style={{ ...CARD, background: "#f8f4fc", borderColor: "#e4d4f4" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#7a4ab4" strokeWidth="1.5" /><path d="M8 5v3l2 1" stroke="#7a4ab4" strokeWidth="1.3" strokeLinecap="round" /></svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: F }}>
                {leap ? `Leap ${leap.leapNumber}: ${leap.name}` : nextLeap ? `Next: Leap ${nextLeap.leap.leapNumber}` : ""}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#9a8080", lineHeight: 1.4, fontFamily: F, overflowWrap: "break-word" }}>
              {leap ? `Weeks ${leap.startWeek}–${leap.endWeek} · ${leap.description}` : nextLeap ? `In about ${Math.round(nextLeap.inDays)} days · ${nextLeap.leap.description}` : ""}
            </div>
            <PremiumGate feature="See detailed leap signs and tips">
              <div style={{ marginTop: 8, fontSize: 10, color: "#5a4a40", lineHeight: 1.5, fontFamily: F }}>
                {(leap?.signs ?? nextLeap?.leap.signs ?? []).map((s, i) => <div key={i}>• {s}</div>)}
              </div>
            </PremiumGate>
            <div style={{ marginTop: 8, fontSize: 9, color: "#9a8080", lineHeight: 1.45, fontFamily: F }}>
              <span style={{ fontWeight: 600 }}>Sources: </span>
              {LEAP_SOURCE_LINKS.map((src, i) => (
                <span key={src.url}>
                  {i > 0 ? <span> · </span> : null}
                  <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4080a0", textDecoration: "underline", textUnderlineOffset: 2 }}>
                    {src.label}
                  </a>
                </span>
              ))}
            </div>
          </div>
        </LocalErrorBoundary>
      )}

      {/* Schedule — age-based nap stages + saved wake/bed + buildDailySchedule */}
      <div style={SECTION}>{t("journey.schedule.title")}</div>
      <LocalErrorBoundary>
        <div style={{ margin: "0 12px 8px" }}>
          <ScheduleCreator birthDateMs={birthMs} babyName={babyName} />
        </div>
      </LocalErrorBoundary>

      {/* Personal Playbook */}
      <div style={SECTION}>Your playbook</div>
      <LocalErrorBoundary>
        <PersonalPlaybook />
      </LocalErrorBoundary>

      {measureOpen && <MeasurementDrawer
        mDate={mDate} setMDate={setMDate}
        mWeight={mWeight} setMWeight={setMWeight}
        mHeight={mHeight} setMHeight={setMHeight}
        mHead={mHead} setMHead={setMHead}
        onSave={handleSaveMeasurement}
        onClose={() => setMeasureOpen(false)}
      />}
      {addMilestoneOpen && <AddMilestoneDialog
        label={newMilestoneLabel} setLabel={setNewMilestoneLabel}
        date={newMilestoneDate} setDate={setNewMilestoneDate}
        onSave={handleAddCustomMilestone}
        onClose={() => setAddMilestoneOpen(false)}
      />}
    </div>
  );
}

/* ─── Measurement drawer ─── */
/** Local noon so formatDate matches the calendar day from the date picker. */
function datePickerStringToLocalMs(s: string): number | null {
  const parts = s.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  const t = new Date(y, mo - 1, d, 12, 0, 0, 0).getTime();
  return Number.isFinite(t) ? t : null;
}

function MeasurementDrawer({
  mDate, setMDate, mWeight, setMWeight, mHeight, setMHeight, mHead, setMHead, onSave, onClose,
}: {
  mDate: string; setMDate: (v: string) => void;
  mWeight: string; setMWeight: (v: string) => void;
  mHeight: string; setMHeight: (v: string) => void;
  mHead: string; setMHead: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #ede0d4",
    background: "#faf7f2", fontSize: 14, fontFamily: "system-ui, sans-serif", outline: "none",
    boxSizing: "border-box", color: "#2c1f1f",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "#9a8080", marginBottom: 4, display: "block" };
  const canSave = !!(mWeight || mHeight || mHead);
  const mDateDisplayMs = datePickerStringToLocalMs(mDate);
  const mDateDisplay = mDateDisplayMs != null ? formatDate(mDateDisplayMs) : "—";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ maxWidth: 380, width: "100%", background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #ede0d4" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2c1f1f", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Log measurement</h3>
        <p style={{ fontSize: 12, color: "#9a8080", marginBottom: 16, fontFamily: "system-ui, sans-serif" }}>
          Record weight, height, and/or head circumference. At least one is required.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9a8080", marginTop: 6, fontFamily: "system-ui, sans-serif" }}>
              In your date format: <strong style={{ color: "#2c1f1f" }}>{mDateDisplay}</strong>
            </p>
          </div>
          <div>
            <label style={labelStyle}>Weight (kg)</label>
            <input type="number" step="0.1" min="0.5" max="25" placeholder="e.g. 4.2" value={mWeight} onChange={(e) => setMWeight(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Height (cm)</label>
            <input type="number" step="0.1" min="30" max="120" placeholder="e.g. 52.5" value={mHeight} onChange={(e) => setMHeight(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Head circumference (cm)</label>
            <input type="number" step="0.1" min="25" max="60" placeholder="e.g. 35.0" value={mHead} onChange={(e) => setMHead(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          style={{
            width: "100%", marginTop: 16, padding: "14px 0", borderRadius: 12, border: "none",
            background: canSave ? "#d4604a" : "#ede0d4", color: canSave ? "#fff" : "#9a8080",
            fontSize: 15, fontWeight: 600, cursor: canSave ? "pointer" : "not-allowed",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Save measurement
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#9a8080", fontSize: 13, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Add custom milestone dialog ─── */
function AddMilestoneDialog({
  label, setLabel, date, setDate, onSave, onClose,
}: {
  label: string; setLabel: (v: string) => void;
  date: string; setDate: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #ede0d4",
    background: "#faf7f2", fontSize: 14, fontFamily: "system-ui, sans-serif", outline: "none",
    boxSizing: "border-box", color: "#2c1f1f",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "#9a8080", marginBottom: 4, display: "block" };
  const canSave = !!label.trim();
  const milestoneDateMs = datePickerStringToLocalMs(date);
  const milestoneDateDisplay = milestoneDateMs != null ? formatDate(milestoneDateMs) : "—";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ maxWidth: 380, width: "100%", background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #ede0d4" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#2c1f1f", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Add custom milestone</h3>
        <p style={{ fontSize: 12, color: "#9a8080", marginBottom: 16, fontFamily: "system-ui, sans-serif" }}>
          Record a special moment — first giggle, first bath, first word, anything you want to remember.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>What happened?</label>
            <input
              type="text"
              placeholder="e.g. First giggle, Said 'mama'"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 80))}
              style={inputStyle}
              maxLength={80}
            />
          </div>
          <div>
            <label style={labelStyle}>When?</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9a8080", marginTop: 6, fontFamily: "system-ui, sans-serif" }}>
              In your date format: <strong style={{ color: "#2c1f1f" }}>{milestoneDateDisplay}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          style={{
            width: "100%", marginTop: 16, padding: "14px 0", borderRadius: 12, border: "none",
            background: canSave ? "#6a6ab4" : "#ede0d4", color: canSave ? "#fff" : "#9a8080",
            fontSize: 15, fontWeight: 600, cursor: canSave ? "pointer" : "not-allowed",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Add milestone
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#9a8080", fontSize: 13, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
