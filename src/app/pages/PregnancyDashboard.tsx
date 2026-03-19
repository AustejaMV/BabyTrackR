import { useMemo, useRef, useEffect, useState } from "react";
import { useBaby } from "../contexts/BabyContext";
import { getPregnancyWeek, getWeeksRemaining, getTrimester, getWeekData, formatDueDate } from "../utils/pregnancyUtils";
import { PREGNANCY_WEEKS, PREGNANCY_MILESTONES } from "../data/pregnancyWeeks";
import { isNightHours } from "../utils/nightMode";
import { BreathingExerciseModal } from "../components/BreathingExerciseModal";

const F = "system-ui, sans-serif";
const CORAL = "#C17D5E";
const SAGE = "#7A9080";
const SAGE_BG = "#E4EDEA";
const MUTED = "#9A9590";
const LIGHT_MUTED = "#D4C5BB";
const CARD_BG = "#FFFDF9";
const CARD_BD = "rgba(28,25,21,0.1)";
const DARK_BG = "#1C1915";
const DARK_TX = "#FAF7F2";

export function PregnancyDashboard() {
  const { activeBaby } = useBaby();
  const nightMode = isNightHours();
  const [showBreathing, setShowBreathing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const dueDate = activeBaby?.birthDate ?? Date.now();
  const currentWeek = useMemo(() => getPregnancyWeek(dueDate), [dueDate]);
  const weeksLeft = useMemo(() => getWeeksRemaining(dueDate), [dueDate]);
  const trimester = getTrimester(currentWeek);
  const weekData = getWeekData(currentWeek);

  useEffect(() => {
    if (!trackRef.current) return;
    const pip = trackRef.current.querySelector(`[data-week="${currentWeek}"]`);
    if (pip) pip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentWeek]);

  const bg = nightMode ? "#1a1520" : "linear-gradient(to bottom, #FAF7F2, #F5F1EA)";
  const tx = nightMode ? "#e8e0d8" : "#1C1915";
  const mu = nightMode ? "#7a7068" : MUTED;
  const cardBg = nightMode ? "#252020" : CARD_BG;
  const cardBd = nightMode ? "rgba(255,255,255,0.06)" : CARD_BD;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: F, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: tx, lineHeight: 1.2 }}>
          Week {currentWeek}
        </div>
        <div style={{ fontSize: 12, color: mu, marginTop: 2 }}>
          {activeBaby?.parentName || "You"} · Due {formatDueDate(dueDate)} · {weeksLeft} weeks to go
        </div>
      </div>

      {/* Section label */}
      <div style={{ fontSize: 9, fontWeight: 600, color: mu, textTransform: "uppercase", letterSpacing: 0.8, padding: "14px 16px 4px" }}>
        Your pregnancy
      </div>

      {/* Trimester labels */}
      <div style={{ display: "flex", gap: 4, padding: "0 16px", marginBottom: 4 }}>
        {[1, 2, 3].map((t) => (
          <span key={t} style={{ flex: 1, fontSize: 8, color: t === trimester ? CORAL : mu, textTransform: "uppercase", letterSpacing: 0.06 }}>
            {t === 1 ? "First" : t === 2 ? "Second" : "Third"} trimester
          </span>
        ))}
      </div>

      {/* Horizontal pip track */}
      <div
        ref={trackRef}
        style={{ overflowX: "auto", padding: "0 16px 8px", WebkitOverflowScrolling: "touch" }}
      >
        <div style={{ display: "flex", gap: 4, width: "max-content" }}>
          {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => {
            const isDone = w < currentWeek;
            const isCurrent = w === currentWeek;
            const isFuture = w > currentWeek;
            return (
              <div
                key={w}
                data-week={w}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  opacity: isFuture ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <div
                  style={{
                    width: isCurrent ? 26 : 20,
                    height: isCurrent ? 26 : 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isCurrent ? 9 : 8,
                    fontWeight: isCurrent ? 600 : 400,
                    background: isDone ? SAGE_BG : isCurrent ? CORAL : (nightMode ? "#2a2520" : "#F0EBE3"),
                    color: isDone ? SAGE : isCurrent ? "#fff" : LIGHT_MUTED,
                    transition: "all 0.15s",
                  }}
                >
                  {w}
                </div>
                <div style={{ fontSize: 7, color: isCurrent ? CORAL : mu }}>
                  {PREGNANCY_MILESTONES[w] ? PREGNANCY_MILESTONES[w]!.slice(0, 8) : `w${w}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Development card — dark style */}
      {weekData && (
        <div style={{ margin: "0 12px 10px", background: nightMode ? "#0d0a08" : DARK_BG, borderRadius: 16, padding: 14, color: DARK_TX }}>
          {/* Week badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(193,125,94,0.2)", borderRadius: 100, padding: "3px 10px", marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: CORAL, fontWeight: 500 }}>Week {currentWeek}</span>
          </div>

          {/* Size row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(193,125,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
                <ellipse cx="16" cy="10" rx={Math.min(7, 3 + currentWeek * 0.12)} ry={Math.min(8, 3 + currentWeek * 0.15)} fill="rgba(193,125,94,0.4)" />
                <path d={`M10 16 Q8 24 9 ${26 + Math.min(4, currentWeek * 0.1)}`} stroke="rgba(193,125,94,0.5)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d={`M22 16 Q24 24 23 ${26 + Math.min(4, currentWeek * 0.1)}`} stroke="rgba(193,125,94,0.5)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {currentWeek >= 10 && <path d="M13 24 Q16 28 19 24" stroke="rgba(193,125,94,0.5)" strokeWidth="2" strokeLinecap="round" fill="none" />}
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>
                {weekData.sizeCm > 0 ? `${weekData.sizeCm} cm · ${weekData.sizeG > 0 ? `${weekData.sizeG >= 1000 ? `${(weekData.sizeG / 1000).toFixed(1)} kg` : `${weekData.sizeG} g`}` : ""}` : "Too small to measure"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(250,247,242,0.5)", marginTop: 2 }}>
                About the size of a {weekData.sizeComparison.toLowerCase()}
              </div>
            </div>
          </div>

          {/* Title + body */}
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
            {weekData.title}
          </div>
          <div
            style={{ fontSize: 11, color: "rgba(250,247,242,0.65)", lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: weekData.body }}
          />

          {/* Tags */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
            {weekData.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 100, background: "rgba(255,255,255,0.07)", color: "rgba(250,247,242,0.5)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* What you might be feeling */}
      {weekData && weekData.feelings.length > 0 && (
        <div style={{ margin: "0 12px 10px", background: nightMode ? "#1e1a28" : "#F0EEF8", borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7A64A0", marginBottom: 8, fontWeight: 600 }}>
            What you might be feeling
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {weekData.feelings.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: nightMode ? "#b8a8d0" : "#6B6560", lineHeight: 1.4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7A64A0", flexShrink: 0, marginTop: 4 }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breathing button */}
      <div style={{ padding: "0 12px", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setShowBreathing(true)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: `1px solid ${cardBd}`,
            background: cardBg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: F,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: SAGE_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SAGE} strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
              <path d="M12 8v4l2 2" />
            </svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: tx }}>I need a moment</div>
            <div style={{ fontSize: 10, color: mu }}>60-second breathing exercise</div>
          </div>
        </button>
      </div>

      {/* Quick peek: next milestone */}
      {(() => {
        const next = PREGNANCY_WEEKS.find((w) => w.week > currentWeek && w.milestone);
        if (!next) return null;
        return (
          <div style={{ margin: "0 12px 10px", background: cardBg, border: `0.5px solid ${cardBd}`, borderRadius: 14, padding: 12, opacity: 0.7 }}>
            <div style={{ fontSize: 9, color: mu, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Coming up</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: tx }}>
              Week {next.week} · {next.milestone}
            </div>
            <div style={{ fontSize: 11, color: mu, lineHeight: 1.4, marginTop: 2 }}>
              {next.title}
            </div>
          </div>
        );
      })()}

      <BreathingExerciseModal open={showBreathing} onClose={() => setShowBreathing(false)} />
    </div>
  );
}
