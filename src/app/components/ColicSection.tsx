/**
 * Colic section for the Dashboard — shows pattern heatmap, insights,
 * progress comparison, and action buttons (log + soothe).
 * Prompt 5: On Today, show as collapsed single row when hasData; hide when never logged.
 */

import { useState, useMemo } from "react";
import { getColicEpisodes } from "../utils/colicStorage";
import {
  buildHourlyHeatmap,
  generateColicInsights,
  compareWeeks,
  detectColicPatterns,
  type ColicInsight,
} from "../utils/colicAnalysis";
import { ColicLogSheet } from "./ColicLogSheet";
import { SoothingTimerModal } from "./SoothingTimerModal";

const F = "system-ui, sans-serif";

const INSIGHT_COLORS: Record<ColicInsight["tone"], { bg: string; border: string; text: string }> = {
  supportive: { bg: "#fef5f0", border: "#f0d4c4", text: "#8a4020" },
  encouraging: { bg: "#eef8ee", border: "#c4e4c4", text: "#2a6a2a" },
  informative: { bg: "#f0eef8", border: "#d4cce8", text: "#4a2a8a" },
};

function HourLabel({ hour }: { hour: number }) {
  if (hour === 0) return <span>12a</span>;
  if (hour === 6) return <span>6a</span>;
  if (hour === 12) return <span>12p</span>;
  if (hour === 18) return <span>6p</span>;
  return null;
}

interface Props {
  ageInWeeks: number;
  compact?: boolean;
  /** Prompt 5: collapsed single row on Today; only show when hasData */
  collapsedRow?: boolean;
}

const CRY_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4604a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15s1.5-2 4-2 4 2 4 2" />
    <path d="M9 9.5v.5M15 9.5v.5" />
    <path d="M8 10c-.5 1-1.5 2-1.5 2M16 10c.5 1 1.5 2 1.5 2" />
  </svg>
);

/** YouTube links for colic / sleep soothing — tap ? for a one-line explainer */
const SOOTHING_SOUND_ITEMS: { id: string; label: string; href: string; help: string }[] = [
  {
    id: "white",
    label: "White noise",
    href: "https://www.youtube.com/watch?v=oewj_XEM1js",
    help: "Sound with equal energy across frequencies — like a fan or steady static. It masks sudden noises (door slams, voices) and can feel similar to the constant whoosh babies heard in the womb, which helps some settle.",
  },
  {
    id: "pink",
    label: "Pink noise",
    href: "https://www.youtube.com/watch?v=WsZ5gWX4YM0",
    help: "Lower frequencies are louder than high ones — think steady rain or wind. It’s often gentler on the ears than white noise but still covers sharp sounds, which can reduce startles and support calmer sleep.",
  },
  {
    id: "brown",
    label: "Brown noise",
    href: "https://www.youtube.com/watch?v=WsZ5gWX4YM0",
    help: "Even more emphasis on deep lows than pink noise — a rumbling, thunder-like texture. The heavy low tones can feel grounding and are another way to mask noise; try volume low and see if your baby prefers it to brighter hiss.",
  },
  {
    id: "flute",
    label: "Native American flute",
    href: "https://www.youtube.com/watch?v=QCT3WcUPPmI",
    help: "Soft, breathy flute melodies instead of electronic static. Slow, repeating phrases can hold attention gently and encourage relaxation when harsh noise doesn’t feel right for your baby.",
  },
];

