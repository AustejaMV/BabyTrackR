import { useState, useMemo } from "react";
import { PREGNANCY_WEEKS, PREGNANCY_MILESTONES } from "../data/pregnancyWeeks";
import { getPregnancyWeek, getWeekData } from "../utils/pregnancyUtils";
import { useBaby } from "../contexts/BabyContext";

const CORAL = "#C17D5E";
const SAGE = "#7A9080";
const SAGE_BG = "#E4EDEA";
const MUTED = "#9A9590";
const LIGHT_MUTED = "#D4C5BB";
const DARK_BG = "#1C1915";
const DARK_TX = "#FAF7F2";
const F = "system-ui, sans-serif";

interface Props {
  onBabyArrived: () => void;
}

export function PregnancyJourneyView({ onBabyArrived }: Props) {
  const { activeBaby } = useBaby();
  const dueDate = activeBaby?.birthDate ?? Date.now();
  const currentWeek = useMemo(() => getPregnancyWeek(dueDate), [dueDate]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const previewWeek = selectedWeek ?? currentWeek;
  const previewData = getWeekData(previewWeek);
  const isFuturePreview = previewWeek > currentWeek;

  return (
    <div style={{ padding: "20px 16px 100px", fontFamily: F }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>Your journey</div>
      <div style={{ fontSize: 12, color: "var(--mu)", marginTop: 2, marginBottom: 16 }}>Weeks 1–40 · tap any week</div>

      {/* 40-week grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 16 }}>
        {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => {
          const isDone = w < currentWeek;
          const isCurrent = w === currentWeek;
          const isFuture = w > currentWeek;
          const hasMilestone = !!PREGNANCY_MILESTONES[w];
          const isSelected = w === selectedWeek;
          return (
            <div
              key={w}
              onClick={() => setSelectedWeek(w === selectedWeek ? null : w)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                cursor: "pointer",
                opacity: isFuture ? (w > 28 ? 0.4 : 0.65) : 1,
              }}
            >
              <div
                style={{
                  width: isCurrent ? 28 : isSelected ? 26 : 22,
                  height: isCurrent ? 28 : isSelected ? 26 : 22,
                  borderRadius: "50%",
                  background: isDone ? SAGE_BG : isCurrent ? CORAL : "var(--bg2, #F0EBE3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isCurrent ? 9 : 8,
                  fontWeight: isCurrent || isSelected ? 600 : 400,
                  color: isDone ? SAGE : isCurrent ? "#fff" : LIGHT_MUTED,
                  border: hasMilestone
                    ? `1.5px solid ${isDone ? SAGE : isCurrent ? CORAL : LIGHT_MUTED}`
                    : isSelected
                    ? `1.5px solid ${CORAL}`
                    : "1.5px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {w}
              </div>
              <div style={{ fontSize: 7, color: isDone ? SAGE : isCurrent ? CORAL : LIGHT_MUTED, textAlign: "center", lineHeight: 1.1, minHeight: 14 }}>
                {PREGNANCY_MILESTONES[w]?.split(" · ")[0]?.slice(0, 10) ?? ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected/current week card */}
      {previewData && (
        <div
          style={{
            background: isFuturePreview ? "var(--bg2, #FFFDF9)" : DARK_BG,
            border: isFuturePreview ? "0.5px solid rgba(28,25,21,0.08)" : "none",
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            opacity: isFuturePreview ? 0.6 : 1,
            color: isFuturePreview ? "var(--tx)" : DARK_TX,
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: isFuturePreview ? "rgba(28,25,21,0.06)" : "rgba(193,125,94,0.2)", borderRadius: 100, padding: "3px 10px", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: isFuturePreview ? MUTED : CORAL, fontWeight: 500 }}>
              Week {previewWeek}{previewWeek === currentWeek ? " · Now" : previewData.milestone ? ` · ${previewData.milestone}` : ""}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, color: isFuturePreview ? MUTED : DARK_TX }}>
            {previewData.title}
          </div>
          <div
            style={{ fontSize: 11, lineHeight: 1.6, color: isFuturePreview ? "var(--mu)" : "rgba(250,247,242,0.65)" }}
            dangerouslySetInnerHTML={{ __html: previewData.body }}
          />
        </div>
      )}

      {/* Show a second future preview if we're looking at current week */}
      {selectedWeek === null && (() => {
        const nextMilestone = PREGNANCY_WEEKS.find((w) => w.week > currentWeek && w.milestone);
        if (!nextMilestone) return null;
        return (
          <div style={{ background: "var(--bg2, #FFFDF9)", border: "0.5px solid rgba(28,25,21,0.08)", borderRadius: 14, padding: 12, marginBottom: 8, opacity: 0.5 }}>
            <div style={{ display: "inline-flex", background: "rgba(28,25,21,0.06)", borderRadius: 100, padding: "3px 10px", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>Week {nextMilestone.week} · {nextMilestone.milestone}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, lineHeight: 1.3, marginBottom: 2 }}>{nextMilestone.title}</div>
            <div style={{ fontSize: 10, color: LIGHT_MUTED, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: nextMilestone.body.slice(0, 200) + "…" }} />
          </div>
        );
      })()}

      {/* Handoff strip */}
      <div style={{
        background: SAGE_BG,
        borderRadius: 12,
        padding: "12px 14px",
        marginTop: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 11, color: "#0F6E56", lineHeight: 1.4, maxWidth: 200 }}>
          When she arrives, one tap converts this to the newborn tracker.
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
          Baby arrived →
        </button>
      </div>
    </div>
  );
}
