import { useState } from "react";

export type NoticeColor = "amber" | "green" | "blue" | "purple" | "coral";

export interface NoticeCard {
  id: string;
  color: NoticeColor;
  title: string;
  body: string;
  cta?: { label: string; action: string; onClick: () => void };
  dismissible?: boolean;
  onDismiss?: () => void;
}

const BORDER_COLORS: Record<NoticeColor, string> = {
  amber: "#d4904a",
  green: "#4a8a4a",
  blue: "#4a6ab4",
  purple: "#7a4ab4",
  coral: "#d4604a",
};

const CTA_BG: Record<NoticeColor, string> = {
  amber: "#fef4e4",
  green: "#e4f4e4",
  blue: "#e4f0fc",
  purple: "#f0eafe",
  coral: "#feeae4",
};

const CTA_TEXT: Record<NoticeColor, string> = {
  amber: "#8a5a00",
  green: "#2a6a2a",
  blue: "#1a4a8a",
  purple: "#4a2a9a",
  coral: "#8a3020",
};

const CTA_ACTION_TEXT: Record<NoticeColor, string> = {
  amber: "#d4904a",
  green: "#4a8a4a",
  blue: "#4a6ab4",
  purple: "#7a4ab4",
  coral: "#d4604a",
};

export function CradlNoticedSection({ notices, compact }: { notices: NoticeCard[]; compact?: boolean }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = (notices ?? []).filter((n) => !dismissed.has(n.id));

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: compact ? "10px 0 4px" : "10px 16px 4px",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: visible.length > 0 ? "#d4604a" : "#c4b0a0",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: visible.length > 0 ? "#d4604a" : "#c4b0a0",
            textTransform: "uppercase" as const,
            letterSpacing: 0.8,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Cradl noticed
        </div>
      </div>

      {visible.length === 0 && (
        <div
          style={{
            background: "#fff",
            borderLeft: "3px solid #e0d4c8",
            borderRadius: compact ? "0 10px 10px 0" : "0 14px 14px 0",
            margin: compact ? "0 0 8px" : "0 12px 8px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#9a8080",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Nothing yet — keep logging
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#b0a090",
              marginTop: 4,
              lineHeight: 1.5,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            As you log feeds, sleeps, and nappies, Cradl watches for patterns — growth spurts, short-nap streaks, sleep regressions, feeds spacing out. The more you log, the more it notices.
          </div>
        </div>
      )}

      {visible.map((notice) => (
        <div
          key={notice.id}
          style={{
            background: "#fff",
            borderLeft: `3px solid ${BORDER_COLORS[notice.color]}`,
            borderRadius: compact ? "0 10px 10px 0" : "0 14px 14px 0",
            margin: compact ? "0 0 8px" : "0 12px 8px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#2c1f1f",
              fontFamily: "system-ui, sans-serif",
              overflowWrap: "break-word" as const,
            }}
          >
            {notice.title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9a8080",
              marginTop: 4,
              lineHeight: 1.4,
              fontFamily: "system-ui, sans-serif",
              overflowWrap: "break-word" as const,
              whiteSpace: "pre-line",
            }}
          >
            {notice.body}
          </div>

          {notice.cta && (
            <div
              style={{
                marginTop: 8,
                background: CTA_BG[notice.color],
                borderRadius: 8,
                padding: "7px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: CTA_TEXT[notice.color],
                  fontWeight: 500,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {notice.cta.label}
              </span>
              <span
                onClick={notice.cta.onClick}
                style={{
                  fontSize: 10,
                  color: CTA_ACTION_TEXT[notice.color],
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {notice.cta.action} →
              </span>
            </div>
          )}

          {notice.dismissible && (
            <div
              onClick={() => {
                setDismissed((prev) => new Set(prev).add(notice.id));
                notice.onDismiss?.();
              }}
              style={{
                marginTop: 6,
                fontSize: 10,
                color: "var(--mu)",
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              I'm okay, thank you
            </div>
          )}
        </div>
      ))}
    </>
  );
}
