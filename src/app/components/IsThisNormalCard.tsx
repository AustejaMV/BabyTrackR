import type { CSSProperties } from "react";
import { getNormalRangeReferenceLinks } from "../data/normalRanges";
import { useLanguage } from "../contexts/LanguageContext";

const F = "system-ui, sans-serif";

/** P18: "Within range" = muted; "A little low/high" = amber; "Speak to your GP" = red */
export type NormalMetricTag = "Within range" | "Normal" | "A little low" | "A little high" | "Speak to your GP";

export interface NormalMetric {
  name: string;
  value: number;
  min: number;
  max: number;
  typicalMin: number;
  typicalMax: number;
  description: string;
  tag: NormalMetricTag;
  suggestion?: string;
  /** Key into NORMAL_RANGE_REFERENCE_LINKS (e.g. feedsPerDay) for source links */
  metricKey?: string;
}

const TAG_STYLE: Record<string, { bg: string; color: string }> = {
  "Within range": { bg: "#f0ece8", color: "#9a8080" },
  Normal: { bg: "#e4f4e4", color: "#2a6a2a" },
  "A little low": { bg: "#fef4e4", color: "#8a5a00" },
  "A little high": { bg: "#fef4e4", color: "#8a5a00" },
  "Speak to your GP": { bg: "#fce8e8", color: "#a02020" },
};

function RangeBar({ value, min, max, typicalMin, typicalMax }: { value: number; min: number; max: number; typicalMin: number; typicalMax: number }) {
  const range = max - min || 1;
  const valPct = Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const typMinPct = Math.max(0, ((typicalMin - min) / range) * 100);
  const typMaxPct = Math.min(100, ((typicalMax - min) / range) * 100);

  return (
    <div style={{ position: "relative", height: 6, background: "#f0ece8", borderRadius: 3, marginTop: 4 }}>
      <div
        style={{
          position: "absolute", height: "100%", borderRadius: 3,
          background: "#b8d8c8",
          left: `${typMinPct}%`,
          width: `${typMaxPct - typMinPct}%`,
        }}
      />
      <div
        style={{
          position: "absolute", top: -2,
          left: `${valPct}%`,
          transform: "translateX(-5px)",
          width: 10, height: 10, borderRadius: "50%",
          background: "#2c1f1f", border: "2px solid #fff",
        }}
      />
    </div>
  );
}

export function IsThisNormalCard({ ageLabel, metrics, compact }: { ageLabel: string; metrics: NormalMetric[]; compact?: boolean }) {
  const { t } = useLanguage();
  if (!metrics?.length) return null;

  const linkStyle: CSSProperties = {
    fontSize: compact ? 8 : 9,
    color: "var(--blue, #4080a0)",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };

  return (
    <div
      style={{
        background: "#fff", border: "1px solid #ede0d4",
        borderRadius: compact ? 12 : 16,
        margin: compact ? "0 0 8px" : "0 12px 8px",
        padding: compact ? "12px 14px" : 14, fontFamily: F,
      }}
    >
      <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 4, lineHeight: 1.35 }}>
        {t("isThisNormalCard.intro", { age: ageLabel })}
      </div>
      <div style={{ fontSize: compact ? 9 : 10, color: "#b09080", marginBottom: 10, lineHeight: 1.4 }}>
        {t("isThisNormalCard.subintro")}
      </div>

      {metrics.map((m, i) => {
        const tagStyle = TAG_STYLE[m.tag] ?? TAG_STYLE.Normal;
        const refs = m.metricKey ? getNormalRangeReferenceLinks(m.metricKey) : [];
        return (
          <div key={m.name} style={{ marginBottom: i < metrics.length - 1 ? 14 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#2c1f1f" }}>{m.name}</span>
              <span
                style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                  background: tagStyle.bg, color: tagStyle.color,
                }}
              >
                {m.tag}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#9a8080", marginTop: 2, lineHeight: 1.4, overflowWrap: "break-word" as const }}>
              {m.description}
            </div>
            <RangeBar value={m.value} min={m.min} max={m.max} typicalMin={m.typicalMin} typicalMax={m.typicalMax} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: 8, color: "var(--mu)" }}>{m.min}</span>
              <span style={{ fontSize: 8, color: "var(--mu)" }}>typical: {m.typicalMin}–{m.typicalMax}</span>
              <span style={{ fontSize: 8, color: "var(--mu)" }}>{m.max}</span>
            </div>
            {(m.tag !== "Normal" && m.tag !== "Within range") && m.suggestion && (
              <div
                style={{
                  background: "#fef4e4", borderRadius: 8, padding: "6px 8px",
                  marginTop: 4, fontSize: 10, color: "#8a5a00", lineHeight: 1.4,
                  overflowWrap: "break-word" as const,
                }}
              >
                {m.suggestion}
              </div>
            )}
            {refs.length > 0 && (
              <div style={{ marginTop: 6, lineHeight: 1.5 }}>
                <span style={{ fontSize: compact ? 8 : 9, color: "var(--mu)", fontWeight: 600 }}>
                  {t("isThisNormalCard.sourcesLabel")}{" "}
                </span>
                {refs.map((ref, j) => (
                  <span key={ref.url} style={{ fontSize: compact ? 8 : 9 }}>
                    {j > 0 ? <span style={{ color: "var(--mu)" }}> · </span> : null}
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkStyle}
                    >
                      {ref.label}
                    </a>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p style={{ fontSize: compact ? 8 : 9, color: "var(--mu)", marginTop: 10, marginBottom: 0, lineHeight: 1.45 }}>
        {t("isThisNormalCard.footnote")}
      </p>
    </div>
  );
}
