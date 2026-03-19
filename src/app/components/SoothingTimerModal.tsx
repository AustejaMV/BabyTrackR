/**
 * 5 S's soothing timer — guided one-tap timer that walks the parent
 * through each soothing technique with timing guidance.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const F = "system-ui, sans-serif";

const STEPS = [
  {
    name: "Swaddle",
    instruction: "Wrap snugly — arms down, hips loose",
    duration: 30,
    color: "#7a4ab4",
  },
  {
    name: "Side / stomach",
    instruction: "Hold on side or tummy (on your arm, never in cot)",
    duration: 60,
    color: "#4080a0",
  },
  {
    name: "Shush",
    instruction: "Loud, rhythmic shushing near the ear — as loud as the crying",
    duration: 60,
    color: "#4a8a4a",
  },
  {
    name: "Swing",
    instruction: "Small, jiggly head movements — support the head and neck",
    duration: 60,
    color: "#d4904a",
  },
  {
    name: "Suck",
    instruction: "Offer a dummy, clean finger, or breast for comfort sucking",
    duration: 90,
    color: "#d4604a",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SoothingTimerModal({ open, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setSecondsLeft(STEPS[0].duration);
      setRunning(false);
      setDone(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [open]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (stepIdx < STEPS.length - 1) {
            const next = stepIdx + 1;
            setStepIdx(next);
            return STEPS[next].duration;
          } else {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, stepIdx]);

  const handleStart = useCallback(() => {
    setRunning(true);
  }, []);

  const handleSkip = useCallback(() => {
    if (stepIdx < STEPS.length - 1) {
      const next = stepIdx + 1;
      setStepIdx(next);
      setSecondsLeft(STEPS[next].duration);
    } else {
      setRunning(false);
      setDone(true);
    }
  }, [stepIdx]);

  if (!open) return null;

  const step = STEPS[stepIdx];
  const progress = step ? (step.duration - secondsLeft) / step.duration : 1;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ width: "90%", maxWidth: 380, borderRadius: 20, background: "#fff", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px 20px 20px", textAlign: "center" }}>
          {done ? (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
                background: "color-mix(in srgb, #4a8a4a 12%, #fff)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: "#2c1f1f", marginBottom: 8 }}>
                You've tried everything
              </div>
              <div style={{ fontSize: 12, color: "#9a8080", fontFamily: F, lineHeight: 1.6, marginBottom: 20 }}>
                If she's still crying, that's okay. Some babies just need to cry it out with you holding them.
                You are not failing — you are here, and that is enough.
              </div>
              <button type="button" onClick={onClose} style={{
                background: "#4a8a4a", color: "#fff", border: "none", borderRadius: 14,
                padding: "12px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F,
              }}>
                Done
              </button>
            </>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 16 }}>
                {STEPS.map((s, i) => (
                  <div key={s.name} style={{
                    width: i === stepIdx ? 20 : 8, height: 6, borderRadius: 3,
                    background: i < stepIdx ? "#4a8a4a" : i === stepIdx ? step.color : "#ede0d4",
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>

              {/* Circle progress */}
              <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 16px" }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f0ece8" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke={step.color} strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: step.color }}>
                    {secondsLeft}
                  </div>
                  <div style={{ fontSize: 10, color: "#9a8080", fontFamily: F }}>seconds</div>
                </div>
              </div>

              {/* Step info */}
              <div style={{
                fontSize: 18, fontWeight: 700, color: step.color, fontFamily: F, marginBottom: 6,
              }}>
                {step.name}
              </div>
              <div style={{
                fontSize: 13, color: "#9a8080", fontFamily: F, lineHeight: 1.5,
                maxWidth: 280, margin: "0 auto 20px",
              }}>
                {step.instruction}
              </div>

              {/* Controls */}
              {!running ? (
                <button type="button" onClick={handleStart} style={{
                  background: step.color, color: "#fff", border: "none", borderRadius: 14,
                  padding: "12px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: F,
                }}>
                  Start
                </button>
              ) : (
                <button type="button" onClick={handleSkip} style={{
                  background: "transparent", color: step.color, border: `1.5px solid ${step.color}`, borderRadius: 14,
                  padding: "10px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
                }}>
                  Skip to next
                </button>
              )}
            </>
          )}
        </div>

        {/* Close */}
        <button type="button" onClick={onClose} style={{
          width: "100%", padding: "12px 0",
          background: "none", border: "none", borderTop: "1px solid #f0ece8",
          cursor: "pointer", fontSize: 12, color: "#9a8080", fontFamily: F,
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
