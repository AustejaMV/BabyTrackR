/**
 * Memory book: monthly recap card with optional share.
 */

import { format } from "date-fns";
import type { MemoryMonthlyRecap } from "../types/memory";

export interface MonthlyRecapCardProps {
  recap: MemoryMonthlyRecap;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MonthlyRecapCard({ recap, onShare, onEdit, onDelete }: MonthlyRecapCardProps) {
  const [y, m] = recap.yearMonth.split("-");
  const monthLabel = format(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1), "MMMM yyyy");

  return (
    <article
      className="rounded-2xl border p-4"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      aria-label={`Recap for ${monthLabel}`}
    >
      <time className="text-[13px] font-medium" style={{ color: "var(--mu)" }}>
        {monthLabel}
      </time>
      <p className="mt-2 text-[14px] whitespace-pre-wrap" style={{ color: "var(--tx)" }}>
        {recap.note}
      </p>
      <div className="flex gap-2 mt-3 flex-wrap">
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-[13px] font-medium"
            style={{ color: "var(--pink)" }}
          >
            Share recap
          </button>
        )}
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-[13px] underline" style={{ color: "var(--pink)" }}>
            Edit
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className="text-[13px] underline" style={{ color: "var(--mu)" }}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
