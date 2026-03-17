/**
 * Sleep pattern summary card — surfaces patterns from fall-asleep method, wake mood, location.
 */

import { useMemo } from "react";
import { getSleepPatternSummary } from "../utils/sleepPatternUtils";
import type { SleepRecord } from "../types";

export interface SleepPatternCardProps {
  sleepHistory: SleepRecord[];
  babyName?: string | null;
}

export function SleepPatternCard({ sleepHistory, babyName }: SleepPatternCardProps) {
  const summary = useMemo(
    () => getSleepPatternSummary(sleepHistory, babyName ?? null),
    [sleepHistory, babyName]
  );

  if (!summary.hasEnoughData || summary.lines.length === 0) return null;

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Sleep patterns"
    >
      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Sleep patterns
      </p>
      <ul className="space-y-1.5 text-[13px]" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        {summary.lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
