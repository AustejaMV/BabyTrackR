import { useState } from "react";
import { NAPPY_GUIDE, type NappyEntry } from "../data/nappyGuide";
import { AlertCircle, Stethoscope } from "lucide-react";

type Filter = "all" | "normal" | "call_gp";

export function NappyGuideSheet({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all"
      ? NAPPY_GUIDE
      : filter === "normal"
        ? NAPPY_GUIDE.filter((e) => e.isNormal === "always" || e.isNormal === "sometimes" || e.isNormal === "rarely")
        : NAPPY_GUIDE.filter((e) => e.isNormal === "call_gp" || e.isNormal === "call_999");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Nappy contents guide">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>Nappy contents guide</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          ×
        </button>
      </div>
      <div className="flex gap-2 p-3 border-b" style={{ borderColor: "var(--bd)" }}>
        {(["all", "normal", "call_gp"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm ${filter === f ? "opacity-100" : "opacity-70"}`}
            style={{
              background: filter === f ? "var(--pink)" : "var(--card)",
              color: filter === f ? "white" : "var(--tx)",
              border: `1px solid var(--bd)`,
            }}
          >
            {f === "all" ? "Show all" : f === "normal" ? "All normal" : "When to call GP"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filtered.map((entry) => (
          <NappyEntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function NappyEntryRow({ entry }: { entry: NappyEntry }) {
  const isUrgent = entry.isNormal === "call_gp" || entry.isNormal === "call_999";
  return (
    <div
      className={`rounded-xl border p-4 ${isUrgent ? "border-[var(--ro)]" : ""}`}
      style={{
        background: isUrgent ? "rgba(240,160,192,0.12)" : "var(--card)",
        borderColor: isUrgent ? "var(--ro)" : "var(--bd)",
      }}
    >
      <div className="flex gap-3">
        <div className="flex gap-1 flex-shrink-0">
          <div className="w-7 h-7 rounded-md border border-[var(--bd)]" style={{ background: entry.colourHex }} />
          {entry.colourHex2 && (
            <div className="w-7 h-7 rounded-md border border-[var(--bd)]" style={{ background: entry.colourHex2 }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[13px]" style={{ color: "var(--tx)" }}>{entry.label}</span>
            {(entry.isNormal === "call_gp" || entry.isNormal === "call_999") && (
              <span className="text-[var(--ro)]" aria-hidden>
                {entry.isNormal === "call_999" ? <AlertCircle className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--mu)" }}>{entry.consistency} · {entry.ageContext}</p>
          <p className="text-[12px] mt-2" style={{ color: "var(--tx)" }}>{entry.meaning}</p>
          {entry.whenToCallGP && (
            <div className="mt-2 p-2 rounded-lg text-[12px]" style={{ background: "rgba(255,200,200,0.2)", color: "var(--tx)" }}>
              <strong>When to call GP:</strong> {entry.whenToCallGP}
            </div>
          )}
          {entry.whenToCall999 && (
            <div className="mt-1 p-2 rounded-lg text-[12px]" style={{ background: "rgba(200,80,80,0.15)", color: "var(--tx)" }}>
              <strong>When to call 999:</strong> {entry.whenToCall999}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
