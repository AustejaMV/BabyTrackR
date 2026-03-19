import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PHASES = [
  { label: "Breathe in...", duration: 4000 },
  { label: "Hold...", duration: 4000 },
  { label: "Breathe out...", duration: 4000 },
  { label: "Rest...", duration: 2000 },
] as const;

const CYCLE_MS = PHASES.reduce((sum, p) => sum + p.duration, 0);
const TOTAL_CYCLES = 4;
const TOTAL_MS = CYCLE_MS * TOTAL_CYCLES;

export function BreathingExerciseModal({ open, onClose }: Props) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    if (startRef.current == null) return;

    const elapsed = Date.now() - startRef.current;
    if (elapsed >= TOTAL_MS) {
      setFinished(true);
      return;
    }

    const posInCycle = elapsed % CYCLE_MS;
    let acc = 0;
    for (let i = 0; i < PHASES.length; i++) {
      acc += PHASES[i].duration;
      if (posInCycle < acc) {
        setPhaseIndex(i);
        break;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFinished(false);
    setPhaseIndex(0);
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, tick]);

  const handleClose = () => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    onClose();
  };

  if (!open) return null;

  const phase = PHASES[phaseIndex];
  const isInhale = phaseIndex === 0;
  const isExhale = phaseIndex === 2;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#1a1428",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes cradl-inhale {
          0%   { transform: scale(0.5); opacity: 0.5; }
          100% { transform: scale(1);   opacity: 1;   }
        }
        @keyframes cradl-hold {
          0%, 100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cradl-exhale {
          0%   { transform: scale(1);   opacity: 1;   }
          100% { transform: scale(0.5); opacity: 0.5; }
        }
        @keyframes cradl-rest {
          0%, 100% { transform: scale(0.5); opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cradl-breath-circle {
            animation: none !important;
            transform: scale(0.75) !important;
            opacity: 0.75 !important;
          }
        }
      `}</style>

      {/* Close / X button */}
      <button
        onClick={handleClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          fontSize: 24,
          cursor: "pointer",
          padding: 8,
          lineHeight: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      {finished ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 22,
              color: "#fff",
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            Take your time.
            <br />
            You're doing great.
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 12,
              padding: "12px 40px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          {/* Animated circle */}
          <div
            className="cradl-breath-circle"
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(196,160,212,0.6), rgba(122,179,212,0.3))",
              animation: isInhale
                ? "cradl-inhale 4s ease-in-out forwards"
                : isExhale
                  ? "cradl-exhale 4s ease-in-out forwards"
                  : phaseIndex === 1
                    ? "cradl-hold 4s ease-in-out forwards"
                    : "cradl-rest 2s ease-in-out forwards",
              marginBottom: 32,
            }}
          />

          {/* Phase label */}
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 20,
              color: "#fff",
              opacity: 0.9,
            }}
          >
            {phase.label}
          </div>
        </>
      )}
    </div>
  );
}
