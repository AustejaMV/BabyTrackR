import { useState, useEffect, useCallback } from "react";

const PHASES = ["inhale", "hold1", "exhale", "rest"] as const;
const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  inhale: "Breathe in...",
  hold1: "Hold...",
  exhale: "Breathe out...",
  rest: "Rest...",
};
const PHASE_DURATION_MS = { inhale: 4000, hold1: 4000, exhale: 4000, rest: 2000 };
const TOTAL_ROUNDS = 4;

export function BreathingExerciseModal({ onClose }: { onClose: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [done, setDone] = useState(false);

  const phase = PHASES[phaseIndex];
  const scale = phase === "inhale" || phase === "hold1" ? 1 : 0.6;
  const transitionMs = phase === "inhale" || phase === "exhale" ? 4000 : 0;

  const advance = useCallback(() => {
    setPhaseIndex((i) => {
      const next = i + 1;
      if (next >= PHASES.length) {
        setRound((r) => {
          if (r >= TOTAL_ROUNDS) setDone(true);
          return r + 1;
        });
        return 0;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (done) return;
    const dur = PHASE_DURATION_MS[phase];
    const t = setTimeout(advance, dur);
    return () => clearTimeout(t);
  }, [phase, phaseIndex, done, advance]);

  const handleSkip = () => onClose();

  const isDark = typeof document !== "undefined" && document.documentElement?.classList?.contains("dark");
  const bg = isDark ? "#1a1428" : "#2a1e35";
  const textColor = "rgba(240, 235, 230, 0.95)";

  if (done) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6"
        style={{ background: bg }}
        role="dialog"
        aria-label="Breathing exercise complete"
      >
        <p className="text-center text-[18px] font-serif mb-6" style={{ color: textColor }}>
          Take your time. You're doing great.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-8 py-3 rounded-xl border border-white/30 text-white font-medium"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6"
      style={{ background: bg }}
      role="dialog"
      aria-label="Breathing exercise"
    >
      <div
        className="w-48 h-48 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-40 h-40 rounded-full border-2 border-white/20 ease-in-out"
          style={{
            transform: `scale(${scale})`,
            transition: transitionMs ? `transform ${transitionMs}ms ease-in-out` : "none",
          }}
        />
      </div>

      <p className="mt-8 text-center text-[18px] font-serif" style={{ color: textColor, fontFamily: "Georgia, serif" }}>
        {PHASE_LABELS[phase]}
      </p>
      <p className="mt-2 text-sm opacity-80" style={{ color: textColor }}>
        Round {round} of {TOTAL_ROUNDS}
      </p>

      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-8 left-0 right-0 text-center text-sm opacity-60 hover:opacity-90"
        style={{ color: textColor }}
      >
        Skip
      </button>
    </div>
  );
}
