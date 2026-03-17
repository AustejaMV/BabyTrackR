/**
 * "Is this normal?" — compares baby's metrics to age-appropriate normal ranges.
 */

import { useMemo } from "react";
import { RangeBar } from "./RangeBar";
import { getNormalRange, assessMetric } from "../data/normalRanges";
import { getReassuranceForMetric } from "../utils/reassuranceUtils";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BabyProfile } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * MS_PER_DAY;

function getAgeInWeeks(birthDateMs: number): number {
  return Math.max(0, Math.floor((Date.now() - birthDateMs) / (7 * MS_PER_DAY)));
}

function getDayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface ComparativeInsightsProps {
  sleepHistory: SleepRecord[];
  feedingHistory: FeedingRecord[];
  diaperHistory: DiaperRecord[];
  tummyHistory: TummyTimeRecord[];
  babyProfile: BabyProfile | null;
}

export function ComparativeInsights({
  sleepHistory,
  feedingHistory,
  diaperHistory,
  tummyHistory,
  babyProfile,
}: ComparativeInsightsProps) {
  const birthMs = babyProfile?.birthDate ?? null;
  const ageInWeeks = birthMs != null ? getAgeInWeeks(birthMs) : null;

  const metrics = useMemo(() => {
    if (ageInWeeks == null) return null;
    const now = Date.now();
    const todayStart = getDayStart(now);

    let feedsToday = 0;
    (feedingHistory ?? []).forEach((f) => {
      const t = f.endTime ?? f.timestamp;
      if (t >= todayStart) feedsToday++;
    });

    let sleepMsToday = 0;
    (sleepHistory ?? []).forEach((s) => {
      const end = s.endTime ?? 0;
      if (end > 0 && end >= todayStart) {
        const start = s.startTime;
        sleepMsToday += Math.max(0, end - Math.max(start, todayStart)) - (s.excludedMs ?? 0);
      }
    });
    const sleepHoursToday = sleepMsToday / (60 * 60 * 1000);

    let diapersToday = (diaperHistory ?? []).filter((d) => d.timestamp >= todayStart).length;

    let tummyMsToday = 0;
    (tummyHistory ?? []).forEach((t) => {
      if (t.startTime >= todayStart && t.endTime != null) {
        tummyMsToday += Math.max(0, t.endTime - t.startTime - (t.excludedMs ?? 0));
      }
    });
    const tummyMinToday = tummyMsToday / (60 * 1000);

    const weekStart = now - SEVEN_DAYS;
    let feedsWeek = 0;
    (feedingHistory ?? []).forEach((f) => {
      const t = f.endTime ?? f.timestamp;
      if (t >= weekStart) feedsWeek++;
    });
    const feedsPerDayWeek = feedsWeek / 7;

    let sleepMsWeek = 0;
    (sleepHistory ?? []).forEach((s) => {
      const end = s.endTime ?? 0;
      if (end >= weekStart) {
        const start = s.startTime;
        sleepMsWeek += Math.max(0, end - Math.max(start, weekStart)) - (s.excludedMs ?? 0);
      }
    });
    const sleepHoursPerDayWeek = sleepMsWeek / (7 * 60 * 60 * 1000);

    let diapersWeek = (diaperHistory ?? []).filter((d) => d.timestamp >= weekStart).length;
    const diapersPerDayWeek = diapersWeek / 7;

    let tummyMsWeek = 0;
    (tummyHistory ?? []).forEach((t) => {
      if (t.startTime >= weekStart && t.endTime != null) {
        tummyMsWeek += Math.max(0, t.endTime - t.startTime - (t.excludedMs ?? 0));
      }
    });
    const tummyMinPerDayWeek = tummyMsWeek / (7 * 60 * 1000);

    return {
      feedsToday,
      sleepHoursToday,
      diapersToday,
      tummyMinToday,
      feedsPerDayWeek,
      sleepHoursPerDayWeek,
      diapersPerDayWeek,
      tummyMinPerDayWeek,
    };
  }, [ageInWeeks, sleepHistory, feedingHistory, diaperHistory, tummyHistory]);

  if (birthMs == null) {
    return (
      <div
        className="rounded-2xl border p-3 mb-2"
        style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        role="region"
        aria-label="Age-appropriate comparisons"
      >
        <p className="text-[14px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Set birth date in Settings to see age-appropriate comparisons.
        </p>
      </div>
    );
  }

  if (metrics == null) return null;

  const rows: { label: string; value: number; valueLabel: string; metric: string; rangeMin: number; rangeMax: number }[] = [];
  const feedRange = getNormalRange("feedsPerDay", ageInWeeks!);
  if (feedRange) {
    rows.push({
      label: "Feeds today",
      value: metrics.feedsToday,
      valueLabel: `${metrics.feedsToday} feeds`,
      metric: "feedsPerDay",
      rangeMin: feedRange.min,
      rangeMax: feedRange.max,
    });
  }
  const sleepRange = getNormalRange("sleepHoursPerDay", ageInWeeks!);
  if (sleepRange) {
    rows.push({
      label: "Sleep today",
      value: metrics.sleepHoursToday,
      valueLabel: `${metrics.sleepHoursToday.toFixed(1)}h`,
      metric: "sleepHoursPerDay",
      rangeMin: sleepRange.min,
      rangeMax: sleepRange.max,
    });
  }
  const diaperRange = getNormalRange("diaperChangesPerDay", ageInWeeks!);
  if (diaperRange) {
    rows.push({
      label: "Diapers today",
      value: metrics.diapersToday,
      valueLabel: `${metrics.diapersToday}`,
      metric: "diaperChangesPerDay",
      rangeMin: diaperRange.min,
      rangeMax: diaperRange.max,
    });
  }
  const tummyRange = getNormalRange("tummyTimeMinPerDay", ageInWeeks!);
  if (tummyRange) {
    rows.push({
      label: "Tummy time today",
      value: metrics.tummyMinToday,
      valueLabel: `${Math.round(metrics.tummyMinToday)}m`,
      metric: "tummyTimeMinPerDay",
      rangeMin: tummyRange.min,
      rangeMax: tummyRange.max,
    });
  }

  const scaleMax = (r: { rangeMin: number; rangeMax: number }) => Math.max(r.rangeMax * 1.2, r.rangeMin + 1);

  return (
    <div
      className="rounded-2xl border p-3 mb-2"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Age-appropriate comparisons"
    >
      <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Is this normal?
      </p>
      {rows.map((row) => {
        const assessment = assessMetric(row.value, row.metric, ageInWeeks!);
        const maxVal = scaleMax(row);
        const rangeStart = (row.rangeMin / maxVal) * 100;
        const rangeWidth = ((row.rangeMax - row.rangeMin) / maxVal) * 100;
        const babyPct = Math.min(100, (row.value / maxVal) * 100);
        const valueColour =
          assessment.status === "normal" ? "var(--grn)" : assessment.status === "low" ? "var(--med-col)" : "var(--coral)";
        return (
          <div key={row.metric} className="mb-3.5 last:mb-0">
            <RangeBar
              label={row.label}
              value={assessment.status === "normal" ? `${row.valueLabel} — in range` : row.valueLabel}
              valueColour={valueColour}
              showValueInHeader={false}
              rangeStart={rangeStart}
              rangeWidth={rangeWidth}
              babyValue={babyPct}
              barColour="#c8e0c4"
              captionLeft={`${row.rangeMin}`}
              captionRight={`${row.rangeMax}`}
            />
            {assessment.message && assessment.status !== "normal" && (
              <p className="text-[11px] mt-0.5 pl-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                {assessment.message}
              </p>
            )}
            {assessment.status === "low" || assessment.status === "high" ? (() => {
              const babyName = babyProfile?.name ?? null;
              const reassurance = getReassuranceForMetric(babyName, row.metric, row.value, assessment.status);
              return reassurance ? (
                <p className="text-[12px] mt-1 pl-0.5" style={{ color: "var(--mu)", fontFamily: "Georgia, serif" }}>
                  {reassurance}
                </p>
              ) : null;
            })() : null}
          </div>
        );
      })}
    </div>
  );
}
