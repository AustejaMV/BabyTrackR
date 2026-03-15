import { useState, useEffect } from "react";
import { format } from "date-fns";
import { saveData } from "../utils/dataSync";
import type { TimelineEvent, TimelineEventKind } from "../types";
import type { Session } from "@supabase/supabase-js";

const STORAGE_KEYS: Record<TimelineEventKind, string> = {
  feed: "feedingHistory",
  sleep: "sleepHistory",
  diaper: "diaperHistory",
  tummy: "tummyTimeHistory",
  bottle: "bottleHistory",
  pump: "pumpHistory",
};

/** Parse date (yyyy-MM-dd from date picker) and time (HH:mm) to epoch ms. */
function parseDateTimeFromPickers(dateStr: string, timeStr: string): number | null {
  if (!dateStr.trim()) return null;
  const [y, m, d] = dateStr.trim().split("-").map(Number);
  const [h = 0, min = 0] = (timeStr.trim() || "0:0").split(":").map(Number);
  if ([y, m, d].some(isNaN)) return null;
  const date = new Date(y, m - 1, d, h, min);
  return isNaN(date.getTime()) ? null : date.getTime();
}

interface LogEditSheetProps {
  event: TimelineEvent | null;
  onClose: () => void;
  onSaved: () => void;
  session: Session | null;
}

