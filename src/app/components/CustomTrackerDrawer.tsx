import { useState, useMemo } from "react";
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { DAY_DATETIME_DISPLAY } from "../utils/dateUtils";
import { getIconDisplay } from "../data/customTrackerIcons";
import { saveCustomTrackerLog, getLogsForTracker, deleteCustomTrackerLog } from "../utils/customTrackerStorage";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const logs = useMemo(() => getLogsForTracker(tracker.id), [tracker.id, refreshKey]);

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
      setValue("");
      setNote("");
      setRefreshKey((k) => k + 1);
      onSaved();
    } catch {
      toast.error("Could not save");
    }
  };

  const handleDelete = (id: string) => {
    try {
      deleteCustomTrackerLog(id);
      setRefreshKey((k) => k + 1);
      toast.success("Entry removed");
    } catch {
      toast.error("Could not remove");
    }
  };

  const F = "system-ui, sans-serif";

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <span className="text-2xl inline-flex items-center justify-center" aria-hidden>{getIconDisplay(tracker.icon)}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate" style={{ color: "var(--tx)", fontFamily: F }}>{tracker.name}</h2>
          <p className="text-[12px]" style={{ color: "var(--mu)", fontFamily: F }}>
            {logs.length > 0 ? `${logs.length} entries logged` : "No entries yet"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <label className="block text-[13px] font-medium" style={{ color: "var(--mu)", fontFamily: F }}>
          {tracker.unit ? `Value (${tracker.unit})` : "Value (optional)"}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={tracker.unit ? "Enter value" : "Number if needed"}
          className="w-full rounded-xl border px-3 py-2.5 text-[15px]"
          style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: F }}
        />
        <label className="block text-[13px] font-medium" style={{ color: "var(--mu)", fontFamily: F }}>Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any details"
          rows={2}
          className="w-full rounded-xl border px-3 py-2.5 text-[15px] resize-none"
          style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: F }}
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
          <label htmlFor="use-now" className="text-[14px]" style={{ color: "var(--tx)", fontFamily: F }}>Log for now</label>
        </div>
        {!useNow && (
          <div className="flex gap-2">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: F }}
            />
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: F }}
            />
          </div>
        )}
      </div>

      <div style={{ position: "sticky", bottom: 0, background: "var(--card)", zIndex: 2, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--bd)" }}>
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-medium text-white min-h-[48px]"
          style={{ background: "var(--pink)", fontFamily: F }}
        >
          Save entry
        </button>
      </div>

      {/* History section */}
      <div className="border-t" style={{ borderColor: "var(--bd)" }}>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3"
          style={{ color: "var(--tx)", fontFamily: F }}
        >
          <span className="text-[13px] font-medium">History ({logs.length})</span>
          {historyOpen ? <ChevronUp className="w-4 h-4" style={{ color: "var(--mu)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--mu)" }} />}
        </button>

        {historyOpen && (
          <div className="px-4 pb-4">
            {logs.length === 0 ? (
              <p className="text-[12px] py-2" style={{ color: "var(--mu)", fontFamily: F }}>No entries yet — log one above.</p>
            ) : (
              <div className="space-y-1">
                {logs.slice(0, 50).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 py-2 border-b last:border-b-0"
                    style={{ borderColor: "var(--bd)" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: F }}>
                        {format(new Date(entry.timestamp), DAY_DATETIME_DISPLAY())}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--mu)", fontFamily: F }}>
                        {entry.value != null && <span>{entry.value}{tracker.unit ? ` ${tracker.unit}` : ""}</span>}
                        {entry.value != null && entry.note ? " — " : ""}
                        {entry.note && <span>{entry.note}</span>}
                        {entry.value == null && !entry.note && <span style={{ fontStyle: "italic" }}>logged</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded-lg shrink-0"
                      style={{ color: "var(--mu)" }}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {logs.length > 50 && (
                  <p className="text-[11px] pt-1" style={{ color: "var(--mu)", fontFamily: F }}>Showing most recent 50 of {logs.length}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
