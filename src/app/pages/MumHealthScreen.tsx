import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Navigation } from "../components/Navigation";
import { LocalErrorBoundary } from "../components/LocalErrorBoundary";
import { SHORT_DATETIME_DISPLAY } from "../utils/dateUtils";

/* Inline SVG icons (no emoji) */
const IconPerson = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a5a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
);
const IconDroplet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#5a9ad4" stroke="#5a9ad4" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
);
const IconArrows = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a5a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><path d="M21 3v6h-6"/></svg>
);
const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#d4604a" stroke="#d4604a" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a5a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);
const IconFlame = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#e85d2a" stroke="#e85d2a" strokeWidth="1.5"><path d="M12 22c4-3 8-6 8-10a8 8 0 0 0-16 0c0 4 4 7 8 10z"/><path d="M12 8c-2 2-2 4 0 6 2-2 2-4 0-6z" fill="#fff" stroke="none"/></svg>
);
const IconStrength = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18l4-4 4 4 4-4"/><path d="M6 14l4-4 4 4 4-4"/><path d="M6 10l4-4 4 4 4-4"/></svg>
);
const IconHeartSmall = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#d4604a" stroke="#d4604a" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const IconCheck = ({ size = 24, color = "#4a8a4a" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
);
const IconCircle = ({ size = 24, color = "#9a8080" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
);
const IconDot = ({ size = 12, color = "#ccc" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="4"/></svg>
);
const MoodSad = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6a5a5a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.5" fill="#6a5a5a"/><circle cx="15" cy="9" r="1.5" fill="#6a5a5a"/><path d="M8 9c.5-1 1.5-1.5 2.5-1.5" strokeLinecap="round"/></svg>
);
const MoodNeutral = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6a5a5a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1.5" fill="#6a5a5a"/><circle cx="15" cy="9" r="1.5" fill="#6a5a5a"/></svg>
);
const MoodOkay = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6a5a5a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1 1.5 4 1.5 4-1.5 4-1.5"/><circle cx="9" cy="9" r="1.5" fill="#6a5a5a"/><circle cx="15" cy="9" r="1.5" fill="#6a5a5a"/><path d="M9 9c.5.5 1 .5 1.5 0" strokeLinecap="round"/></svg>
);
const MoodGood = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6a5a5a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14c1 1 2 1.5 3 1.5s2-.5 3-1.5"/><circle cx="9" cy="9" r="1.5" fill="#6a5a5a"/><circle cx="15" cy="9" r="1.5" fill="#6a5a5a"/><path d="M9 8.5c.3.4.8.5 1.2.2" strokeLinecap="round"/></svg>
);
const MoodLove = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4604a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 13s1 1.5 4 1.5 4-1.5 4-1.5"/><circle cx="9" cy="9" r="1.5" fill="#6a5a5a"/><circle cx="15" cy="9" r="1.5" fill="#6a5a5a"/><path d="M12 16l-1.5-1.5a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0z" fill="#d4604a" stroke="none"/></svg>
);

const WOUND_LOG_KEY = "cradl-wound-log";
const PELVIC_KEY = "cradl-pelvic-floor";
const EPDS_KEY = "cradl-epds-result";
const RELATIONSHIP_KEY = "cradl-relationship-log";

