import React from "react";

interface StatsRowProps {
  feeds: number;
  sleepHours: string;
  nappies: number;
  lastSide: string;
  tummyMin: number;
  awakeTime: string;
  compact?: boolean;
}

interface StatPill {
  label: string;
  value: string | number;
  color: string;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: "0 12px 8px",
  overflowX: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const pillStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ede0d4",
  borderRadius: 20,
  padding: "6px 12px",
  minWidth: 54,
  textAlign: "center",
  flexShrink: 0,
  overflow: "hidden",
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--mu)",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  marginTop: 1,
};

export function StatsRow({
  feeds,
  sleepHours,
  nappies,
  lastSide,
  tummyMin,
  awakeTime,
  compact,
}: StatsRowProps) {
  const pills: StatPill[] = [
    { label: "Feeds", value: feeds, color: "#c05030" },
    { label: "Sleep", value: sleepHours, color: "#4080a0" },
    { label: "Nappies", value: nappies, color: "#4a8a4a" },
    { label: "Last side", value: lastSide, color: "#2c1f1f" },
    { label: "Tummy", value: `${tummyMin}m`, color: "#2c1f1f" },
    { label: "Awake", value: awakeTime, color: "#2c1f1f" },
  ];

  return (
    <div style={compact ? { ...containerStyle, padding: "0 0 8px" } : containerStyle} className="hide-scrollbar">
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      {pills.map((pill) => (
        <div key={pill.label} style={pillStyle} aria-label={`${pill.value} ${pill.label.toLowerCase()}`}>
          <div style={{ fontSize: 15, fontWeight: 600, color: pill.color }}>
            {pill.value}
          </div>
          <div style={labelStyle}>{pill.label}</div>
        </div>
      ))}
    </div>
  );
}
