import { useState, useMemo, useRef, useEffect } from "react";
import { useBaby } from "../contexts/BabyContext";
import { getPregnancyWeek, getWeeksRemaining } from "../utils/pregnancyUtils";
import { getHospitalBag, toggleBagItem, addBagItem, addKickSession, getKickSessions, type BagItem } from "../utils/pregnancyStorage";
import { toast } from "sonner";

const F = "system-ui, sans-serif";
const CORAL = "#C17D5E";
const SAGE = "#7A9080";
const MUTED = "#9A9590";

interface Props {
  onBabyArrived: () => void;
}

interface PregnancyAppointment {
  label: string;
  weekRange: string;
  targetWeek: number;
  done: boolean;
}

export function PregnancyToolsSection({ onBabyArrived }: Props) {
  const { activeBaby } = useBaby();
  const dueDate = activeBaby?.birthDate ?? Date.now();
  const currentWeek = useMemo(() => getPregnancyWeek(dueDate), [dueDate]);
  const weeksLeft = useMemo(() => getWeeksRemaining(dueDate), [dueDate]);

  const [showKickCounter, setShowKickCounter] = useState(false);
  const [showHospitalBag, setShowHospitalBag] = useState(false);
  const [bagItems, setBagItems] = useState<BagItem[]>(() => getHospitalBag());
  const [kickCount, setKickCount] = useState(0);
  const [kickStart, setKickStart] = useState<number | null>(null);
  const [newBagItem, setNewBagItem] = useState("");

  const appointments: PregnancyAppointment[] = useMemo(() => [
    { label: "Dating / early scan", weekRange: "Weeks 8–14", targetWeek: 12, done: currentWeek > 14 },
    { label: "Blood tests (first trimester)", weekRange: "Weeks 10–14", targetWeek: 12, done: currentWeek > 14 },
    { label: "12-week scan", weekRange: "Week 12", targetWeek: 12, done: currentWeek > 12 },
    { label: "16-week midwife check", weekRange: "Week 16", targetWeek: 16, done: currentWeek > 16 },
    { label: "20-week anatomy scan", weekRange: "Week 20", targetWeek: 20, done: currentWeek > 20 },
    { label: "Glucose tolerance test", weekRange: "Weeks 24–28", targetWeek: 26, done: currentWeek > 28 },
    { label: "Anti-D injection (if Rh−)", weekRange: "Week 28", targetWeek: 28, done: currentWeek > 28 },
    { label: "Group B Strep test", weekRange: "Weeks 35–37", targetWeek: 36, done: currentWeek > 37 },
  ], [currentWeek]);

  const nextAppt = appointments.find((a) => !a.done);

  const handleKick = () => {
    if (!kickStart) setKickStart(Date.now());
    setKickCount((c) => c + 1);
  };

  const finishKickSession = () => {
    if (kickCount > 0 && kickStart) {
      addKickSession({
        date: new Date().toISOString().slice(0, 10),
        startTime: kickStart,
        kicks: kickCount,
        durationMs: Date.now() - kickStart,
      });
      toast.success(`Recorded ${kickCount} kicks`);
    }
    setKickCount(0);
    setKickStart(null);
    setShowKickCounter(false);
  };

  const handleToggleBag = (id: string) => {
    setBagItems(toggleBagItem(id));
  };

  const handleAddBagItem = () => {
    const label = newBagItem.trim();
    if (!label) return;
    setBagItems(addBagItem(label, "mum"));
    setNewBagItem("");
  };

  const packedCount = bagItems.filter((b) => b.packed).length;

  const cardStyle: React.CSSProperties = {
    background: "var(--bg2, #FFFDF9)",
    border: "0.5px solid var(--bd, rgba(28,25,21,0.1))",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  };

  const checkBoxStyle = (done: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: 5,
    border: `1.5px solid ${done ? CORAL : "rgba(28,25,21,0.2)"}`,
    background: done ? CORAL : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div style={{ padding: "20px 16px 100px", fontFamily: F }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>Appointments</div>
      <div style={{ fontSize: 12, color: "var(--mu)", marginTop: 2, marginBottom: 16 }}>
        Week {currentWeek} · {weeksLeft} weeks to go
      </div>

      {/* Appointments */}
      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Coming up</div>
      <div style={cardStyle}>
        {appointments.map((a, i) => {
          const isNext = a === nextAppt;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: i < appointments.length - 1 ? "0.5px solid rgba(28,25,21,0.07)" : "none",
                ...(isNext ? { background: "#FDF4EF", borderRadius: 8, padding: "8px", margin: "-2px 0" } : {}),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={checkBoxStyle(a.done)}>
                  {a.done && (
                    <svg width="10" height="8" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: isNext ? CORAL : "var(--tx)", fontWeight: isNext ? 600 : 400 }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: "var(--mu)" }}>{a.weekRange}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tools */}
      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase", letterSpacing: 0.8, margin: "14px 0 7px" }}>Tools</div>
      <div style={cardStyle}>
        {/* Kick counter */}
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(28,25,21,0.07)", cursor: "pointer" }}
          onClick={() => currentWeek >= 24 ? setShowKickCounter(true) : null}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FDF4EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="1.6" strokeLinecap="round">
                <path d="M18 8a3 3 0 00-6 0c0 2 3 3 3 5s-3 3-3 5a3 3 0 006 0" />
                <path d="M12 2v4M8 4l1.5 2M16 4l-1.5 2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--tx)" }}>Kick counter</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>{currentWeek >= 24 ? `${getKickSessions().length} sessions recorded` : "Unlocks at week 24"}</div>
            </div>
          </div>
          <span style={{ fontSize: 10, color: currentWeek >= 24 ? CORAL : "var(--mu)", fontWeight: 500 }}>
            {currentWeek >= 24 ? "Start →" : "Week 24"}
          </span>
        </div>

        {/* Birth plan */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(28,25,21,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#E4EDEA", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SAGE} strokeWidth="1.4" strokeLinecap="round">
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 7h8M8 11h8M8 15h4" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--tx)" }}>Birth plan builder</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>Start any time — recommended by week 32</div>
            </div>
          </div>
          <span style={{ fontSize: 10, color: CORAL, fontWeight: 500 }}>Open →</span>
        </div>

        {/* Hospital bag */}
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(28,25,21,0.07)", cursor: "pointer" }}
          onClick={() => currentWeek >= 35 ? setShowHospitalBag(!showHospitalBag) : null}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F0EEF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A64A0" strokeWidth="1.4" strokeLinecap="round">
                <rect x="3" y="8" width="18" height="13" rx="3" />
                <path d="M8 8V6a4 4 0 018 0v2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--tx)" }}>Hospital bag checklist</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>
                {currentWeek >= 35 ? `${packedCount}/${bagItems.length} packed` : "Surfaces automatically at week 35"}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 10, color: currentWeek >= 35 ? CORAL : "var(--mu)", fontWeight: 500 }}>
            {currentWeek >= 35 ? (showHospitalBag ? "Hide" : "Open →") : "Week 35"}
          </span>
        </div>

        {/* Partner view */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FAEEDA", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="1.4" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--tx)" }}>Partner view</div>
              <div style={{ fontSize: 10, color: "var(--mu)" }}>Share a lighter version with your partner</div>
            </div>
          </div>
          <span style={{ fontSize: 10, color: CORAL, fontWeight: 500 }}>Share →</span>
        </div>
      </div>

      {/* Hospital bag expanded */}
      {showHospitalBag && currentWeek >= 35 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx)", marginBottom: 8 }}>
            Hospital bag · {packedCount}/{bagItems.length}
          </div>
          {(["documents", "mum", "baby", "partner"] as const).map((cat) => {
            const items = bagItems.filter((b) => b.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--mu)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                  {cat === "mum" ? "For you" : cat === "baby" ? "For baby" : cat === "partner" ? "For partner" : "Documents"}
                </div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleBag(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      cursor: "pointer",
                      borderBottom: "0.5px solid rgba(28,25,21,0.05)",
                    }}
                  >
                    <div style={checkBoxStyle(item.packed)}>
                      {item.packed && (
                        <svg width="10" height="8" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: item.packed ? "var(--mu)" : "var(--tx)", textDecoration: item.packed ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              type="text"
              value={newBagItem}
              onChange={(e) => setNewBagItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBagItem()}
              placeholder="Add custom item…"
              style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--bd)", background: "var(--bg)", color: "var(--tx)", fontFamily: F }}
            />
            <button
              type="button"
              onClick={handleAddBagItem}
              style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, background: CORAL, color: "#fff", border: "none", cursor: "pointer", fontFamily: F, fontWeight: 600 }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Kick counter modal */}
      {showKickCounter && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg, #fff)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, textAlign: "center", fontFamily: F }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>Kick counter</div>
            <div style={{ fontSize: 11, color: "var(--mu)", marginBottom: 20 }}>Tap every time you feel a kick, roll, or jab</div>

            <button
              type="button"
              onClick={handleKick}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${CORAL}, #d4604a)`,
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 4px 20px rgba(193,125,94,0.3)",
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{kickCount}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>kicks</div>
            </button>

            {kickStart && (
              <div style={{ fontSize: 11, color: "var(--mu)", marginBottom: 12 }}>
                {Math.round((Date.now() - kickStart) / 60000)} min elapsed
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { setKickCount(0); setKickStart(null); setShowKickCounter(false); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--bd)", background: "transparent", cursor: "pointer", fontFamily: F, fontSize: 13, color: "var(--tx)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={finishKickSession}
                style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: CORAL, color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 600 }}
              >
                Save session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handoff strip */}
      <div style={{
        background: "#E4EDEA",
        borderRadius: 12,
        padding: "12px 14px",
        marginTop: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 11, color: "#0F6E56", lineHeight: 1.4, maxWidth: 200 }}>
          Baby arrived? One tap to start tracking.
        </div>
        <button
          type="button"
          onClick={onBabyArrived}
          style={{
            fontSize: 10,
            color: "#0F6E56",
            fontWeight: 600,
            whiteSpace: "nowrap",
            background: "#fff",
            padding: "6px 12px",
            borderRadius: 100,
            border: "none",
            cursor: "pointer",
            fontFamily: F,
          }}
        >
          She's here →
        </button>
      </div>
    </div>
  );
}
