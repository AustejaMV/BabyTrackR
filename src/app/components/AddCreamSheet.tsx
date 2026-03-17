/**
 * Log a skin cream: product name, body areas, note.
 */

import { useState } from "react";
import { saveSkinCream } from "../utils/skinStorage";
import type { BodyArea } from "../types/skin";
import { toast } from "sonner";

const BODY_AREAS: BodyArea[] = ["face", "scalp", "neck", "chest", "back", "arms", "hands", "legs", "feet", "nappy_area", "behind_knees", "inside_elbows"];

function label(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AddCreamSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [product, setProduct] = useState("");
  const [bodyAreas, setBodyAreas] = useState<BodyArea[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleArea = (a: BodyArea) => {
    setBodyAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const handleSave = () => {
    const p = product.trim();
    if (!p) {
      toast.error("Enter product name");
      return;
    }
    if (bodyAreas.length === 0) {
      toast.error("Select at least one body area");
      return;
    }
    setSaving(true);
    try {
      saveSkinCream({
        timestamp: new Date().toISOString(),
        product: p,
        bodyAreas,
        note: note.trim() || null,
      });
      toast.success("Cream logged");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Log cream">
      <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>Log cream</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg text-lg" style={{ color: "var(--mu)" }} aria-label="Close">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: "var(--tx)" }}>Product name</label>
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="e.g. E45, Aveeno"
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            maxLength={60}
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--tx)" }}>Where applied</p>
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
          {saving ? "Saving…" : "Save cream"}
        </button>
      </div>
    </div>
  );
}
