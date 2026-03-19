/**
 * Bottom sheet for logging a crying / colic episode.
 * Includes a live timer, intensity picker, and auto-populates
 * feed/nap context from localStorage.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { addColicEpisode, type ColicEpisode } from "../utils/colicStorage";
import { isColicLikely } from "../utils/colicAnalysis";
import { readStoredArray } from "../utils/warningUtils";
import type { FeedingRecord, SleepRecord } from "../types";

const F = "system-ui, sans-serif";

const INTENSITIES = [
  { value: 1, label: "Fussy", color: "#b0a090" },
  { value: 2, label: "Grumpy", color: "#d4904a" },
  { value: 3, label: "Crying", color: "#d4604a" },
  { value: 4, label: "Intense", color: "#c02020" },
  { value: 5, label: "Inconsolable", color: "#8a0020" },
];

const SOOTHING_OPTIONS = [
  "Shushing", "Swaddling", "Swinging", "Sucking", "Side/stomach",
  "Rocking", "White noise", "Feeding", "Carrying", "Bath",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ageInWeeks: number;
}

export function ColicLogSheet({ open, onClose, onSaved, ageInWeeks }: Props) {
  const [timing, setTiming] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [intensity, setIntensity] = useState(3);
  const [soothing, setSoothing] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [colicVerdict, setColicVerdict] = useState<{ likely: boolean; reason: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setTiming(false);
      setStartTime(0);
      setElapsed(0);
      setIntensity(3);
      setSoothing(new Set());
      setNote("");
      setSaved(false);
      setColicVerdict(null);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  const handleStartTimer = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setTiming(true);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - now) / 1000));
    }, 1000);
  }, []);

  const handleStopAndSave = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTiming(false);

    const endTime = Date.now();
    const actualStart = startTime || endTime - elapsed * 1000;

    const feeds = readStoredArray<FeedingRecord>("feedingHistory");
    const sleeps = readStoredArray<SleepRecord>("sleepHistory");

    const postFeed = feeds.some((f) => {
      const ft = f.endTime ?? f.timestamp ?? 0;
      return ft > 0 && actualStart - ft >= 0 && actualStart - ft <= 30 * 60_000;
    });

    const inNapWindow = sleeps.some((s) => {
      if (!s.endTime) return false;
      const awakeFor = (actualStart - s.endTime) / 60_000;
      return awakeFor >= 45 && awakeFor <= 120;
    });

    const ep: ColicEpisode = {
      id: `colic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      startTime: actualStart,
      endTime: endTime,
      intensity,
      soothing: [...soothing],
      note: note.trim() || undefined,
      postFeed,
      inNapWindow,
    };

    addColicEpisode(ep);
    const verdict = isColicLikely(ep, ageInWeeks);
    setColicVerdict(verdict);
    setSaved(true);

    setTimeout(() => {
      onSaved();
      onClose();
    }, 3000);
  }, [startTime, elapsed, intensity, soothing, note, ageInWeeks, onSaved, onClose]);

  const toggleSoothing = (s: string) => {
    setSoothing((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 512, maxHeight: "90dvh", background: "var(--card, #fff)", borderRadius: "16px 16px 0 0", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 20px 28px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--bd, #ede0d4)", margin: "0 auto 16px" }} />

          {saved && colicVerdict ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", margin: "0 auto 12px",
                background: colicVerdict.likely ? "color-mix(in srgb, #d4604a 12%, #fff)" : "color-mix(in srgb, #4a8a4a 12%, #fff)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colicVerdict.likely ? "#d4604a" : "#4a8a4a"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx, #2c1f1f)", fontFamily: F, marginBottom: 6 }}>
                Episode logged
              </div>
              <div style={{ fontSize: 12, color: "var(--mu, #9a8080)", fontFamily: F, lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>
                {colicVerdict.reason}
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--tx, #2c1f1f)", fontWeight: 500, margin: "0 0 16px" }}>
                Log crying episode
              </h3>

              {/* Timer */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  fontSize: 40, fontWeight: 600, fontFamily: "ui-monospace, monospace",
                  color: timing ? "#d4604a" : "var(--tx, #2c1f1f)", marginBottom: 12,
                }}>
                  {formatTimer(elapsed)}
                </div>
                {!timing ? (
                  <button type="button" onClick={handleStartTimer} style={{
                    background: "#d4604a", color: "#fff", border: "none", borderRadius: 14,
                    padding: "12px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: F,
                  }}>
                    Start timer
                  </button>
                ) : (
                  <button type="button" onClick={handleStopAndSave} style={{
                    background: "#4a8a4a", color: "#fff", border: "none", borderRadius: 14,
                    padding: "12px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: F,
                  }}>
                    Stop &amp; save
                  </button>
                )}
              </div>

              {/* Intensity */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mu, #9a8080)", fontFamily: F, marginBottom: 8 }}>
                  Intensity
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {INTENSITIES.map((i) => (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => setIntensity(i.value)}
                      style={{
                        flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                        border: intensity === i.value ? `2px solid ${i.color}` : "1px solid var(--bd, #ede0d4)",
                        background: intensity === i.value ? `color-mix(in srgb, ${i.color} 12%, #fff)` : "transparent",
                        fontFamily: F, fontSize: 10, fontWeight: 600, color: i.color,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: `color-mix(in srgb, ${i.color} ${20 + i.value * 10}%, #fff)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 12 }}>{i.value}</span>
                      </div>
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soothing tried */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mu, #9a8080)", fontFamily: F, marginBottom: 8 }}>
                  What soothing did you try?
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SOOTHING_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSoothing(s)}
                      style={{
                        padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontFamily: F,
                        fontSize: 11, fontWeight: 500,
                        border: soothing.has(s) ? "1.5px solid #7a4ab4" : "1px solid var(--bd, #ede0d4)",
                        background: soothing.has(s) ? "color-mix(in srgb, #7a4ab4 10%, #fff)" : "transparent",
                        color: soothing.has(s) ? "#7a4ab4" : "var(--tx, #2c1f1f)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={2}
                placeholder="Any notes..."
                style={{
                  width: "100%", borderRadius: 10, border: "1px solid var(--bd, #ede0d4)",
                  padding: "10px 12px", fontSize: 13, fontFamily: F, resize: "none",
                  background: "var(--bg2, #faf7f4)", color: "var(--tx, #2c1f1f)",
                  boxSizing: "border-box",
                }}
              />

              {/* Save without timer (manual entry) */}
              {!timing && elapsed === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStartTime(Date.now() - 20 * 60_000);
                    setElapsed(20 * 60);
                    setTimeout(() => handleStopAndSave(), 50);
                  }}
                  style={{
                    width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 10,
                    border: "1px solid var(--bd, #ede0d4)", background: "transparent",
                    cursor: "pointer", fontFamily: F, fontSize: 12, color: "var(--mu, #9a8080)",
                  }}
                >
                  Log without timing (saves as ~20 min episode)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
