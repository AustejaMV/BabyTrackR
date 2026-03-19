import { useState, useMemo } from "react";
import { getReturnToWorkPlan } from "../utils/returnToWorkStorage";
import { Briefcase, X } from "lucide-react";

const DISMISS_PREFIX = "cradl-rtw-countdown-dismissed-";

const MESSAGES: Record<number, string> = {
  7: "7 days to go. The logistics are mostly sorted. How are you feeling about it?",
  5: "5 days. You have done something extraordinary. Going back is just the next chapter, not the end of this one.",
  3: "3 days to go. It's okay to feel overwhelmed. You're not failing; you're human.",
  1: "1 day to go. You have done something extraordinary this year. Tomorrow is just the next chapter.",
  0: "Today's the day. You've prepared. You're ready. And you'll be home before you know it.",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateISO: string): number {
  const target = new Date(dateISO);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function isDismissedToday(dateISO: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${dateISO}`) === todayISO();
  } catch {
    return false;
  }
}

function dismissToday(dateISO: string): void {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${dateISO}`, todayISO());
  } catch {}
}

export function ReturnToWorkCountdown() {
  const plan = useMemo(() => getReturnToWorkPlan(), []);
  const [dismissed, setDismissed] = useState(false);

  if (!plan?.returnDate) return null;

  const days = daysUntil(plan.returnDate);
  if (days < 0 || days > 7) return null;

  const message = MESSAGES[days];
  if (!message) return null;

  if (dismissed || isDismissedToday(plan.returnDate)) return null;

  const handleDismiss = () => {
    dismissToday(plan.returnDate);
    setDismissed(true);
  };

  return (
    <div
      className="rounded-2xl border p-4 mx-3 mb-2"
      style={{ background: "var(--card)", borderColor: "var(--bd)", position: "relative" }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 rounded-full"
        style={{ color: "var(--mu)", background: "none", border: "none", cursor: "pointer" }}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--pink) 12%, transparent)" }}
        >
          <Briefcase className="w-4 h-4" style={{ color: "var(--pink)" }} />
        </div>
        <div className="pr-6">
          <p className="text-[14px] font-semibold" style={{ color: "var(--tx)" }}>
            {days === 0 ? "Return to work — today" : `Return to work in ${days} day${days === 1 ? "" : "s"}`}
          </p>
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "var(--mu)", fontFamily: "Georgia, serif" }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
