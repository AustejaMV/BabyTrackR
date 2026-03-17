/**
 * Suggested daily schedule (wake, naps, bedtime) based on baby's age.
 * Stores wake/bedtime prefs and shows stage transition message when nap stage changes.
 */

import { useState, useEffect } from "react";
import {
  getSchedulePrefs,
  setSchedulePrefs,
  getLastNapStage,
  setLastNapStage,
  getNapStage,
  buildDailySchedule,
  type ScheduleEvent,
  type NapScheduleStage,
} from "../data/napSchedules";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * MS_PER_DAY;

function getAgeInWeeks(birthDateMs: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - birthDateMs) / SEVEN_DAYS));
}

export interface ScheduleCreatorProps {
  birthDateMs: number | null;
  babyName?: string | null;
}

export function ScheduleCreator({ birthDateMs, babyName }: ScheduleCreatorProps) {
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedtime, setBedtime] = useState("19:30");
  const [transitionDismissed, setTransitionDismissed] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState<{ stage: NapScheduleStage; prevLabel: string | null } | null>(null);

  useEffect(() => {
    const prefs = getSchedulePrefs();
    setWakeTime(prefs.wakeTime);
    setBedtime(prefs.bedtime);
  }, []);

  useEffect(() => {
    if (birthDateMs == null) return;
    const ageInWeeks = getAgeInWeeks(birthDateMs);
    const stage = getNapStage(ageInWeeks);
    if (!stage) return;
    const lastStage = getLastNapStage();
    if (lastStage === null) {
      setLastNapStage(stage.label);
      return;
    }
    if (lastStage !== stage.label && !transitionDismissed) {
      setTransitionMessage({ stage, prevLabel: lastStage });
      setShowTransition(true);
      setLastNapStage(stage.label);
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

  const ageInWeeks = birthDateMs != null ? getAgeInWeeks(birthDateMs) : null;
  const stage = ageInWeeks != null ? getNapStage(ageInWeeks) : null;
  const events = ageInWeeks != null ? buildDailySchedule(wakeTime, bedtime, ageInWeeks) : [];
  const displayName = babyName?.trim() || "your baby";

  if (birthDateMs == null) {
    return (
      <div
        className="border rounded-2xl p-4 mb-3"
        style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        role="region"
        aria-label="Suggested schedule"
      >
        <p className="text-[14px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Set birth date in Settings to see a suggested schedule.
        </p>
      </div>
    );
  }

  return (
    <div
      className="border rounded-2xl p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Suggested schedule"
    >
      {showTransition && transitionMessage && (
        <div
          className="rounded-xl p-3 mb-3 flex items-start gap-2"
          style={{ background: "var(--bg2)", borderColor: "var(--bd)", borderWidth: 1 }}
        >
          <p className="text-[13px] flex-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            {displayName} may be ready to move to {transitionMessage.stage.naps} nap{transitionMessage.stage.naps !== 1 ? "s" : ""} — here&apos;s her updated suggested schedule.
          </p>
          <button
            type="button"
            onClick={() => { setShowTransition(false); setTransitionDismissed(true); }}
            className="flex-shrink-0 py-1.5 px-2 rounded-lg text-[12px] border"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {stage && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className="rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ background: "var(--sk)", color: "var(--blue)", fontFamily: "system-ui, sans-serif" }}
          >
            {stage.label} · {ageInWeeks} weeks
          </span>
        </div>
      )}
      {stage && <p className="text-[12px] mb-3" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{stage.description}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="flex flex-col gap-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          <span className="text-[13px]">Usual wake time</span>
          <input
            type="time"
            value={wakeTime}
            onChange={handleWakeChange}
            className="rounded-lg border px-3 py-2.5 text-[14px] min-h-[44px]"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            aria-label="Usual wake time"
          />
        </label>
        <label className="flex flex-col gap-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          <span className="text-[13px]">Target bedtime</span>
          <input
            type="time"
            value={bedtime}
            onChange={handleBedtimeChange}
            className="rounded-lg border px-3 py-2.5 text-[14px] min-h-[44px]"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            aria-label="Target bedtime"
          />
        </label>
      </div>

      {events.length > 0 && (
        <div className="space-y-2 mb-3">
          {events.map((evt, i) => (
            <ScheduleEventRow key={`${evt.type}-${evt.time}-${i}`} event={evt} />
          ))}
        </div>
      )}

      <p className="text-[12px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        This schedule is a guide based on {displayName}&apos;s age. Adjust based on her cues.
      </p>
    </div>
  );
}

function ScheduleEventRow({ event }: { event: ScheduleEvent }) {
  const dotColor =
    event.type === "wake" || event.type === "bedtime"
      ? "var(--grn)"
      : event.type === "nap"
        ? "var(--blue)"
        : "var(--coral)";
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: dotColor }}
        aria-hidden
      />
      <span className="text-[13px] tabular-nums" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif", minWidth: "3.5rem" }}>
        {event.time}
      </span>
      <span className="text-[13px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
        {event.label}
      </span>
    </div>
  );
}
