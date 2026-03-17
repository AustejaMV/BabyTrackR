/**
 * Once per day after 05:30: "How much sleep did you get last night?" — 4 options, skip.
 */

import { useState, useEffect } from "react";
import { getMumSleepForDate, saveMumSleepEntry } from "../utils/mumSleepStorage";
import type { MumSleepRange } from "../types/mumSleep";

const PROMPT_DATE_KEY = "cradl-mum-sleep-prompt-date";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shouldShowPrompt(): boolean {
  try {
    const hour = new Date().getHours();
    if (hour < 5 || (hour === 5 && new Date().getMinutes() < 30)) return false;
    const last = localStorage.getItem(PROMPT_DATE_KEY);
    if (last === todayStr()) return false;
    return true;
  } catch {
    return false;
  }
}

const RANGES: { value: MumSleepRange; label: string }[] = [
  { value: "under_2h", label: "Less than 2h" },
  { value: "2_to_4h", label: "2–4 hours" },
  { value: "4_to_6h", label: "4–6 hours" },
  { value: "6h_plus", label: "6 or more hours" },
];

export function MumSleepPrompt() {
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (getMumSleepForDate(todayStr()) != null) {
      try {
        localStorage.setItem(PROMPT_DATE_KEY, todayStr());
      } catch {}
      return;
    }
    setVisible(shouldShowPrompt());
  }, []);

  const handleSelect = (sleepRange: MumSleepRange) => {
    try {
      saveMumSleepEntry({
        date: todayStr(),
        sleepRange,
        loggedAt: new Date().toISOString(),
      });
      localStorage.setItem(PROMPT_DATE_KEY, todayStr());
      setSaved(true);
      setTimeout(() => {
        setVisible(false);
      }, 1200);
    } catch {
      setVisible(false);
    }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(PROMPT_DATE_KEY, todayStr());
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="rounded-2xl border p-4 mb-3 animate-in slide-in-from-top-2 duration-300"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Mum's sleep check-in"
    >
      {saved ? (
        <p className="text-[14px] text-center py-2" style={{ color: "var(--tx)" }}>
          Got it. Take care of yourself.
        </p>
      ) : (
        <>
          <p className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            How much sleep did you get last night?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleSelect(r.value)}
                className="py-3 px-3 rounded-xl border text-sm font-medium"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="mt-2 text-xs"
            style={{ color: "var(--mu)" }}
          >
            Skip today
          </button>
        </>
      )}
    </div>
  );
}
