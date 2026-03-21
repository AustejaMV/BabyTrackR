/**
 * Prompt 9: Daily personalised sign-off at bottom of Today.
 * "You fed her X times, changed Y nappies, and did Z minutes of tummy time today."
 * "You are doing an extraordinary job, [mum's name]."
 * Only show when baby awake ≥8h or after 19:00; hide if nothing logged today.
 */

import { useMemo } from "react";

interface DailySignOffCardProps {
  feedsToday: number;
  nappiesToday: number;
  tummyMinutesToday: number;
  parentName: string | null | undefined;
}

/** Show after 19:00 or in the morning (before 10) — baby awake 8h or evening (Prompt 9). */
function isInWindow(): boolean {
  const h = new Date().getHours();
  return h >= 19 || h < 10;
}

export function DailySignOffCard({ feedsToday, nappiesToday, tummyMinutesToday, parentName }: DailySignOffCardProps) {
  const show = useMemo(() => {
    if (!isInWindow()) return false;
    const total = feedsToday + nappiesToday + (tummyMinutesToday > 0 ? 1 : 0);
    return total > 0;
  }, [feedsToday, nappiesToday, tummyMinutesToday]);

  const line1 = useMemo(() => {
    const parts: string[] = [];
    if (feedsToday > 0) parts.push(`You fed her ${feedsToday} time${feedsToday !== 1 ? "s" : ""}`);
    if (nappiesToday > 0) parts.push(`changed ${nappiesToday} napp${nappiesToday !== 1 ? "ies" : "y"}`);
    if (tummyMinutesToday > 0) parts.push(`did ${tummyMinutesToday} minutes of tummy time`);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0] + " today.";
    if (parts.length === 2) return parts[0] + " and " + parts[1] + " today.";
    return parts[0] + ", " + parts[1] + ", and " + parts[2] + " today.";
  }, [feedsToday, nappiesToday, tummyMinutesToday]);

  const name = parentName?.trim() || "you";

  if (!show || !line1) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1a1428, #1e1832)",
        borderRadius: 14,
        margin: "12px 12px 24px",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        border: "1px solid rgba(196,160,212,0.2)",
      }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "#fde8d8" }}>
        {line1}
      </div>
      <div style={{ fontSize: 13, fontStyle: "italic", color: "#d4604a", marginTop: 6 }}>
        You are doing an extraordinary job, {name}.
      </div>
    </div>
  );
}
