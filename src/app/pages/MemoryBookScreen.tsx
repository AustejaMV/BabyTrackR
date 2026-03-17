/**
 * Memory book: day entries and monthly recaps (Premium).
 */

import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import { PremiumGate } from "../components/PremiumGate";
import { DayCard } from "../components/DayCard";
import { MonthlyRecapCard } from "../components/MonthlyRecapCard";
import { AddDayMemorySheet } from "../components/AddDayMemorySheet";
import { AddMonthlyRecapSheet } from "../components/AddMonthlyRecapSheet";
import {
  getMemoryDays,
  getMonthlyRecaps,
  deleteMemoryDay,
  deleteMonthlyRecap,
} from "../utils/memoryStorage";
import type { MemoryDayEntry, MemoryMonthlyRecap } from "../types/memory";

function MemoryBookContent() {
  const [days, setDays] = useState(getMemoryDays());
  const [recaps, setRecaps] = useState(getMonthlyRecaps());
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [recapSheetOpen, setRecapSheetOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<MemoryDayEntry | null>(null);
  const [editingRecap, setEditingRecap] = useState<MemoryMonthlyRecap | null>(null);

  const refresh = () => {
    setDays(getMemoryDays());
    setRecaps(getMonthlyRecaps());
  };

  const byMonth = days.reduce<Record<string, MemoryDayEntry[]>>((acc, e) => {
    const ym = e.date.slice(0, 7);
    if (!acc[ym]) acc[ym] = [];
    acc[ym].push(e);
    return acc;
  }, {});
  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const handleShareRecap = (recap: MemoryMonthlyRecap) => {
    const [y, m] = recap.yearMonth.split("-");
    const label = format(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1), "MMMM yyyy");
    const text = `${label}\n\n${recap.note}`;
    if (navigator.share) {
      navigator.share({ title: `Recap: ${label}`, text }).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ background: "var(--bg)", borderColor: "var(--bd)" }}>
        <Link to="/more" className="p-2 -ml-2 rounded-full" aria-label="Back to More">
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--tx)" }} />
        </Link>
        <h1 className="text-lg font-semibold flex-1" style={{ color: "var(--tx)" }}>
          Memory book
        </h1>
      </header>

      <div className="px-4 py-4 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-medium" style={{ color: "var(--tx)" }}>Days</h2>
            <button
              type="button"
              onClick={() => { setEditingDay(null); setDaySheetOpen(true); }}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-[13px] font-medium"
              style={{ background: "var(--pink)", color: "white" }}
            >
              <Plus className="w-4 h-4" aria-hidden /> Add day
            </button>
          </div>
          {days.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--mu)" }}>
              Add a photo or note for any day to build your memory book.
            </p>
          ) : (
            <div className="space-y-6">
              {monthKeys.map((ym) => {
                const [y, m] = ym.split("-");
                const label = format(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1), "MMMM yyyy");
                return (
                  <div key={ym}>
                    <h3 className="text-[13px] font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--mu)" }}>{label}</h3>
                    <div className="space-y-3">
                      {byMonth[ym].map((entry) => (
                        <DayCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => { setEditingDay(entry); setDaySheetOpen(true); }}
                          onDelete={() => { deleteMemoryDay(entry.id); refresh(); }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-medium" style={{ color: "var(--tx)" }}>Monthly recaps</h2>
            <button
              type="button"
              onClick={() => { setEditingRecap(null); setRecapSheetOpen(true); }}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-[13px] font-medium"
              style={{ background: "var(--pink)", color: "white" }}
            >
              <Plus className="w-4 h-4" aria-hidden /> Add recap
            </button>
          </div>
          {recaps.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--mu)" }}>
              Write a short recap for any month to look back on.
            </p>
          ) : (
            <div className="space-y-3">
              {recaps.map((recap) => (
                <MonthlyRecapCard
                  key={recap.id}
                  recap={recap}
                  onShare={() => handleShareRecap(recap)}
                  onEdit={() => { setEditingRecap(recap); setRecapSheetOpen(true); }}
                  onDelete={() => { deleteMonthlyRecap(recap.id); refresh(); }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {daySheetOpen && (
        <AddDayMemorySheet
          existing={editingDay}
          onClose={() => { setDaySheetOpen(false); setEditingDay(null); }}
          onSaved={refresh}
        />
      )}
      {recapSheetOpen && (
        <AddMonthlyRecapSheet
          existing={editingRecap}
          onClose={() => { setRecapSheetOpen(false); setEditingRecap(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

export function MemoryBookScreen() {
  return (
    <PremiumGate feature="Memory book — save photos and notes by day, monthly recaps, and shareable recaps.">
      <MemoryBookContent />
    </PremiumGate>
  );
}
