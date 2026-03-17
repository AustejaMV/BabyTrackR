/**
 * Medication reminder config — Huckleberry-style: mode, interval, daytime, repeat days, notifications.
 */
import { useState, useEffect } from "react";
import {
  getMedicationReminderConfig,
  saveMedicationReminderConfig,
  type MedicationReminderConfig,
  type ReminderMode,
} from "../data/medicationReminderStorage";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const INTERVAL_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12];

export interface MedicationReminderModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function MedicationReminderModal({ open, onClose, onSaved }: MedicationReminderModalProps) {
  const [config, setConfig] = useState<MedicationReminderConfig>(() => getMedicationReminderConfig());
  const [showDayNight, setShowDayNight] = useState(false);

  useEffect(() => {
    if (open) setConfig(getMedicationReminderConfig());
  }, [open]);

  const update = (patch: Partial<MedicationReminderConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
  };

  const toggleDay = (day: number) => {
    setConfig((c) => ({
      ...c,
      repeatDays: c.repeatDays.includes(day) ? c.repeatDays.filter((d) => d !== day) : [...c.repeatDays, day].sort((a, b) => a - b),
    }));
  };

  const handleSave = () => {
    saveMedicationReminderConfig(config);
    onSaved?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]"
      role="dialog"
      aria-labelledby="med-reminder-title"
      aria-modal="true"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--bd)" }}>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: "var(--mu)" }}
          aria-label="Close"
        >
          <span className="text-xl font-semibold">×</span>
        </button>
        <h1 id="med-reminder-title" className="text-[17px] font-semibold" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          Medication reminder
        </h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Mode */}
        <div>
          <p className="text-[12px] font-medium mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Mode</p>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--bd)", background: "var(--bg2)" }}>
            <button
              type="button"
              onClick={() => update({ mode: "remind_at" })}
              className="flex-1 py-2.5 text-[14px]"
              style={{
                background: config.mode === "remind_at" ? "var(--blue)" : "transparent",
                color: config.mode === "remind_at" ? "#fff" : "var(--tx)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Remind at
            </button>
            <button
              type="button"
              onClick={() => update({ mode: "remind_in" })}
              className="flex-1 py-2.5 text-[14px]"
              style={{
                background: config.mode === "remind_in" ? "var(--blue)" : "transparent",
                color: config.mode === "remind_in" ? "#fff" : "var(--tx)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Remind in
            </button>
          </div>
        </div>

        {/* Enabled */}
        <div className="flex items-center justify-between">
          <span className="text-[15px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Enabled</span>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => update({ enabled: !config.enabled })}
            className="w-12 h-7 rounded-full border-2 transition-colors shrink-0"
            style={{
              borderColor: config.enabled ? "var(--grn)" : "var(--bd)",
              background: config.enabled ? "var(--grn)" : "var(--bg2)",
            }}
          >
            <span
              className="block w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: config.enabled ? "translateX(22px)" : "translateX(2px)", marginTop: 2 }}
            />
          </button>
        </div>

        {/* Time between (for Remind in) */}
        {config.mode === "remind_in" && (
          <div>
            <p className="text-[12px] font-medium mb-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Time between</p>
            <p className="text-[11px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>After start of last medication</p>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => update({ intervalHours: h })}
                  className="rounded-full px-3 py-2 text-[14px] border min-h-[44px]"
                  style={{
                    borderColor: config.intervalHours === h ? "var(--blue)" : "var(--bd)",
                    background: config.intervalHours === h ? "color-mix(in srgb, var(--blue) 18%, transparent)" : "var(--card)",
                    color: "var(--tx)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Remind at time */}
        {config.mode === "remind_at" && (
          <div>
            <p className="text-[12px] font-medium mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Remind at</p>
            <input
              type="time"
              value={config.remindAtTime}
              onChange={(e) => update({ remindAtTime: e.target.value })}
              className="rounded-xl border px-3 py-2.5 text-[15px] w-full max-w-[140px]"
              style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
            />
          </div>
        )}

        {/* Daytime only */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[15px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Daytime only</span>
            <button
              type="button"
              role="switch"
              aria-checked={config.daytimeOnly}
              onClick={() => update({ daytimeOnly: !config.daytimeOnly })}
              className="w-12 h-7 rounded-full border-2 transition-colors shrink-0"
              style={{
                borderColor: config.daytimeOnly ? "var(--blue)" : "var(--bd)",
                background: config.daytimeOnly ? "var(--blue)" : "var(--bg2)",
              }}
            >
              <span
                className="block w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: config.daytimeOnly ? "translateX(22px)" : "translateX(2px)", marginTop: 2 }}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowDayNight(!showDayNight)}
            className="text-[13px]"
            style={{ color: "var(--blue)" }}
          >
            View day and night settings
          </button>
          {showDayNight && (
            <div className="mt-3 flex gap-4">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "var(--mu)" }}>Day start</label>
                <input
                  type="time"
                  value={config.dayStart}
                  onChange={(e) => update({ dayStart: e.target.value })}
                  className="rounded-lg border px-2 py-1.5 text-[14px]"
                  style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: "var(--mu)" }}>Day end</label>
                <input
                  type="time"
                  value={config.dayEnd}
                  onChange={(e) => update({ dayEnd: e.target.value })}
                  className="rounded-lg border px-2 py-1.5 text-[14px]"
                  style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Repeat on specific days */}
        <div>
          <p className="text-[12px] font-medium mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Repeat on specific days</p>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className="w-10 h-10 rounded-full text-[13px] font-medium border shrink-0"
                style={{
                  borderColor: config.repeatDays.includes(i) ? "var(--blue)" : "var(--bd)",
                  background: config.repeatDays.includes(i) ? "color-mix(in srgb, var(--blue) 22%, transparent)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound / Vibration */}
        <div className="flex items-center justify-between">
          <span className="text-[15px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Sound / Vibration</span>
          <button
            type="button"
            role="switch"
            aria-checked={config.soundVibration}
            onClick={() => update({ soundVibration: !config.soundVibration })}
            className="w-12 h-7 rounded-full border-2 transition-colors shrink-0"
            style={{
              borderColor: config.soundVibration ? "var(--blue)" : "var(--bd)",
              background: config.soundVibration ? "var(--blue)" : "var(--bg2)",
            }}
          >
            <span
              className="block w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: config.soundVibration ? "translateX(22px)" : "translateX(2px)", marginTop: 2 }}
            />
          </button>
        </div>
      </div>

      <div className="p-4 border-t shrink-0" style={{ borderColor: "var(--bd)" }}>
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl text-[16px] font-medium text-white border-none"
          style={{ background: "var(--grn)", fontFamily: "system-ui, sans-serif" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
