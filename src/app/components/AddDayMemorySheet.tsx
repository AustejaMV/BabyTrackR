/**
 * Add or edit a day memory (note + optional photo).
 */

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { compressBabyPhoto } from "../utils/imageCompress";
import { saveMemoryDay, deleteMemoryDay } from "../utils/memoryStorage";
import type { MemoryDayEntry } from "../types/memory";

const today = new Date();
const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

export interface AddDayMemorySheetProps {
  existing?: MemoryDayEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AddDayMemorySheet({ existing, onClose, onSaved }: AddDayMemorySheetProps) {
  const [date, setDate] = useState(existing?.date ?? todayStr);
  const [note, setNote] = useState(existing?.note ?? "");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(existing?.photoDataUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await compressBabyPhoto(file);
      setPhotoDataUrl(url);
    } catch {
      setPhotoDataUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Add day memory">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>
          {existing ? "Edit day" : "Add day memory"}
        </h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <label className="block">
          <span className="text-[13px]" style={{ color: "var(--mu)" }}>Date</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
            aria-label="Date"
          />
        </label>
        <label className="block">
          <span className="text-[13px]" style={{ color: "var(--mu)" }}>Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today?"
            rows={4}
            className="w-full mt-1 p-3 rounded-xl border text-[14px] resize-y"
            style={{ background: "var(--card)", borderColor: "var(--bd)", color: "var(--tx)" }}
            aria-label="Note"
          />
        </label>
        <div>
          <span className="text-[13px]" style={{ color: "var(--mu)" }}>Photo (optional)</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-label="Upload photo" />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Choose photo"}
            </Button>
            {photoDataUrl && (
              <button type="button" onClick={() => setPhotoDataUrl(null)} className="text-[13px] underline" style={{ color: "var(--mu)" }}>
                Remove
              </button>
            )}
          </div>
          {photoDataUrl && (
            <div className="mt-2 rounded-xl overflow-hidden max-w-[200px] aspect-video bg-[var(--bd)]">
              <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t" style={{ borderColor: "var(--bd)" }}>
        <Button
          className="w-full"
          onClick={() => {
            if (!date) return;
            if (existing) deleteMemoryDay(existing.id);
            saveMemoryDay({
              date,
              note: note.trim() || undefined,
              photoDataUrl: photoDataUrl ?? undefined,
            });
            onSaved();
            onClose();
          }}
        >
          {existing ? "Save changes" : "Save"}
        </Button>
      </div>
    </div>
  );
}
