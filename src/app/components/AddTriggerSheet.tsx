/**
 * Log a skin trigger: type, description, note.
 */

import { useState } from "react";
import { saveSkinTrigger } from "../utils/skinStorage";
import type { TriggerType } from "../types/skin";
import { toast } from "sonner";

const TRIGGER_TYPES: TriggerType[] = ["food", "product", "fabric", "weather", "detergent", "animal", "stress", "other"];

function label(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AddTriggerSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [triggerType, setTriggerType] = useState<TriggerType>("product");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    const d = description.trim();
    if (!d) {
      toast.error("Enter a description");
      return;
    }
    setSaving(true);
    try {
      saveSkinTrigger({
        timestamp: new Date().toISOString(),
        triggerType,
        description: d,
        note: note.trim() || null,
      });
      toast.success("Trigger logged");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Log trigger">
      <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>Log trigger</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg text-lg" style={{ color: "var(--mu)" }} aria-label="Close">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Type</p>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTriggerType(t)}
                className="px-3 py-1.5 rounded-full text-sm border"
                style={{
                  borderColor: triggerType === t ? "var(--amber-500)" : "var(--bd)",
                  background: triggerType === t ? "rgba(245,158,11,0.15)" : "var(--card)",
                  color: "var(--tx)",
                }}
              >
                {label(t)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: "var(--tx)" }}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. New washing powder, strawberries"
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: "var(--tx)" }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else?"
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[60px] resize-y"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            maxLength={300}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-medium text-white"
          style={{ background: "var(--amber-500, #f59e0b)" }}
        >
          {saving ? "Saving…" : "Save trigger"}
        </button>
      </div>
    </div>
  );
}
