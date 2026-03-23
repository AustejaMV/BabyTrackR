/**
 * Single collapsed row merging "Cradl noticed" and patterns. Expand to read full
 * parent-facing copy (redesign: sentences first, not one-line titles only).
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

const CTA_BG: Record<string, string> = {
  amber: "#fef4e4",
  green: "#e4f4e4",
  blue: "#e4f0fc",
  purple: "#f0eafe",
  coral: "#feeae4",
};

const CTA_TEXT: Record<string, string> = {
  amber: "#8a5a00",
  green: "#2a6a2a",
  blue: "#1a4a8a",
  purple: "#6040a0",
  coral: "#8a3020",
};

const CTA_ACTION: Record<string, string> = {
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
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const visibleNotices = (notices ?? []).filter((n) => !dismissed.has(n.id));
  const count = (leapText ? 1 : 0) + visibleNotices.length + (insights?.length ?? 0);

  const tx = nightMode ? "rgba(255,255,255,0.85)" : "#2c1f1f";
  const mu = nightMode ? "rgba(255,255,255,0.4)" : "#9a8080";
  const cardBg = nightMode ? "rgba(255,255,255,0.04)" : "#fff";
  const cardBd = nightMode ? "rgba(255,255,255,0.06)" : "#f0ece4";

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
          {leapText && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/journey")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/journey")}
              style={{
                padding: "10px 12px",
                borderRadius: "0 10px 10px 0",
                borderLeft: `3px solid ${BORDER_COLORS.purple}`,
                background: cardBg,
                borderTop: `1px solid ${cardBd}`,
                borderRight: `1px solid ${cardBd}`,
                borderBottom: `1px solid ${cardBd}`,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: tx,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {leapText}
            </div>
          )}

          {visibleNotices.map((notice) => (
            <div
              key={notice.id}
              style={{
                padding: "10px 12px",
                borderRadius: "0 10px 10px 0",
                borderLeft: `3px solid ${BORDER_COLORS[notice.color] ?? "#d4904a"}`,
                background: cardBg,
                borderTop: `1px solid ${cardBd}`,
                borderRight: `1px solid ${cardBd}`,
                borderBottom: `1px solid ${cardBd}`,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: tx, overflowWrap: "break-word" }}>{notice.title}</div>
              <div style={{ fontSize: 11, color: mu, marginTop: 4, lineHeight: 1.45, whiteSpace: "pre-line", overflowWrap: "break-word" }}>
                {notice.body}
              </div>
              {notice.cta && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    notice.cta!.onClick();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      notice.cta!.onClick();
                    }
                  }}
                  style={{
                    marginTop: 8,
                    background: CTA_BG[notice.color] ?? CTA_BG.amber,
                    borderRadius: 8,
                    padding: "7px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 10, color: CTA_TEXT[notice.color] ?? CTA_TEXT.amber, fontWeight: 500 }}>{notice.cta.label}</span>
                  <span style={{ fontSize: 10, color: CTA_ACTION[notice.color] ?? CTA_ACTION.amber, fontWeight: 600 }}>
                    {notice.cta.action} →
                  </span>
                </div>
              )}
              {notice.dismissible && (
                <button
                  type="button"
                  onClick={() => {
                    setDismissed((prev) => new Set(prev).add(notice.id));
                    notice.onDismiss?.();
                  }}
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    color: mu,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left" as const,
                  }}
                >
                  Not a concern · dismiss
                </button>
              )}
            </div>
          ))}

          {(insights ?? []).map((insight) => (
            <div
              key={insight.id}
              style={{
                padding: "10px 12px",
                borderRadius: "0 10px 10px 0",
                borderLeft: `3px solid ${BORDER_COLORS.green}`,
                background: cardBg,
                borderTop: `1px solid ${cardBd}`,
                borderRight: `1px solid ${cardBd}`,
                borderBottom: `1px solid ${cardBd}`,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <div style={{ fontSize: 11, color: tx, lineHeight: 1.45, overflowWrap: "break-word" }}>{insight.message}</div>
              {insight.id === "tummy-nap-correlation" && (
                <button
                  type="button"
                  onClick={() => navigate("/?action=tummy")}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    textAlign: "left" as const,
                    background: "#e8d4f5",
                    color: "#6040a0",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Add tummy time now →
                </button>
              )}
              <div style={{ fontSize: 9, color: mu, marginTop: 6 }}>
                {insight.confidence === "high" ? "High confidence" : insight.confidence === "medium" ? "Medium confidence" : "Low confidence"}
                {insight.id === "short-nap-pattern" ? " · based on last 4 naps" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
