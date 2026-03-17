/**
 * Memory book: single day entry card (photo + note).
 */

import { format } from "date-fns";
import type { MemoryDayEntry } from "../types/memory";

export interface DayCardProps {
  entry: MemoryDayEntry;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function DayCard({ entry, onEdit, onDelete }: DayCardProps) {
  const dateLabel = format(new Date(entry.date + "T12:00:00"), "EEEE, d MMMM yyyy");

  return (
    <article
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      aria-label={`Memory for ${dateLabel}`}
    >
      {entry.photoDataUrl && (
        <div className="aspect-[4/3] bg-[var(--bd)]">
          <img
            src={entry.photoDataUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <time className="text-[13px] font-medium" style={{ color: "var(--mu)" }}>
          {dateLabel}
        </time>
        {entry.note && (
          <p className="mt-2 text-[14px] whitespace-pre-wrap" style={{ color: "var(--tx)" }}>
            {entry.note}
          </p>
        )}
        {(onEdit || onDelete) && (
          <div className="flex gap-2 mt-3">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-[13px] underline"
                style={{ color: "var(--pink)" }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-[13px] underline"
                style={{ color: "var(--mu)" }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
