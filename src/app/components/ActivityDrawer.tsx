/**
 * Activity / playtime log: type, duration (1–120 min), note.
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { saveActivityEntry } from "../utils/activityStorage";
import type { ActivityType } from "../types/activity";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "play", label: "Play" },
  { value: "bath", label: "Bath" },
  { value: "walk", label: "Walk" },
  { value: "story", label: "Story" },
  { value: "music", label: "Music" },
  { value: "sensory", label: "Sensory" },
  { value: "outdoor", label: "Outdoor" },
  { value: "other", label: "Other" },
];

const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export interface ActivityDrawerProps {
  onClose: () => void;
  onSaved: () => void;
}

function PastPanel({ expanded, onToggle, children }: { expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-[14px] border px-4 py-3.5 mb-3 text-left min-h-[48px]"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      >
        <span className="text-[14px]">Log a past activity</span>
        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} style={{ color: "var(--mu)" }} />
      </button>
      {expanded && children}
    </>
  );
}

export function ActivityDrawer({ onClose, onSaved }: ActivityDrawerProps) {
  const [activityType, setActivityType] = useState<ActivityType>("play");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [note, setNote] = useState("");
  const [pastExpanded, setPastExpanded] = useState(false);
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");

  const getTimestamp = (): string => {
    if (pastExpanded && pastDate.trim()) {
      const [y, m, d] = pastDate.split("-").map(Number);
      const [h = 0, min = 0] = pastTime.split(":").map(Number);
      if (![y, m, d].some(isNaN)) {
        const ms = new Date(y, m - 1, d, h, min).getTime();
        if (Number.isFinite(ms)) return new Date(ms).toISOString();
      }
    }
    return new Date().toISOString();
  };

  const handleSave = () => {
    if (durationMinutes < 1 || durationMinutes > 300) {
      toast.error("Duration must be 1–300 minutes");
      return;
    }
    try {
      saveActivityEntry({
        id: `activity-${Date.now()}`,
        timestamp: getTimestamp(),
        durationMinutes,
        activityType,
        note: note.trim() || null,
      });
      toast.success("Activity logged");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  return (
    <div className="rounded-b-2xl border border-t-0 border-[var(--bd)] p-4 pb-6" style={{ background: "var(--card2)" }}>
      <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
        Activity
      </h2>
      <p className="text-[13px] mb-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Play, bath, walk, story time…
      </p>

      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Type
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ACTIVITY_TYPES.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setActivityType(a.value)}
            className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
            style={{
              borderColor: activityType === a.value ? "#f5a623" : "var(--bd)",
              background: activityType === a.value ? "color-mix(in srgb, #f5a623 15%, transparent)" : "var(--card)",
              color: "var(--tx)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Duration (minutes)
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {DURATION_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDurationMinutes(m)}
            className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
            style={{
              borderColor: durationMinutes === m ? "#f5a623" : "var(--bd)",
              background: durationMinutes === m ? "color-mix(in srgb, #f5a623 15%, transparent)" : "var(--card)",
              color: "var(--tx)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {m}m
          </button>
        ))}
      </div>
      <input
        type="number"
        min={1}
        max={120}
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Math.min(120, Math.max(1, parseInt(e.target.value, 10) || 1)))}
        className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px] mb-4"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      />

      <PastPanel expanded={pastExpanded} onToggle={() => setPastExpanded((x) => !x)}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
          <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
        </div>
      </PastPanel>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border px-3 py-2.5 text-[14px] mb-4"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      />

      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[52px]"
        style={{ background: "#f5a623", fontFamily: "system-ui, sans-serif" }}
      >
        Save
      </button>
    </div>
  );
}
