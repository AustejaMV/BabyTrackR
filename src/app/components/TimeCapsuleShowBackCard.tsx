/**
 * Shows a past time-capsule note when it's time to "show back" (e.g. 12mo show-back for 6mo note).
 */

import { useState } from "react";
import { format } from "date-fns";
import type { TimeCapsuleEntry } from "../types/timeCapsule";
import { markShownBack } from "../utils/timeCapsuleStorage";

export function TimeCapsuleShowBackCard({
  entry,
  onDismiss,
}: {
  entry: TimeCapsuleEntry;
  onDismiss: () => void;
}) {
  const [ack, setAck] = useState(false);

  const handleDone = () => {
    markShownBack(entry.id);
    setAck(true);
    onDismiss();
  };

  const label =
    entry.showBackAtWeeks === 52
      ? "12 months"
      : entry.showBackAtWeeks === 78
        ? "18 months"
        : entry.showBackAtWeeks === 104
          ? "24 months"
          : `${entry.showBackAtWeeks} weeks`;

  return (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Note from your past self"
    >
      <p className="text-[12px] uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>
        From you at {entry.writtenAtWeeks === 26 ? "6" : entry.writtenAtWeeks === 52 ? "12" : "24"} months · showing at {label}
      </p>
      <p className="text-[14px] leading-relaxed whitespace-pre-wrap mt-2" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        {entry.body}
      </p>
      <p className="text-[11px] mt-2" style={{ color: "var(--mu)" }}>
        Written {format(new Date(entry.writtenAt), "dd MMM yyyy")}
      </p>
      <button
        type="button"
        onClick={handleDone}
        className="mt-3 py-2 px-4 rounded-xl text-sm font-medium"
        style={{ background: "var(--pink)", color: "white" }}
      >
        Done — put it away
      </button>
    </div>
  );
}
