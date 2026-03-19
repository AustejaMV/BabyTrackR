import React from "react";

interface PainReliefCardProps {
  hoursSinceLastDose: number | null;
  onLog: () => void;
  compact?: boolean;
}

const cardStyle: React.CSSProperties = {
  margin: "0 12px 8px",
  background: "#fff",
  border: "1px solid #ede0d4",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const iconBoxStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  background: "#feeae4",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#2c1f1f",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#9a8080",
  overflowWrap: "break-word",
};

const buttonStyle: React.CSSProperties = {
  fontSize: 10,
  background: "#e4f4e4",
  color: "#2a6a2a",
  padding: "4px 10px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

function RedCrossIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x={5.5} y={1} width={3} height={12} rx={1.5} fill="#d4604a" />
      <rect x={1} y={5.5} width={12} height={3} rx={1.5} fill="#d4604a" />
    </svg>
  );
}

export function PainReliefCard({ hoursSinceLastDose, onLog, compact }: PainReliefCardProps) {
  const subtitle =
    hoursSinceLastDose != null
      ? `Safe to take now · ${hoursSinceLastDose}h since last dose`
      : "No doses logged yet";

  return (
    <div style={compact ? { ...cardStyle, margin: "0 0 8px" } : cardStyle}>
      <div style={iconBoxStyle}>
        <RedCrossIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>Pain relief</div>
        <div style={subtitleStyle}>{subtitle}</div>
      </div>
      <button style={buttonStyle} onClick={onLog}>
        Log it
      </button>
    </div>
  );
}
