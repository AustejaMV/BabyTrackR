import { useState, useEffect } from "react";
import { format } from "date-fns";
import { getTimelineEventsForDay, getBorderColorForKind } from "../utils/timelineUtils";
import { readStoredArray } from "../utils/warningUtils";
import type { TimelineEvent, TimelineEventKind, FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord, BottleRecord, PumpRecord } from "../types";

function getIcon(kind: TimelineEventKind) {
  const stroke = kind === "feed" || kind === "bottle" ? "var(--coral)" : kind === "sleep" ? "var(--blue)" : kind === "diaper" ? "var(--grn)" : kind === "tummy" ? "var(--purp)" : "var(--pink)";
  if (kind === "feed" || kind === "bottle") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v2.5M6 3.5A3 3 0 0 0 8 10a3 3 0 0 0 2-6.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6.5 5.5h3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "sleep") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z" stroke={stroke} strokeWidth="1.4" />
        <path d="M8 6v3l1.5 1" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "diaper") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M4 8c0-2 8-2 8 0s-.5 4.5-4 4.5S4 10 4 8z" stroke={stroke} strokeWidth="1.4" />
        <path d="M8 8V5.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "tummy") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="8" width="10" height="5.5" rx="2" stroke={stroke} strokeWidth="1.4" />
        <path d="M6 8V6.5a2 2 0 0 1 4 0V8" stroke={stroke} strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="7" y="2" width="4" height="14" rx="2" stroke={stroke} strokeWidth="1.5" />
      <rect x="2" y="7" width="14" height="4" rx="2" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

interface TodayTimelineModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, only show events of this type */
  filter?: TimelineEventKind | null;
  /** When an entry is tapped, open edit sheet (Prompt 11) */
  onEdit?: (event: TimelineEvent) => void;
  /** Increment to refetch timeline (e.g. after edit/delete) */
  refreshKey?: number;
}

export function TodayTimelineModal({ open, onClose, filter = null, onEdit, refreshKey = 0 }: TodayTimelineModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [todayEvents, setTodayEvents] = useState<TimelineEvent[]>([]);
  const [yesterdayEvents, setYesterdayEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!open) return;
    const feedingHistory = readStoredArray<FeedingRecord>("feedingHistory");
    const sleepHistory = readStoredArray<SleepRecord>("sleepHistory");
    const diaperHistory = readStoredArray<DiaperRecord>("diaperHistory");
    const tummyTimeHistory = readStoredArray<TummyTimeRecord>("tummyTimeHistory");
    const bottleHistory = readStoredArray<BottleRecord>("bottleHistory");
    const pumpHistory = readStoredArray<PumpRecord>("pumpHistory");

    const dayStart = selectedDate;
    const yesterdayStart = dayStart - 24 * 60 * 60 * 1000;
    const isToday = dayStart === new Date().setHours(0, 0, 0, 0);

    const data = {
      feedingHistory,
      sleepHistory,
      diaperHistory,
      tummyTimeHistory,
      bottleHistory,
      pumpHistory,
      useDateOnLabel: !isToday,
    };

    let today = getTimelineEventsForDay(dayStart, data);
    let yesterday = getTimelineEventsForDay(yesterdayStart, { ...data, useDateOnLabel: true });

    if (filter) {
      today = today.filter((e) => e.kind === filter);
      yesterday = yesterday.filter((e) => e.kind === filter);
    }

    setTodayEvents(today);
    setYesterdayEvents(yesterday);
  }, [open, selectedDate, filter, refreshKey]);

  if (!open) return null;

  const dayLabel = format(selectedDate, "EEEE, d MMM yyyy");
  const isToday = selectedDate === new Date().setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--bg)] w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col border border-[var(--bd)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--bd)] flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            {filter ? `Today: ${filter}` : "Today's activity"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg2)]" style={{ color: "var(--mu)" }} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-3 border-b border-[var(--bd)] flex-shrink-0">
          <label className="block text-[10px] mb-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Jump to date</label>
          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setSelectedDate(new Date(v).setHours(0, 0, 0, 0));
            }}
            className="w-full rounded-xl border px-3 py-2 text-[13px]"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {isToday ? "Today" : dayLabel}
            </h3>
            {todayEvents.length === 0 ? (
              <p className="text-[13px] py-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>No events logged for this day.</p>
            ) : (
              <ul className="space-y-1">
                {todayEvents.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onEdit?.(ev)}
                      className="w-full flex items-center gap-3 rounded-xl border py-2.5 px-3 text-left transition-colors hover:bg-[var(--bg2)]"
                      style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                    >
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: getBorderColorForKind(ev.kind) }} />
                      <span className="text-[13px] tabular-nums w-14 flex-shrink-0" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{ev.timeLabel}</span>
                      <span className="flex-shrink-0 text-[var(--tx)]">{getIcon(ev.kind)}</span>
                      <span className="text-[13px] min-w-0 truncate" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{ev.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Yesterday</h3>
            {yesterdayEvents.length === 0 ? (
              <p className="text-[13px] py-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>No events logged.</p>
            ) : (
              <ul className="space-y-1">
                {yesterdayEvents.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onEdit?.(ev)}
                      className="w-full flex items-center gap-3 rounded-xl border py-2.5 px-3 text-left transition-colors hover:bg-[var(--bg2)]"
                      style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                    >
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: getBorderColorForKind(ev.kind) }} />
                      <span className="text-[13px] tabular-nums w-20 flex-shrink-0" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{ev.timeLabel}</span>
                      <span className="flex-shrink-0 text-[var(--tx)]">{getIcon(ev.kind)}</span>
                      <span className="text-[13px] min-w-0 truncate" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{ev.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
