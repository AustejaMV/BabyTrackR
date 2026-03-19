import { useState, useEffect } from "react";
import { format, addYears, isBefore, startOfDay } from "date-fns";
import { getAppointments, saveAppointments, toDateStr, parseDateStr, type Appointment } from "../data/appointmentsStorage";
import { useAuth } from "../contexts/AuthContext";
import { saveData } from "../utils/dataSync";

const TYPES: Appointment["type"][] = ["GP", "Health visitor", "Hospital", "Other"];
const GP_QUESTIONS_KEY = "cradl-gp-questions";

export interface AppointmentSheetProps {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment;
  onSaved: () => void;
}

export function AppointmentSheet({ open, onClose, appointment, onSaved }: AppointmentSheetProps) {
  const isEdit = !!appointment;
  const { session } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState<Appointment["type"]>("GP");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [notes, setNotes] = useState("");
  const [questions, setQuestions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setName(appointment.name || "");
      setType(appointment.type);
      const parsed = parseDateStr(appointment.date);
      setDateStr(parsed ? format(parsed, "yyyy-MM-dd") : "");
      setTimeStr(appointment.time || "");
      setNotes(appointment.notes || "");
      setQuestions(appointment.questions || "");
    } else {
      setName("");
      setType("GP");
      setDateStr(format(new Date(), "yyyy-MM-dd"));
      setTimeStr("");
      setNotes("");
      const savedQuestions = localStorage.getItem(GP_QUESTIONS_KEY) ?? "";
      setQuestions(savedQuestions);
    }
    setErrors({});
    setShowDeleteConfirm(false);
    setDateWarning(null);
  }, [open, appointment]);

  useEffect(() => {
    if (!dateStr) { setDateWarning(null); return; }
    const [y, m, d] = dateStr.split("-").map(Number);
    if ([y, m, d].some(isNaN)) { setDateWarning(null); return; }
    const date = new Date(y, m - 1, d);
    const today = startOfDay(new Date());
    if (isBefore(date, today)) {
      setDateWarning("This date is in the past");
    } else if (isBefore(addYears(new Date(), 2), date)) {
      setDateWarning("This date is more than 2 years away");
    } else {
      setDateWarning(null);
    }
  }, [dateStr]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!dateStr.trim()) errs.date = "Date is required";
    else {
      const [y, m, d] = dateStr.split("-").map(Number);
      if ([y, m, d].some(isNaN)) errs.date = "Invalid date";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const all = getAppointments();

    const appt: Appointment = {
      id: appointment?.id ?? Date.now().toString(),
      name: name.trim().slice(0, 80),
      date: toDateStr(dateObj),
      time: timeStr.trim(),
      type,
      notes: notes.trim().slice(0, 500),
      questions: questions.trim().slice(0, 1000),
    };

    const next = isEdit ? all.map((a) => (a.id === appt.id ? appt : a)) : [...all, appt];
    saveAppointments(next);
    if (session?.access_token) saveData("babytrackr-appointments", next, session.access_token);
    onSaved();
    onClose();
  };

  const handleDelete = () => {
    if (!appointment) return;
    const all = getAppointments().filter((a) => a.id !== appointment.id);
    saveAppointments(all);
    if (session?.access_token) saveData("babytrackr-appointments", all, session.access_token);
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 512, maxHeight: "90vh", background: "var(--card)", borderRadius: "18px 18px 0 0", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontFamily: "Georgia, serif", fontWeight: 600, color: "var(--tx)", margin: 0 }}>
              {isEdit ? "Edit appointment" : "Add appointment"}
            </h2>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--mu)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>

        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="e.g. 6-week check"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: errors.name ? "1px solid var(--destructive)" : "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontSize: 14, fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
            />
            {errors.name && <p style={{ fontSize: 11, color: "var(--destructive)", marginTop: 2 }}>{errors.name}</p>}
            <p style={{ fontSize: 10, color: "var(--mu)", marginTop: 2, textAlign: "right" }}>{name.length}/80</p>
          </div>

          {/* Type pills */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 6, fontFamily: "system-ui, sans-serif" }}>Type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    border: type === t ? "none" : "1px solid var(--bd)",
                    background: type === t ? "var(--coral)" : "var(--card)",
                    color: type === t ? "#fff" : "var(--tx)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Date *</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: errors.date ? "1px solid var(--destructive)" : "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontSize: 14, fontFamily: "system-ui, sans-serif", boxSizing: "border-box", minHeight: 40 }}
            />
            {errors.date && <p style={{ fontSize: 11, color: "var(--destructive)", marginTop: 2 }}>{errors.date}</p>}
            {dateWarning && <p style={{ fontSize: 11, color: "var(--notice-amber)", marginTop: 2 }}>{dateWarning}</p>}
          </div>

          {/* Time (optional) */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Time <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontSize: 14, fontFamily: "system-ui, sans-serif", boxSizing: "border-box", minHeight: 40 }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Any notes for this appointment…"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontSize: 14, fontFamily: "system-ui, sans-serif", resize: "vertical", boxSizing: "border-box" }}
            />
            <p style={{ fontSize: 10, color: "var(--mu)", marginTop: 2, textAlign: "right" }}>{notes.length}/500</p>
          </div>

          {/* Questions */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--mu)", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Questions to ask</label>
            <textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value.slice(0, 1000))}
              placeholder="What I want to ask the GP / health visitor…"
              rows={4}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)", fontSize: 14, fontFamily: "system-ui, sans-serif", resize: "vertical", boxSizing: "border-box" }}
            />
            <p style={{ fontSize: 10, color: "var(--mu)", marginTop: 2, textAlign: "right" }}>{questions.length}/1000</p>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: "var(--pink)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            {isEdit ? "Save changes" : "Add appointment"}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            style={{ width: "100%", padding: "10px 0", background: "none", border: "none", color: "var(--mu)", fontSize: 13, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            Cancel
          </button>

          {/* Delete */}
          {isEdit && (
            <div style={{ borderTop: "1px solid var(--bd)", paddingTop: 14, marginTop: 4 }}>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ background: "none", border: "none", color: "var(--destructive)", fontSize: 13, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
                >
                  Delete this appointment
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--destructive)", fontFamily: "system-ui, sans-serif" }}>Delete permanently?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{ padding: "6px 14px", borderRadius: 8, background: "var(--destructive)", color: "#fff", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ background: "none", border: "none", color: "var(--mu)", fontSize: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
