import { useState, useCallback, useRef, useEffect } from "react";
import { useBaby } from "../contexts/BabyContext";
import { ChevronDown, Plus, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { Baby } from "../data/babiesStorage";

const MAX_BABIES = 4;

function formatAge(birthDate: number): string {
  const ms = Date.now() - birthDate;
  const days = Math.floor(ms / 86400000);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 12) return `${weeks}w`;
  const months = Math.floor(days / 30.44);
  return `${months}mo`;
}

function formatLastLog(babyId: string): string {
  const keys = ["feedingHistory", "sleepHistory", "diaperHistory"];
  let latest = 0;
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(`baby_${babyId}_${key}`);
      if (!raw) continue;
      const arr = JSON.parse(raw) as Array<{ timestamp?: number; endTime?: number; startTime?: number }>;
      for (const r of arr) {
        const t = r.endTime ?? r.timestamp ?? r.startTime ?? 0;
        if (t > latest) latest = t;
      }
    } catch { /* skip */ }
  }
  if (latest === 0) return "No logs";
  const mins = Math.round((Date.now() - latest) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AvatarCircle({ baby, active, size = 28 }: { baby: Baby; active: boolean; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${active ? "var(--coral)" : "var(--bd)"}`,
        background: "linear-gradient(135deg, var(--pe), var(--la))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {baby.photoDataUrl ? (
        <img src={baby.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      ) : baby.icon ? (
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{baby.icon}</span>
      ) : (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
      )}
    </div>
  );
}

export function BabySwitcher() {
  const { babies, activeBaby, activeBabyId, setActiveBabyId, addBaby } = useBaby();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sheetOpen) {
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [sheetOpen]);

  const handleAdd = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) { toast.error("Please enter a name."); return; }
    if (!newDob) { toast.error("Please enter a date of birth."); return; }
    const dob = new Date(newDob);
    if (Number.isNaN(dob.getTime())) { toast.error("Invalid date."); return; }

    const created = addBaby({ name: trimmed, birthDate: dob.getTime() });
    setActiveBabyId(created.id);
    setNewName("");
    setNewDob("");
    setAddMode(false);
    setSheetOpen(false);
    toast.success(`${trimmed} added!`);
  }, [newName, newDob, addBaby, setActiveBabyId]);

  if (babies.length < 2) return null;

  return (
    <>
      {/* Compact header widget */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-center gap-1.5"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        {activeBaby && <AvatarCircle baby={activeBaby} active />}
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeBaby?.name ?? "Baby"}
        </span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--mu)" }} />
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div
          ref={backdropRef}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === backdropRef.current) setSheetOpen(false); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 512,
              background: "var(--card)",
              borderRadius: "16px 16px 0 0",
              padding: 16,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)" }}>Switch baby</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mu)", padding: 4 }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {babies.map((baby) => (
                <button
                  key={baby.id}
                  type="button"
                  onClick={() => {
                    setActiveBabyId(baby.id);
                    setSheetOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border p-3"
                  style={{
                    borderColor: baby.id === activeBabyId ? "var(--coral)" : "var(--bd)",
                    background: baby.id === activeBabyId ? "color-mix(in srgb, var(--coral) 6%, var(--card))" : "var(--card)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <AvatarCircle baby={baby} active={baby.id === activeBabyId} size={36} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{baby.name}</div>
                    <div style={{ fontSize: 11, color: "var(--mu)" }}>
                      {formatAge(baby.birthDate)} · Last log: {formatLastLog(baby.id)}
                    </div>
                  </div>
                  {baby.id === activeBabyId && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--coral)", flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>

            {/* Add baby */}
            {!addMode ? (
              <button
                type="button"
                onClick={() => {
                  if (babies.length >= MAX_BABIES) {
                    toast.error(`Maximum of ${MAX_BABIES} babies.`);
                    return;
                  }
                  setAddMode(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border p-3 mt-3"
                style={{ borderColor: "var(--bd)", background: "var(--card)", cursor: "pointer", color: "var(--pink)" }}
              >
                <Plus className="w-4 h-4" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Add baby</span>
              </button>
            ) : (
              <div className="rounded-xl border p-3 mt-3 space-y-3" style={{ borderColor: "var(--pink)", background: "var(--bg2)" }}>
                <div>
                  <label className="block text-[12px] mb-1 font-medium" style={{ color: "var(--mu)" }}>Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Baby's name"
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[12px] mb-1 font-medium" style={{ color: "var(--mu)" }}>Date of birth</label>
                  <Input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAdd}
                    className="flex-1 min-h-[40px]"
                    style={{ background: "var(--pink)", color: "white" }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setAddMode(false); setNewName(""); setNewDob(""); }}
                    className="min-h-[40px]"
                    style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
