import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import type { SweetSpotPrediction } from "../utils/napPrediction";
import { TIME_DISPLAY } from "../utils/dateUtils";

interface Props {
  prediction: SweetSpotPrediction | null;
  onStartSleep: () => void;
  babyName?: string;
  compact?: boolean;
}

type SweetState = "pre" | "green" | "amber" | "red";

function calcState(pred: SweetSpotPrediction | null, now: number): SweetState {
  if (!pred) return "pre";
  const opens = pred.opensAt.getTime();
  const closes = pred.closesAt.getTime();
  const danger = closes + 15 * 60 * 1000;
  if (now < opens) return "pre";
  if (now <= closes) return "green";
  if (now <= danger) return "amber";
  return "red";
}

function minutesUntil(target: Date, now: number) {
  return Math.max(0, Math.round((target.getTime() - now) / 60000));
}

function minutesSince(target: Date, now: number) {
  return Math.max(0, Math.round((now - target.getTime()) / 60000));
}

/** Above this, "passed X minutes ago" reads silly — anchor wake / window is stale vs reality */
const RED_PAST_WINDOW_CAP_MINUTES = 90;

function formatTime(d: Date) {
  return format(d, TIME_DISPLAY());
}

/** localStorage key: hasSeenSweetSpotExplainer (Prompt 2) */
const EXPLAINER_KEY = "cradl-nap-explainer-seen";

