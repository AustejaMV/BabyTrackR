/**
 * Colic section for the Dashboard — shows pattern heatmap, insights,
 * progress comparison, and action buttons (log + soothe).
 *
 * Always renders (with empty state when no data).
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
}

export function ColicSection({ ageInWeeks, compact }: Props) {
  const [logOpen, setLogOpen] = useState(false);
  const [soothingOpen, setSoothingOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const episodes = useMemo(() => getColicEpisodes(), [refreshKey]);
  const heatmap = useMemo(() => buildHourlyHeatmap(episodes), [episodes]);
  const insights = useMemo(() => generateColicInsights(episodes, ageInWeeks), [episodes, ageInWeeks]);
  const comparison = useMemo(() => compareWeeks(episodes), [episodes]);
  const patterns = useMemo(() => detectColicPatterns(episodes), [episodes]);

  const hasData = episodes.length > 0;

  const pad = compact ? 0 : 12;
  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #ede0d4",
    borderRadius: 14,
    margin: compact ? "0 0 8px" : `0 ${pad}px 8px`,
    padding: 14,
  };

  return (
    <>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasData ? 12 : 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4604a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15s1.5-2 4-2 4 2 4 2" />
              <path d="M9 9.5v.5M15 9.5v.5" />
              <path d="M8 10c-.5 1-1.5 2-1.5 2M16 10c.5 1 1.5 2 1.5 2" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2c1f1f", fontFamily: "Georgia, serif" }}>
              Colic tracker
            </span>
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
