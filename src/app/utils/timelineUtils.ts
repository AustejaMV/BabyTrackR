/**
 * Build a chronological timeline of all events for a given day (and optionally yesterday).
 * Used by Today view and PDF export.
 */
import { format } from "date-fns";
import { formatDurationMs, DATETIME_DISPLAY, TIME_DISPLAY } from "./dateUtils";
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
import type { TemperatureEntry, SymptomEntry, MedicationEntry } from "../types/health";
import type { CustomTrackerDefinition, CustomTrackerLogEntry } from "../types/customTracker";
import { getIconLabel } from "../data/customTrackerIcons";

// Uses centralized DATETIME_DISPLAY() and TIME_DISPLAY() from dateUtils

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
  return dur ? `Nurse, ${dur}` : "Nurse";
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

function healthDescription(entry: TemperatureEntry | SymptomEntry | MedicationEntry): string {
  if ("tempC" in entry) return `Temperature ${entry.tempC}°C (${entry.method})`;
  if ("symptoms" in entry) return `Symptoms: ${entry.symptoms.join(", ")} (${entry.severity})`;
  if ("medication" in entry) return `Medication: ${entry.medication}${entry.doseML != null ? ` ${entry.doseML}ml` : ""}`;
  return "Health";
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
    temperatureHistory?: TemperatureEntry[];
    symptomHistory?: SymptomEntry[];
    medicationHistory?: MedicationEntry[];
    customTrackers?: CustomTrackerDefinition[];
    customTrackerLogs?: CustomTrackerLogEntry[];
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
        timeLabel: useDate ? format(t, DATETIME_DISPLAY()) : format(t, TIME_DISPLAY()),
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
        timeLabel: useDate ? format(t, DATETIME_DISPLAY()) : format(t, TIME_DISPLAY()),
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
        timeLabel: useDate ? format(r.timestamp, DATETIME_DISPLAY()) : format(r.timestamp, TIME_DISPLAY()),
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
        timeLabel: useDate ? format(t, DATETIME_DISPLAY()) : format(t, TIME_DISPLAY()),
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
        timeLabel: useDate ? format(r.timestamp, DATETIME_DISPLAY()) : format(r.timestamp, TIME_DISPLAY()),
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
        timeLabel: useDate ? format(r.timestamp, DATETIME_DISPLAY()) : format(r.timestamp, TIME_DISPLAY()),
        description: pumpDescription(r),
        record: r,
      });
    }
  });

  const pushHealth = (entry: TemperatureEntry | SymptomEntry | MedicationEntry) => {
    const ts = new Date(entry.timestamp).getTime();
    if (ts >= dayStartMs && ts <= end) {
      events.push({
        id: entry.id,
        kind: "health",
        forDatetime: ts,
        timeLabel: useDate ? format(ts, DATETIME_DISPLAY()) : format(ts, TIME_DISPLAY()),
        description: healthDescription(entry),
        record: entry,
      });
    }
  };
  (options.temperatureHistory ?? []).forEach(pushHealth);
  (options.symptomHistory ?? []).forEach(pushHealth);
  (options.medicationHistory ?? []).forEach(pushHealth);

  const trackers = options.customTrackers ?? [];
  const trackerMap = new Map(trackers.map((t) => [t.id, t]));
  (options.customTrackerLogs ?? []).forEach((r) => {
    if (r.timestamp >= dayStartMs && r.timestamp <= end) {
      const tracker = trackerMap.get(r.trackerId);
      const name = tracker?.name ?? "Custom";
      const valuePart = r.value != null ? ` ${r.value}${tracker?.unit ?? ""}` : "";
      const notePart = r.note ? ` — ${r.note}` : "";
      events.push({
        id: r.id,
        kind: "custom",
        forDatetime: r.timestamp,
        timeLabel: useDate ? format(r.timestamp, DATETIME_DISPLAY()) : format(r.timestamp, TIME_DISPLAY()),
        description: `${getIconLabel(tracker?.icon ?? "star")} ${name}${valuePart}${notePart}`.trim(),
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
    case "health": return "#e87474";
    case "custom": return "var(--purp)";
    default: return "var(--bd)";
  }
}
