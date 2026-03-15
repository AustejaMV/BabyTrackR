/**
 * Build a chronological timeline of all events for a given day (and optionally yesterday).
 * Used by Today view and PDF export.
 */
import { format } from "date-fns";
import { formatDurationMs } from "./dateUtils";
import type {
  TimelineEvent,
  TimelineEventKind,
  FeedingRecord,
  SleepRecord,
  DiaperRecord,
  TummyTimeRecord,
  BottleRecord,
  PumpRecord,
} from "../types";

const DATE_DISPLAY = "dd/MM/yyyy";

function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayEnd(ts: number): number {
  return dayStart(ts) + 24 * 60 * 60 * 1000 - 1;
}

function inDay(ts: number, dayStartMs: number): boolean {
  return ts >= dayStartMs && ts < dayStartMs + 24 * 60 * 60 * 1000;
}

function feedDescription(r: FeedingRecord): string {
  if (r.segments && r.segments.length > 0) {
    const parts = r.segments.map((s) => {
      const label = s.type; // e.g. "Left breast"
      const dur = formatDurationMs(s.durationMs, true);
      return `${label}, ${dur}`;
    });
    return parts.join(" · ");
  }
  const dur = r.durationMs != null ? formatDurationMs(r.durationMs, true) : "";
  return dur ? `Feed, ${dur}` : "Feed";
}

function sleepDescription(r: SleepRecord): string {
  const start = r.startTime ?? 0;
  const end = r.endTime ?? start;
  const dur = end - start;
  return `Nap, ${formatDurationMs(dur, false)}, ${r.position}`;
}

function diaperDescription(r: DiaperRecord): string {
  if (r.type === "both") return "Wet and dirty diaper";
  if (r.type === "poop") return "Dirty diaper";
  return "Wet diaper";
}

function tummyDescription(r: TummyTimeRecord): string {
  const start = r.startTime ?? 0;
  const end = r.endTime ?? start;
  const dur = Math.round((end - start) / 1000) * 1000;
  return `Tummy time, ${formatDurationMs(dur, false)}`;
}

function bottleDescription(r: BottleRecord): string {
  const typeLabel = r.feedType === "formula" ? "Formula" : r.feedType === "expressed" ? "Expressed milk" : "Mixed";
  return `Bottle ${r.volumeMl}ml, ${typeLabel}`;
}

function pumpDescription(r: PumpRecord): string {
  const sides: string[] = [];
  if (r.side === "both" || r.side === "left") sides.push(`L ${r.volumeLeftMl ?? 0}ml`);
  if (r.side === "both" || r.side === "right") sides.push(`R ${r.volumeRightMl ?? 0}ml`);
  return `Pump ${sides.join(" / ")}, ${formatDurationMs(r.durationMs, false)}`;
}

export function getTimelineEventsForDay(
  dayStartMs: number,
  options: {
    feedingHistory: FeedingRecord[];
    sleepHistory: SleepRecord[];
    diaperHistory: DiaperRecord[];
    tummyTimeHistory: TummyTimeRecord[];
    bottleHistory?: BottleRecord[];
    pumpHistory?: PumpRecord[];
    useDateOnLabel?: boolean; // if true, show dd/mm/yyyy in time label (for past days)
  }
): TimelineEvent[] {
  const end = dayEnd(dayStartMs);
  const useDate = options.useDateOnLabel ?? false;

  const events: TimelineEvent[] = [];

  options.feedingHistory.forEach((r) => {
    const t = r.endTime ?? r.timestamp;
    if (t >= dayStartMs && t <= end) {
      events.push({
        id: r.id,
        kind: "feed",
        forDatetime: t,
        timeLabel: useDate ? format(t, `${DATE_DISPLAY} HH:mm`) : format(t, "HH:mm"),
        description: feedDescription(r),
        record: r,
      });
    }
  });

  options.sleepHistory.forEach((r) => {
    const t = r.endTime ?? r.startTime;
    if (t >= dayStartMs && t <= end) {
      events.push({
        id: r.id,
        kind: "sleep",
        forDatetime: t,
        timeLabel: useDate ? format(t, `${DATE_DISPLAY} HH:mm`) : format(t, "HH:mm"),
        description: sleepDescription(r),
        record: r,
      });
    }
  });

  options.diaperHistory.forEach((r) => {
    if (r.timestamp >= dayStartMs && r.timestamp <= end) {
      events.push({
        id: r.id,
        kind: "diaper",
        forDatetime: r.timestamp,
        timeLabel: useDate ? format(r.timestamp, `${DATE_DISPLAY} HH:mm`) : format(r.timestamp, "HH:mm"),
        description: diaperDescription(r),
        record: r,
      });
    }
  });

  options.tummyTimeHistory.forEach((r) => {
    const t = r.endTime ?? r.startTime;
    if (t >= dayStartMs && t <= end) {
      events.push({
        id: r.id,
        kind: "tummy",
        forDatetime: t,
        timeLabel: useDate ? format(t, `${DATE_DISPLAY} HH:mm`) : format(t, "HH:mm"),
        description: tummyDescription(r),
        record: r,
      });
    }
  });

  (options.bottleHistory ?? []).forEach((r) => {
    if (r.timestamp >= dayStartMs && r.timestamp <= end) {
      events.push({
        id: r.id,
        kind: "bottle",
        forDatetime: r.timestamp,
        timeLabel: useDate ? format(r.timestamp, `${DATE_DISPLAY} HH:mm`) : format(r.timestamp, "HH:mm"),
        description: bottleDescription(r),
        record: r,
      });
    }
  });

  (options.pumpHistory ?? []).forEach((r) => {
    if (r.timestamp >= dayStartMs && r.timestamp <= end) {
      events.push({
        id: r.id,
        kind: "pump",
        forDatetime: r.timestamp,
        timeLabel: useDate ? format(r.timestamp, `${DATE_DISPLAY} HH:mm`) : format(r.timestamp, "HH:mm"),
        description: pumpDescription(r),
        record: r,
      });
    }
  });

  events.sort((a, b) => a.forDatetime - b.forDatetime);
  return events;
}

export function getBorderColorForKind(kind: TimelineEventKind): string {
  switch (kind) {
    case "feed": return "var(--coral)";
    case "sleep": return "var(--blue)";
    case "diaper": return "var(--grn)";
    case "tummy": return "var(--purp)";
    case "bottle": return "var(--coral)";
    case "pump": return "var(--pink)";
    default: return "var(--bd)";
  }
}