export function ColicSection({ ageInWeeks, compact, collapsedRow }: Props) {
  const [logOpen, setLogOpen] = useState(false);
  const [soothingOpen, setSoothingOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [noiseHelpId, setNoiseHelpId] = useState<string | null>(null);

  const episodes = useMemo(() => getColicEpisodes(), [refreshKey]);
  const heatmap = useMemo(() => buildHourlyHeatmap(episodes), [episodes]);
  const insights = useMemo(() => generateColicInsights(episodes, ageInWeeks), [episodes, ageInWeeks]);
  const comparison = useMemo(() => compareWeeks(episodes), [episodes]);
  const patterns = useMemo(() => detectColicPatterns(episodes), [episodes]);

  const hasData = episodes.length > 0;
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const thisWeekCount = comparison?.thisWeek?.count ?? episodes.filter((e) => (e.startTime ?? e.timestamp) >= sevenDaysAgo).length;

  if (collapsedRow && !hasData) return null;

  const pad = compact ? 0 : 12;
  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #ede0d4",
    borderRadius: 14,
    margin: compact ? "0 0 8px" : `0 ${pad}px 8px`,
    padding: 14,
  };

  if (collapsedRow && hasData && !expanded) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
          onKeyDown={(e) => e.key === "Enter" && setExpanded(true)}
          style={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <div style={{ flexShrink: 0 }}>{CRY_ICON}</div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#2c1f1f", fontFamily: F }}>
            Colic · {thisWeekCount} episode{thisWeekCount !== 1 ? "s" : ""} this week
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLogOpen(true); }}
            style={{
              background: "#d4604a", color: "#fff", border: "none", borderRadius: 20,
              padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F,
            }}
          >
            Log episode
          </button>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a8080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <ColicLogSheet open={logOpen} onClose={() => setLogOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} ageInWeeks={ageInWeeks} />
      </>
    );
  }

  return (
    <>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasData ? 12 : 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {CRY_ICON}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2c1f1f", fontFamily: "Georgia, serif" }}>
              Colic tracker
            </span>
            {collapsedRow && expanded && (
              <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8080" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            style={{
              background: "#d4604a", color: "#fff", border: "none", borderRadius: 10,
              padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F,
            }}
          >
            Log episode
          </button>
        </div>

        {!hasData ? (
          /* Empty state */
          <div style={{ fontSize: 11, color: "#9a8080", fontFamily: F, lineHeight: 1.6 }}>
            Track crying episodes to build a pattern map.
            Over 2 weeks, Cradl will show whether crying clusters in the evening (classic colic),
            after feeds, or around sleep windows — and tell you when it's getting better.
          </div>
        ) : (
          <>
            {/* Heatmap */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9a8080", fontFamily: F, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                When she cries (last 14 days)
              </div>
              <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end", height: 40 }}>
                {heatmap.map((val, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{
                      width: "100%", minHeight: 2,
                      height: Math.max(2, val * 36),
                      borderRadius: 2,
                      background: val > 0.6 ? "#d4604a" : val > 0.3 ? "#e8a040" : val > 0 ? "#f0d4c4" : "#f4f0ec",
                      transition: "height 0.3s",
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 8, color: "#b0a090", fontFamily: F }}>
                {heatmap.map((_, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <HourLabel hour={i} />
                  </div>
                ))}
              </div>
            </div>

            {/* Week comparison */}
            {comparison && (
              <div style={{
                padding: "10px 12px", borderRadius: 10, marginBottom: 10,
                background: comparison.trend === "improving" ? "#eef8ee" : comparison.trend === "worsening" ? "#fef5f0" : "#faf7f4",
                border: `1px solid ${comparison.trend === "improving" ? "#c4e4c4" : comparison.trend === "worsening" ? "#f0d4c4" : "#f0ece4"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: "#9a8080", fontFamily: F }}>
                    This week: {comparison.thisWeek.count} ep · {comparison.thisWeek.totalMinutes}m
                  </div>
                  <div style={{ fontSize: 10, color: "#9a8080", fontFamily: F }}>
                    Last week: {comparison.lastWeek.count} ep · {comparison.lastWeek.totalMinutes}m
                  </div>
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 600, fontFamily: F, lineHeight: 1.5,
                  color: comparison.trend === "improving" ? "#2a6a2a" : comparison.trend === "worsening" ? "#8a4020" : "#2c1f1f",
                }}>
                  {comparison.message}
                </div>
              </div>
            )}

            {/* Pattern badges */}
            {patterns.length > 0 && patterns[0].cluster !== "random" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {patterns.map((p) => (
                  <div key={p.cluster} style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: F,
                    background: p.cluster === "evening" ? "#fef5f0" : p.cluster === "post-feed" ? "#fef4e4" : "#f0eef8",
                    color: p.cluster === "evening" ? "#d4604a" : p.cluster === "post-feed" ? "#8a5a00" : "#7a4ab4",
                    border: `1px solid ${p.cluster === "evening" ? "#f0d4c4" : p.cluster === "post-feed" ? "#e8d4a0" : "#d4cce8"}`,
                  }}>
                    {p.cluster === "evening" ? "Evening cluster" : p.cluster === "post-feed" ? "Post-feed" : "Nap-window"} · {p.confidence}%
                  </div>
                ))}
              </div>
            )}

            {/* Insights */}
            {insights.slice(0, 2).map((ins) => {
              const col = INSIGHT_COLORS[ins.tone];
              return (
                <div key={ins.id} style={{
                  padding: "10px 12px", borderRadius: 10, marginBottom: 8,
                  background: col.bg, border: `1px solid ${col.border}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: col.text, fontFamily: F, marginBottom: 3 }}>
                    {ins.title}
                  </div>
                  <div style={{ fontSize: 11, color: col.text, fontFamily: F, lineHeight: 1.5, opacity: 0.85 }}>
                    {ins.body}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Soothing timer button */}
        <button
          type="button"
          onClick={() => setSoothingOpen(true)}
          style={{
            width: "100%", marginTop: hasData ? 4 : 10, padding: "10px 0", borderRadius: 10,
            border: "1px solid #e4d8ec", background: "linear-gradient(135deg, #f8f4fc, #f0ecf8)",
            cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a4ab4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#7a4ab4" }}>
            5 S's soothing guide
          </span>
          <span style={{ fontSize: 10, color: "#9a8080" }}>one-tap timer</span>
        </button>
        <a
          href="https://www.youtube.com/watch?v=c4e-og7wj_U"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: F,
            color: "#7a4ab4",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Video: 5 S's guide (YouTube)
        </a>

        {/* Soothing sounds — links + ? explainer */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0ece4" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#9a8080",
              fontFamily: F,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Soothing sounds
          </div>
          {SOOTHING_SOUND_ITEMS.map((s) => (
            <div key={s.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: F,
                    color: "#7a4ab4",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {s.label}
                </a>
                <button
                  type="button"
                  aria-label={`What is ${s.label}?`}
                  aria-expanded={noiseHelpId === s.id}
                  title={s.help}
                  onClick={() => setNoiseHelpId((prev) => (prev === s.id ? null : s.id))}
                  style={{
                    width: 20,
                    height: 20,
                    padding: 0,
                    borderRadius: "50%",
                    border: "1px solid #d4cce8",
                    background: "#faf7fc",
                    color: "#7a4ab4",
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    cursor: "pointer",
                    fontFamily: F,
                    flexShrink: 0,
                  }}
                >
                  ?
                </button>
              </div>
              {noiseHelpId === s.id && (
                <p
                  style={{
                    margin: "6px 0 0",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "#faf7f4",
                    border: "1px solid #f0ece4",
                    fontSize: 10,
                    lineHeight: 1.55,
                    color: "#5c5048",
                    fontFamily: F,
                  }}
                >
                  {s.help}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <ColicLogSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        ageInWeeks={ageInWeeks}
      />
      <SoothingTimerModal open={soothingOpen} onClose={() => setSoothingOpen(false)} />
    </>
  );
}
