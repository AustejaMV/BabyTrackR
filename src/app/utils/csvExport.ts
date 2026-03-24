/**
 * CSV export — RFC 4180 (quote/escape). CSV injection guard: prefix =+-@ with '.
 */

export interface CSVExportItem {
  filename: string;
  content: string;
}

/** Escape a cell for CSV: wrap in quotes if contains comma, newline, or quote; double quotes inside. */
function escapeCell(value: string): string {
  const s = String(value ?? "");
  // CSV injection: if starts with =, +, -, @, prepend single quote so spreadsheet doesn't interpret
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/** Format date for CSV (ISO date or UTC datetime — stable across timezones). */
export function formatDateForCSV(ms: number, mode: "date" | "datetime" = "datetime"): string {
  const d = new Date(ms);
  if (mode === "date") return d.toISOString().slice(0, 10);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Format duration (ms) as hours and minutes for CSV. */
export function formatDurationForCSV(ms: number): string {
  if (ms <= 0 || !Number.isFinite(ms)) return "0m";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Build one CSV string from headers and rows. */
export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCell).join(",");
  const bodyLines = rows.map((row) => row.map(escapeCell).join(","));
  return [headerLine, ...bodyLines].join("\r\n");
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Generate all CSV files from current localStorage data. */
export function generateAllCSVs(babyName?: string | null): CSVExportItem[] {
  const name = babyName ?? "baby";
  const out: CSVExportItem[] = [];

  const feeds = loadJson<Array<{ id?: string; timestamp?: number; endTime?: number; type?: string; amount?: number; durationMs?: number; segments?: Array<{ type?: string; durationMs?: number; amount?: number }> }>>("feedingHistory", []);
  if (feeds.length > 0) {
    const rows = feeds.map((f) => {
      const t = f.endTime ?? f.timestamp ?? 0;
      const dur = f.durationMs ?? (f.segments?.reduce((s, seg) => s + (seg.durationMs ?? 0), 0) ?? 0);
      const amt = f.amount ?? f.segments?.reduce((s, seg) => s + (seg.amount ?? 0), 0) ?? "";
      return [formatDateForCSV(t), f.type ?? "", String(dur), String(amt)];
    });
    out.push({
      filename: `feeds-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Date", "Type", "Duration (ms)", "Amount"], rows),
    });
  }

  const sleep = loadJson<Array<{ id?: string; startTime?: number; endTime?: number; position?: string }>>("sleepHistory", []);
  if (sleep.length > 0) {
    const rows = sleep.map((s) => [
      formatDateForCSV(s.startTime ?? 0, "datetime"),
      s.endTime ? formatDateForCSV(s.endTime, "datetime") : "",
      s.endTime && s.startTime ? formatDurationForCSV(s.endTime - s.startTime) : "",
      s.position ?? "",
    ]);
    out.push({
      filename: `sleep-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Start", "End", "Duration", "Position"], rows),
    });
  }

  const diapers = loadJson<Array<{ id?: string; timestamp?: number; type?: string; notes?: string }>>("diaperHistory", []);
  if (diapers.length > 0) {
    const rows = diapers.map((d) => [formatDateForCSV(d.timestamp ?? 0), d.type ?? "", d.notes ?? ""]);
    out.push({
      filename: `diapers-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Date", "Type", "Notes"], rows),
    });
  }

  const tummy = loadJson<Array<{ id?: string; startTime?: number; endTime?: number; excludedMs?: number }>>("tummyTimeHistory", []);
  if (tummy.length > 0) {
    const rows = tummy.map((t) => {
      const start = t.startTime ?? 0;
      const end = t.endTime ?? 0;
      const dur = end ? Math.max(0, end - start - (t.excludedMs ?? 0)) : 0;
      return [formatDateForCSV(start, "datetime"), end ? formatDateForCSV(end, "datetime") : "", formatDurationForCSV(dur)];
    });
    out.push({
      filename: `tummy-time-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Start", "End", "Duration"], rows),
    });
  }

  const growth = loadJson<Array<{ id?: string; date?: number; weightKg?: number; heightCm?: number; headCircumferenceCm?: number }>>("growthMeasurements", []);
  if (growth.length > 0) {
    const rows = growth.map((g) => [
      formatDateForCSV(g.date ?? 0, "date"),
      g.weightKg != null ? String(g.weightKg) : "",
      g.heightCm != null ? String(g.heightCm) : "",
      g.headCircumferenceCm != null ? String(g.headCircumferenceCm) : "",
    ]);
    out.push({
      filename: `growth-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Date", "Weight (kg)", "Height (cm)", "Head (cm)"], rows),
    });
  }

  const temps = loadJson<Array<{ id?: string; timestamp?: string; tempC?: number; method?: string; note?: string | null }>>("temperatureHistory", []);
  if (temps.length > 0) {
    const rows = temps.map((t) => [
      t.timestamp ?? "",
      t.tempC != null ? String(t.tempC) : "",
      t.method ?? "",
      t.note ?? "",
    ]);
    out.push({
      filename: `temperature-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Timestamp", "Temp (°C)", "Method", "Note"], rows),
    });
  }

  const solids = loadJson<Array<{ id?: string; timestamp?: string; food?: string; isFirstTime?: boolean; reaction?: string }>>("solidFoodHistory", []);
  if (solids.length > 0) {
    const rows = solids.map((s) => [
      s.timestamp ?? "",
      s.food ?? "",
      s.isFirstTime ? "Yes" : "No",
      s.reaction ?? "",
    ]);
    out.push({
      filename: `solids-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Timestamp", "Food", "First time", "Reaction"], rows),
    });
  }

  const mumSleep = loadJson<Array<{ id?: string; date?: string; sleepRange?: string; loggedAt?: string }>>("mumSleepHistory", []);
  if (mumSleep.length > 0) {
    const rows = mumSleep.map((m) => [m.date ?? "", m.sleepRange ?? "", m.loggedAt ?? ""]);
    out.push({
      filename: `mum-sleep-${name.replace(/\s+/g, "-")}.csv`,
      content: generateCSV(["Date", "Sleep range", "Logged at"], rows),
    });
  }

  return out;
}

/** Download a blob as file (web). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
