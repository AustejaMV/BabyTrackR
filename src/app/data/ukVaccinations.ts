/**
 * UK standard childhood vaccination schedule (simplified).
 * Age: when due (weeks from birth for first ones, then months/years).
 */
export interface VaccinationVisit {
  id: string;
  ageLabel: string; // "8 weeks", "12 weeks", "1 year"
  ageWeeks: number; // approximate for "due within 14 days" check
  vaccines: string[];
}

export const UK_VACCINATION_SCHEDULE: VaccinationVisit[] = [
  { id: "8w", ageLabel: "8 weeks", ageWeeks: 8, vaccines: ["6-in-1 (1st dose)", "Rotavirus (1st dose)", "MenB (1st dose)"] },
  { id: "12w", ageLabel: "12 weeks", ageWeeks: 12, vaccines: ["6-in-1 (2nd dose)", "Rotavirus (2nd dose)", "PCV (1st dose)"] },
  { id: "16w", ageLabel: "16 weeks", ageWeeks: 16, vaccines: ["6-in-1 (3rd dose)", "MenB (2nd dose)", "PCV (2nd dose)"] },
  { id: "1y", ageLabel: "1 year", ageWeeks: 52, vaccines: ["Hib/MenC", "MMR (1st dose)", "PCV (booster)", "MenB (3rd dose)"] },
  { id: "2y", ageLabel: "2–3 years", ageWeeks: 104, vaccines: ["Flu (annual)"] },
  { id: "3y4m", ageLabel: "3 years 4 months", ageWeeks: 173, vaccines: ["Flu (annual)", "MMR (2nd dose)", "4-in-1 pre-school"] },
  { id: "12y", ageLabel: "12–13 years", ageWeeks: 624, vaccines: ["HPV", "Td/IPV (3-in-1 teenage booster)"] },
  { id: "14y", ageLabel: "14 years", ageWeeks: 728, vaccines: ["MenACWY"] },
];

export interface VaccinationLogEntry {
  visitId: string;
  dateGiven: string; // dd/mm/yyyy
}

const VACC_LOG_KEY = "babytrackr-vaccinationLog";
const APPT_KEY = "babytrackr-appointments";

export function getVaccinationLog(): VaccinationLogEntry[] {
  try {
    const raw = localStorage.getItem(VACC_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVaccinationLog(log: VaccinationLogEntry[]) {
  try {
    localStorage.setItem(VACC_LOG_KEY, JSON.stringify(log));
  } catch {}
}

export interface Appointment {
  id: string;
  date: string; // dd/mm/yyyy
  time: string;
  type: "GP" | "Health visitor" | "Hospital";
  notes: string;
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

/** Is a vaccination due within the next 14 days for this baby (by age in weeks)? */
export function isVaccinationDueWithin14Days(ageWeeks: number): boolean {
  const log = getVaccinationLog();
  return UK_VACCINATION_SCHEDULE.some(
    (v) => v.ageWeeks >= ageWeeks && v.ageWeeks <= ageWeeks + 2 && !log.some((e) => e.visitId === v.id)
  );
}
