import { useState } from "react";
import { X } from "lucide-react";
import { CUSTOM_TRACKER_ICONS } from "../data/customTrackerIcons";
import { saveCustomTracker } from "../utils/customTrackerStorage";
import type { CustomTrackerDefinition, CustomTrackerIcon } from "../types/customTracker";
import { toast } from "sonner";

interface CreateCustomTrackerSheetProps {
  onClose: () => void;
  onSaved: (tracker: CustomTrackerDefinition) => void;
}

export function CreateCustomTrackerSheet({ onClose, onSaved }: CreateCustomTrackerSheetProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CustomTrackerIcon>("star");
  const [unit, setUnit] = useState("");

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a name for your tracker");
      return;
    }
    if (trimmed.length > 40) {
      toast.error("Name must be 40 characters or less");
      return;
    }
    try {
      const tracker = saveCustomTracker({
        name: trimmed,
        icon,
        unit: unit.trim() || null,
      });
      toast.success("Tracker created");
      onSaved(tracker);
      onClose();
    } catch {
      toast.error("Could not save tracker");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--tx)" }}>New custom tracker</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Vitamins, Medicine"
          maxLength={40}
          className="w-full rounded-xl border px-3 py-2.5 text-[15px]"
          style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
        />
        <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>Icon</label>
        <div className="flex flex-wrap gap-2">
          {CUSTOM_TRACKER_ICONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setIcon(opt.id)}
              className="w-11 h-11 rounded-xl border-2 flex items-center justify-center text-lg transition-colors"
              style={{
                borderColor: icon === opt.id ? "var(--pink)" : "var(--bd)",
                background: icon === opt.id ? "color-mix(in srgb, var(--pink) 15%, transparent)" : "var(--card)",
              }}
              aria-label={opt.label}
              aria-pressed={icon === opt.id}
            >
              {opt.emoji}
            </button>
          ))}
        </div>
        <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>Unit (optional)</label>
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="e.g. ml, mg"
          maxLength={10}
          className="w-full rounded-xl border px-3 py-2.5 text-[15px]"
          style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
        />
      </div>
      <div className="p-4 border-t" style={{ borderColor: "var(--bd)" }}>
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-medium text-white"
          style={{ background: "var(--pink)" }}
        >
          Create tracker
        </button>
      </div>
    </div>
  );
}
