import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface FeedSegment {
  side: "Left" | "Right" | "Both";
  durationMs: number;
}

interface FeedTimerState {
  timerRunning: boolean;
  timerPaused: boolean;
  elapsedMs: number;
  feedSegments: FeedSegment[];
  feedSide: "Left" | "Right" | "Both";
}

interface FeedTimerContextValue extends FeedTimerState {
  setTimerRunning: (v: boolean) => void;
  setTimerPaused: (v: boolean) => void;
  setElapsedMs: (v: number | ((prev: number) => number)) => void;
  setFeedSegments: React.Dispatch<React.SetStateAction<FeedSegment[]>>;
  setFeedSide: (v: "Left" | "Right" | "Both") => void;
  resetFeedTimer: () => void;
}

const defaultState: FeedTimerState = {
  timerRunning: false,
  timerPaused: false,
  elapsedMs: 0,
  feedSegments: [],
  feedSide: "Left",
};

const FeedTimerContext = createContext<FeedTimerContextValue | null>(null);

export function FeedTimerProvider({ children }: { children: React.ReactNode }) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [feedSegments, setFeedSegments] = useState<FeedSegment[]>([]);
  const [feedSide, setFeedSide] = useState<"Left" | "Right" | "Both">("Left");

  useEffect(() => {
    if (!timerRunning || timerPaused) return;
    const id = setInterval(() => setElapsedMs((e) => e + 1000), 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerPaused]);

  const resetFeedTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerPaused(false);
    setElapsedMs(0);
    setFeedSegments([]);
  }, []);

  const value: FeedTimerContextValue = {
    timerRunning,
    timerPaused,
    elapsedMs,
    feedSegments,
    feedSide,
    setTimerRunning,
    setTimerPaused,
    setElapsedMs,
    setFeedSegments,
    setFeedSide,
    resetFeedTimer,
  };

  return <FeedTimerContext.Provider value={value}>{children}</FeedTimerContext.Provider>;
}

export function useFeedTimer() {
  const ctx = useContext(FeedTimerContext);
  return ctx;
}
