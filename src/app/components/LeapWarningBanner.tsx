import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useBaby } from "../contexts/BabyContext";
import { getLeapAtWeek, getNextLeap } from "../data/leaps";

function ageInWeeks(birthDateMs: number, nowMs: number = Date.now()): number {
  return Math.floor((nowMs - birthDateMs) / (7 * 24 * 60 * 60 * 1000));
}

export function LeapWarningBanner() {
  const { activeBaby } = useBaby();
  const navigate = useNavigate();

  const info = useMemo(() => {
    if (!activeBaby?.birthDate) return null;
    const dob = typeof activeBaby.birthDate === "number"
      ? activeBaby.birthDate
      : new Date(activeBaby.birthDate).getTime();
    const weeks = ageInWeeks(dob);

    const current = getLeapAtWeek(weeks);
    if (current) {
      return { text: `Leap ${current.leapNumber} is happening now — extra fussiness is normal`, active: true };
    }

    const next = getNextLeap(weeks);
    if (next && next.inDays <= 3) {
      return {
        text: `Leap ${next.leap.leapNumber} starts in ${next.inDays} day${next.inDays === 1 ? "" : "s"} — extra fussiness is normal`,
        active: false,
      };
    }

    return null;
  }, [activeBaby?.birthDate]);

  if (!info) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/journey")}
      onKeyDown={(e) => e.key === "Enter" && navigate("/journey")}
      style={{
        background: "linear-gradient(135deg, #f4eafc, #ede0f8)",
        borderRadius: 14,
        margin: "0 12px 8px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" /></svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#4a2a9a", overflowWrap: "break-word" }}>
          {info.text}
        </div>
      </div>
      <span style={{ fontSize: 11, color: "#7a4ab4", fontWeight: 600, flexShrink: 0 }}>
        Story →
      </span>
    </div>
  );
}
