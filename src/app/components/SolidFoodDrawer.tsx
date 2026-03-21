/**
 * Solid food log: food name, first time, reaction, allergen flags.
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { saveSolidEntry } from "../utils/solidsStorage";
import type { SolidReaction, AllergenType } from "../types/solids";

const QUICK_FOODS = [
  "Puréed carrot",
  "Puréed sweet potato",
  "Baby rice",
  "Puréed pea",
  "Banana",
  "Avocado",
  "Puréed apple",
];

const REACTIONS: { value: SolidReaction; label: string }[] = [
  { value: "none", label: "None" },
  { value: "liked", label: "Liked it" },
  { value: "disliked", label: "Didn't like it" },
  { value: "allergic_reaction", label: "Possible reaction" },
  { value: "unsure", label: "Not sure" },
];

const ALLERGENS: { value: AllergenType; label: string }[] = [
  { value: "milk", label: "Milk" },
  { value: "eggs", label: "Eggs" },
  { value: "gluten", label: "Gluten" },
  { value: "nuts", label: "Nuts" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
  { value: "soy", label: "Soy" },
  { value: "none", label: "None" },
];

export interface SolidFoodDrawerProps {
  onClose: () => void;
  onSaved: () => void;
}

function PastPanel({ expanded, onToggle, children }: { expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-[14px] border px-4 py-3.5 mb-3 text-left min-h-[48px]"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      >
        <span className="text-[14px]">Log a past entry</span>
        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} style={{ color: "var(--mu)" }} />
      </button>
      {expanded && children}
    </>
  );
}

export function SolidFoodDrawer({ onClose, onSaved }: SolidFoodDrawerProps) {
  const [food, setFood] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [reaction, setReaction] = useState<SolidReaction>("none");
  const [allergenFlags, setAllergenFlags] = useState<AllergenType[]>([]);
  const [note, setNote] = useState("");
  const [pastExpanded, setPastExpanded] = useState(false);
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");

  const getTimestamp = (): string => {
    if (pastExpanded && pastDate.trim()) {
      const [y, m, d] = pastDate.split("-").map(Number);
      const [h = 0, min = 0] = pastTime.split(":").map(Number);
      if (![y, m, d].some(isNaN)) {
        const ms = new Date(y, m - 1, d, h, min).getTime();
        if (Number.isFinite(ms)) return new Date(ms).toISOString();
      }
    }
    return new Date().toISOString();
  };

  const handleSave = () => {
    const name = food.trim();
    if (!name) {
      toast.error("Enter a food name");
      return;
    }
    if (name.length > 60) {
      toast.error("Food name too long");
      return;
    }
    try {
      saveSolidEntry({
        id: `solid-${Date.now()}`,
        timestamp: getTimestamp(),
        food: name,
        isFirstTime,
        reaction,
        note: note.trim() || null,
        allergenFlags,
      });
      if (isFirstTime) toast.success("First taste logged!");
      else toast.success("Solid food logged");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const toggleAllergen = (a: AllergenType) => {
    if (a === "none") {
      setAllergenFlags([]);
      return;
    }
    setAllergenFlags((prev) => {
      const next = prev.filter((x) => x !== "none");
      if (next.includes(a)) return next.filter((x) => x !== a);
      return [...next, a];
    });
  };

  const showAllergyNote = reaction === "allergic_reaction" || allergenFlags.length > 0;

  return (
    <div className="rounded-b-2xl border border-t-0 border-[var(--bd)] p-4 pb-6" style={{ background: "var(--card2)" }}>
      <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
        Solid food
      </h2>
      <p className="text-[13px] mb-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Log what she tried and how it went
      </p>

      <label className="block text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Food
      </label>
      <input
        type="text"
        value={food}
        onChange={(e) => setFood(e.target.value.slice(0, 60))}
        placeholder="e.g. Banana"
        maxLength={60}
        className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px] mb-2"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_FOODS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setFood(q)}
            className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          >
            {q}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={isFirstTime} onChange={(e) => setIsFirstTime(e.target.checked)} className="w-5 h-5 rounded" />
        <span className="text-[14px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          First time trying this food
        </span>
      </label>

      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Reaction
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {REACTIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setReaction(r.value)}
            className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
            style={{
              borderColor: reaction === r.value ? "var(--grn)" : "var(--bd)",
              background: reaction === r.value ? "color-mix(in srgb, var(--grn) 15%, transparent)" : "var(--card)",
              color: "var(--tx)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        Allergen (if applicable)
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ALLERGENS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => toggleAllergen(a.value)}
            className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
            style={{
              borderColor: allergenFlags.includes(a.value) ? "var(--coral)" : "var(--bd)",
              background: allergenFlags.includes(a.value) ? "color-mix(in srgb, var(--coral) 15%, transparent)" : "var(--card)",
              color: "var(--tx)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {showAllergyNote && (
        <p className="text-[13px] p-2 rounded-lg mb-4" style={{ background: "color-mix(in srgb, var(--coral) 15%, var(--card))", color: "var(--tx)" }}>
          If you suspect an allergic reaction, stop feeding and contact your doctor or local health advice line if symptoms are severe.
        </p>
      )}

      <PastPanel expanded={pastExpanded} onToggle={() => setPastExpanded((x) => !x)}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
          <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
        </div>
      </PastPanel>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border px-3 py-2.5 text-[14px] mb-4"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
      />

      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[52px]"
        style={{ background: "var(--grn)", fontFamily: "system-ui, sans-serif" }}
      >
        Save
      </button>
    </div>
  );
}
