import { useMemo, useState } from "react";
import { useBaby } from "../contexts/BabyContext";

const STORAGE_PREFIX = "cradl-good-enough-";

function todayKey(): string {
  const d = new Date();
  return `${STORAGE_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isVisibleWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 10;
}

function alreadyDismissed(): boolean {
  try {
    return localStorage.getItem(todayKey()) === "1";
  } catch {
    return false;
  }
}

function readCount(key: string): number {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
    const todayStart = new Date().setHours(0, 0, 0, 0);
    return arr.filter((r: any) => (r.endTime ?? r.timestamp ?? r.startTime ?? 0) >= todayStart).length;
  } catch {
    return 0;
  }
}

function readSleepHours(): number {
  try {
    const arr = JSON.parse(localStorage.getItem("sleepHistory") || "[]") as any[];
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const end = todayStart + 86400000;
    let ms = 0;
    for (const s of arr) {
      const st = s.startTime ?? 0;
      const en = s.endTime ?? 0;
      if (en >= todayStart && st < end && en > st) {
        ms += Math.min(en, end) - Math.max(st, todayStart);
      }
    }
    return ms / 3600000;
  } catch {
    return 0;
  }
}

function readTummyMinutes(): number {
  try {
    const arr = JSON.parse(localStorage.getItem("tummyTimeHistory") || "[]") as any[];
    const todayStart = new Date().setHours(0, 0, 0, 0);
    let mins = 0;
    for (const t of arr) {
      if ((t.startTime ?? 0) >= todayStart && t.endTime) {
        mins += Math.round((t.endTime - t.startTime) / 60000);
      }
    }
    return mins;
  } catch {
    return 0;
  }
}

export function DailyGoodEnoughCard() {
  const { activeBaby } = useBaby();
  const [dismissed, setDismissed] = useState(alreadyDismissed);

  const data = useMemo(() => {
    const feeds = readCount("feedingHistory");
    const sleepH = readSleepHours();
    const tummyM = readTummyMinutes();
    const goodDay = feeds >= 6 && sleepH >= 10;
    return { feeds, sleepH, tummyM, goodDay };
  }, []);

  if (dismissed || !isVisibleWindow()) return null;

  const name = activeBaby?.name || "Baby";
  const headline = data.goodDay ? `What a good day, ${name}.` : "Today had its moments.";
  const body = "You kept her safe, fed, and loved. That's everything.";
  const tip = data.tummyM < 15 ? "Tomorrow: try 5 more minutes of tummy time." : null;

  const dismiss = () => {
    try { localStorage.setItem(todayKey(), "1"); } catch {}
    setDismissed(true);
  };

  return (
    <div
      style={{
        background: "var(--pe, #fde8d8)",
        borderRadius: 14,
        margin: "0 12px 8px",
        padding: "14px 14px 12px",
        position: "relative",
        borderLeft: "3px solid #d4604a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          background: "none",
          border: "none",
          fontSize: 16,
          color: "var(--mu)",
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#2c1f1f", marginBottom: 4 }}>
        {headline}
      </div>
      <div style={{ fontSize: 12, color: "#5a4a40", lineHeight: 1.5 }}>
        {body}
      </div>
      {tip && (
        <div style={{ fontSize: 11, color: "#d4604a", marginTop: 6, fontWeight: 500 }}>
          {tip}
        </div>
      )}
    </div>
  );
}