/** Shared content for first-run card and ? bottom sheet (Prompt 2). */
function WhyTimingMattersContent() {
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        Why timing matters
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
      </div>
      <p style={{ fontSize: 10, color: "#5a4a40", lineHeight: 1.6, margin: "0 0 8px" }}>
        Babies have a biological "sweet spot" when their body is ready for sleep.
        Put them down during this window and they settle quickly. Miss it and
        they become overtired — fighting sleep even though they're exhausted.
      </p>
      <p style={{ fontSize: 10, color: "#5a4a40", lineHeight: 1.6, margin: "0 0 10px" }}>
        Cradl tracks your baby's patterns to show when the sweet spot is open.
        The three zones help you make decisions at a glance.
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[
          { bg: "#e4f4e4", border: "#4a8a4a", title: "Sweet spot", sub: "She'll go down easily" },
          { bg: "#fef4e4", border: "#d4904a", title: "Closing", sub: "Start your routine now" },
          { bg: "#fce8e8", border: "#c04040", title: "Overtired", sub: "Extra soothing needed" },
        ].map((z) => (
          <div
            key={z.title}
            style={{
              flex: 1,
              background: z.bg,
              border: `1px solid ${z.border}`,
              borderRadius: 10,
              padding: "8px 6px",
              textAlign: "center" as const,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 600, color: "#2c1f1f" }}>{z.title}</div>
            <div style={{ fontSize: 8, color: "#9a8080", marginTop: 1 }}>{z.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function NapExplainer({ onDismiss, compact }: { onDismiss: () => void; compact?: boolean }) {
  return (
    <div
      style={{
        background: "#fff8f0",
        border: "1.5px solid #fde8d8",
        borderRadius: 16,
        padding: 14,
        margin: compact ? "0 0 8px" : "0 12px 8px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <WhyTimingMattersContent />
      <div
        onClick={onDismiss}
        style={{
          fontSize: 10,
          color: "#d4604a",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "center" as const,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Got it — show me her sweet spot →
      </div>
    </div>
  );
}

function arcA11yLabel(prediction: SweetSpotPrediction, state: SweetState): string {
  const opensStr = formatTime(prediction.opensAt);
  const closesStr = formatTime(prediction.closesAt);
  if (state === "pre") return `Sleep sweet spot chart. Nap window opens at ${opensStr}`;
  if (state === "green") return `Sleep sweet spot chart. Nap window open now, ${opensStr} to ${closesStr}`;
  if (state === "amber") return `Sleep sweet spot chart. Nap window closing soon, started at ${opensStr}`;
  return `Sleep sweet spot chart. Nap window has passed, was ${opensStr} to ${closesStr}`;
}

function ArcSvg({
  prediction,
  state,
  now,
}: {
  prediction: SweetSpotPrediction;
  state: SweetState;
  now: number;
}) {
  const opens = prediction.opensAt.getTime();
  const closes = prediction.closesAt.getTime();
  const danger = closes + 15 * 60 * 1000;
  const totalSpan = danger - opens + 30 * 60 * 1000;
  const preSpan = Math.max(0, 30 * 60 * 1000);
  const greenSpan = closes - opens;
  const amberSpan = 15 * 60 * 1000;
  const redSpan = 15 * 60 * 1000;

  const totalArcLen = 140;
  const greenLen = (greenSpan / totalSpan) * totalArcLen;
  const amberLen = (amberSpan / totalSpan) * totalArcLen;
  const redLen = (redSpan / totalSpan) * totalArcLen;
  const preLen = (preSpan / totalSpan) * totalArcLen;

  const elapsed = now - (opens - preSpan);
  const progress = Math.min(1, Math.max(0, elapsed / (totalSpan)));
  const angle = -90 + progress * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 30 + 22 * Math.cos(rad);
  const cy = 30 + 22 * Math.sin(rad);

  const DOT_COLOR: Record<SweetState, string> = {
    pre: "#8a6b5b",
    green: "#4a8a4a",
    amber: "#d4904a",
    red: "#c04040",
  };

  return (
    <svg width="60" height="40" viewBox="0 0 60 40" role="img" aria-label={arcA11yLabel(prediction, state)} style={{ flexShrink: 0 }}>
      <path
        d="M 8 36 A 22 22 0 0 1 52 36"
        fill="none"
        stroke="#e8e0d8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 8 36 A 22 22 0 0 1 52 36"
        fill="none"
        stroke="#4a8a4a"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${greenLen} 200`}
        strokeDashoffset={-preLen}
      />
      <path
        d="M 8 36 A 22 22 0 0 1 52 36"
        fill="none"
        stroke="#d4904a"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${amberLen} 200`}
        strokeDashoffset={-(preLen + greenLen)}
      />
      <path
        d="M 8 36 A 22 22 0 0 1 52 36"
        fill="none"
        stroke="#c04040"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${redLen} 200`}
        strokeDashoffset={-(preLen + greenLen + amberLen)}
      />
      <circle cx={cx} cy={cy} r="4" fill={DOT_COLOR[state]} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export function SleepSweetSpot({ prediction, onStartSleep, babyName, compact }: Props) {
  const [now, setNow] = useState(Date.now());
  const [explainerSeen, setExplainerSeen] = useState(() => {
    try {
      return localStorage.getItem(EXPLAINER_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [showExplainerSheet, setShowExplainerSheet] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const state = useMemo(() => calcState(prediction, now), [prediction, now]);

  const dismissExplainer = () => {
    setExplainerSeen(true);
    try {
      localStorage.setItem(EXPLAINER_KEY, "true");
    } catch {}
  };

  if (!prediction) {
    return (
      <>
        {/* Why timing matters only when expanded; no expanded state here so no explainer or ? */}
        <div
          style={{
            border: "1px solid #e8d8c8",
            borderRadius: 12,
            margin: compact ? "0 0 8px" : "0 12px 8px",
            padding: "10px 12px",
            background: "#faf8f6",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#b0a090", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#7a6a60" }}>Sleep sweet spot — </span>
            <span style={{ fontSize: 11, color: "#9a8080" }}>log a sleep to activate</span>
          </div>
        </div>
      </>
    );
  }

  const BORDER_COLORS: Record<SweetState, string> = {
    pre: "#e8d8c8",
    green: "#4a8a4a",
    amber: "#d4904a",
    red: "#c04040",
  };

  const TAG: Record<SweetState, { text: string; bg: string; color: string }> = {
    pre: {
      text: `Opens in ${minutesUntil(prediction.opensAt, now)}m`,
      bg: "#f0ece8",
      color: "#7a6a60",
    },
    green: { text: "Open now", bg: "#e4f4e4", color: "#2a6a2a" },
    amber: { text: "Closing soon", bg: "#fef4e4", color: "#8a5a00" },
    red: { text: "Overtired now", bg: "#fce8e8", color: "#8a2020" },
  };

  const tag = TAG[state];
  const showFullCard = state === "green" || isExpanded;
  const DOT_COLOR: Record<SweetState, string> = {
    pre: "#b0a090",
    green: "#4a8a4a",
    amber: "#d4904a",
    red: "#c04040",
  };
  const compactStatusText =
    state === "pre"
      ? `Opens in ${minutesUntil(prediction.opensAt, now)}m`
      : state === "amber"
        ? `Closing soon · window was ${formatTime(prediction.opensAt)}–${formatTime(prediction.closesAt)}`
        : `Overtired now · window was ${formatTime(prediction.opensAt)}–${formatTime(prediction.closesAt)}`;

  return (
    <>
      {/* Why timing matters only when expanded: first-run explainer inside expanded card below */}

      {/* Prompt 3: compact row when closed/missed/overtired; full card when green or expanded. No ? when collapsed. */}
      {!showFullCard && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(true)}
          onKeyDown={(e) => e.key === "Enter" && setIsExpanded(true)}
          style={{
            border: `1px solid ${state === "red" ? "rgba(192,64,64,0.4)" : BORDER_COLORS[state]}`,
            borderRadius: 12,
            margin: compact ? "0 0 8px" : "0 12px 8px",
            padding: "10px 12px",
            background: state === "red" ? "#fef8f8" : "#fff",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLOR[state], flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: state === "red" ? "#8a3030" : "#2c1f1f" }}>Sleep sweet spot — </span>
            <span style={{ fontSize: 11, color: state === "red" ? "#9a6060" : "#9a8080" }}>{compactStatusText}</span>
            {state === "red" && (
              <div style={{ fontSize: 10, color: "#8a2020", marginTop: 2, fontStyle: "italic" }}>
                Try extra soothing — she&apos;ll still settle
              </div>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#9a8080" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}

      {showFullCard && (
      <div
        role="region"
        aria-label="Sleep sweet spot"
        style={{
          border: `2px solid ${BORDER_COLORS[state]}`,
          borderRadius: 18,
          padding: 14,
          margin: compact ? "0 0 8px" : "0 12px 8px",
          background: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Why timing matters: only in expanded card — first-run card or ? button */}
        {!explainerSeen && <NapExplainer onDismiss={dismissExplainer} compact={compact} />}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#2c1f1f" }}>
              Sleep sweet spot
            </span>
            {state !== "green" && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Collapse"
                style={{
                  width: 22, height: 22, borderRadius: "50%", border: "1px solid #e8d0c8",
                  background: "#f4ece8", color: "#9a8080", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0, fontFamily: "system-ui, sans-serif",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
              </button>
            )}
            {explainerSeen && (
              <button
                type="button"
                onClick={() => setShowExplainerSheet(true)}
                aria-label="Why timing matters"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "1px solid #e8d0c8",
                  background: "#fff8f0",
                  color: "#9a8080",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                ?
              </button>
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 20,
              background: tag.bg,
              color: tag.color,
            }}
          >
            {tag.text}
          </span>
        </div>

        {showExplainerSheet && (
          <div
            role="dialog"
            aria-label="Why timing matters"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
            onClick={() => setShowExplainerSheet(false)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 512,
                maxHeight: "85vh",
                background: "#fff",
                borderRadius: "16px 16px 0 0",
                padding: 20,
                overflowY: "auto",
                fontFamily: "system-ui, sans-serif",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <WhyTimingMattersContent />
              <button
                type="button"
                onClick={() => setShowExplainerSheet(false)}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#2c1f1f",
                  background: "#f0ece8",
                  border: "1px solid #e8d8c8",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ArcSvg prediction={prediction} state={state} now={now} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#2c1f1f", overflowWrap: "break-word" as const }}>
              {formatTime(prediction.opensAt)} – {formatTime(prediction.closesAt)}
            </div>

            {state === "pre" && (
              <div style={{ fontSize: 11, color: "#9a8080", marginTop: 2 }}>
                Sweet spot opens in {minutesUntil(prediction.opensAt, now)} minutes
              </div>
            )}
            {state === "green" && (
              <>
                <div style={{ fontSize: 11, color: "#9a8080", marginTop: 2 }}>
                  She'll settle easily now · closes in{" "}
                  {minutesUntil(prediction.closesAt, now)}m
                </div>
                {prediction.hasPersonalisedData && prediction.personalisedTime && (
                  <div style={{ fontSize: 11, color: "#9a7ab4", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    Best time based on her pattern: {formatTime(prediction.personalisedTime)}
                  </div>
                )}
              </>
            )}
            {state === "amber" && (() => {
              const m = minutesSince(prediction.closesAt, now);
              return (
                <div style={{ fontSize: 10, color: "#2c1f1f", marginTop: 2, lineHeight: 1.4 }}>
                  The ideal window just closed about {m} minute{m === 1 ? "" : "s"} ago — settle her
                  now before it gets harder.
                </div>
              );
            })()}
            {state === "red" && (() => {
              const pastMin = minutesSince(prediction.closesAt, now);
              const useStaleCopy = pastMin > RED_PAST_WINDOW_CAP_MINUTES;
              return (
                <div style={{ fontSize: 10, color: "#2c1f1f", marginTop: 2, lineHeight: 1.4 }}>
                  {useStaleCopy ? (
                    <>
                      This timing is probably out of date — it&apos;s based on an older wake, and
                      we may be missing a recent sleep. Log when she last woke or fell asleep so the
                      window stays accurate. For now, watch her tired cues and settle her when she
                      seems ready — she&apos;ll still sleep.
                    </>
                  ) : (
                    <>
                      The sweet spot passed {pastMin} minute{pastMin === 1 ? "" : "s"} ago.
                      She&apos;s likely overtired — it may take a bit longer to settle, but
                      she&apos;ll still sleep.
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {state === "green" && (
          <div
            role="button"
            tabIndex={0}
            onClick={onStartSleep}
            onKeyDown={(e) => e.key === "Enter" && onStartSleep()}
            style={{
              marginTop: 10,
              background: "#e8f4e8",
              borderRadius: 10,
              padding: "9px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2a6a2a" }}>
              She'll settle easily right now
            </span>
            <span style={{ fontSize: 11, color: "#4a8a4a", fontWeight: 600 }}>
              Start sleep →
            </span>
          </div>
        )}

        {state === "amber" && (
          <div
            style={{
              marginTop: 10,
              background: "#fef4e4",
              borderRadius: 10,
              padding: "7px 10px",
              fontSize: 10,
              color: "#8a5a00",
              lineHeight: 1.4,
            }}
          >
            Once overtired she'll fight sleep — start your nap routine now.
          </div>
        )}

        {state === "red" && (
          <div
            style={{
              marginTop: 10,
              background: "#fce8e8",
              borderRadius: 10,
              padding: "7px 10px",
              fontSize: 10,
              color: "#8a2020",
              lineHeight: 1.4,
            }}
          >
            Try extra soothing — white noise, rocking, or feeding to sleep. Don&apos;t
            worry, this happens to everyone.
          </div>
        )}
      </div>
      )}
    </>
  );
}
