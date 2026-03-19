import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, addMonths, subMonths } from "date-fns";
import { DATE_DISPLAY } from "../utils/dateUtils";
import { getAppointments, saveAppointments, toDateStr, parseDateStr, type Appointment } from "../data/appointmentsStorage";
import { getMedicationReminderConfig } from "../data/medicationReminderStorage";
import { MedicationReminderModal } from "./MedicationReminderModal";
import { AppointmentSheet } from "./AppointmentSheet";
import { scheduleNextMedicationReminder } from "../utils/medicationReminderScheduler";
import { exportAppointmentsToIcs, exportSingleAppointmentToIcs } from "../utils/icsExport";

export function AppointmentsSection() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [pickDate, setPickDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>(undefined);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderConfig, setReminderConfig] = useState(() => getMedicationReminderConfig());

  useEffect(() => {
    setAppointments(getAppointments());
  }, []);

  useEffect(() => {
    setReminderConfig(getMedicationReminderConfig());
  }, [reminderModalOpen]);

  const reload = () => setAppointments(getAppointments());

  const now = Date.now();
  const past = appointments
    .filter((a) => {
      const d = parseDateStr(a.date);
      return d && d.getTime() < now;
    })
    .sort((a, b) => (parseDateStr(b.date)?.getTime() ?? 0) - (parseDateStr(a.date)?.getTime() ?? 0));

  const datesWithAppts = new Set(appointments.map((a) => {
    const d = parseDateStr(a.date);
    return d ? format(d, "yyyy-MM-dd") : "";
  }).filter(Boolean));

  const datesWithReminder = new Set<string>();
  if (reminderConfig.enabled && reminderConfig.repeatDays.length > 0) {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (reminderConfig.repeatDays.includes(d.getDay())) datesWithReminder.add(format(d, "yyyy-MM-dd"));
    }
  }

  const openNewSheet = () => {
    setEditingAppt(undefined);
    setSheetOpen(true);
  };

  const openEditSheet = (appt: Appointment) => {
    setEditingAppt(appt);
    setSheetOpen(true);
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const nextKey = format(day, "yyyy-MM-dd");
    const isDeselect = pickDate && format(pickDate, "yyyy-MM-dd") === nextKey;
    if (isDeselect) {
      setPickDate(null);
      return;
    }
    setPickDate(day);
  };

  const selectedDayKey = pickDate ? format(pickDate, "yyyy-MM-dd") : null;
  const appointmentsOnSelectedDay = selectedDayKey
    ? appointments.filter((a) => {
        const d = parseDateStr(a.date);
        return d && format(d, "yyyy-MM-dd") === selectedDayKey;
      }).sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    : [];

  return (
    <div className="rounded-[18px] border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          APPOINTMENTS
        </p>
        <button
          type="button"
          onClick={() => setReminderModalOpen(true)}
          className="text-[12px] py-1.5 px-2 rounded-lg border"
          style={{ borderColor: "var(--bd)", color: "var(--grn)", fontFamily: "system-ui, sans-serif" }}
        >
          Medication reminder
        </button>
      </div>

      <MedicationReminderModal
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        onSaved={() => { setReminderConfig(getMedicationReminderConfig()); scheduleNextMedicationReminder(); }}
      />

      <div className="w-full mb-4 rounded-xl overflow-hidden border" style={{ borderColor: "var(--bd)", background: "var(--bg2)" }}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--bd)" }}>
          <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1 rounded text-[var(--tx)]" aria-label="Previous month">‹</button>
          <span className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{format(month, "MMMM yyyy")}</span>
          <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1 rounded text-[var(--tx)]" aria-label="Next month">›</button>
        </div>
        <div className="w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-month_grid]:w-full [&_.rdp-weeknumbers]:hidden">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={pickDate ?? undefined}
            onSelect={handleDaySelect}
            showOutsideDays
            className="rdp-appointments w-full p-2"
            style={{ color: "var(--tx)" }}
            modifiers={{
              hasAppt: (d) => datesWithAppts.has(format(d, "yyyy-MM-dd")),
              hasReminder: (d) => datesWithReminder.has(format(d, "yyyy-MM-dd")),
            }}
            modifiersClassNames={{
              hasAppt: "rdp-has-appt",
              hasReminder: "rdp-has-reminder",
            }}
          />
        </div>
      </div>
      <style>{`
        .rdp-appointments { --rdp-cell-size: min(36px, 10vw); width: 100%; }
        .rdp-appointments .rdp-month { width: 100%; }
        .rdp-appointments .rdp-month_grid { width: 100%; }
        .rdp-appointments table { width: 100%; table-layout: fixed; border-collapse: collapse; }
        .rdp-appointments .rdp-head_cell,
        .rdp-appointments .rdp-cell { width: 14.28%; padding: 0; text-align: center; vertical-align: middle; }
        .rdp-appointments .rdp-head_cell { color: var(--mu); font-size: 9px; font-weight: 700; text-transform: uppercase; height: var(--rdp-cell-size); }
        .rdp-appointments .rdp-cell { height: var(--rdp-cell-size); }
        .rdp-appointments .rdp-day {
          display: flex; align-items: center; justify-content: center;
          box-sizing: border-box; width: 100%; max-width: var(--rdp-cell-size); height: var(--rdp-cell-size);
          margin: 0 auto; color: var(--tx); font-size: 11px; border-radius: 8px; border: 2px solid transparent;
        }
        .rdp-appointments .rdp-day:hover { background: var(--bg2); }
        .rdp-appointments .rdp-day[aria-selected="true"] { background: var(--pink); color: var(--bg); }
        .rdp-appointments .rdp-day.rdp-has-appt:not([aria-selected="true"]) {
          background: rgba(232, 116, 138, 0.2); color: var(--pink); font-weight: 600;
          box-shadow: 0 0 0 1px rgba(232, 116, 138, 0.4);
        }
        .rdp-appointments .rdp-day.rdp-has-appt:not([aria-selected="true"])::after {
          content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%; background: var(--pink);
        }
        .rdp-appointments .rdp-day.rdp-has-reminder:not([aria-selected="true"])::before {
          content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px; border-radius: 50%; background: var(--grn);
        }
        .rdp-appointments .rdp-day.rdp-has-appt.rdp-has-reminder::before { left: 30%; transform: translateX(-50%); }
        .rdp-appointments .rdp-day.rdp-has-appt.rdp-has-reminder::after { left: 70%; transform: translateX(-50%); }
        .rdp-appointments .rdp-day { position: relative; }
        .rdp-appointments .rdp-caption { display: none; }
      `}</style>

      {pickDate && (
        <div className="mb-3">
          <p className="text-[11px] font-medium mb-2" style={{ color: "var(--tx)" }}>
            {format(pickDate, DATE_DISPLAY())}
          </p>
          {reminderConfig.enabled && reminderConfig.repeatDays.includes(pickDate.getDay()) && (
            <div className="p-2.5 rounded-lg border mb-2" style={{ borderColor: "var(--grn)", background: "color-mix(in srgb, var(--grn) 12%, transparent)" }}>
              <p className="text-[11px] font-medium" style={{ color: "var(--tx)" }}>Medication reminder</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--mu)" }}>
                {reminderConfig.mode === "remind_at"
                  ? `Remind at ${reminderConfig.remindAtTime}`
                  : `Every ${reminderConfig.intervalHours}h after last dose`}
              </p>
            </div>
          )}
          <div className="space-y-2 mb-2">
            {appointmentsOnSelectedDay.length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--mu)" }}>No appointments this day.</p>
            ) : (
              appointmentsOnSelectedDay.map((a) => (
                <div key={a.id} className="p-2.5 rounded-lg border text-[11px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)" }}>
                  <div className="flex justify-between items-start gap-2">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span className="font-medium" style={{ color: "var(--tx)" }}>{a.name || a.type}</span>
                      <span style={{ color: "var(--mu)" }}> · {a.time || "No time"} · {a.type}</span>
                      {a.notes && (
                        <p className="mt-1 text-[10px]" style={{ color: "var(--mu)" }}>{a.notes}</p>
                      )}
                      {a.questions && (
                        <p className="mt-1 text-[10px]" style={{ color: "var(--mu)" }}>
                          <span className="font-medium">Questions:</span> {a.questions}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => exportSingleAppointmentToIcs(a)} className="text-[10px] p-1" style={{ color: "var(--mu)" }} aria-label="Export to calendar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></button>
                      <button type="button" onClick={() => openEditSheet(a)} className="text-[10px]" style={{ color: "var(--pink)" }}>Edit</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <details className="mb-3">
          <summary className="text-[10px] cursor-pointer" style={{ color: "var(--mu)" }}>Past appointments</summary>
          <div className="mt-1 space-y-1">
            {past.map((a) => (
              <div key={a.id} className="p-1.5 rounded text-[10px]" style={{ color: "var(--mu)" }}>{a.date} {a.time} · {a.type}</div>
            ))}
          </div>
        </details>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={openNewSheet} className="text-[11px] py-1.5 px-2 rounded-lg border" style={{ borderColor: "var(--bd)", color: "var(--pink)" }}>+ New appointment</button>
        {appointments.length > 0 && (
          <button
            type="button"
            onClick={() => exportAppointmentsToIcs(appointments)}
            className="text-[11px] py-1.5 px-2 rounded-lg border"
            style={{ borderColor: "var(--bd)", color: "var(--mu)" }}
          >
            Export to calendar
          </button>
        )}
      </div>

      <AppointmentSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingAppt(undefined); }}
        appointment={editingAppt}
        onSaved={reload}
      />
    </div>
  );
}
