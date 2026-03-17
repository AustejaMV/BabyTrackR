import { useState, useEffect } from "react";
import { detectSleepRegression } from "../utils/sleepRegression";
import type { SleepRecord } from "../types";

const DISMISS_KEY = "cradl-regression-dismissed";

export function RegressionCard() {
  const [dismissed, setDismissed] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof detectSleepRegression>>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { type, dismissedAt } = JSON.parse(raw);
        if (type && dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) setDismissed(true);
      }
    } catch {}
    try {
      const sleepHistory = JSON.parse(localStorage.getItem("sleepHistory") || "[]") as SleepRecord[];
      const babyProfile = JSON.parse(localStorage.getItem("babyProfile") || "null") as { birthDate?: number } | null;
      const ageWeeks = babyProfile?.birthDate
        ? Math.floor((Date.now() - babyProfile.birthDate) / (7 * 24 * 60 * 60 * 1000))
        : null;
      const r = detectSleepRegression(sleepHistory, ageWeeks);
      setResult(r);
    } catch {
      setResult(null);
    }
  }, []);

  if (dismissed || !result?.detected) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ type: result.type, dismissedAt: Date.now() })
      );
    } catch {}
  };

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "color-mix(in srgb, var(--pink) 10%, var(--card))", borderColor: "var(--pink)" }}
      role="region"
      aria-label="Sleep regression notice"
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--tx)" }}>Sleep pattern change</p>
          <p className="text-[13px] leading-snug" style={{ color: "var(--tx)" }}>{result.message}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg shrink-0"
          style={{ color: "var(--mu)" }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
