import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import type { MemoryDayEntry } from "../types/memory";
import { useBaby } from "../contexts/BabyContext";
import { getAgeMonthsWeeks } from "../utils/babyUtils";

interface DayStats {
  feeds: number;
  sleepH: string;
  nappies: number;
  tummyM: number;
}

function loadDayStats(dateStr: string): DayStats {
  const dayStart = new Date(dateStr + "T00:00:00").getTime();
  const dayEnd = dayStart + 86400000;
  let feeds = 0, sleepMs = 0, nappies = 0, tummyM = 0;
  try {
    const fh = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
    feeds = fh.filter((r: any) => { const t = r.endTime ?? r.timestamp ?? 0; return t >= dayStart && t < dayEnd; }).length;
  } catch {}
  try {
    const sh = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
    sh.forEach((s: any) => {
      const start = s.startTime ?? 0;
      const end = s.endTime ?? 0;
      if (!end) return;
      if (end >= dayStart && start < dayEnd) {
        sleepMs += Math.max(0, Math.min(end, dayEnd) - Math.max(start, dayStart));
      }
    });
  } catch {}
  try {
    const dh = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
    nappies = dh.filter((r: any) => { const t = r.timestamp ?? 0; return t >= dayStart && t < dayEnd; }).length;
  } catch {}
  try {
    const th = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]");
    th.forEach((t: any) => {
      if ((t.startTime ?? 0) >= dayStart && (t.startTime ?? 0) < dayEnd && t.endTime)
        tummyM += Math.round((t.endTime - t.startTime) / 60000);
    });
  } catch {}
  const sleepH = sleepMs >= 3600000 ? `${(sleepMs / 3600000).toFixed(1)}h` : sleepMs >= 60000 ? `${Math.round(sleepMs / 60000)}m` : "0m";
  return { feeds, sleepH, nappies, tummyM };
}

function loadMilestoneForDate(dateStr: string): string | null {
  try {
    const milestones = JSON.parse(localStorage.getItem("milestoneHistory") || "[]");
    const dayStart = new Date(dateStr + "T00:00:00").getTime();
    const dayEnd = dayStart + 86400000;
    const found = milestones.find((m: any) => {
      const t = m.timestamp ?? m.achievedAt ?? 0;
      return t >= dayStart && t < dayEnd;
    });
    return found?.title ?? found?.label ?? null;
  } catch { return null; }
}

function notesKey(babyId: string, dateStr: string) {
  return `memory-notes-${babyId}-${dateStr}`;
}

export interface DayCardModalProps {
  entry: MemoryDayEntry;
  onClose: () => void;
}

export function DayCardModal({ entry, onClose }: DayCardModalProps) {
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id ?? "default";
  const [notes, setNotes] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = loadDayStats(entry.date);
  const milestone = loadMilestoneForDate(entry.date);

  const dob = activeBaby?.birthDate;
  const ageLabel = dob
    ? getAgeMonthsWeeks(typeof dob === "number" ? dob : new Date(dob).getTime(), new Date(entry.date + "T12:00:00").getTime())
    : null;

  useEffect(() => {
    const saved = localStorage.getItem(notesKey(babyId, entry.date)) ?? "";
    setNotes(saved);
  }, [babyId, entry.date]);

  const saveNotes = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(notesKey(babyId, entry.date), text); } catch {}
    }, 500);
  }, [babyId, entry.date]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleNotesChange = (text: string) => {
    setNotes(text);
    saveNotes(text);
  };

  const dateLabel = format(new Date(entry.date + "T12:00:00"), "EEEE, d MMMM yyyy");

  const statItems = [
    { label: "Feeds", value: String(stats.feeds), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2h8v4l2 16H6L8 6V2z"/><path d="M8 6h8"/></svg> },
    { label: "Sleep", value: stats.sleepH, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M12 6v4"/><path d="M9 9h6"/></svg> },
    { label: "Nappies", value: String(stats.nappies), icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16"/><path d="M12 4v16"/></svg> },
    { label: "Tummy", value: `${stats.tummyM}m`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4h4v16H6z"/><path d="M14 4h4v16h-4z"/><path d="M10 12h4"/></svg> },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--bg)", display: "flex", flexDirection: "column" }}
      role="dialog"
      aria-label={`Memory for ${dateLabel}`}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid var(--bd)" }}>
        <div>
          <h2 style={{ fontSize: 16, fontFamily: "Georgia, serif", fontWeight: 600, color: "var(--tx)", margin: 0 }}>{dateLabel}</h2>
          {ageLabel && <p style={{ fontSize: 12, color: "var(--mu)", margin: "2px 0 0", fontFamily: "system-ui, sans-serif" }}>{ageLabel}</p>}
        </div>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--mu)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Photo */}
        {entry.photoDataUrl && (
          <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16, aspectRatio: "4/3", background: "var(--bd)" }}>
            <img src={entry.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* 2x2 stat grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {statItems.map((s) => (
            <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4, color: "var(--tx)" }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Milestone badge */}
        {milestone && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "var(--la)", marginBottom: 16 }}>
            <span style={{ display: "flex", alignItems: "center", color: "var(--tx)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{milestone}</span>
          </div>
        )}

        {/* Memory note from entry */}
        {entry.note && (
          <div style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: "var(--tx)", whiteSpace: "pre-wrap", margin: 0 }}>{entry.note}</p>
          </div>
        )}

        {/* Editable notes textarea */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 6, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add notes for this day…"
            rows={4}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)",
              fontSize: 14, fontFamily: "system-ui, sans-serif", resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--bd)" }}>
        <button
          type="button"
          onClick={onClose}
          style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: "var(--pink)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
