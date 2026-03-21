/**
 * Suggested daily schedule (wake, naps, bedtime) based on baby's age.
 * Stores wake/bedtime prefs and shows stage transition when nap stage changes.
 */

import { useState, useEffect } from "react";
import {
  getSchedulePrefs,
  setSchedulePrefs,
  getLastNapStage,
  setLastNapStage,
  getNapStage,
  buildDailySchedule,
  normalizeStoredNapStageKey,
  type ScheduleEvent,
  type NapScheduleStage,
  type NapStageKey,
} from "../data/napSchedules";
import { useLanguage } from "../contexts/LanguageContext";
import { formatClockTime } from "../utils/dateUtils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * MS_PER_DAY;

function getAgeInWeeksFloor(birthDateMs: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - birthDateMs) / SEVEN_DAYS));
}

function stageLabelKey(stageKey: NapStageKey): string {
  return `journey.schedule.stages.${stageKey}.label`;
}

function stageDescKey(stageKey: NapStageKey): string {
  return `journey.schedule.stages.${stageKey}.description`;
}

/** Convert "HH:mm" to display time using user's 12h/24h preference. */
function formatScheduleTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return formatClockTime(d.getTime(), hhmm);
}

export interface ScheduleCreatorProps {
  birthDateMs: number | null;
  babyName?: string | null;
  /** Tighter padding for desktop sidebar */
  compact?: boolean;
}

const SCHEDULE_SOURCE_LINKS = [
  {
    label: "NHS — Baby sleep and nighttime feeding",
    url: "https://nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep",
  },
  {
    label: "WHO — Infant and young child nutrition",
    url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
  },
];

