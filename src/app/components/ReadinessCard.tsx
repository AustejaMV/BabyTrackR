import { useMemo } from "react";
import { generateReadinessCards } from "../utils/readinessUtils";

export function ReadinessCard() {
  const cards = useMemo(() => {
    try {
      const babyProfile = JSON.parse(localStorage.getItem("babyProfile") || "null") as { birthDate?: number } | null;
      const babyDob = babyProfile?.birthDate ?? null;
      const sleepHistory = JSON.parse(localStorage.getItem("sleepHistory") || "[]") as { startTime: number; endTime?: number }[];
      const napCount = sleepHistory.filter((s) => s.endTime != null).length;
      const solidHistory = JSON.parse(localStorage.getItem("solidFoodHistory") || "[]") as unknown[];
      return generateReadinessCards(babyDob, {
        napCount,
        solidsStarted: solidHistory.length > 0,
        nightFeedCount: undefined,
        inCot: undefined,
      });
    } catch {
      return [];
    }
  }, []);

  if (cards.length === 0) return null;

  const notReady = cards.filter((c) => !c.ready);
  if (notReady.length === 0) return null;

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Is she ready for..."
    >
      <p className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Is she ready for...?</p>
      <ul className="space-y-2">
        {notReady.slice(0, 2).map((c) => (
          <li key={c.id}>
            <p className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>{c.title}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--mu)" }}>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
