import { parseDateStr, type Appointment } from "../data/appointmentsStorage";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIcsDate(d: Date, time?: string): string {
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    return `${yyyy}${MM}${dd}T${pad2(hh || 0)}${pad2(mm || 0)}00`;
  }
  return `${yyyy}${MM}${dd}`;
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function uid(appt: Appointment): string {
  return `${appt.id}@cradl-baby`;
}

function appointmentToVEvent(appt: Appointment): string | null {
  const d = parseDateStr(appt.date);
  if (!d) return null;

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid(appt)}`,
    `DTSTAMP:${toIcsDate(new Date(), "00:00")}Z`,
  ];

  if (appt.time) {
    lines.push(`DTSTART:${toIcsDate(d, appt.time)}`);
    const end = new Date(d);
    const [hh, mm] = appt.time.split(":").map(Number);
    end.setHours((hh || 0) + 1, mm || 0);
    lines.push(`DTEND:${toIcsDate(end, `${pad2(end.getHours())}:${pad2(end.getMinutes())}`)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(d)}`);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(next)}`);
  }

  lines.push(`SUMMARY:${escapeIcs(appt.name || appt.type)}`);

  const descParts: string[] = [];
  if (appt.type) descParts.push(`Type: ${appt.type}`);
  if (appt.notes) descParts.push(`Notes: ${appt.notes}`);
  if (appt.questions) descParts.push(`Questions to ask: ${appt.questions}`);
  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcs(descParts.join("\n"))}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function exportAppointmentsToIcs(appointments: Appointment[]): void {
  const events = appointments.map(appointmentToVEvent).filter(Boolean);
  if (events.length === 0) return;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cradl Baby Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Baby Appointments",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "baby-appointments.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSingleAppointmentToIcs(appt: Appointment): void {
  const event = appointmentToVEvent(appt);
  if (!event) return;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cradl Baby Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    event,
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(appt.name || appt.type).replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