export function ScheduleCreator({ birthDateMs, babyName, compact }: ScheduleCreatorProps) {
  const { t } = useLanguage();
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedtime, setBedtime] = useState("19:30");
  const [transitionDismissed, setTransitionDismissed] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState<{ stage: NapScheduleStage } | null>(null);

  useEffect(() => {
    const prefs = getSchedulePrefs();
    setWakeTime(prefs.wakeTime);
    setBedtime(prefs.bedtime);
  }, []);

  useEffect(() => {
    if (birthDateMs == null) return;
    const ageInWeeks = getAgeInWeeksFloor(birthDateMs);
    const stage = getNapStage(ageInWeeks);
    if (!stage) return;
    const lastKey = normalizeStoredNapStageKey(getLastNapStage());
    if (lastKey === null) {
      setLastNapStage(stage.stageKey);
      return;
    }
    if (lastKey !== stage.stageKey && !transitionDismissed) {
      setTransitionMessage({ stage });
      setShowTransition(true);
      setLastNapStage(stage.stageKey);
    }
  }, [birthDateMs, transitionDismissed]);

  const handleWakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v) {
      setWakeTime(v);
      setSchedulePrefs(v, bedtime);
    }
  };

  const handleBedtimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v) {
      setBedtime(v);
      setSchedulePrefs(wakeTime, v);
    }
  };

  const ageInWeeksFloor = birthDateMs != null ? getAgeInWeeksFloor(birthDateMs) : null;
  const stage = ageInWeeksFloor != null ? getNapStage(ageInWeeksFloor) : null;
  const events =
    ageInWeeksFloor != null ? buildDailySchedule(wakeTime, bedtime, ageInWeeksFloor) : [];
  const displayName = babyName?.trim() || t("journey.schedule.yourBaby");

  const padClass = compact ? "p-3 mb-2" : "p-4 mb-3";
  const badgeText = compact ? "text-[11px]" : "text-[12px]";
  const labelText = compact ? "text-[12px]" : "text-[13px]";

  if (birthDateMs == null) {
    return (
      <div
        className={`border rounded-2xl ${padClass}`}
        style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        role="region"
        aria-label={t("journey.schedule.title")}
      >
        <p className={labelText} style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          {t("journey.schedule.needBirthDate")}
        </p>
      </div>
    );
  }

  const transitionNapPhrase =
    showTransition && transitionMessage
      ? transitionMessage.stage.naps === 1
        ? t("journey.schedule.oneNapPhrase")
        : t("journey.schedule.napsPhrase", { count: transitionMessage.stage.naps })
      : "";

  return (
    <div
      className={`border rounded-2xl ${padClass}`}
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label={t("journey.schedule.title")}
    >
      {showTransition && transitionMessage && (
        <div
          className="rounded-xl p-3 mb-3 flex items-start gap-2"
          style={{ background: "var(--bg2)", borderColor: "var(--bd)", borderWidth: 1 }}
        >
          <p className={`${compact ? "text-[12px]" : "text-[13px]"} flex-1`} style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            {t("journey.schedule.transition", { name: displayName, napPhrase: transitionNapPhrase })}
          </p>
          <button
            type="button"
            onClick={() => {
              setShowTransition(false);
              setTransitionDismissed(true);
            }}
            className="flex-shrink-0 py-1.5 px-2 rounded-lg text-[12px] border"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            aria-label={t("common.close")}
          >
            {t("journey.schedule.dismiss")}
          </button>
        </div>
      )}

      {stage && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${badgeText}`}
            style={{ background: "var(--sk)", color: "var(--blue)", fontFamily: "system-ui, sans-serif" }}
          >
            {t(stageLabelKey(stage.stageKey))} ·{" "}
            {(ageInWeeksFloor ?? 0) === 1
              ? t("common.age.weeks_one", { count: 1 })
              : t("common.age.weeks_other", { count: ageInWeeksFloor ?? 0 })}
          </span>
        </div>
      )}
      {stage && (
        <p className={`${compact ? "text-[11px]" : "text-[12px]"} mb-3`} style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          {t(stageDescKey(stage.stageKey))}
        </p>
      )}

      <div className={`grid grid-cols-2 gap-3 ${compact ? "mb-3" : "mb-4"}`}>
        <label className="flex flex-col gap-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          <span className={labelText}>{t("journey.schedule.usualWake")}</span>
          <input
            type="time"
            value={wakeTime}
            onChange={handleWakeChange}
            className={`rounded-lg border px-3 py-2.5 min-h-[44px] ${compact ? "text-[13px]" : "text-[14px]"}`}
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            aria-label={t("journey.schedule.usualWake")}
          />
          <span className="text-[11px]" style={{ color: "var(--mu)" }}>{formatScheduleTime(wakeTime)}</span>
        </label>
        <label className="flex flex-col gap-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          <span className={labelText}>{t("journey.schedule.targetBedtime")}</span>
          <input
            type="time"
            value={bedtime}
            onChange={handleBedtimeChange}
            className={`rounded-lg border px-3 py-2.5 min-h-[44px] ${compact ? "text-[13px]" : "text-[14px]"}`}
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            aria-label={t("journey.schedule.targetBedtime")}
          />
          <span className="text-[11px]" style={{ color: "var(--mu)" }}>{formatScheduleTime(bedtime)}</span>
        </label>
      </div>

      {events.length > 0 && (
        <div className={`space-y-2 ${compact ? "mb-2" : "mb-3"}`}>
          {events.map((evt, i) => (
            <ScheduleEventRow key={`${evt.type}-${evt.time}-${i}`} event={evt} t={t} compact={!!compact} />
          ))}
        </div>
      )}

      <p className={compact ? "text-[11px]" : "text-[12px]"} style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        {t("journey.schedule.footer", { name: displayName })}
      </p>
      <p
        className={compact ? "text-[10px]" : "text-[11px]"}
        style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif", marginTop: 6, lineHeight: 1.45 }}
      >
        <span style={{ fontWeight: 600 }}>{t("journey.schedule.sourcesLabel")} </span>
        {SCHEDULE_SOURCE_LINKS.map((src, idx) => (
          <span key={src.url}>
            {idx > 0 ? <span> · </span> : null}
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--blue)", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              {src.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}

function ScheduleEventRow({
  event,
  t,
  compact,
}: {
  event: ScheduleEvent;
  t: (key: string, params?: Record<string, string | number>) => string;
  compact: boolean;
}) {
  const dotColor =
    event.type === "wake" || event.type === "bedtime"
      ? "var(--grn)"
      : event.type === "nap"
        ? "var(--blue)"
        : "var(--coral)";

  const label =
    event.type === "wake"
      ? t("journey.schedule.eventWake")
      : event.type === "bedtime"
        ? t("journey.schedule.eventBedtime")
        : event.type === "nap" && event.napIndex != null
          ? t("journey.schedule.eventNap", { n: event.napIndex })
          : event.label;

  const rowText = compact ? "text-[12px]" : "text-[13px]";

  return (
    <div className="flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor }} aria-hidden />
      <span className={`${rowText} tabular-nums flex-shrink-0`} style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif", minWidth: "3.25rem" }}>
        {formatScheduleTime(event.time)}
      </span>
      <span className={rowText} style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
        {label}
      </span>
    </div>
  );
}
