/**
 * List of foods introduced, grouped by week. First taste badge, reaction highlight.
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { getSolidHistory } from "../utils/solidsStorage";
import type { SolidFoodEntry } from "../types/solids";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.getTime();
}

export interface FoodsIntroducedListProps {
  /** If provided, only show when baby age >= 17 weeks */
  ageInWeeks: number | null;
  babyName?: string | null;
}

export function FoodsIntroducedList({ ageInWeeks, babyName }: FoodsIntroducedListProps) {
  const history = useMemo(() => getSolidHistory(), []);

  const byWeek = useMemo(() => {
    const map = new Map<number, SolidFoodEntry[]>();
    for (const e of history) {
      const ts = new Date(e.timestamp).getTime();
      const week = weekStart(ts);
      if (!map.has(week)) map.set(week, []);
      map.get(week)!.push(e);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return Array.from(map.entries()).sort(([a], [b]) => b - a);
  }, [history]);

  const firstTimeIds = useMemo(() => {
    const set = new Set<string>();
    const byFood = new Map<string, SolidFoodEntry>();
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const e of sorted) {
      const key = e.food.toLowerCase().trim();
      if (!byFood.has(key) && e.isFirstTime) set.add(e.id);
      byFood.set(key, e);
    }
    return set;
  }, [history]);

  const showSection = ageInWeeks != null && ageInWeeks >= 17;

  if (!showSection) {
    const name = babyName || "Baby";
    return (
      <div className="rounded-2xl border p-4 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }} role="region" aria-label="Foods introduced">
        <p className="text-[14px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Solid food tracking will appear here when {name} is ready (usually around 4–6 months).
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border p-4 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }} role="region" aria-label="Foods introduced">
        <h3 className="text-[15px] font-medium mb-2" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>Foods introduced</h3>
        <p className="text-[13px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>No solid foods logged yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }} role="region" aria-label="Foods introduced">
      <h3 className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>Foods introduced</h3>
      <div className="space-y-4">
        {byWeek.map(([weekMs, entries]) => (
          <div key={weekMs}>
            <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              Week of {format(weekMs, "d MMM yyyy")}
            </p>
            <ul className="space-y-2 list-none p-0 m-0">
              {entries.map((e) => {
                const isFirst = firstTimeIds.has(e.id);
                const isFlagged = e.reaction === "allergic_reaction" || e.allergenFlags.length > 0;
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0"
                    style={{
                      borderColor: "var(--bd)",
                      background: isFlagged ? "color-mix(in srgb, var(--coral) 8%, transparent)" : undefined,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{e.food}</span>
                      {isFirst && (
                        <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--grn)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                          First taste
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] shrink-0" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                      {e.reaction === "liked" ? "Liked" : e.reaction === "disliked" ? "Disliked" : e.reaction === "allergic_reaction" ? "Reaction" : e.reaction === "unsure" ? "Unsure" : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
