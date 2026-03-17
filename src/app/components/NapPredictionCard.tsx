/**
 * Nap window / sweet spot prediction card for the home screen.
 * Shows when baby has DOB and sleep history; otherwise prompts to set DOB.
 */

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getSweetSpotPrediction } from "../utils/napPrediction";
import { getLastWakeTime } from "../utils/napPrediction";
import type { SleepRecord } from "../types";

const ARC_SIZE = 44;
const STROKE = 4;
const R = (ARC_SIZE - STROKE) / 2;
const CX = ARC_SIZE / 2;
const CY = ARC_SIZE / 2;

function statusColor(status: 'green' | 'amber' | 'red' | 'unknown'): string {
  switch (status) {
    case 'green': return 'var(--grn, #22c55e)';
    case 'amber': return 'var(--med-col, #f59e0b)';
    case 'red': return 'var(--coral, #e11d48)';
    default: return 'var(--mu, #6b7280)';
  }
}

function formatAwakeDuration(lastWakeTime: Date): string {
  const now = Date.now();
  const ms = now - lastWakeTime.getTime();
  const totalMins = Math.floor(ms / (60 * 1000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export interface NapPredictionCardProps {
  sleepHistory: SleepRecord[];
  babyDob: number | null;
  babyName?: string | null;
}

export function NapPredictionCard({ sleepHistory, babyDob, babyName }: NapPredictionCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (babyDob == null) {
    return (
      <div
        className="rounded-2xl border py-3.5 px-4 mb-3"
        style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        role="region"
        aria-label="Nap prediction"
      >
        <p className="text-[14px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Set birth date in Settings to see nap predictions.
        </p>
      </div>
    );
  }

  const prediction = getSweetSpotPrediction(sleepHistory, babyDob, now);
  if (!prediction) return null;

  const lastWake = getLastWakeTime(sleepHistory);
  const awakeDuration = lastWake ? formatAwakeDuration(lastWake) : null;

  const opensAt = prediction.opensAt.getTime();
  const closesAt = prediction.closesAt.getTime();
  let countdownText: string;
  if (now < opensAt) {
    const mins = Math.ceil((opensAt - now) / (60 * 1000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    countdownText = h > 0 ? `Window opens in ${h}h ${m}m` : `Window opens in ${m}m`;
  } else if (now <= closesAt) {
    const mins = Math.ceil((closesAt - now) / (60 * 1000));
    countdownText = mins > 0 ? `Window open · closes in ${mins}m` : "Window closing soon";
  } else {
    countdownText = "Past nap window — watch for tired signs";
  }

  const displayName = babyName?.trim() || "Baby";
  const color = statusColor(prediction.status);
  const dashArray = 2 * Math.PI * R;
  const dashOffset = 0;

  return (
    <div
      className="rounded-2xl border py-3.5 px-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label={`${displayName} nap window`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0" aria-hidden>
          <svg width={ARC_SIZE} height={ARC_SIZE} viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}>
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="var(--bd)"
              strokeWidth={STROKE}
            />
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            {displayName} nap window
          </h3>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Opens at {format(prediction.opensAt, "HH:mm")} · closes at {format(prediction.closesAt, "HH:mm")}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            {countdownText}
          </p>
          {awakeDuration && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              Awake {awakeDuration}
            </p>
          )}
          {prediction.hasPersonalisedData && prediction.personalisedTime && (
            <p className="text-[12px] mt-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              Based on {displayName}&apos;s pattern, she usually naps around {format(prediction.personalisedTime, "HH:mm")}.
            </p>
          )}
          <div className="mt-2">
            <span
              className="inline-block rounded-full px-2.5 py-1 text-[12px] font-medium"
              style={{
                background: `${color}22`,
                color: color,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {prediction.status === "green" && "Nap window open"}
              {prediction.status === "amber" && "Nap window approaching"}
              {prediction.status === "red" && "Past nap window"}
              {prediction.status === "unknown" && "Nap window not yet open"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
