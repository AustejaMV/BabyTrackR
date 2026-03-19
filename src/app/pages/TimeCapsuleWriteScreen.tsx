/**
 * Write a time-capsule note. Route: /time-capsule/write?weeks=N.
 */

import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { saveTimeCapsule } from "../utils/timeCapsuleStorage";
import { getDefaultShowBackWeeks } from "../utils/timeCapsuleTrigger";
import { toast } from "sonner";

export function TimeCapsuleWriteScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const weeksParam = searchParams.get("weeks");
  const parsedWeeks = weeksParam ? parseInt(weeksParam, 10) : 0;
  const valid = Number.isFinite(parsedWeeks) && parsedWeeks >= 0 ? parsedWeeks : 0;

  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    const b = body.trim();
    if (!b) {
      toast.error("Write something first");
      return;
    }
    setSaving(true);
    try {
      saveTimeCapsule({
        writtenAtWeeks: valid,
        writtenAt: new Date().toISOString(),
        body: b,
        showBackAtWeeks: getDefaultShowBackWeeks(valid),
      });
      toast.success("Saved. You'll see this note again later.");
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const months = Math.round(valid / 4.33);
  const label = months < 1 ? `${valid} week${valid !== 1 ? "s" : ""}` : `${months} month${months !== 1 ? "s" : ""}`;

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-sm" style={{ color: "var(--pink)" }}>← Cancel</Link>
          <h1 className="text-xl font-serif" style={{ color: "var(--tx)" }}>Note to your past self</h1>
          <span className="w-14" />
        </div>
        <p className="text-[13px] mb-4" style={{ color: "var(--mu)" }}>
          You've reached {label}. What would you tell yourself from the early days? You'll see this again in 6 months.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. It gets easier. You're doing great. The sleepless nights don't last forever..."
          className="w-full rounded-xl border px-4 py-3 text-sm min-h-[180px] resize-y"
          style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
          maxLength={2000}
        />
        <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{body.length}/2000</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-3 rounded-xl font-medium text-white"
          style={{ background: "var(--pink)" }}
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
