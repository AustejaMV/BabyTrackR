/**
 * Hold-to-log button: 150ms tap opens form, 1s hold quick-logs (Prompt 4).
 * Active timer state: pulsing dot, live elapsed time, hold-to-stop sub-label, smart colour shift.
 */

import { useState, useRef, useCallback, useLayoutEffect } from "react";
import type { TimerThresholdState } from "../utils/activeTimerThresholds";

const HOLD_MS = 1000;

const SAGE = {
  dot: "#7A9080",
  time: "#0F6E56",
  border: "rgba(122,144,128,0.25)",
  bg: "#E4EDEA",
  iconBg: "rgba(255,255,255,0.5)",
};
const TERRACOTTA = {
  dot: "#C17D5E",
  time: "#8A5240",
  timeAlert: "#C17D5E",
  border: "rgba(193,125,94,0.3)",
  borderAlert: "rgba(193,125,94,0.4)",
  bg: "#FDF4EF",
  bgAlert: "#FEF8F4",
};

function formatElapsed(elapsedMs: number): string {
  const ms = Number(elapsedMs);
  if (!Number.isFinite(ms) || ms < 0) return "0m 00s";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  // H:MM:SS from 1h+ so the hour digit can’t be clipped or mistaken for minutes-only
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

interface HoldToLogButtonProps {
  type: "feed" | "sleep" | "diaper" | "tummy";
  color: string;
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  onTap: () => void;
  onHoldComplete: () => void;
  nightMode?: boolean;
  style?: React.CSSProperties;
  /** Active timer: show pulsing dot and live elapsed time */
  isActive?: boolean;
  activeElapsedMs?: number;
  thresholdState?: TimerThresholdState;
  /** Sub-label when active: "Hold to stop" / "Nap running long — hold to stop" / "Running very long — hold to stop" */
  activeSubLabel?: string;
  /** When true (e.g. another timer is in alert), use muted rest color for non-active styling */
  muteRestColor?: boolean;
  /** Bumped when parent syncs session from LogDrawer — cancel any in-flight hold */
  uiEpoch?: number;
}

export function HoldToLogButton({
  type,
  color,
  icon,
  label,
  subLabel,
  onTap,
  onHoldComplete,
  nightMode,
  style,
  isActive = false,
  activeElapsedMs = 0,
  thresholdState = "normal",
  activeSubLabel,
  muteRestColor = false,
  uiEpoch = 0,
}: HoldToLogButtonProps) {
  /** Only for border/surface rules — not updated every animation frame (avoids React batching killing smooth fill) */
  const [isPressing, setIsPressing] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  /** Latest hold progress; parent re-renders (timer tick) reset inline styles from JSX — we repaint from this in layout. */
  const holdProgressRef = useRef(0);

  const paintHoldFillDom = useCallback((p: number) => {
    const clamped = Math.min(1, Math.max(0, p));
    const el = fillRef.current;
    const br = barRef.current;
    if (el) {
      if (clamped > 0 && clamped < 1) {
        el.style.display = "block";
        el.style.height = `${clamped * 100}%`;
      } else {
        el.style.height = "0%";
        el.style.display = "none";
      }
    }
    if (br) {
      if (clamped > 0 && clamped < 1) {
        br.style.display = "block";
        br.style.width = `${clamped * 100}%`;
      } else {
        br.style.width = "0%";
        br.style.display = "none";
      }
    }
  }, []);

  const clearHold = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    holdStartRef.current = null;
    holdProgressRef.current = 0;
    paintHoldFillDom(0);
  }, [paintHoldFillDom]);

  /** Session/timer changed from drawer — stop RAF + release pressing UI */
  useLayoutEffect(() => {
    clearHold();
    setIsPressing(false);
    // Do NOT clear suppressClickRef / completedRef here: onHoldComplete updates parent state
    // in the same gesture and this effect runs before the synthetic click — clearing would
    // let onTap fire and open the drawer after a successful hold-to-quick-log.
  }, [isActive, uiEpoch, clearHold]);

  /** After any commit while pressed, restore fill (React reapplies `style` from JSX and clears RAF-driven height/width). */
  useLayoutEffect(() => {
    if (!isPressing) return;
    const p = holdProgressRef.current;
    if (p > 0 && p < 1) paintHoldFillDom(p);
  });

  const startHold = useCallback(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      completedRef.current = false;
      holdStartRef.current = Date.now();
      holdProgressRef.current = 0;
      paintHoldFillDom(0);
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        if (elapsed >= HOLD_MS) {
          holdProgressRef.current = 0;
          paintHoldFillDom(0);
          if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          holdStartRef.current = null;
          setIsPressing(false);
          if (!completedRef.current) {
            completedRef.current = true;
            suppressClickRef.current = true;
            if (navigator.vibrate) navigator.vibrate(50);
            onHoldComplete();
          }
          return;
        }
        const pr = elapsed / HOLD_MS;
        holdProgressRef.current = pr;
        paintHoldFillDom(pr);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, [paintHoldFillDom, onHoldComplete]);

  const finishHold = useCallback(() => {
    setIsPressing(false);
    clearHold();
  }, [clearHold]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setIsPressing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    startHold();
  }, [startHold]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    finishHold();
  }, [finishHold]);

  const handlePointerLeave = useCallback(() => {
    finishHold();
  }, [finishHold]);

  const handlePointerCancel = useCallback(() => {
    finishHold();
  }, [finishHold]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (completedRef.current || suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      completedRef.current = false;
      suppressClickRef.current = false;
      return;
    }
    onTap();
  }, [onTap]);

  const isWarning = thresholdState === "warning";
  const isAlert = thresholdState === "alert";
  const dotColor = isAlert || isWarning ? TERRACOTTA.dot : SAGE.dot;
  const timeColor = isAlert ? TERRACOTTA.timeAlert : isWarning ? TERRACOTTA.time : SAGE.time;
  const borderColor = isAlert ? TERRACOTTA.borderAlert : isWarning ? TERRACOTTA.border : SAGE.border;
  const bgColor = isAlert ? TERRACOTTA.bgAlert : isWarning ? TERRACOTTA.bg : SAGE.bg;

  const baseBorder = isPressing && !isActive
    ? `1px solid ${color}`
    : isActive
      ? `0.5px solid ${borderColor}`
      : nightMode
        ? "1px solid rgba(255,255,255,0.1)"
        : "1px solid #ede0d4";

  /** Parent often passes `background`; we animate `background-color` so the active fill transition actually runs. */
  const { transition: parentTransition, background: parentSurfaceBg, ...styleRest } = style ?? {};
  const inactiveSurface =
    (typeof parentSurfaceBg === "string" ? parentSurfaceBg : undefined)
    ?? (nightMode ? "rgba(255,255,255,0.06)" : muteRestColor ? "#E8C9B8" : "#fff");
  const surfaceBgColor = isActive ? bgColor : inactiveSurface;

  const mergedTransition =
    [parentTransition, "background-color 0.45s ease", "border-color 0.45s ease", "color 0.45s ease"].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      style={{
        border: isAlert && isActive ? `1px solid ${borderColor}` : baseBorder,
        backgroundColor: surfaceBgColor,
        borderRadius: 14,
        padding: "10px 6px",
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "visible",
        minWidth: 0,
        ...styleRest,
        transition: mergedTransition,
      }}
    >
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        @keyframes dot-flash {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.2; }
        }
        @keyframes elapsed-flash {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.4; }
        }
        .hold-log-pulse-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--hold-dot-color);
          pointer-events: none;
        }
        .hold-log-pulse-dot::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1.5px solid var(--hold-dot-color);
          animation: pulse-ring 1.8s ease-out infinite;
          pointer-events: none;
        }
        .hold-log-pulse-dot.warning::after {
          animation-duration: 1.2s;
        }
        .hold-log-pulse-dot.alert {
          animation: dot-flash 0.6s step-end infinite;
        }
        .hold-log-pulse-dot.alert::after {
          animation: pulse-ring 1s ease-out infinite;
        }
        .hold-log-elapsed-flash {
          animation: elapsed-flash 0.6s step-end infinite;
        }
      `}</style>

      {isActive && (
        <div
          className={`hold-log-pulse-dot ${isWarning ? "warning" : ""} ${isAlert ? "alert" : ""}`}
          style={{ ["--hold-dot-color" as string]: dotColor }}
          aria-hidden
        />
      )}

      <div
        ref={fillRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: nightMode ? `color-mix(in srgb, ${color} 35%, transparent)` : `color-mix(in srgb, ${color} 20%, #fff)`,
          borderRadius: "0 0 14px 14px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(0,0,0,0.06)",
          borderRadius: "0 0 14px 14px",
        }}
      />
      <div
        ref={barRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          background: color,
          borderRadius: "0 0 0 14px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: isActive ? SAGE.iconBg : (nightMode ? `color-mix(in srgb, ${color} 20%, transparent)` : `color-mix(in srgb, ${color} 15%, #fff)`),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      {isActive ? (
        <>
          <div
            className={isAlert ? "hold-log-elapsed-flash" : undefined}
            style={{
              fontFamily: "'Lora', serif",
              fontSize: activeElapsedMs >= 3600000 ? 12 : 14,
              fontWeight: 600,
              color: timeColor,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              lineHeight: 1.15,
              textAlign: "center",
              maxWidth: "100%",
            }}
          >
            {formatElapsed(activeElapsedMs)}
          </div>
          <div style={{ fontSize: 9, color: "rgba(28,25,21,0.35)" }}>
            {activeSubLabel ?? "Hold to stop"}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: nightMode ? "rgba(255,255,255,0.8)" : "#2c1f1f" }}>{label}</div>
          <div style={{ fontSize: 10, color: nightMode ? "rgba(255,255,255,0.35)" : "var(--mu)" }}>{subLabel}</div>
        </>
      )}
    </button>
  );
}
