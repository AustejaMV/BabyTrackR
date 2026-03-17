import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Navigation } from "../components/Navigation";
import { ThemeToggle } from "../components/ThemeToggle";
import { AppointmentsSection } from "../components/AppointmentsSection";
import { HealthHistorySection } from "../components/HealthHistorySection";
import { useBaby } from "../contexts/BabyContext";
import { getSpitUpHistory, getSpitUpWeeklySummary } from "../utils/spitUpStorage";
import { BabySwitcher } from "../components/BabySwitcher";
import { EmptyState } from "../components/EmptyState";

const FAMILY_STORAGE = "babytrackr-family";
const NOTES_STORAGE = "babytrackr-notes";
const SHOP_STORAGE = "babytrackr-shopping";

interface FamilyMember {
  id: string;
  initial: string;
  name: string;
  role: string;
  badge: string;
  badgeStyle: string;
}

interface NoteItem {
  id: string;
  text: string;
  at: string;
  isPrivate: boolean;
}

interface ShopItem {
  id: string;
  label: string;
  done: boolean;
}

const DEFAULT_FAMILY: FamilyMember[] = [
  { id: "1", initial: "A", name: "Primary caregiver", role: "You", badge: "You", badgeStyle: "var(--pe)" },
  { id: "2", initial: "M", name: "Partner", role: "Dad · can view & log", badge: "Active", badgeStyle: "var(--sk)" },
];

const PRESET_CHIPS = ["Diapers", "Wipes", "Formula", "Diaper cream", "Baby shampoo"];

