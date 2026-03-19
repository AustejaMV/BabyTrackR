/**
 * Appointments only (no vaccinations). Dates stored as dd/mm/yyyy.
 */
const APPT_KEY = "babytrackr-appointments";

export interface Appointment {
  id: string;
  name: string;
  date: string; // dd/mm/yyyy
  time: string;
  type: "GP" | "Health visitor" | "Hospital" | "Other";
  notes: string;
  questions: string;
}

export function getAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(APPT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAppointments(list: Appointment[]) {
  try {
    localStorage.setItem(APPT_KEY, JSON.stringify(list));
  } catch {}
}

export function toDateStr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseDateStr(s: string): Date | null {
  const parts = s.trim().split("/").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}
