/**
 * "Why might she be crying?" — shows top reasons and actions to open the right log drawer.
 */

import type { CryReason } from "../utils/cryingDiagnostic";
import type { FeedingRecord, SleepRecord, DiaperRecord } from "../types";

export interface WhyIsCryingCardProps {
  reasons: CryReason[];
  /** When baby is asleep we hide the card */
  isBabyAwake: boolean;
  onOpenDrawer: (drawer: "feed" | "sleep" | "diaper") => void;
}

const MAX_REASONS = 3;

export function WhyIsCryingCard({ reasons, isBabyAwake, onOpenDrawer }: WhyIsCryingCardProps) {
  const showReasons = reasons.filter((r) => r.likelihood !== "unlikely");
  if (!isBabyAwake || showReasons.length === 0) return null;

  const top = showReasons.slice(0, MAX_REASONS);

  return (
    <div
      className="rounded-2xl border py-3.5 px-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Why might she be crying?"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          Why might she be crying?
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.5" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
      </div>
      <ul className="space-y-2 list-none p-0 m-0">
        {top.map((r, i) => (
          <li key={`${r.priority}-${r.reason}-${i}`}>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px]" style={{ background: "var(--bg2)", color: "var(--mu)" }} aria-hidden>
                {r.icon === "droplet" && "💧"}
                {r.icon === "moon" && "🌙"}
                {r.icon === "baby" && "👶"}
                {r.icon === "sparkles" && "✨"}
                {r.icon === "wind" && "💨"}
                {!["droplet", "moon", "baby", "sparkles", "wind"].includes(r.icon) && "❓"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                    {r.reason}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: r.likelihood === "likely" ? "color-mix(in srgb, var(--coral) 20%, transparent)" : r.likelihood === "possible" ? "color-mix(in srgb, var(--med-col) 20%, transparent)" : "var(--bg2)",
                      color: r.likelihood === "likely" ? "var(--coral)" : r.likelihood === "possible" ? "var(--med-col)" : "var(--mu)",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {r.likelihood}
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                  {r.detail}
                </p>
                {r.drawer ? (
                  <button
                    type="button"
                    onClick={() => onOpenDrawer(r.drawer!)}
                    className="mt-1 text-[12px] font-medium underline focus:outline-none focus:ring-2 rounded"
                    style={{ color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
                    aria-label={`${r.action} — open ${r.drawer} log`}
                  >
                    {r.action}
                  </button>
                ) : (
                  <span className="mt-1 text-[12px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                    {r.action}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