export function LogEditSheet({ event, onClose, onSaved, session }: LogEditSheetProps) {
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [extra, setExtra] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!event) return;
    const ts = event.forDatetime;
    const d = new Date(ts);
    setDateStr(format(d, "dd/MM/yyyy"));
    setTimeStr(format(d, "HH:mm"));
    const r = event.record as Record<string, unknown>;
    if (event.kind === "feed") {
      const seg = (r.segments as { type: string }[])?.[0];
      setExtra({ side: seg?.type?.includes("Left") ? "Left" : seg?.type?.includes("Right") ? "Right" : "Both", durationMs: (r.endTime as number) - (r.startTime as number) });
    } else if (event.kind === "sleep") {
      setExtra({ position: r.position ?? "Back", durationMs: ((r.endTime as number) ?? 0) - ((r.startTime as number) ?? 0) });
    } else if (event.kind === "diaper") {
      setExtra({ type: r.type ?? "pee" });
    } else if (event.kind === "tummy") {
      setExtra({ durationMs: ((r.endTime as number) ?? 0) - (r.startTime as number) });
    } else if (event.kind === "bottle") {
      setExtra({ volumeMl: r.volumeMl ?? 0, feedType: r.feedType ?? "expressed" });
    } else if (event.kind === "pump") {
      setExtra({ side: r.side ?? "both", volumeLeftMl: r.volumeLeftMl ?? 0, volumeRightMl: r.volumeRightMl ?? 0, durationMs: r.durationMs ?? 0 });
    }
  }, [event]);

  if (!event) return null;

  const key = STORAGE_KEYS[event.kind];

  const handleSave = () => {
    const ts = parseDateTimeFromPickers(dateStr, timeStr);
    if (!ts) return;
    try {
      const raw = localStorage.getItem(key);
      const arr: unknown[] = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((i: { id?: string }) => (i as { id: string }).id === event.id);
      if (idx < 0) return;
      const existing = arr[idx] as Record<string, unknown>;
      const updated = { ...existing, timestamp: ts, forDatetime: ts } as Record<string, unknown>;
      if (event.kind === "feed") {
        const durationMs = (extra.durationMs as number) ?? 0;
        updated.startTime = ts - durationMs;
        updated.endTime = ts;
        const sideLabel = extra.side === "Both" ? "Both breasts" : `${extra.side} breast`;
        updated.segments = [{ type: sideLabel, startTime: ts - durationMs, endTime: ts, durationMs }];
      } else if (event.kind === "sleep") {
        const durationMs = (extra.durationMs as number) ?? 0;
        updated.startTime = ts - durationMs;
        updated.endTime = ts;
        updated.position = extra.position;
      } else if (event.kind === "diaper") {
        updated.type = extra.type;
      } else if (event.kind === "tummy") {
        const durationMs = (extra.durationMs as number) ?? 0;
        updated.startTime = ts - durationMs;
        updated.endTime = ts;
      } else if (event.kind === "bottle") {
        updated.volumeMl = extra.volumeMl;
        updated.feedType = extra.feedType;
      } else if (event.kind === "pump") {
        updated.side = extra.side;
        updated.volumeLeftMl = extra.volumeLeftMl;
        updated.volumeRightMl = extra.volumeRightMl;
        updated.durationMs = extra.durationMs;
      }
      arr[idx] = updated;
      localStorage.setItem(key, JSON.stringify(arr));
      if (session?.access_token) saveData(key, arr, session.access_token);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      const arr: unknown[] = raw ? JSON.parse(raw) : [];
      const next = arr.filter((i: { id?: string }) => (i as { id: string }).id !== event.id);
      localStorage.setItem(key, JSON.stringify(next));
      if (session?.access_token) saveData(key, next, session.access_token);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const styleInput = "w-full rounded-lg border px-2 py-1.5 text-[12px] outline-none border-[var(--bd)] bg-[var(--bg2)] text-[var(--tx)]";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[var(--card)] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--bd)] p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          Edit {event.kind}
        </h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Date</label>
            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className={styleInput} />
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Time</label>
            <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className={styleInput} />
          </div>
          {event.kind === "feed" && (
            <>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Side</label>
                <select value={String(extra.side)} onChange={(e) => setExtra((x) => ({ ...x, side: e.target.value }))} className={styleInput}>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Duration (minutes)</label>
                <input type="number" value={Math.round((Number(extra.durationMs) || 0) / 60000)} onChange={(e) => setExtra((x) => ({ ...x, durationMs: Number(e.target.value) * 60000 }))} className={styleInput} />
              </div>
            </>
          )}
          {event.kind === "sleep" && (
            <>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Position</label>
                <select value={String(extra.position)} onChange={(e) => setExtra((x) => ({ ...x, position: e.target.value }))} className={styleInput}>
                  <option value="Back">Back</option>
                  <option value="Left side">Left side</option>
                  <option value="Right side">Right side</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Duration (minutes)</label>
                <input type="number" value={Math.round((Number(extra.durationMs) || 0) / 60000)} onChange={(e) => setExtra((x) => ({ ...x, durationMs: Number(e.target.value) * 60000 }))} className={styleInput} />
              </div>
            </>
          )}
          {event.kind === "diaper" && (
            <div>
              <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Type</label>
              <select value={String(extra.type)} onChange={(e) => setExtra((x) => ({ ...x, type: e.target.value }))} className={styleInput}>
                <option value="pee">Wet</option>
                <option value="poop">Dirty</option>
                <option value="both">Both</option>
              </select>
            </div>
          )}
          {event.kind === "tummy" && (
            <div>
              <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Duration (minutes)</label>
              <input type="number" value={Math.round((Number(extra.durationMs) || 0) / 60000)} onChange={(e) => setExtra((x) => ({ ...x, durationMs: Number(e.target.value) * 60000 }))} className={styleInput} />
            </div>
          )}
          {event.kind === "bottle" && (
            <>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Volume (ml)</label>
                <input type="number" value={Number(extra.volumeMl) || 0} onChange={(e) => setExtra((x) => ({ ...x, volumeMl: Number(e.target.value) }))} className={styleInput} />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Type</label>
                <select value={String(extra.feedType)} onChange={(e) => setExtra((x) => ({ ...x, feedType: e.target.value }))} className={styleInput}>
                  <option value="formula">Formula</option>
                  <option value="expressed">Expressed milk</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </>
          )}
          {event.kind === "pump" && (
            <>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Side</label>
                <select value={String(extra.side)} onChange={(e) => setExtra((x) => ({ ...x, side: e.target.value }))} className={styleInput}>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Left (ml)</label>
                  <input type="number" value={Number(extra.volumeLeftMl) || 0} onChange={(e) => setExtra((x) => ({ ...x, volumeLeftMl: Number(e.target.value) }))} className={styleInput} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Right (ml)</label>
                  <input type="number" value={Number(extra.volumeRightMl) || 0} onChange={(e) => setExtra((x) => ({ ...x, volumeRightMl: Number(e.target.value) }))} className={styleInput} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--mu)" }}>Duration (minutes)</label>
                <input type="number" value={Math.round((Number(extra.durationMs) || 0) / 60000)} onChange={(e) => setExtra((x) => ({ ...x, durationMs: Number(e.target.value) * 60000 }))} className={styleInput} />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border text-[12px]" style={{ borderColor: "var(--bd)", color: "var(--mu)" }}>Cancel</button>
          <button type="button" onClick={handleSave} className="flex-1 py-2 rounded-xl text-[12px] text-white" style={{ background: "var(--pink)" }}>Save</button>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--bd)]">
          <button type="button" onClick={handleDelete} className="text-[12px] text-red-500">
            {confirmDelete ? "Are you sure? This cannot be undone. Click again to delete." : "Delete this entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
