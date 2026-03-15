import { AlertCircle, Baby, Utensils, Droplet, Clock, Pill, HelpCircle, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { maybeNotifyForWarning } from "../utils/notifications";
import { computeWarnings, readStoredArray, readFeedingInterval } from "../utils/warningUtils";
import { readAlertThresholds, isAlertDismissed, dismissAlert } from "../utils/alertThresholdsStorage";
import type { AlertThresholds } from "../utils/alertThresholdsStorage";
import type { WarningKey } from "../utils/warningUtils";
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord } from "../types";

function getTooltip(key: WarningKey, thresholds: { noPoopHours: number; noSleepHours: number; feedOverdueMinutes: number; tummyLowMinutes: number; tummyLowByHour: number }): string {
  switch (key) {
    case "no-poop":
      return `No dirty nappies in ${thresholds.noPoopHours}h (your threshold in Settings). For babies under 6 weeks this may need checking. Older babies can go several days — this is often normal.`;
    case "no-sleep":
      return `No sleep logged in the last ${thresholds.noSleepHours}h (your threshold). Typical sleep: newborns 14–17h/day, 3–6 mo 12–16h, 6–12 mo 12–16h. If baby is awake longer than usual, that can be normal during growth spurts. Change threshold in Settings → Alert thresholds.`;
    case "feed-overdue":
      return `Last feed was more than your usual interval plus ${thresholds.feedOverdueMinutes} minutes. Adjust in Settings → Alert thresholds.`;
    case "tummy-low":
      return `Tummy time today is below ${thresholds.tummyLowMinutes} minutes and it's past ${thresholds.tummyLowByHour}:00. Change target and time in Settings → Alert thresholds.`;
    case "feeding-due":
      return "Time for the next feeding.";
    case "feeding-soon":
      return "Feeding time is coming up soon.";
    case "same-position":
      return "Consider changing baby's sleep position for safety (e.g. alternate back, left side, right side).";
    case "no-tummy-time":
      return "No tummy time logged today yet. Aim for a few short sessions; you can set a daily target in Settings.";
    case "painkiller-due":
      return "It's been 8+ hours — you can take another dose if needed. Follow the leaflet for your medicine.";
    default:
      return "";
  }
}

const PILL_STYLE: Record<string, { bg: string; color: string; iconColor?: string }> = {
  "no-poop": { bg: "rgba(255, 179, 71, 0.25)", color: "#b8860b", iconColor: "#ffb347" },
  "no-sleep": { bg: "rgba(200, 168, 240, 0.25)", color: "#8b7aa8", iconColor: "#c8a8f0" },
  "feed-overdue": { bg: "rgba(255, 170, 136, 0.25)", color: "#c75a2a", iconColor: "var(--coral)" },
  "tummy-low": { bg: "rgba(200, 168, 240, 0.2)", color: "#7a6a9a", iconColor: "var(--purp)" },
  "feeding-due": { bg: "rgba(239, 68, 68, 0.2)", color: "#b91c1c" },
  "feeding-soon": { bg: "rgba(234, 179, 8, 0.2)", color: "#a16207" },
  "same-position": { bg: "rgba(249, 115, 22, 0.2)", color: "#c2410c" },
  "no-tummy-time": { bg: "rgba(59, 130, 246, 0.2)", color: "#1d4ed8" },
  "painkiller-due": { bg: "rgba(239, 68, 68, 0.2)", color: "#b91c1c" },
};

const LABELS: Record<string, string> = {
  "no-poop": "No poop in 24h",
  "no-sleep": "No sleep in 6h",
  "feed-overdue": "Feed overdue",
  "tummy-low": "Tummy time low today",
  "feeding-due": "Feeding overdue",
  "feeding-soon": "Feeding soon",
  "same-position": "Change sleep position",
  "no-tummy-time": "No tummy time today",
  "painkiller-due": "Painkiller: next dose ok (8h)",
};

