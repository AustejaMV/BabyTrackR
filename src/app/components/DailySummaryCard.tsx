import { useMemo } from "react";
import { format } from "date-fns";
import { generateDailySummary } from "../utils/dailySummary";
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord } from "../types";

interface DailySummaryCardProps {
  sleepHistory: SleepRecord[];
  feedingHistory: FeedingRecord[];
  diaperHistory: DiaperRecord[];
  tummyHistory: TummyTimeRecord[];
  parentName: string | null;
  date?: Date;
  /** Optional: for "good enough" sentence with targets (age in weeks from birth). */
  ageInWeeks?: number | null;
  babyName?: string | null;
}

export function DailySummaryCard({
  sleepHistory,
  feedingHistory,
  diaperHistory,
  tummyHistory,
  parentName,
  date = new Date(),
  ageInWeeks,
  babyName,
}: DailySummaryCardProps) {
  const summary = useMemo(
    () =>
      generateDailySummary(
        sleepHistory,
        feedingHistory,
        diaperHistory,
        tummyHistory,
        parentName,
        date,
        ageInWeeks != null ? { ageInWeeks, babyName } : undefined
      ),
    [sleepHistory, feedingHistory, diaperHistory, tummyHistory, parentName, date, ageInWeeks, babyName]
  );

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Today's summary"
    >
      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)" }}>
        {summary.date === format(new Date(), "yyyy-MM-dd") ? "Today" : format(new Date(summary.date), "d MMM")}
      </p>
      {summary.summarySentence ? (
        <p className="text-[13px] mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          {summary.summarySentence}
        </p>
      ) : (
        <ul className="space-y-1 text-[13px] mb-3" style={{ color: "var(--tx)" }}>
          {summary.lines.map((line, i) => (
            <li key={i} className={line.highlight ? "font-medium" : ""}>
              {line.text}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] italic" style={{ color: "var(--tx)" }}>
        {summary.acknowledgement}
      </p>
    </div>
  );
}
