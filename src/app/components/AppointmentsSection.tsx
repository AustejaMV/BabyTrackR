import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, addMonths, subMonths } from "date-fns";
import { getAppointments, saveAppointments, toDateStr, parseDateStr, type Appointment } from "../data/appointmentsStorage";
import { getMedicationReminderConfig } from "../data/medicationReminderStorage";
import { MedicationReminderModal } from "./MedicationReminderModal";
import { scheduleNextMedicationReminder } from "../utils/medicationReminderScheduler";

export function AppointmentsSection() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [pickDate, setPickDate] = useState<Date | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newType, setNewType] = useState<Appointment["type"]>("GP");
  const [newNotes, setNewNotes] = useState("");
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderConfig, setReminderConfig] = useState(() => getMedicationReminderConfig());

  useEffect(() => {
    setAppointments(getAppointments());
  }, []);

  useEffect(() => {
    setReminderConfig(getMedicationReminderConfig());
  }, [reminderModalOpen]);

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

  const addAppointment = () => {
    const d = pickDate || (newDate.trim() ? (() => {
      const [y, m, day] = newDate.trim().split("-").map(Number);
      if ([y, m, day].some(isNaN)) return null;
      return new Date(y, m - 1, day);
    })() : null);
    if (!d) return;
    const appt: Appointment = {
      id: Date.now().toString(),
      date: toDateStr(d),
      time: newTime.trim() || "09:00",
      type: newType,
      notes: newNotes.trim(),
    };
    const next = [...appointments, appt];
    setAppointments(next);
    saveAppointments(next);
    setShowAdd(false);
    setNewDate("");
    setNewTime("");
    setNewNotes("");
  };

  const removeAppointment = (id: string) => {
    const next = appointments.filter((a) => a.id !== id);
    setAppointments(next);
    saveAppointments(next);
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const nextKey = format(day, "yyyy-MM-dd");
    const isDeselect = pickDate && format(pickDate, "yyyy-MM-dd") === nextKey;
    if (isDeselect) {
      setPickDate(null);
      setShowAdd(false);
      return;
    }
    setPickDate(day);
    setNewDate(format(day, "yyyy-MM-dd"));
    setShowAdd(true);
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
            }}
            modifiersClassNames={{
              hasAppt: "rdp-has-appt",
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
            {format(pickDate, "dd/MM/yyyy")}
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
                    <div>
                      <span style={{ color: "var(--tx)" }}>{a.time} · {a.type}</span>
                      {a.notes && (
                        <p className="mt-1.5 text-[10px]" style={{ color: "var(--mu)" }}>
                          <span className="font-medium">Questions to ask:</span> {a.notes}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => removeAppointment(a.id)} className="text-red-500 text-[10px] shrink-0">Remove</button>
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

      {!showAdd ? (
        <button type="button" onClick={() => { setShowAdd(true); setPickDate(null); const t = new Date(); setNewDate(format(t, "yyyy-MM-dd")); setNewTime(format(t, "HH:mm")); }} className="text-[11px] py-1.5 px-2 rounded-lg border" style={{ borderColor: "var(--bd)", color: "var(--pink)" }}>+ New appointment</button>
      ) : (
        <div className="space-y-2 p-2 rounded-lg border mb-2" style={{ borderColor: "var(--bd)", background: "var(--bg2)" }}>
          <label className="block text-[10px]" style={{ color: "var(--mu)" }}>Date</label>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full rounded px-2 py-1.5 text-[11px] min-h-[36px]" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
          <label className="block text-[10px]" style={{ color: "var(--mu)" }}>Time</label>
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full rounded px-2 py-1.5 text-[11px] min-h-[36px]" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
          <select value={newType} onChange={(e) => setNewType(e.target.value as Appointment["type"])} className="w-full rounded px-2 py-1.5 text-[11px]" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--tx)" }}>
            <option value="GP">GP</option>
            <option value="Health visitor">Health visitor</option>
            <option value="Hospital">Hospital</option>
          </select>
          <input type="text" placeholder="Questions to ask" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full rounded px-2 py-1.5 text-[11px]" style={{ border: "1px solid var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowAdd(false); setPickDate(null); }} className="flex-1 py-1.5 text-[11px] rounded border" style={{ borderColor: "var(--bd)", color: "var(--mu)" }}>Cancel</button>
            <button type="button" onClick={addAppointment} className="flex-1 py-1.5 text-[11px] rounded text-white" style={{ background: "var(--pink)" }}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
