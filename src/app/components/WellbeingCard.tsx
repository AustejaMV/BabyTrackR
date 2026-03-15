import { useState } from "react";
import { Sun, Smile, Meh, Moon, CloudRain } from "lucide-react";
import { getMoodForDate, saveMoodEntry, getLastSevenDaysMood, hasStrugglingThreeInARow, type MoodKey } from "../utils/moodStorage";
import { format } from "date-fns";

const MOODS: { key: MoodKey; icon: React.ReactNode; label: string }[] = [
  { key: "great", icon: <Sun className="w-6 h-6" />, label: "Great" },
  { key: "good", icon: <Smile className="w-6 h-6" />, label: "Good" },
  { key: "okay", icon: <Meh className="w-6 h-6" />, label: "Okay" },
  { key: "tired", icon: <Moon className="w-6 h-6" />, label: "Tired" },
  { key: "struggling", icon: <CloudRain className="w-6 h-6" />, label: "Struggling" },
];

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function WellbeingCard() {
  const [dismissed, setDismissed] = useState(false);
  const today = todayStr();
  const alreadyAnswered = getMoodForDate(today) != null;
  const lastSeven = getLastSevenDaysMood();
  const showStrugglingSupport = hasStrugglingThreeInARow();
  const showQuestion = !alreadyAnswered;

  if (alreadyAnswered && !showStrugglingSupport && lastSeven.length === 0) return null;

  const handleSelect = (mood: MoodKey) => {
    saveMoodEntry({ date: today, mood });
    setDismissed(true);
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
              <span className="text-[18px]" title={e.mood}>
                {MOODS.find((m) => m.key === e.mood)?.icon}
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
      </div>
    );
  }

  if (!showQuestion) return null;

  return (
    <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <p className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        How are you feeling today, Mum?
      </p>
      <div className="flex justify-between gap-2">
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => handleSelect(m.key)}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-transparent hover:border-[var(--bd)] transition-colors min-h-[60px]"
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
