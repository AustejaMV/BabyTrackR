import { useState } from "react";
import { getLeapAtWeek, getNextLeap } from "../data/leaps";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function getAgeWeeks(birthDateMs: number): number {
  return Math.floor((Date.now() - birthDateMs) / MS_PER_WEEK);
}

interface LeapsCardProps {
  birthDateMs: number | null;
}

export function LeapsCard({ birthDateMs }: LeapsCardProps) {
  const [expanded, setExpanded] = useState(false);
  if (birthDateMs == null) return null;
  const ageWeeks = getAgeWeeks(birthDateMs);
  const currentLeap = getLeapAtWeek(ageWeeks);
  const nextLeap = getNextLeap(ageWeeks);

  if (currentLeap) {
    return (
      <div
        className="rounded-2xl border p-4 mb-3"
        style={{ background: "rgba(200, 168, 240, 0.2)", borderColor: "var(--purp)" }}
      >
        <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            What to expect
          </p>
          <p className="text-[16px] font-medium mb-0.5" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            {currentLeap.name}
          </p>
          <p className="text-[13px] mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            {currentLeap.description}
          </p>
          <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            {currentLeap.signs.slice(0, 3).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {expanded && (
            <div className="mt-2 pt-2 border-t border-[var(--bd)]">
              <p className="text-[12px] font-medium mb-1" style={{ color: "var(--mu)" }}>Tips</p>
              <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "var(--tx)" }}>
                {currentLeap.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <span className="text-[11px]" style={{ color: "var(--mu)" }}>{expanded ? "Tap to collapse" : "Tap for more tips"}</span>
        </button>
      </div>
    );
  }

  if (nextLeap && nextLeap.inDays <= 7) {
    return (
      <div
        className="rounded-2xl border p-4 mb-3"
        style={{ background: "rgba(200, 168, 240, 0.1)", borderColor: "var(--bd)" }}
      >
        <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Coming soon
        </p>
        <p className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          {nextLeap.leap.name}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          In about {nextLeap.inDays} day{nextLeap.inDays !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return null;
}