export function MoreScreen() {
  const { activeBaby, babies, setActiveBabyId } = useBaby();
  const [family, setFamily] = useState<FamilyMember[]>(DEFAULT_FAMILY);
  const [inviteEmail, setInviteEmail] = useState("");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopInput, setShopInput] = useState("");

  useEffect(() => {
    try {
      const f = localStorage.getItem(FAMILY_STORAGE);
      if (f) setFamily(JSON.parse(f));
    } catch {}
    try {
      const n = localStorage.getItem(NOTES_STORAGE);
      if (n) setNotes(JSON.parse(n));
    } catch {}
    try {
      const s = localStorage.getItem(SHOP_STORAGE);
      if (s) setShopItems(JSON.parse(s));
    } catch {}
  }, []);

  const saveFamily = (next: FamilyMember[]) => {
    setFamily(next);
    try {
      localStorage.setItem(FAMILY_STORAGE, JSON.stringify(next));
    } catch {}
  };
  const saveNotes = (next: NoteItem[]) => {
    setNotes(next);
    try {
      localStorage.setItem(NOTES_STORAGE, JSON.stringify(next));
    } catch {}
  };
  const saveShop = (next: ShopItem[]) => {
    setShopItems(next);
    try {
      localStorage.setItem(SHOP_STORAGE, JSON.stringify(next));
    } catch {}
  };

  const addFamily = () => {
    if (!inviteEmail.trim()) return;
    const initial = inviteEmail[0].toUpperCase();
    saveFamily([
      ...family,
      { id: String(Date.now()), initial, name: inviteEmail.trim(), role: "Invited", badge: "Pending", badgeStyle: "var(--mu)" },
    ]);
    setInviteEmail("");
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    const now = new Date();
    const at = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}, ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    saveNotes([...notes, { id: String(Date.now()), text: noteInput.trim(), at, isPrivate: false }]);
    setNoteInput("");
  };

  const addChip = (label: string) => {
    if (shopItems.some((i) => i.label === label)) return;
    saveShop([...shopItems, { id: String(Date.now()), label, done: false }]);
  };

  const addShopItem = () => {
    if (!shopInput.trim()) return;
    saveShop([...shopItems, { id: String(Date.now()), label: shopInput.trim(), done: false }]);
    setShopInput("");
  };

  const toggleShop = (id: string) => {
    saveShop(shopItems.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  };

  const removeNote = (id: string) => {
    saveNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="p-2 -ml-2 rounded-lg hover:opacity-80" style={{ color: "var(--mu)" }} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10H5M5 10l5 5M5 10l5-5" />
            </svg>
          </Link>
          <Link
            to="/settings"
            className="p-2 rounded-lg hover:opacity-80"
            style={{ color: "var(--mu)" }}
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="2.5" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
            </svg>
          </Link>
        </div>
        <BabySwitcher babies={babies} activeBaby={activeBaby} onSwitch={setActiveBabyId} />

        <AppointmentsSection />

        <Link
          to="/gp-summary"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            Prepare for GP visit
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            One-page summary for health visitor or GP
          </div>
        </Link>

        <Link
          to="/return-to-work"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            Return to work planner
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Feeding transition, sleep shift, handoff doc for nursery or childminder
          </div>
        </Link>

        <Link
          to="/library"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            Library
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            NHS-aligned articles on sleep, feeding, nappies and when to call your GP
          </div>
        </Link>

        <Link
          to="/jaundice"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            Jaundice watch
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Track skin checks in the first few weeks — when to call your midwife or 111
          </div>
        </Link>

        <Link
          to="/memories"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            Memory book
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Photos and notes by day, monthly recaps, shareable with family (Premium)
          </div>
        </Link>

        {(() => {
          const spitUpEntries = getSpitUpHistory();
          const weeklySummary = getSpitUpWeeklySummary(spitUpEntries, activeBaby?.name ?? null);
          return weeklySummary ? (
            <div className="rounded-[18px] border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
              <div className="text-[15px] font-medium mb-1" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
                Spit-up & reflux
              </div>
              <p className="text-[13px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                {weeklySummary}
              </p>
              <p className="text-[12px]" style={{ color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}>
                Log more from Home → Spit-up
              </p>
            </div>
          ) : null;
        })()}

        <HealthHistorySection />

        <Link
          to="/skin"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
            Skin & eczema
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Flares, creams, triggers — spot patterns
          </div>
        </Link>

        <p className="text-[12px] uppercase tracking-widest mb-2 mt-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          you
        </p>
        <Link
          to="/mum"
          className="block rounded-[18px] border p-4 mb-3"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            You matter too
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Recovery, pelvic floor, pain relief, mood check
          </div>
        </Link>

        <p className="text-[12px] uppercase tracking-widest mb-2 mt-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          family
        </p>
        <div className="rounded-[18px] border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          {family.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--bd)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-medium flex-shrink-0"
                style={{ background: m.badgeStyle, color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              >
                {m.initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                  {m.name}
                </div>
                <div className="text-[12px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                  {m.role}
                </div>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[11px]"
                style={{ background: m.badgeStyle, color: "var(--tx)", fontFamily: "system-ui, sans-serif", opacity: 0.9 }}
              >
                {m.badge}
              </span>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <input
              type="email"
              placeholder="partner@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFamily()}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px] outline-none min-h-[44px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            />
            <button
              type="button"
              onClick={addFamily}
              className="px-4 py-2.5 rounded-xl text-[14px] min-h-[44px] border-none cursor-pointer whitespace-nowrap"
              style={{ background: "var(--btn-row)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            >
              Invite
            </button>
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            They&apos;ll sign in with this email to join your family
          </p>
        </div>

        <p className="text-[12px] uppercase tracking-widest mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          notes
        </p>
        <div className="rounded-[18px] border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          {notes.length === 0 ? (
            <EmptyState
              illustration="note"
              title="No notes yet"
              body="Add a quick note for GP visits, reminders, or anything you want to remember."
              compact
              primaryAction={{ label: "Add a note", onClick: () => document.getElementById("note-input")?.focus() }}
            />
          ) : null}
          {notes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border p-3 mb-2 flex justify-between items-start gap-2"
              style={{ background: "var(--card)", borderColor: "var(--bd)" }}
            >
              <div className="text-[14px] leading-snug min-w-0" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                {n.text}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                  {n.at}
                </span>
                <button
                  type="button"
                  onClick={() => removeNote(n.id)}
                  className="text-[12px] cursor-pointer min-h-[36px] px-2"
                  style={{ color: "var(--pink)" }}
                >
                  remove
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              id="note-input"
              placeholder="Add a note..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px] outline-none min-h-[44px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            />
            <button
              type="button"
              onClick={addNote}
              className="px-4 py-2.5 rounded-xl text-[14px] min-h-[44px] border-none cursor-pointer"
              style={{ background: "var(--btn-row)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            >
              Add
            </button>
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Public notes appear in the PDF export.
          </p>
        </div>

        <p className="text-[12px] uppercase tracking-widest mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          shopping list
        </p>
        <div className="rounded-[18px] border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_CHIPS.map((label) => {
              const on = shopItems.some((i) => i.label === label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => addChip(label)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[13px] min-h-[40px] cursor-pointer transition-all"
                  style={{
                    borderColor: on ? "#a8d498" : "var(--bd)",
                    background: on ? "var(--sa)" : "var(--card)",
                    color: "var(--tx)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a custom item..."
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addShopItem()}
              className="flex-1 rounded-xl border px-3 py-2.5 text-[15px] outline-none min-h-[44px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            />
            <button
              type="button"
              onClick={addShopItem}
              className="px-4 py-2.5 rounded-xl text-lg min-h-[44px] border-none cursor-pointer"
              style={{ background: "var(--btn-row)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            >
              +
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {shopItems.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--bd)" }}>
                <button
                  type="button"
                  onClick={() => toggleShop(i.id)}
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer min-w-[24px] min-h-[24px]"
                  style={{
                    borderColor: i.done ? "var(--grn)" : "var(--bd)",
                    background: i.done ? "var(--grn)" : "transparent",
                  }}
                >
                  {i.done && <span className="text-white text-[12px]">✓</span>}
                </button>
                <span
                  className="text-[14px] flex-1"
                  style={{
                    color: "var(--tx)",
                    fontFamily: "system-ui, sans-serif",
                    textDecoration: i.done ? "line-through" : "none",
                    opacity: i.done ? 0.7 : 1,
                  }}
                >
                  {i.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] uppercase tracking-widest mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          export
        </p>
        <div className="rounded-2xl border p-4 mb-2" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          <div className="text-[15px] font-medium mb-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            PDF report
          </div>
          <p className="text-[13px] leading-snug mb-2.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            All logs, feed times per breast, milestones, public notes and growth data. Dates in dd/mm/yyyy.
          </p>
          <Link
            to="/settings"
            className="block w-full py-3 rounded-xl text-[14px] font-medium text-white text-center cursor-pointer min-h-[48px] leading-[48px]"
            style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}
          >
            Generate PDF
          </Link>
        </div>
        <div className="rounded-[18px] border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          <div className="text-[15px] font-medium mb-1" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
            Weekly summary
          </div>
          <p className="text-[13px] leading-snug mb-2.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            A cosy digest sent to you or your partner.
          </p>
          <button
            type="button"
            className="w-full py-3 rounded-xl text-[14px] font-medium text-white cursor-pointer border-none min-h-[48px]"
            style={{ background: "var(--blue)", fontFamily: "system-ui, sans-serif" }}
          >
            Send email
          </button>
        </div>

        <p className="text-[12px] uppercase tracking-widest mb-2 mt-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          preferences
        </p>
        <div className="rounded-[18px] border p-4 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          <ThemeToggle />
        </div>
      </div>
      <Navigation />
    </div>
  );
}