const TABS = [
  { id: "body", label: "Body recovery" },
  { id: "pelvic", label: "Pelvic floor" },
  { id: "postnatal", label: "Postnatal check" },
  { id: "relationship", label: "Relationship" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const EPDS_QUESTIONS = [
  { q: "I have been able to laugh and see the funny side of things", options: ["As much as I always could", "Not quite so much now", "Definitely not so much now", "Not at all"] },
  { q: "I have looked forward with enjoyment to things", options: ["As much as I ever did", "Rather less than I used to", "Definitely less than I used to", "Hardly at all"] },
  { q: "I have blamed myself unnecessarily when things went wrong", options: ["No, never", "Not very often", "Yes, some of the time", "Yes, most of the time"] },
  { q: "I have been anxious or worried for no good reason", options: ["No, not at all", "Hardly ever", "Yes, sometimes", "Yes, very often"] },
  { q: "I have felt scared or panicky for no very good reason", options: ["No, not at all", "No, not much", "Yes, sometimes", "Yes, quite a lot"] },
  { q: "Things have been getting on top of me", options: ["No, I have been coping as well as ever", "No, most of the time I have coped quite well", "Yes, sometimes I haven't been coping as well as usual", "Yes, most of the time I haven't been able to cope at all"] },
  { q: "I have been so unhappy that I have had difficulty sleeping", options: ["No, not at all", "Not very often", "Yes, sometimes", "Yes, most of the time"] },
  { q: "I have felt sad or miserable", options: ["No, not at all", "Not very often", "Yes, quite often", "Yes, most of the time"] },
  { q: "I have been so unhappy that I have been crying", options: ["No, never", "Only occasionally", "Yes, quite often", "Yes, most of the time"] },
  { q: "The thought of harming myself has occurred to me", options: ["Never", "Hardly ever", "Sometimes", "Yes, quite often"] },
] as const;

const font = "system-ui, sans-serif";

interface WoundEntry {
  date: string;
  note: string;
}

interface PelvicData {
  streak: number;
  lastDate: string | null;
  history: string[];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadWoundLog(): WoundEntry[] {
  try {
    const raw = localStorage.getItem(WOUND_LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function loadPelvicData(): PelvicData {
  try {
    const raw = localStorage.getItem(PELVIC_KEY);
    if (!raw) return { streak: 0, lastDate: null, history: [] };
    return JSON.parse(raw);
  } catch {
    return { streak: 0, lastDate: null, history: [] };
  }
}

function getTabFromUrl(): TabId {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "body" || tab === "pelvic" || tab === "postnatal" || tab === "relationship") return tab;
  } catch {}
  return "body";
}

function BodyRecoveryTab() {
  const [entries, setEntries] = useState<WoundEntry[]>(() => loadWoundLog());
  const [note, setNote] = useState("");

  const saveEntry = useCallback(() => {
    const trimmed = note.trim();
    if (!trimmed) return;
    const entry: WoundEntry = { date: new Date().toISOString(), note: trimmed };
    const updated = [...entries, entry];
    try {
      localStorage.setItem(WOUND_LOG_KEY, JSON.stringify(updated));
    } catch {}
    setEntries(updated);
    setNote("");
  }, [note, entries]);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 4, fontFamily: font }}>
        Wound care log
      </div>
      <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 12, lineHeight: 1.4, fontFamily: font }}>
        Track how your recovery is going — C-section wound, perineal stitches, or anything else.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How does it feel today?"
          maxLength={200}
          style={{
            flex: 1,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1.5px solid #ede0d4",
            fontSize: 12,
            fontFamily: font,
            outline: "none",
            color: "#2c1f1f",
          }}
          onKeyDown={(e) => e.key === "Enter" && saveEntry()}
        />
        <button
          onClick={saveEntry}
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            border: "none",
            background: "#d4604a",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          Log
        </button>
      </div>

      {entries.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: font, textAlign: "center", padding: "16px 0" }}>
          No entries yet. Start logging your recovery.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
          {[...entries].reverse().slice(0, 20).map((e, i) => (
            <div
              key={i}
              style={{
                background: "#faf8f6",
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              <div style={{ fontSize: 9, color: "var(--mu)", fontFamily: font, marginBottom: 2 }}>
                {format(new Date(e.date), SHORT_DATETIME_DISPLAY())}
              </div>
              <div style={{ fontSize: 12, color: "#2c1f1f", fontFamily: font, lineHeight: 1.4 }}>
                {e.note}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EXERCISES = [
  {
    name: "Slow kegels",
    steps: "Squeeze and lift your pelvic floor. Hold for up to 10 seconds (build up slowly). Relax fully for 10 seconds. Repeat 10 times.",
    tip: "Imagine you're stopping the flow of urine and holding in wind at the same time.",
  },
  {
    name: "Fast kegels",
    steps: "Squeeze and lift quickly, then let go immediately. Repeat 10 times as fast as you can while keeping each squeeze strong.",
    tip: "These train the fast-twitch fibres that react when you cough, sneeze, or laugh.",
  },
  {
    name: "The lift",
    steps: "Imagine your pelvic floor is a lift. Squeeze to the 1st floor, then 2nd, then 3rd — holding tighter at each level. Then slowly lower back down floor by floor.",
    tip: "The controlled release is just as important as the squeeze.",
  },
  {
    name: "Bridge with squeeze",
    steps: "Lie on your back, knees bent. Squeeze your pelvic floor, then lift your hips into a bridge. Hold for 5 seconds. Lower slowly, then release the squeeze.",
    tip: "Only add this once basic kegels feel comfortable — usually from around 6 weeks.",
  },
];

const WHY_REASONS = [
  { icon: <IconPerson />, text: "Pregnancy and birth stretch and weaken the pelvic floor muscles, even after a caesarean" },
  { icon: <IconDroplet />, text: "1 in 3 women experience bladder leaks postpartum — exercises are the most effective treatment" },
  { icon: <IconArrows />, text: "Strengthening now prevents prolapse and incontinence problems later in life" },
  { icon: <IconHeart />, text: "A strong pelvic floor improves core stability, posture, and sexual sensation" },
  { icon: <IconClock />, text: "NHS guidelines recommend starting gently within days of birth and continuing for life" },
];

function PelvicFloorTab() {
  const [data, setData] = useState<PelvicData>(() => loadPelvicData());
  const [showWhy, setShowWhy] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const today = todayKey();
  const doneToday = data.lastDate === today;

  const toggleToday = useCallback(() => {
    const updated = { ...data };
    if (doneToday) {
      updated.history = updated.history.filter((d) => d !== today);
      updated.lastDate = updated.history[updated.history.length - 1] ?? null;
      updated.streak = Math.max(0, updated.streak - 1);
    } else {
      updated.history = [...updated.history, today];
      updated.lastDate = today;
      if (data.lastDate) {
        const prev = new Date(data.lastDate);
        const now = new Date(today);
        const diffDays = Math.round((now.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
        updated.streak = diffDays <= 1 ? data.streak + 1 : 1;
      } else {
        updated.streak = 1;
      }
    }
    try {
      localStorage.setItem(PELVIC_KEY, JSON.stringify(updated));
    } catch {}
    setData(updated);
  }, [data, doneToday, today]);

  const StreakIcon = data.streak >= 7 ? IconFlame : data.streak >= 3 ? IconStrength : IconHeartSmall;

  const sectionHeaderStyle = {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "10px 14px",
    borderRadius: 10,
    background: "#faf8f6",
    cursor: "pointer" as const,
    marginBottom: 8,
    border: "1px solid #f0ebe6",
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 4, fontFamily: font }}>
        Pelvic floor exercises
      </div>
      <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 16, lineHeight: 1.4, fontFamily: font }}>
        Consistency matters more than intensity. Even a few squeezes count. Aim for 3 sets a day.
      </div>

      <div style={{ textAlign: "center" as const, padding: "12px 0 20px" }}>
        <div
          onClick={toggleToday}
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: doneToday ? "#e4f4e4" : "#faf8f6",
            border: doneToday ? "3px solid #4a8a4a" : "3px solid #ede0d4",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 28,
            transition: "all 0.2s",
          }}
        >
          {doneToday ? <IconCheck size={28} color="#4a8a4a" /> : <IconCircle size={28} color="#ede0d4" />}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: doneToday ? "#4a8a4a" : "#9a8080", fontFamily: font }}>
          {doneToday ? "Done today!" : "Tap when done"}
        </div>
      </div>

      <div
        style={{
          background: "#faf6ff",
          borderRadius: 12,
          padding: "12px 16px",
          textAlign: "center" as const,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><StreakIcon /></div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#4a2a9a", fontFamily: font }}>
          {data.streak} day{data.streak !== 1 ? "s" : ""}
        </div>
        <div style={{ fontSize: 11, color: "#9a8080", fontFamily: font }}>
          Current streak
        </div>
      </div>

      {data.history.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "var(--mu)", fontFamily: font, marginBottom: 6 }}>
            Last 7 days
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const done = data.history.includes(key);
              const dayLabel = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
              return (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: done ? "#e4f4e4" : "#f4f0ec",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: done ? "#4a8a4a" : "#ccc",
                      fontWeight: 600,
                    }}
                  >
                    {done ? <IconCheck size={12} color="#4a8a4a" /> : <IconDot size={8} color="#ccc" />}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--mu)", marginTop: 2, fontFamily: font }}>
                    {dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Why it matters */}
      <div
        onClick={() => setShowWhy(!showWhy)}
        style={sectionHeaderStyle}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: font }}>
          Why pelvic floor exercises matter
        </span>
        <span style={{ fontSize: 14, color: "#9a8080", transition: "transform 0.2s", transform: showWhy ? "rotate(180deg)" : "rotate(0)" }}>
          ▾
        </span>
      </div>
      {showWhy && (
        <div style={{ padding: "0 4px 12px", display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {WHY_REASONS.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, lineHeight: "20px", flexShrink: 0, display: "inline-flex", alignItems: "center" }}>{r.icon}</span>
              <span style={{ fontSize: 11, color: "#4a3a3a", lineHeight: 1.5, fontFamily: font }}>{r.text}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: "#b0a098", fontStyle: "italic", lineHeight: 1.4, fontFamily: font, marginTop: 4, paddingLeft: 26 }}>
            Source: NHS, NICE guidelines CG37, Royal College of Obstetricians & Gynaecologists
          </div>
        </div>
      )}

      {/* Exercise guide */}
      <div
        onClick={() => setShowExercises(!showExercises)}
        style={sectionHeaderStyle}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: font }}>
          How to do pelvic floor exercises
        </span>
        <span style={{ fontSize: 14, color: "#9a8080", transition: "transform 0.2s", transform: showExercises ? "rotate(180deg)" : "rotate(0)" }}>
          ▾
        </span>
      </div>
      {showExercises && (
        <div style={{ padding: "0 0 8px", display: "flex", flexDirection: "column" as const, gap: 6 }}>
          <div style={{ fontSize: 11, color: "#6a5a5a", lineHeight: 1.5, fontFamily: font, padding: "0 4px 6px" }}>
            You can do these sitting, standing, or lying down — anywhere, any time. Nobody can tell you're doing them.
          </div>
          {EXERCISES.map((ex, i) => {
            const isOpen = expandedExercise === i;
            return (
              <div
                key={i}
                style={{
                  border: "1px solid #ede0d4",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  onClick={() => setExpandedExercise(isOpen ? null : i)}
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#f0eafe", color: "#7a4ab4",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, fontFamily: font, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", fontFamily: font }}>
                      {ex.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#9a8080", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                    ▾
                  </span>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 12px 12px" }}>
                    <div style={{ fontSize: 11, color: "#4a3a3a", lineHeight: 1.6, fontFamily: font, marginBottom: 8 }}>
                      {ex.steps}
                    </div>
                    <div style={{
                      background: "#fef9f0", borderRadius: 8, padding: "8px 10px",
                      fontSize: 10, color: "#8a7040", lineHeight: 1.5, fontFamily: font,
                    }}>
                      <strong>Tip:</strong> {ex.tip}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{
            background: "#f0f8f0", borderRadius: 10, padding: "10px 12px",
            fontSize: 11, color: "#3a6a3a", lineHeight: 1.5, fontFamily: font, marginTop: 4,
          }}>
            <strong>Daily routine:</strong> Try doing one set of slow kegels and one set of fast kegels, three times a day. It takes about 5 minutes total. Pair it with something you already do — feeding, brushing your teeth, or waiting for the kettle.
          </div>
          <div style={{
            background: "#fef4f0", borderRadius: 10, padding: "10px 12px",
            fontSize: 11, color: "#8a4030", lineHeight: 1.5, fontFamily: font,
          }}>
            <strong>When to get help:</strong> If you're still leaking after 3 months of regular exercises, or feel heaviness or dragging in your pelvis, ask your GP for a referral to a women's health physiotherapist. This is common and treatable.
          </div>
        </div>
      )}
    </div>
  );
}

function PostnatalCheckTab() {
  const [answers, setAnswers] = useState<number[]>(new Array(10).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EPDS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.score != null) {
          setScore(data.score);
          setSubmitted(true);
          if (data.answers) setAnswers(data.answers);
        }
      }
    } catch {}
  }, []);

  const allAnswered = answers.every((a) => a >= 0);

  const handleSubmit = useCallback(() => {
    const total = answers.reduce((sum, a) => sum + a, 0);
    setScore(total);
    setSubmitted(true);
    try {
      localStorage.setItem(EPDS_KEY, JSON.stringify({
        date: new Date().toISOString(),
        score: total,
        answers,
      }));
    } catch {}
  }, [answers]);

  const reset = useCallback(() => {
    setAnswers(new Array(10).fill(-1));
    setSubmitted(false);
    setScore(null);
    try {
      localStorage.removeItem(EPDS_KEY);
    } catch {}
  }, []);

  const flagged = score !== null && score >= 13;

  if (submitted && score !== null) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 8, fontFamily: font }}>
          Edinburgh Postnatal Depression Scale
        </div>

        <div
          style={{
            background: flagged ? "#fef4f0" : "#e4f4e4",
            border: `1px solid ${flagged ? "#f4d4cc" : "#c4e4c4"}`,
            borderRadius: 14,
            padding: 16,
            textAlign: "center" as const,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: flagged ? "#8a3020" : "#2a6a2a", fontFamily: font }}>
            {score}/30
          </div>
          <div style={{ fontSize: 11, color: "#9a8080", fontFamily: font, marginTop: 4, marginBottom: 8 }}>
            Your score
          </div>

          {flagged ? (
            <div style={{ fontSize: 12, color: "#5a2a1a", lineHeight: 1.5, fontFamily: font, textAlign: "left" as const }}>
              Your score suggests you may be experiencing significant difficulties. This is
              not a diagnosis — but it is a signal worth acting on. Please speak with your GP
              or health visitor. You can also call the PANDAS Foundation helpline:{" "}
              <strong>0808 1961 776</strong>.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#2a6a2a", lineHeight: 1.5, fontFamily: font }}>
              Your score is within the typical range. If you're still struggling, please don't
              hesitate to talk to someone.
            </div>
          )}
        </div>

        <div
          onClick={reset}
          style={{
            fontSize: 11,
            color: "var(--mu)",
            cursor: "pointer",
            textAlign: "center" as const,
            fontFamily: font,
          }}
        >
          Retake questionnaire
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 4, fontFamily: font }}>
        Edinburgh Postnatal Depression Scale (EPDS)
      </div>
      <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 4, lineHeight: 1.4, fontFamily: font }}>
        This is a widely used screening tool — not a diagnosis. Answer based on how you've felt in the past 7 days.
      </div>
      <div style={{ fontSize: 10, color: "var(--mu)", marginBottom: 14, fontFamily: font }}>
        Your answers stay on this device only.
      </div>

      {EPDS_QUESTIONS.map((item, qIdx) => (
        <div key={qIdx} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#2c1f1f", marginBottom: 6, fontFamily: font, lineHeight: 1.4 }}>
            {qIdx + 1}. {item.q}
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
            {item.options.map((opt, oIdx) => {
              const selected = answers[qIdx] === oIdx;
              return (
                <div
                  key={oIdx}
                  onClick={() => {
                    const next = [...answers];
                    next[qIdx] = oIdx;
                    setAnswers(next);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: selected ? "1.5px solid #7a4ab4" : "1.5px solid #ede0d4",
                    background: selected ? "#f0eafe" : "#fff",
                    fontSize: 11,
                    color: selected ? "#4a2a9a" : "#2c1f1f",
                    cursor: "pointer",
                    fontFamily: font,
                    lineHeight: 1.3,
                    transition: "all 0.15s",
                  }}
                >
                  {opt}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 12,
          border: "none",
          background: allAnswered ? "#d4604a" : "#ede0d4",
          color: allAnswered ? "#fff" : "var(--mu)",
          fontSize: 13,
          fontWeight: 600,
          cursor: allAnswered ? "pointer" : "default",
          fontFamily: font,
          marginBottom: 8,
        }}
      >
        See my score
      </button>
    </div>
  );
}

interface RelationshipEntry {
  id: string;
  date: string;
  feeling: number;
  note: string;
}

function loadRelationshipLog(): RelationshipEntry[] {
  try {
    const raw = localStorage.getItem(RELATIONSHIP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRelationshipLog(entries: RelationshipEntry[]) {
  try { localStorage.setItem(RELATIONSHIP_KEY, JSON.stringify(entries)); } catch {}
}

const FEELINGS = [
  { value: 1, icon: <MoodSad />, label: "Struggling" },
  { value: 2, icon: <MoodNeutral />, label: "Disconnected" },
  { value: 3, icon: <MoodOkay />, label: "Okay" },
  { value: 4, icon: <MoodGood />, label: "Good" },
  { value: 5, icon: <MoodLove />, label: "Really close" },
];

function RelationshipTab() {
  const [entries, setEntries] = useState<RelationshipEntry[]>(() => loadRelationshipLog());
  const [selectedFeeling, setSelectedFeeling] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);
  const checkedInToday = entries.some((e) => e.date === todayKey);

  const handleSave = () => {
    if (selectedFeeling == null) return;
    const entry: RelationshipEntry = {
      id: `rel-${Date.now()}`,
      date: todayKey,
      feeling: selectedFeeling,
      note: note.trim().slice(0, 500),
    };
    const updated = [entry, ...entries.filter((e) => e.date !== todayKey)].slice(0, 52);
    setEntries(updated);
    saveRelationshipLog(updated);
    setSelectedFeeling(null);
    setNote("");
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 4 }}>
        How are things between you and your partner?
      </div>
      <p style={{ fontSize: 11, color: "#9a8080", margin: "0 0 12px", lineHeight: 1.5 }}>
        This is completely private — only you can see it. Checking in weekly helps you notice patterns and look after your relationship during a big life change.
      </p>

      {checkedInToday ? (
        <div style={{ background: "#f0eafe", borderRadius: 10, padding: 12, textAlign: "center" as const, marginBottom: 12 }}>
          <div style={{ fontSize: 24, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {FEELINGS.find((f) => f.value === entries[0]?.feeling)?.icon ?? <IconCheck size={24} color="#5a4a60" />}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#5a4a60" }}>Checked in today</div>
          {entries[0]?.note && (
            <div style={{ fontSize: 11, color: "#7a6a8a", marginTop: 4, fontStyle: "italic" }}>"{entries[0].note}"</div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setSelectedFeeling(f.value)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  gap: 2,
                  padding: "8px 2px",
                  borderRadius: 10,
                  border: selectedFeeling === f.value ? "2px solid #7a4ab4" : "1px solid #ede0d4",
                  background: selectedFeeling === f.value ? "#f0eafe" : "#fff",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.icon}</span>
                <span style={{ fontSize: 8, color: "#9a8080", fontWeight: 500, fontFamily: font }}>{f.label}</span>
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="Anything on your mind? (optional)"
            rows={2}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #ede0d4",
              background: "#faf8f6",
              color: "#2c1f1f",
              fontSize: 12,
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box" as const,
              marginBottom: 8,
            }}
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={selectedFeeling == null}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: selectedFeeling != null ? "#7a4ab4" : "#ede0d4",
              color: selectedFeeling != null ? "#fff" : "#9a8080",
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedFeeling != null ? "pointer" : "default",
              fontFamily: font,
              marginBottom: 12,
            }}
          >
            Save check-in
          </button>
        </>
      )}

      {entries.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9a8080", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
            Recent check-ins
          </div>
          {entries.slice(0, 8).map((e) => {
            const f = FEELINGS.find((fl) => fl.value === e.feeling);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f4f0ec" }}>
                <span style={{ fontSize: 18, display: "flex", alignItems: "center" }}>{f?.icon ?? "—"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#2c1f1f" }}>{f?.label ?? "—"}</div>
                  {e.note && <div style={{ fontSize: 10, color: "#9a8080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{e.note}</div>}
                </div>
                <span style={{ fontSize: 10, color: "#9a8080", flexShrink: 0 }}>{e.date}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export function MumHealthScreen() {
  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromUrl());

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: 80,
        background: "#faf8f6",
        fontFamily: font,
      }}
    >
      <div style={{ padding: "16px 12px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span
            onClick={() => (window.location.href = "/more")}
            style={{ fontSize: 14, cursor: "pointer", color: "#d4604a" }}
          >
            ← Back
          </span>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#2c1f1f", fontFamily: "Georgia, serif" }}>
            Your recovery
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 0,
            background: "#f4f0ec",
            borderRadius: 12,
            padding: 3,
          }}
        >
          {TABS.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                textAlign: "center" as const,
                padding: "8px 4px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                color: activeTab === tab.id ? "#2c1f1f" : "#9a8080",
                background: activeTab === tab.id ? "#fff" : "transparent",
                cursor: "pointer",
                fontFamily: font,
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      <LocalErrorBoundary>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #ede0d4",
            margin: "0 12px 8px",
            padding: 14,
          }}
        >
          {activeTab === "body" && <BodyRecoveryTab />}
          {activeTab === "pelvic" && <PelvicFloorTab />}
          {activeTab === "postnatal" && <PostnatalCheckTab />}
          {activeTab === "relationship" && <RelationshipTab />}
        </div>
      </LocalErrorBoundary>

      <Navigation />
    </div>
  );
}
