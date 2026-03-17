import { useState } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { getIconEmoji } from "../data/customTrackerIcons";
import { saveCustomTrackerLog } from "../utils/customTrackerStorage";
import type { CustomTrackerDefinition } from "../types/customTracker";
import { toast } from "sonner";

interface CustomTrackerDrawerProps {
  tracker: CustomTrackerDefinition;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomTrackerDrawer({ tracker, onClose, onSaved }: CustomTrackerDrawerProps) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [useNow, setUseNow] = useState(true);
  const [dateStr, setDateStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState(() => format(new Date(), "HH:mm"));

  const handleSave = () => {
    const timestamp = useNow
      ? Date.now()
      : (() => {
          const [y, m, d] = dateStr.split("-").map(Number);
          const [h = 0, min = 0] = timeStr.split(":").map(Number);
          return new Date(y, m - 1, d, h, min).getTime();
        })();
    if (!useNow && !dateStr.trim()) {
      toast.error("Pick a date");
      return;
    }
    const numValue = value.trim() ? parseFloat(value.replace(",", ".")) : null;
    if (value.trim() && (numValue === undefined || Number.isNaN(numValue))) {
      toast.error("Enter a valid number or leave value empty");
      return;
    }
    try {
      saveCustomTrackerLog({
        trackerId: tracker.id,
        timestamp,
        value: numValue ?? undefined,
        note: note.trim() || undefined,
      });
      toast.success("Logged");
      onSaved();
      onClose();
    } catch {
      toast.error("Could not save");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <span className="text-2xl" aria-hidden>{getIconEmoji(tracker.icon)}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate" style={{ color: "var(--tx)" }}>{tracker.name}</h2>
          <p className="text-[12px]" style={{ color: "var(--mu)" }}>Log an entry</p>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {tracker.unit != null && tracker.unit !== "" && (
          <>
            <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>Value ({tracker.unit})</label>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border px-3 py-2.5 text-[15px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
          </>
        )}
        {(!tracker.unit || tracker.unit === "") && (
          <>
            <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>Value (optional)</label>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Number if needed"
              className="w-full rounded-xl border px-3 py-2.5 text-[15px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
          </>
        )}
        <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any details"
          rows={2}
          className="w-full rounded-xl border px-3 py-2.5 text-[15px] resize-none"
          style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use-now"
            checked={useNow}
            onChange={(e) => setUseNow(e.target.checked)}
            className="rounded border"
            style={{ borderColor: "var(--bd)" }}
          />
          <label htmlFor="use-now" className="text-[14px]" style={{ color: "var(--tx)" }}>Log for now</label>
        </div>
        {!useNow && (
          <div className="flex gap-2">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
          </div>
        )}
      </div>
      <div className="p-4 border-t" style={{ borderColor: "var(--bd)" }}>
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-medium text-white"
          style={{ background: "var(--pink)" }}
        >
          Save entry
        </button>
      </div>
    </div>
  );
}