export function WarningIndicators() {
  const [warnings, setWarnings] = useState<WarningKey[]>([]);
  const [thresholds, setThresholds] = useState<AlertThresholds>(() => readAlertThresholds());
  const [expandedTooltip, setExpandedTooltip] = useState<WarningKey | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const checkWarnings = () => {
      const thresholds = readAlertThresholds();
      const activeWarnings = computeWarnings({
        feedingHistory: readStoredArray<FeedingRecord>("feedingHistory"),
        sleepHistory: readStoredArray<SleepRecord>("sleepHistory"),
        diaperHistory: readStoredArray<DiaperRecord>("diaperHistory"),
        tummyTimeHistory: readStoredArray<TummyTimeRecord>("tummyTimeHistory"),
        painkillerHistory: readStoredArray("painkillerHistory"),
        feedingIntervalHours: readFeedingInterval(),
        thresholds: {
          noPoopHours: thresholds.noPoopHours,
          noSleepHours: thresholds.noSleepHours,
          feedOverdueMinutes: thresholds.feedOverdueMinutes,
          tummyLowMinutes: thresholds.tummyLowMinutes,
          tummyLowByHour: thresholds.tummyLowByHour,
        },
      });
      setWarnings(activeWarnings);
      setThresholds(thresholds);

      if (activeWarnings.includes("feeding-due")) maybeNotifyForWarning("feeding-due", "Feeding due", "Time for the next feeding.");
      if (activeWarnings.includes("feeding-soon")) maybeNotifyForWarning("feeding-soon", "Feeding soon", "Feeding time is coming up soon.");
      if (activeWarnings.includes("feed-overdue")) maybeNotifyForWarning("feed-overdue", "Feed overdue", "Last feed was more than your interval + 30 min ago.");
      if (activeWarnings.includes("painkiller-due")) maybeNotifyForWarning("painkiller-due", "Painkiller reminder", "It's been 8+ hours — you can take another dose if needed.");
      if (activeWarnings.includes("same-position")) maybeNotifyForWarning("same-position", "Sleep position", "Consider changing baby's sleep position.");
      if (activeWarnings.includes("no-poop")) maybeNotifyForWarning("no-poop", "Diaper check", "No poop in 24 hours. Check with your pediatrician if concerned.");
      if (activeWarnings.includes("no-sleep")) maybeNotifyForWarning("no-sleep", "Sleep check", "No sleep recorded in the last 6 hours.");
      if (activeWarnings.includes("no-tummy-time")) maybeNotifyForWarning("no-tummy-time", "Tummy time", "No tummy time logged today yet.");
    };
    checkWarnings();
    const interval = setInterval(checkWarnings, 60_000);
    return () => clearInterval(interval);
  }, []);

  const visible = warnings.filter((k) => !isAlertDismissed(k));
  const pillRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
  }, []);

  if (visible.length === 0) return null;

  const activeKey = expandedTooltip;
  const activeRect = activeKey && pillRefs.current[activeKey]
    ? pillRefs.current[activeKey]!.getBoundingClientRect()
    : null;

  const scheduleClose = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => setExpandedTooltip(null), 150);
  };
  const cancelClose = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  return (
    <>
      <div className="overflow-x-auto flex gap-2 mb-3 pb-1 -mx-1 px-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {visible.map((key) => {
          const style = PILL_STYLE[key] ?? { bg: "var(--bg2)", color: "var(--tx)" };
          const isExpanded = expandedTooltip === key;
          return (
            <div
              key={key}
              ref={(el) => { pillRefs.current[key] = el; }}
              className="relative flex-shrink-0 flex items-center gap-2 pl-3 pr-2 py-2 rounded-full border"
              style={{ background: style.bg, color: style.color, borderColor: "var(--bd)" }}
              onMouseEnter={() => { cancelClose(); setExpandedTooltip(key); }}
              onMouseLeave={() => scheduleClose()}
            >
              {key === "feed-overdue" || key === "feeding-due" || key === "feeding-soon" ? (
                <Utensils className="w-5 h-5 flex-shrink-0" style={{ color: style.iconColor ?? style.color }} />
              ) : key === "no-poop" ? (
                <Droplet className="w-5 h-5 flex-shrink-0" style={{ color: style.iconColor ?? style.color }} />
              ) : key === "no-sleep" || key === "same-position" ? (
                <Baby className="w-5 h-5 flex-shrink-0" style={{ color: style.iconColor ?? style.color }} />
              ) : key === "no-tummy-time" || key === "tummy-low" ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: style.iconColor ?? style.color }} />
              ) : (
                <Pill className="w-5 h-5 flex-shrink-0" style={{ color: style.iconColor ?? style.color }} />
              )}
              <span className="text-[13px] font-medium whitespace-nowrap" style={{ fontFamily: "system-ui, sans-serif" }}>
                {LABELS[key] ?? key}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpandedTooltip(isExpanded ? null : key); }}
                className="p-0.5 rounded-full hover:opacity-80 flex-shrink-0"
                aria-label="More info"
              >
                <HelpCircle className="w-3.5 h-3.5" style={{ color: style.color }} />
              </button>
              <button
                type="button"
                onClick={() => { dismissAlert(key); forceUpdate((n) => n + 1); }}
                className="p-0.5 rounded-full hover:opacity-80 flex-shrink-0"
                aria-label="Dismiss for 2 hours"
              >
                <X className="w-3.5 h-3.5" style={{ color: style.color }} />
              </button>
            </div>
          );
        })}
      </div>
      {activeKey && activeRect && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed p-3 rounded-lg text-[12px] leading-snug shadow-lg border max-w-[300px] z-[9999]"
            style={{
              background: "var(--card)",
              color: "var(--tx)",
              borderColor: "var(--bd)",
              fontFamily: "system-ui, sans-serif",
              left: Math.max(8, Math.min(activeRect.left, window.innerWidth - 308)),
              top: activeRect.top - 8,
              transform: "translateY(-100%)",
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={() => setExpandedTooltip(null)}
          >
            {getTooltip(activeKey, thresholds)}
          </div>,
          document.body
        )}
    </>
  );
}
