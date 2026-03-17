/**
 * Teeth tracker: mouth diagram, eruption log, teething banner.
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { TEETH, getToothById, getExpectedTeeth } from "../data/teethData";
import { getToothHistory, saveToothRecord } from "../utils/teethStorage";
import type { ToothDef } from "../data/teethData";

const UPPER = TEETH.filter((t) => t.position === "upper").sort((a, b) => a.typicalWeeksMin - b.typicalWeeksMin);
const LOWER = TEETH.filter((t) => t.position === "lower").sort((a, b) => a.typicalWeeksMin - b.typicalWeeksMin);

export interface TeethTrackerProps {
  ageInWeeks: number | null;
  babyName?: string | null;
}

type ToothStatus = "erupted" | "expected_soon" | "none";

export function TeethTracker({ ageInWeeks, babyName }: TeethTrackerProps) {
  const [history, setHistory] = useState(() => getToothHistory());
  const [logTooth, setLogTooth] = useState<ToothDef | null>(null);
  const [logDate, setLogDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [logNote, setLogNote] = useState("");
  const [popoverTooth, setPopoverTooth] = useState<ToothDef | null>(null);

  const eruptedMap = useMemo(() => {
    const m = new Map<string, { eruptedAt: string; note: string | null }>();
    history.forEach((r) => m.set(r.toothId, { eruptedAt: r.eruptedAt, note: r.note }));
    return m;
  }, [history]);

  const expectedSoon = useMemo(() => (ageInWeeks != null && ageInWeeks >= 0 ? getExpectedTeeth(ageInWeeks) : []), [ageInWeeks]);
  const expectedSoonIds = new Set(expectedSoon.map((t) => t.id));

  const getStatus = (t: ToothDef): ToothStatus => {
    if (eruptedMap.has(t.id)) return "erupted";
    if (expectedSoonIds.has(t.id)) return "expected_soon";
    return "none";
  };

  const handleSaveEruption = () => {
    if (!logTooth) return;
    const eruptedAt = logDate.trim();
    if (!eruptedAt) return;
    try {
      saveToothRecord({ toothId: logTooth.id, eruptedAt, note: logNote.trim() || null });
      setHistory(getToothHistory());
      setLogTooth(null);
      setLogDate(format(new Date(), "yyyy-MM-dd"));
      setLogNote("");
    } catch {
      // toast or inline error
    }
  };

  const eruptedList = useMemo(() => {
    return history
      .map((r) => ({ ...r, def: getToothById(r.toothId) }))
      .filter((x): x is typeof x & { def: ToothDef } => x.def != null)
      .sort((a, b) => a.eruptedAt.localeCompare(b.eruptedAt));
  }, [history]);

  const firstEruptedId = eruptedList.length > 0 ? eruptedList[0].toothId : null;

  if (ageInWeeks == null || ageInWeeks < 20) {
    return null;
  }

  const name = babyName || "Baby";

  return (
    <div
      className="rounded-2xl border p-4 mb-4"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Teeth"
    >
      <h3 className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        Teeth
      </h3>

      {expectedSoon.length > 0 && (
        <div
          className="rounded-xl p-3 mb-4 text-[13px]"
          style={{ background: "color-mix(in srgb, var(--coral) 12%, var(--card))", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
        >
          {name} may be starting to teethe — watch for drooling, chewing, and gum rubbing.
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4" aria-label="Mouth diagram">
        <div className="flex justify-center gap-0.5 flex-wrap">
          {UPPER.map((t) => {
            const status = getStatus(t);
            const fill = status === "erupted" ? "var(--coral)" : status === "expected_soon" ? "var(--med-col, #f5a623)" : "var(--bg2)";
            const stroke = status === "erupted" ? "var(--coral)" : "var(--bd)";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => (eruptedMap.has(t.id) ? setPopoverTooth(t) : setLogTooth(t))}
                className="w-7 h-6 rounded-md border flex-shrink-0 transition-colors"
                style={{ background: fill, borderColor: stroke }}
                title={t.label}
                aria-label={`${t.label}, ${status === "erupted" ? "erupted" : status === "expected_soon" ? "expected soon" : "not yet erupted"}`}
              />
            );
          })}
        </div>
        <div className="flex justify-center gap-0.5 flex-wrap">
          {LOWER.map((t) => {
            const status = getStatus(t);
            const fill = status === "erupted" ? "var(--coral)" : status === "expected_soon" ? "var(--med-col, #f5a623)" : "var(--bg2)";
            const stroke = status === "erupted" ? "var(--coral)" : "var(--bd)";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => (eruptedMap.has(t.id) ? setPopoverTooth(t) : setLogTooth(t))}
                className="w-7 h-6 rounded-md border flex-shrink-0 transition-colors"
                style={{ background: fill, borderColor: stroke }}
                title={t.label}
                aria-label={`${t.label}, ${status === "erupted" ? "erupted" : status === "expected_soon" ? "expected soon" : "not yet erupted"}`}
              />
            );
          })}
        </div>
      </div>

      {logTooth && (
        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--bd)", background: "var(--bg2)" }}>
          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            Log eruption: {logTooth.label}
          </p>
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-[14px] mb-2"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-[14px] mb-2"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setLogTooth(null); setLogNote(""); }}
              className="flex-1 py-2 rounded-lg text-[13px] border"
              style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEruption}
              className="flex-1 py-2 rounded-lg text-[13px] text-white"
              style={{ background: "var(--coral)" }}
            >
              Log eruption
            </button>
          </div>
        </div>
      )}

      {popoverTooth && eruptedMap.has(popoverTooth.id) && (
        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "var(--bd)", background: "var(--bg2)" }}>
          <p className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            {popoverTooth.label}
          </p>
          <p className="text-[12px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Erupted {format(new Date(eruptedMap.get(popoverTooth.id)!.eruptedAt), "d MMM yyyy")}
          </p>
          {eruptedMap.get(popoverTooth.id)?.note && (
            <p className="text-[12px] mt-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {eruptedMap.get(popoverTooth.id)!.note}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPopoverTooth(null)}
            className="mt-2 text-[12px]"
            style={{ color: "var(--mu)" }}
          >
            Close
          </button>
        </div>
      )}

      {eruptedList.length > 0 && (
        <div>
          <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Erupted teeth
          </p>
          <ul className="space-y-1 list-none p-0 m-0">
            {eruptedList.map((r) => (
              <li key={r.toothId} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                {r.toothId === firstEruptedId && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--grn)", color: "var(--tx)" }}>
                    First tooth
                  </span>
                )}
                <span>{r.def?.label ?? r.toothId}</span>
                <span className="text-[12px]" style={{ color: "var(--mu)" }}>{format(new Date(r.eruptedAt), "d MMM yyyy")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
