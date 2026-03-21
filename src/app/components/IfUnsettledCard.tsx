import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

export interface UnsettledReason {
  likelihood: "likely" | "possible" | "unlikely";
  text: string;
  cta: string;
  onAction: () => void;
}

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  likely: { bg: "#fce8e8", color: "#8a2020" },
  possible: { bg: "#fef4e4", color: "#8a5a00" },
  unlikely: { bg: "#f0ece8", color: "#7a6a60" },
};

export function IfUnsettledCard({
  reasons,
  compact,
  nightMode,
}: {
  reasons: UnsettledReason[];
  compact?: boolean;
  nightMode?: boolean;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hasReasons = reasons?.length > 0;
  const bg = nightMode ? "rgba(255,255,255,0.06)" : "#fff";
  const bd = nightMode ? "rgba(255,255,255,0.1)" : "#ede0d4";
  const tx = nightMode ? "rgba(255,255,255,0.85)" : "#2c1f1f";
  const mu = nightMode ? "rgba(255,255,255,0.45)" : "var(--mu)";
  const sep = nightMode ? "rgba(255,255,255,0.08)" : "#f4ece4";

  useEffect(() => {
    if (!helpOpen) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setHelpOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [helpOpen]);

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${bd}`,
        borderRadius: 14,
        margin: compact ? "0 0 8px" : "0 12px 8px",
        padding: 12,
      }}
    >
      <div
        ref={wrapRef}
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: tx,
          fontFamily: "Georgia, serif",
          marginBottom: hasReasons ? 8 : 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
          position: "relative",
        }}
      >
        <span>Why is she crying?</span>
        <button
          type="button"
          aria-label="How are these reasons calculated?"
          onClick={() => setHelpOpen((v) => !v)}
          style={{ background: "none", border: "none", padding: 1, cursor: "pointer", color: mu, display: "flex" }}
        >
          <HelpCircle size={13} />
        </button>
        {helpOpen && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "100%",
              marginTop: 4,
              maxWidth: 280,
              padding: "10px 12px",
              background: "var(--card)",
              border: "1px solid var(--bd)",
              borderRadius: 12,
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 400,
              color: "var(--tx)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 120,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            This is a best-guess from recent feed, sleep, nappy and developmental-pattern logs.
          </div>
        )}
      </div>

      {!hasReasons ? (
        <div style={{ fontSize: 11, color: mu, fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
          Log a feed, sleep, or nappy and Cradl will calculate the most likely
          reason she's unsettled — hunger probability, nap window, nappy status,
          and leap proximity, all in one card.
        </div>
      ) : (
        reasons.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom:
                i < reasons.length - 1 ? `1px solid ${sep}` : "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 20,
                background: nightMode ? "rgba(255,255,255,0.1)" : TAG_STYLES[r.likelihood]?.bg,
                color: nightMode ? "rgba(255,255,255,0.7)" : TAG_STYLES[r.likelihood]?.color,
                flexShrink: 0,
                fontFamily: "system-ui, sans-serif",
                whiteSpace: "nowrap" as const,
                textTransform: "capitalize" as const,
              }}
            >
              {r.likelihood}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 11,
                color: tx,
                lineHeight: 1.3,
                fontFamily: "system-ui, sans-serif",
                overflowWrap: "break-word" as const,
              }}
            >
              {r.text}
            </span>
            <span
              onClick={r.onAction}
              style={{
                fontSize: 10,
                color: nightMode ? "rgba(196,160,212,0.8)" : "#d4604a",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap" as const,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {r.cta}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
