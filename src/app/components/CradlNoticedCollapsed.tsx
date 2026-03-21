/**
 * Prompt 6: Single collapsed row merging "Cradl noticed" and "Patterns".
 * Includes leap banner as one insight item. Tap row to expand; tap item to go to Story.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import type { NoticeCard } from "./CradlNoticedSection";
import type { Insight } from "../utils/insights";

const BORDER_COLORS: Record<string, string> = {
  amber: "#d4904a",
  green: "#4a8a4a",
  blue: "#4a6ab4",
  purple: "#7a4ab4",
  coral: "#d4604a",
};

interface CradlNoticedCollapsedProps {
  notices: NoticeCard[];
  insights: Insight[];
  leapText: string | null;
  nightMode?: boolean;
}

export function CradlNoticedCollapsed({ notices, insights, leapText, nightMode }: CradlNoticedCollapsedProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const items: { id: string; line: string; color: string }[] = [];
  if (leapText) items.push({ id: "leap", line: leapText, color: "purple" });
  notices.forEach((n) => items.push({ id: n.id, line: n.title, color: n.color }));
  insights.forEach((i) => items.push({ id: i.id, line: i.message, color: "green" }));

  const count = items.length;
  const tx = nightMode ? "rgba(255,255,255,0.85)" : "#2c1f1f";
  const mu = nightMode ? "rgba(255,255,255,0.4)" : "#9a8080";

  return (
    <div style={{ margin: "0 12px 8px" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 12,
          background: nightMode ? "rgba(255,255,255,0.06)" : "#fff",
          border: `1px solid ${nightMode ? "rgba(255,255,255,0.1)" : "#ede0d4"}`,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: count > 0 ? "#d4604a" : "#b0a090",
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: count > 0 ? tx : mu }}>
          {count > 0 ? `Cradl noticed ${count} thing${count !== 1 ? "s" : ""}` : "Cradl noticed · keep logging"}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={mu}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/journey")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/journey")}
              style={{
                padding: "10px 12px",
                borderRadius: "0 10px 10px 0",
                borderLeft: `3px solid ${BORDER_COLORS[item.color] ?? "#7a4ab4"}`,
                background: nightMode ? "rgba(255,255,255,0.04)" : "#fff",
                borderTop: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "#f0ece4"}`,
                borderRight: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "#f0ece4"}`,
                borderBottom: `1px solid ${nightMode ? "rgba(255,255,255,0.06)" : "#f0ece4"}`,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: tx,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {item.line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
