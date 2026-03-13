import { useEffect, useRef, useState } from "react";

// Top-aligned picker: selection at top row; smaller default
const ROW_HEIGHT = 32;
const VISIBLE_ROWS = 3;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
/** Only sync scroll from valueMs when delta is >= this (avoids live tick overwriting user scroll) */
const SYNC_SCROLL_THRESHOLD_MS = 25_000;

/** Max duration for editing past sessions: 23h 59m. Use as maxMs when showing picker on history items. */
export const MAX_DURATION_HISTORY_MS = 23 * 60 * 60 * 1000 + 59 * 60 * 1000;

interface DurationPickerProps {
  /** Current duration in milliseconds (updates live for active sessions). */
  valueMs: number;
  /** Maximum duration in ms. For active sessions use actual elapsed since start; for history use MAX_DURATION_HISTORY_MS. */
  maxMs: number;
  onChange: (ms: number) => void;
  /** Show seconds column (for active sessions so duration "moves" live). */
  showSeconds?: boolean;
  className?: string;
}

/**
 * iOS-style duration wheel: scroll hours, minutes, and optionally seconds.
 * Value updates live from valueMs (e.g. every second for active sessions); user can scroll to adjust.
 */
export function DurationPicker({ valueMs, maxMs, onChange, showSeconds = false, className = "" }: DurationPickerProps) {
  const maxHours = Math.floor(maxMs / (60 * 60 * 1000));
  const maxMins = maxHours > 0 ? 59 : Math.min(59, Math.floor(maxMs / 60_000));
  const maxSecs = showSeconds ? (maxHours > 0 || maxMins > 0 ? 59 : Math.min(59, Math.floor(maxMs / 1000))) : 0;

  const hours = Math.floor(valueMs / (60 * 60 * 1000));
  const minutes = Math.floor((valueMs % (60 * 60 * 1000)) / 60_000);
  const seconds = Math.floor((valueMs % 60_000) / 1000);

  const [hourIndex, setHourIndex] = useState(Math.min(hours, maxHours));
  const [minIndex, setMinIndex] = useState(Math.min(minutes, maxMins));
  const [secIndex, setSecIndex] = useState(Math.min(seconds, maxSecs));
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  const msFromIndices = (h: number, m: number, s: number) => {
    let ms = h * 60 * 60 * 1000 + m * 60_000;
    if (showSeconds) ms += s * 1000;
    return Math.min(ms, maxMs);
  };

  // Sync from controlled value only when change is large (avoids live tick snapping picker back)
  useEffect(() => {
    const currentMs = msFromIndices(hourIndex, minIndex, secIndex);
    const delta = Math.abs(valueMs - currentMs);
    const shouldSync = !didInitialScroll.current || delta >= SYNC_SCROLL_THRESHOLD_MS || valueMs < currentMs;
    if (!shouldSync) return;

    const h = Math.floor(valueMs / (60 * 60 * 1000));
    const m = Math.floor((valueMs % (60 * 60 * 1000)) / 60_000);
    const s = Math.floor((valueMs % 60_000) / 1000);
    setHourIndex(Math.min(h, maxHours));
    setMinIndex(Math.min(m, maxMins));
    if (showSeconds) setSecIndex(Math.min(s, maxSecs));
  }, [valueMs, maxHours, maxMins, showSeconds, maxSecs]);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, index: number, instant = false) => {
    if (!ref.current) return;
    const el = ref.current;
    const targetScroll = index * ROW_HEIGHT;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ top: targetScroll, behavior: instant ? "auto" : "smooth" });
    } else {
      (el as { scrollTop?: number }).scrollTop = targetScroll;
    }
  };

  // Initial scroll (top-aligned: selected row at top)
  useEffect(() => {
    if (didInitialScroll.current) return;
    const h = Math.min(hourIndex, maxHours);
    const m = Math.min(minIndex, maxMins);
    const s = Math.min(secIndex, maxSecs);
    if (hourRef.current) hourRef.current.scrollTop = h * ROW_HEIGHT;
    if (minRef.current) minRef.current.scrollTop = m * ROW_HEIGHT;
    if (showSeconds && secRef.current) secRef.current.scrollTop = s * ROW_HEIGHT;
    didInitialScroll.current = true;
  }, [hourIndex, minIndex, secIndex, maxHours, maxMins, maxSecs, showSeconds]);

  useEffect(() => {
    if (!didInitialScroll.current) return;
    scrollTo(hourRef, hourIndex);
  }, [hourIndex]);
  useEffect(() => {
    if (!didInitialScroll.current) return;
    scrollTo(minRef, minIndex);
  }, [minIndex]);
  useEffect(() => {
    if (!didInitialScroll.current || !showSeconds) return;
    scrollTo(secRef, secIndex);
  }, [secIndex, showSeconds]);

  const handleScroll = (type: "h" | "m" | "s") => {
    const ref = type === "h" ? hourRef : type === "m" ? minRef : secRef;
    const max = type === "h" ? maxHours : type === "m" ? maxMins : maxSecs;
    if (!ref.current) return;
    const el = ref.current;
    const index = Math.round(el.scrollTop / ROW_HEIGHT);
    const clamped = Math.max(0, Math.min(index, max));
    if (type === "h") {
      setHourIndex(clamped);
      onChange(msFromIndices(clamped, minIndex, secIndex));
    } else if (type === "m") {
      setMinIndex(clamped);
      onChange(msFromIndices(hourIndex, clamped, secIndex));
    } else {
      setSecIndex(clamped);
      onChange(msFromIndices(hourIndex, minIndex, clamped));
    }
  };

  const newMsFromIndices = (h: number, m: number, s?: number) => {
    onChange(msFromIndices(h, m, s ?? (showSeconds ? secIndex : 0)));
  };

  return (
    <div
      className={`duration-picker-container flex items-stretch rounded-2xl overflow-hidden ${className}`}
      style={{
        minHeight: PICKER_HEIGHT,
        backgroundColor: "var(--duration-picker-bg, #e5e5ea)",
      }}
    >
      <style>{`
        .duration-picker-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .duration-picker-scroll::-webkit-scrollbar { display: none; }
        .dark .duration-picker-container {
          --duration-picker-bg: #2c2c2e;
          --duration-picker-band: rgba(255,255,255,0.08);
        }
      `}</style>
      <div
        className="flex flex-1 relative"
        style={{
          height: PICKER_HEIGHT,
          backgroundColor: "var(--duration-picker-bg)",
        }}
      >
        {/* Top/bottom fade */}
        <div
          className="absolute inset-x-0 top-0 h-8 pointer-events-none z-10 rounded-t-2xl"
          style={{
            background: "linear-gradient(to bottom, var(--duration-picker-bg) 0%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-8 pointer-events-none z-10 rounded-b-2xl"
          style={{
            background: "linear-gradient(to top, var(--duration-picker-bg) 0%, transparent 100%)",
          }}
        />
        {/* Top selection band — selected row at top */}
        <div
          className="absolute inset-x-0 top-0 z-[8] pointer-events-none rounded-t-lg mx-1"
          style={{
            height: ROW_HEIGHT,
            backgroundColor: "var(--duration-picker-band, rgba(0,0,0,0.06))",
          }}
        />
        {/* Column dividers */}
        {showSeconds ? (
          <>
            <div className="absolute left-[33.33%] top-0 w-px h-[32px] bg-gray-300 dark:bg-gray-600 z-[9] pointer-events-none" />
            <div className="absolute left-[66.66%] top-0 w-px h-[32px] bg-gray-300 dark:bg-gray-600 z-[9] pointer-events-none" />
          </>
        ) : (
          <div className="absolute left-1/2 top-0 -translate-x-px w-px h-[32px] bg-gray-300 dark:bg-gray-600 z-[9] pointer-events-none" />
        )}

        <div
          ref={hourRef}
          className="duration-picker-scroll flex-1 overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory min-w-0"
          style={{
            height: PICKER_HEIGHT,
            scrollSnapType: "y mandatory",
            paddingBottom: Math.max(0, (maxHours + 1) * ROW_HEIGHT - PICKER_HEIGHT),
          }}
          onScroll={() => handleScroll("h")}
        >
          {Array.from({ length: maxHours + 1 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-center snap-start select-none font-semibold tabular-nums text-[15px] text-gray-900 dark:text-white"
              style={{ height: ROW_HEIGHT, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" }}
              onClick={() => { setHourIndex(i); newMsFromIndices(i, minIndex, showSeconds ? secIndex : undefined); }}
            >
              {i}h
            </div>
          ))}
        </div>
        <div
          ref={minRef}
          className="duration-picker-scroll flex-1 overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory min-w-0"
          style={{
            height: PICKER_HEIGHT,
            scrollSnapType: "y mandatory",
            paddingBottom: Math.max(0, (maxMins + 1) * ROW_HEIGHT - PICKER_HEIGHT),
          }}
          onScroll={() => handleScroll("m")}
        >
          {Array.from({ length: maxMins + 1 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-center snap-start select-none font-semibold tabular-nums text-[15px] text-gray-900 dark:text-white"
              style={{ height: ROW_HEIGHT, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" }}
              onClick={() => { setMinIndex(i); newMsFromIndices(hourIndex, i, showSeconds ? secIndex : undefined); }}
            >
              {i}m
            </div>
          ))}
        </div>
        {showSeconds && (
          <div
            ref={secRef}
            className="duration-picker-scroll flex-1 overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory min-w-0"
            style={{
              height: PICKER_HEIGHT,
              scrollSnapType: "y mandatory",
              paddingBottom: Math.max(0, (maxSecs + 1) * ROW_HEIGHT - PICKER_HEIGHT),
            }}
            onScroll={() => handleScroll("s")}
          >
            {Array.from({ length: maxSecs + 1 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-center snap-start select-none font-semibold tabular-nums text-[15px] text-gray-900 dark:text-white"
                style={{ height: ROW_HEIGHT, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" }}
                onClick={() => { setSecIndex(i); newMsFromIndices(hourIndex, minIndex, i); }}
              >
                {i}s
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
