const F = "system-ui, sans-serif";

export interface NormalMetric {
  name: string;
  value: number;
  min: number;
  max: number;
  typicalMin: number;
  typicalMax: number;
  description: string;
  tag: "Normal" | "A little low" | "A little high";
  suggestion?: string;
}

const TAG_STYLE: Record<string, { bg: string; color: string }> = {
  Normal: { bg: "#e4f4e4", color: "#2a6a2a" },
  "A little low": { bg: "#fef4e4", color: "#8a5a00" },
  "A little high": { bg: "#fef4e4", color: "#8a5a00" },
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
  if (!metrics?.length) return null;

  return (
    <div
      style={{
        background: "#fff", border: "1px solid #ede0d4",
        borderRadius: compact ? 12 : 16,
        margin: compact ? "0 0 8px" : "0 12px 8px",
        padding: compact ? "12px 14px" : 14, fontFamily: F,
      }}
    >
      <div style={{ fontSize: 11, color: "#9a8080", marginBottom: 10 }}>
        Based on WHO data for {ageLabel}
      </div>

      {metrics.map((m, i) => {
        const tagStyle = TAG_STYLE[m.tag] ?? TAG_STYLE.Normal;
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
            {m.tag !== "Normal" && m.suggestion && (
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
          </div>
        );
      })}
    </div>
  );
}
