import { useState } from "react";
import { Sun, Smile, Meh, Moon, CloudRain, CloudLightning } from "lucide-react";
import { getMoodForDate, saveMoodEntry, getLastSevenDaysMood, hasStrugglingThreeInARow, type MoodKey } from "../utils/moodStorage";
import { detectOverwhelmedPattern } from "../utils/ragePattern";
import { format } from "date-fns";

const MOODS: { key: MoodKey; icon: React.ReactNode; label: string }[] = [
  { key: "great", icon: <Sun className="w-6 h-6" />, label: "Great" },
  { key: "good", icon: <Smile className="w-6 h-6" />, label: "Good" },
  { key: "okay", icon: <Meh className="w-6 h-6" />, label: "Okay" },
  { key: "tired", icon: <Moon className="w-6 h-6" />, label: "Tired" },
  { key: "struggling", icon: <CloudRain className="w-6 h-6" />, label: "Struggling" },
  { key: "overwhelmed", icon: <CloudLightning className="w-6 h-6" />, label: "Overwhelmed" },
];

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const OVERWHELMED_ACK =
  "Feeling overwhelmed or sudden intense anger after having a baby is a recognised response to hormonal changes and exhaustion. It's common, it's real, and it is not a character flaw. You are not a bad parent.";

const SUPPORT_CARD_DISMISS_KEY = "cradl-overwhelmed-support-dismissed";

function wasOverwhelmedSupportDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(SUPPORT_CARD_DISMISS_KEY);
    if (!raw) return false;
    const t = parseInt(raw, 10);
    return Date.now() - t < 14 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markOverwhelmedSupportDismissed(): void {
  try {
    localStorage.setItem(SUPPORT_CARD_DISMISS_KEY, String(Date.now()));
  } catch {}
}

export function WellbeingCard() {
  const [dismissed, setDismissed] = useState(false);
  const [overwhelmedPending, setOverwhelmedPending] = useState<MoodKey | null>(null);
  const today = todayStr();
  const alreadyAnswered = getMoodForDate(today) != null;
  const lastSeven = getLastSevenDaysMood();
  const showStrugglingSupport = hasStrugglingThreeInARow();
  const overwhelmedPattern = detectOverwhelmedPattern(lastSeven);
  const showOverwhelmedSupport = overwhelmedPattern?.shouldSuggestSupport === true && !wasOverwhelmedSupportDismissedRecently();
  const showQuestion = !alreadyAnswered;

  if (alreadyAnswered && !showStrugglingSupport && !showOverwhelmedSupport && lastSeven.length === 0) return null;

  const handleSelect = (mood: MoodKey) => {
    if (mood === "overwhelmed") {
      setOverwhelmedPending("overwhelmed");
      return;
    }
    saveMoodEntry({ date: today, mood });
    setDismissed(true);
  };

  const handleOverwhelmedThanks = () => {
    if (overwhelmedPending === "overwhelmed") {
      saveMoodEntry({ date: today, mood: "overwhelmed" });
      setOverwhelmedPending(null);
      setDismissed(true);
    }
  };

  const handleTellMeMore = () => {
    if (overwhelmedPending === "overwhelmed") {
      saveMoodEntry({ date: today, mood: "overwhelmed" });
      setOverwhelmedPending(null);
      setDismissed(true);
    }
    // In a full implementation this would open postnatal-rage.md article; for now just dismiss
  };

  if (alreadyAnswered) {
    return (
      <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
        <p className="text-[13px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Mood (last 7 days)
        </p>
        <div className="flex gap-2 flex-wrap">
          {lastSeven.map((e) => (
            <div key={e.date} className="flex flex-col items-center gap-0.5">
              <span className="text-[18px]" title={e.mood} style={e.mood === "overwhelmed" ? { color: "var(--rose-500, #e87474)" } : undefined}>
                {MOODS.find((m) => m.key === e.mood)?.icon ?? <CloudLightning className="w-6 h-6" />}
              </span>
              <span className="text-[11px]" style={{ color: "var(--mu)" }}>{format(new Date(e.date), "dd/MM")}</span>
            </div>
          ))}
        </div>
        {showStrugglingSupport && (
          <div className="mt-3 p-3 rounded-xl border" style={{ background: "rgba(240,160,192,0.1)", borderColor: "var(--pink)" }}>
            <p className="text-[13px] leading-snug" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
              It sounds like things have been hard lately. You&apos;re doing an incredible job. If you need support, your GP or the PANDAS helpline (0808 1961 776) is always there.
            </p>
          </div>
        )}
        {showOverwhelmedSupport && (
          <div className="mt-3 p-3 rounded-xl border flex flex-col gap-2" style={{ background: "rgba(232,116,116,0.08)", borderColor: "var(--rose-500, #e87474)" }}>
            <p className="text-[13px] leading-snug" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
              {overwhelmedPattern?.message}
            </p>
            <button type="button" onClick={markOverwhelmedSupportDismissed} className="text-left text-xs opacity-70 hover:opacity-100" style={{ color: "var(--mu)" }}>
              Dismiss for 14 days
            </button>
          </div>
        )}
      </div>
    );
  }

  if (overwhelmedPending === "overwhelmed") {
    return (
      <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
        <p className="text-[14px] leading-snug mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          {OVERWHELMED_ACK}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={handleOverwhelmedThanks} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>
            Thanks — save this
          </button>
          <button type="button" onClick={handleTellMeMore} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>
            Tell me more
          </button>
        </div>
      </div>
    );
  }

  if (!showQuestion) return null;

  return (
    <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <p className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        How are you feeling today, Mum?
      </p>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => handleSelect(m.key)}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-transparent hover:border-[var(--bd)] transition-colors min-h-[60px] min-w-[52px]"
            style={{ color: "var(--tx)" }}
            title={m.label}
          >
            {m.icon}
            <span className="text-[12px]" style={{ fontFamily: "system-ui, sans-serif" }}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
