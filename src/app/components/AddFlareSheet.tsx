/**
 * Log a skin flare: severity 1–5, body areas, appearance, note. Photo stored local-only (null for web).
 */

import { useState } from "react";
import { saveSkinFlare } from "../utils/skinStorage";
import type { BodyArea, SkinAppearance } from "../types/skin";
import { toast } from "sonner";

const BODY_AREAS: BodyArea[] = ["face", "scalp", "neck", "chest", "back", "arms", "hands", "legs", "feet", "nappy_area", "behind_knees", "inside_elbows"];
const APPEARANCES: SkinAppearance[] = ["red", "dry", "scaly", "weeping", "cracked", "swollen", "hives"];

function label(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AddFlareSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [bodyAreas, setBodyAreas] = useState<BodyArea[]>([]);
  const [appearance, setAppearance] = useState<SkinAppearance[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleArea = (a: BodyArea) => {
    setBodyAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const toggleAppearance = (a: SkinAppearance) => {
    setAppearance((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const handleSave = () => {
    if (bodyAreas.length === 0) {
      toast.error("Select at least one body area");
      return;
    }
    if (appearance.length === 0) {
      toast.error("Select at least one appearance");
      return;
    }
    setSaving(true);
    try {
      saveSkinFlare({
        timestamp: new Date().toISOString(),
        bodyAreas,
        severity,
        appearance,
        photo: null,
        note: note.trim() || null,
      });
      toast.success("Flare logged");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Log skin flare">
      <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>Log flare</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg text-lg" style={{ color: "var(--mu)" }} aria-label="Close">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Severity (1–5)</p>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSeverity(n)}
                className="w-10 h-10 rounded-full border-2 font-medium text-sm"
                style={{
                  borderColor: severity === n ? "var(--amber-500, #f59e0b)" : "var(--bd)",
                  background: severity === n ? "rgba(245,158,11,0.2)" : "transparent",
                  color: "var(--tx)",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Body areas</p>
          <div className="flex flex-wrap gap-2">
            {BODY_AREAS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleArea(a)}
                className="px-3 py-1.5 rounded-full text-sm border"
                style={{
                  borderColor: bodyAreas.includes(a) ? "var(--amber-500)" : "var(--bd)",
                  background: bodyAreas.includes(a) ? "rgba(245,158,11,0.15)" : "var(--card)",
                  color: "var(--tx)",
                }}
              >
                {label(a)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Appearance</p>
          <div className="flex flex-wrap gap-2">
            {APPEARANCES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAppearance(a)}
                className="px-3 py-1.5 rounded-full text-sm border"
                style={{
                  borderColor: appearance.includes(a) ? "var(--amber-500)" : "var(--bd)",
                  background: appearance.includes(a) ? "rgba(245,158,11,0.15)" : "var(--card)",
                  color: "var(--tx)",
                }}
              >
                {label(a)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: "var(--tx)" }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else to remember?"
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px] resize-y"
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
          {saving ? "Saving…" : "Save flare"}
        </button>
      </div>
    </div>
  );
}
