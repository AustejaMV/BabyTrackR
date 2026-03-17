/**
 * Spit-up / reflux log drawer. Severity, timing, optional note.
 */

import { useState } from "react";
import { toast } from "sonner";
import { saveSpitUpEntry, getSpitUpHistory } from "../utils/spitUpStorage";
import type { SpitUpSeverity, SpitUpTiming } from "../types/spitUp";
import { saveData } from "../utils/dataSync";
import type { Session } from "@supabase/supabase-js";

const SEVERITIES: { value: SpitUpSeverity; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "moderate", label: "Moderate" },
  { value: "large", label: "Large" },
  { value: "forceful", label: "Forceful" },
];

const TIMINGS: { value: SpitUpTiming; label: string }[] = [
  { value: "during_feed", label: "During feed" },
  { value: "immediately_after", label: "Immediately after" },
  { value: "30min_after", label: "30+ min after" },
];

export interface SpitUpDrawerProps {
  onClose: () => void;
  onSaved: () => void;
  session: Session | null;
}

export function SpitUpDrawer({ onClose, onSaved, session }: SpitUpDrawerProps) {
  const [severity, setSeverity] = useState<SpitUpSeverity>("moderate");
  const [timing, setTiming] = useState<SpitUpTiming>("immediately_after");
  const [note, setNote] = useState("");
  const [pastChecked, setPastChecked] = useState(false);
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");

  const getTimestamp = (): number => {
    if (!pastChecked || !pastDate.trim()) return Date.now();
    const [y, m, d] = pastDate.split("-").map(Number);
    if (pastTime.trim()) {
      const [h, min] = pastTime.split(":").map(Number);
      return new Date(y, m - 1, d, h, min, 0, 0).getTime();
    }
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  };

  const handleSave = () => {
    try {
      const ts = getTimestamp();
      saveSpitUpEntry({ severity, timing, note: note.trim() || null, timestamp: ts });
      const history = getSpitUpHistory();
      if (session?.access_token) saveData("spitUpHistory", history, session.access_token);
      toast.success("Spit-up logged");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const inputStyle = "flex-1 rounded-lg border px-3 py-2.5 text-[15px] outline-none min-h-[44px]";
  const inputStyleObj: React.CSSProperties = { borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" };

  return (
    <div className="rounded-t-2xl border-t p-4 pb-safe" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)" }}>
        Severity
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SEVERITIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSeverity(value)}
            className="px-4 py-2.5 rounded-[20px] border text-[13px] min-h-[44px]"
            style={{
              borderColor: severity === value ? "var(--ro)" : "var(--bd)",
              background: severity === value ? "var(--pe)" : "var(--card)",
              color: "var(--tx)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)" }}>
        When did it happen?
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {TIMINGS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTiming(value)}
            className="px-4 py-2.5 rounded-[20px] border text-[13px] min-h-[44px]"
            style={{
              borderColor: timing === value ? "var(--ro)" : "var(--bd)",
              background: timing === value ? "var(--pe)" : "var(--card)",
              color: "var(--tx)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)" }}>
        Note (optional)
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything to remember for GP…"
        rows={2}
        className="w-full rounded-[14px] border px-4 py-3 text-[14px] outline-none resize-none mb-4"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
      />
      <button
        type="button"
        onClick={() => setPastChecked((c) => !c)}
        className="text-[12px] mb-2 block"
        style={{ color: "var(--pink)" }}
      >
        {pastChecked ? "✓ Log for a past time" : "Log for a past time"}
      </button>
      {pastChecked && (
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={pastDate}
            onChange={(e) => setPastDate(e.target.value)}
            className={inputStyle}
            style={inputStyleObj}
          />
          <input
            type="time"
            value={pastTime}
            onChange={(e) => setPastTime(e.target.value)}
            className={inputStyle}
            style={inputStyleObj}
          />
        </div>
      )}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none min-h-[52px]"
        style={{ background: "var(--coral)" }}
      >
        Save spit-up
      </button>
    </div>
  );
}
