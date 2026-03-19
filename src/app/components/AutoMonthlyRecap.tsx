import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";

interface AutoRecapProps {
  yearMonth: string;
  babyDob: number | null;
}

type RecapIconKey = "sleep" | "star" | "bottle" | "trendUp" | "trendDown" | "strong" | "lightbulb";

interface RecapHighlight {
  icon: RecapIconKey;
  text: string;
}

const ICON_SVG: Record<RecapIconKey, ReactNode> = {
  sleep: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M12 6v4"/><path d="M9 9h6"/></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  bottle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2h8v4l2 16H6L8 6V2z"/><path d="M8 6h8"/></svg>,
  trendUp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 7l-8.5 8.5-4-4L2 17"/><path d="M16 7h6v6"/></svg>,
  trendDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 17l-8.5-8.5-4 4L2 7"/><path d="M16 17h6v-6"/></svg>,
  strong: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4h4v16H6z"/><path d="M14 4h4v16h-4z"/><path d="M10 12h4"/></svg>,
  lightbulb: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
};

const AGE_FACTS: Record<number, string> = {
  0: "Newborns can recognise their mother's voice from birth",
  1: "By 1 month, babies can briefly focus on faces close up",
  2: "Around 2 months, you might see the first real smile",
  3: "By 3 months, many babies can hold their head steady",
  4: "Around 4 months, babies start reaching for objects",
  5: "By 5 months, many babies can roll over",
  6: "At 6 months, most babies are ready to start solids",
  7: "By 7 months, babies often sit without support",
  8: "Around 8 months, stranger anxiety may appear",
  9: "By 9 months, many babies can pull to stand",
  10: "Around 10 months, babies love to wave bye-bye",
  11: "By 11 months, some babies take their first steps",
  12: "Happy first birthday! Many babies say their first word around now",
};

function getMonthRange(ym: string): { start: number; end: number } {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1).getTime();
  const end = new Date(y, m, 1).getTime();
  return { start, end };
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function generateHighlights(ym: string, babyDob: number | null): RecapHighlight[] {
  const { start, end } = getMonthRange(ym);
  const highlights: RecapHighlight[] = [];

  const sleepHistory = safeParse<any[]>("sleepHistory", []);
  const feedingHistory = safeParse<any[]>("feedingHistory", []);
  const diaperHistory = safeParse<any[]>("diaperHistory", []);
  const tummyTimeHistory = safeParse<any[]>("tummyTimeHistory", []);
  const milestoneHistory = safeParse<any[]>("milestoneHistory", []);

  const monthSleep = sleepHistory.filter((s: any) => (s.startTime ?? 0) >= start && (s.startTime ?? 0) < end && s.endTime);
  const monthFeeds = feedingHistory.filter((f: any) => (f.endTime ?? f.timestamp ?? 0) >= start && (f.endTime ?? f.timestamp ?? 0) < end);
  const monthTummy = tummyTimeHistory.filter((t: any) => (t.startTime ?? 0) >= start && (t.startTime ?? 0) < end && t.endTime);

  // Best sleep day
  if (monthSleep.length > 0) {
    const byDay: Record<string, number> = {};
    for (const s of monthSleep) {
      const day = format(new Date(s.startTime), "yyyy-MM-dd");
      byDay[day] = (byDay[day] ?? 0) + ((s.endTime ?? 0) - (s.startTime ?? 0));
    }
    const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    if (best) {
      const hrs = (best[1] / 3600000).toFixed(1);
      highlights.push({ icon: "sleep", text: `Best sleep day: ${format(new Date(best[0] + "T12:00:00"), "d MMM")} (${hrs}h)` });
    }
  }

  // First milestone
  const monthMilestones = milestoneHistory.filter((m: any) => {
    const t = m.timestamp ?? m.achievedAt ?? 0;
    return t >= start && t < end;
  });
  if (monthMilestones.length > 0) {
    const first = monthMilestones.sort((a: any, b: any) => (a.timestamp ?? a.achievedAt ?? 0) - (b.timestamp ?? b.achievedAt ?? 0))[0];
    highlights.push({ icon: "star", text: `First milestone: ${first.title ?? first.label ?? "Achieved!"}` });
  }

  // Most active feeding day
  if (monthFeeds.length > 0) {
    const byDay: Record<string, number> = {};
    for (const f of monthFeeds) {
      const day = format(new Date(f.endTime ?? f.timestamp), "yyyy-MM-dd");
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
    const most = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    if (most && most[1] > 1) {
      highlights.push({ icon: "bottle", text: `Most feeds in a day: ${most[1]} on ${format(new Date(most[0] + "T12:00:00"), "d MMM")}` });
    }
  }

  // Sleep vs prior month
  const [y, m] = ym.split("-").map(Number);
  const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const { start: pStart, end: pEnd } = getMonthRange(prevYm);
  const prevMonthSleep = sleepHistory.filter((s: any) => (s.startTime ?? 0) >= pStart && (s.startTime ?? 0) < pEnd && s.endTime);
  if (monthSleep.length > 0 && prevMonthSleep.length > 0) {
    const avgThis = monthSleep.reduce((s: number, r: any) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0) / monthSleep.length;
    const avgPrev = prevMonthSleep.reduce((s: number, r: any) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)), 0) / prevMonthSleep.length;
    const diff = ((avgThis - avgPrev) / avgPrev) * 100;
    if (Math.abs(diff) > 5) {
      highlights.push({
        icon: diff > 0 ? "trendUp" : "trendDown",
        text: `Avg sleep ${diff > 0 ? "up" : "down"} ${Math.abs(Math.round(diff))}% vs last month`,
      });
    }
  }

  // Tummy time progress
  if (monthTummy.length > 0) {
    const totalMin = monthTummy.reduce((s: number, t: any) => s + ((t.endTime ?? 0) - (t.startTime ?? 0)) / 60000, 0);
    highlights.push({ icon: "strong", text: `${Math.round(totalMin)} minutes of tummy time this month` });
  }

  // Fun fact by age
  if (babyDob) {
    const midMonth = new Date(y, m - 1, 15).getTime();
    const ageMonths = Math.floor((midMonth - babyDob) / (30.44 * 24 * 60 * 60 * 1000));
    const fact = AGE_FACTS[ageMonths];
    if (fact) highlights.push({ icon: "lightbulb", text: fact });
  }

  return highlights;
}

export function AutoMonthlyRecap({ yearMonth, babyDob }: AutoRecapProps) {
  const highlights = useMemo(() => generateHighlights(yearMonth, babyDob), [yearMonth, babyDob]);
  if (highlights.length === 0) return null;

  const [y, m] = yearMonth.split("-").map(Number);
  const monthLabel = format(new Date(y, m - 1, 1), "MMMM yyyy");

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--pe), var(--la))",
        borderRadius: 16, padding: 16, marginTop: 12,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--mu)", marginBottom: 8, fontFamily: "system-ui, sans-serif" }}>
        {monthLabel} — highlights
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {highlights.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ width: 16, height: 16, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--tx)" }}>{ICON_SVG[h.icon]}</span>
            <span style={{ fontSize: 13, color: "var(--tx)", fontFamily: "system-ui, sans-serif", lineHeight: 1.4 }}>{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
