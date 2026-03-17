/**
 * Breastfeeding supply balance — informational only. Shown on Journey.
 */

import { assessSupply } from "../utils/supplyAssessment";
import type { FeedingRecord } from "../types";

export function SupplyMonitorCard({
  feedingHistory,
  babyDobMs,
}: {
  feedingHistory: FeedingRecord[];
  babyDobMs: number | null;
}) {
  const assessment = assessSupply(feedingHistory, babyDobMs);

  if (assessment.status === "low_data") return null;

  const statusLabel =
    assessment.status === "balanced"
      ? "Balanced"
      : assessment.status === "left_favoured"
        ? "Left favoured"
        : assessment.status === "right_favoured"
          ? "Right favoured"
          : "Supply";

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Breastfeeding supply balance"
    >
      <p className="text-[13px] font-medium mb-1" style={{ color: "var(--tx)" }}>
        Supply balance (last 7 days)
      </p>
      <p className="text-[12px] mb-2" style={{ color: "var(--mu)" }}>
        Left {assessment.leftTotalMinutes}m · Right {assessment.rightTotalMinutes}m · {assessment.feedCountLast7Days} feeds
      </p>
      <p className="text-[13px] leading-snug" style={{ color: "var(--tx)" }}>
        {assessment.message}
      </p>
      <span
        className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium"
        style={{
          background: assessment.status === "balanced" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
          color: "var(--tx)",
        }}
      >
        {statusLabel}
      </span>
    </div>
  );
}
