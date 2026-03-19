import type { CSSProperties } from "react";

export interface EscalationCardProps {
  level: "routine" | "monitor" | "urgent";
}

const config: Record<
  EscalationCardProps["level"],
  {
    bg: string;
    border: string;
    icon: JSX.Element;
    heading: string;
    body: string;
    action?: JSX.Element;
  }
> = {
  routine: {
    bg: "#e8f4e8",
    border: "#4a8a4a",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
    heading: "Looks routine",
    body: "This sounds like normal behaviour for your baby's age. Keep doing what you're doing — you're doing great.",
  },
  monitor: {
    bg: "#fff8e8",
    border: "#d4904a",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4904a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    heading: "Keep an eye on this",
    body: "This may be worth monitoring over the next 24–48 hours. If things change or you feel worried, trust your instinct and call your GP or 111.",
  },
  urgent: {
    bg: "#fce8e8",
    border: "#d44a4a",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d44a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m10.29 3.86-8.6 14.9A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.71-2.99l-8.6-15.16a2 2 0 0 0-3.42.01z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    heading: "Seek help now",
    body: "Based on what you've described, we recommend contacting a healthcare professional right away.",
    action: (
      <a
        href="tel:111"
        style={{
          display: "inline-block",
          marginTop: 8,
          padding: "8px 20px",
          background: "#d44a4a",
          color: "#fff",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Call 111 now
      </a>
    ),
  },
};

export function EscalationCard({ level }: EscalationCardProps) {
  const c = config[level];

  const card: CSSProperties = {
    background: c.bg,
    borderLeft: `4px solid ${c.border}`,
    borderRadius: 14,
    padding: "14px 16px",
    marginTop: 12,
  };

  return (
    <div style={card} role="status" aria-live="polite">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {c.icon}
        <strong style={{ fontSize: 14, color: c.border }}>{c.heading}</strong>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--tx)" }}>{c.body}</p>
      {c.action}
    </div>
  );
}
