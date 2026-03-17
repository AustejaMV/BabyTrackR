/**
 * Add or edit a monthly recap.
 */

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { saveMonthlyRecap } from "../utils/memoryStorage";
import type { MemoryMonthlyRecap } from "../types/memory";

const now = new Date();
const defaultYearMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

export interface AddMonthlyRecapSheetProps {
  existing?: MemoryMonthlyRecap | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AddMonthlyRecapSheet({ existing, onClose, onSaved }: AddMonthlyRecapSheetProps) {
  const [yearMonth, setYearMonth] = useState(existing?.yearMonth ?? defaultYearMonth);
  const [note, setNote] = useState(existing?.note ?? "");

  const handleSave = () => {
    if (!yearMonth || !note.trim()) return;
    saveMonthlyRecap({ yearMonth, note: note.trim() });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Add monthly recap">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>
          {existing ? "Edit recap" : "Add monthly recap"}
        </h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <label className="block">
          <span className="text-[13px]" style={{ color: "var(--mu)" }}>Month</span>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="w-full mt-1 p-3 rounded-xl border text-[14px]"
            style={{ background: "var(--card)", borderColor: "var(--bd)", color: "var(--tx)" }}
            aria-label="Month"
          />
        </label>
        <label className="block">
          <span className="text-[13px]" style={{ color: "var(--mu)" }}>Recap</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How was this month?"
            rows={5}
            className="w-full mt-1 p-3 rounded-xl border text-[14px] resize-y"
            style={{ background: "var(--card)", borderColor: "var(--bd)", color: "var(--tx)" }}
            aria-label="Recap"
          />
        </label>
      </div>
      <div className="p-4 border-t" style={{ borderColor: "var(--bd)" }}>
        <Button className="w-full" onClick={handleSave} disabled={!note.trim()}>
          {existing ? "Save changes" : "Save"}
        </Button>
      </div>
    </div>
  );
}
