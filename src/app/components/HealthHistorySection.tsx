/**
 * Health log summary: last 7 days temperature sparkline, symptom badges, medication list.
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { getTemperatureHistory, getSymptomHistory, getMedicationHistory } from "../utils/healthStorage";
import type { TemperatureEntry, SymptomEntry, MedicationEntry } from "../types/health";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function HealthHistorySection() {
  const temps = useMemo(() => getTemperatureHistory(), []);
  const symptoms = useMemo(() => getSymptomHistory(), []);
  const meds = useMemo(() => getMedicationHistory(), []);

  const now = Date.now();
  const cutoff = now - SEVEN_DAYS_MS;
  const last7Temps = temps
    .filter((t) => new Date(t.timestamp).getTime() >= cutoff)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const last7Symptoms = symptoms.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
  const last7Meds = meds.filter((m) => new Date(m.timestamp).getTime() >= cutoff);

  const minT = last7Temps.length ? Math.min(...last7Temps.map((t) => t.tempC)) : 36;
  const maxT = last7Temps.length ? Math.max(...last7Temps.map((t) => t.tempC)) : 38;
  const range = maxT - minT || 1;

  return (
    <div
      className="rounded-2xl border p-4 mb-4"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Health log"
    >
      <h3 className="text-[15px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        Health log
      </h3>

      {last7Temps.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Temperature (last 7 days)
          </p>
          <div
            className="flex items-end gap-0.5 h-12"
            style={{ minHeight: 48 }}
            role="img"
            aria-label={`Temperature trend: ${last7Temps.map((t) => `${t.tempC}°C`).join(", ")}`}
          >
            {last7Temps.map((t) => {
              return (
                <div
                  key={t.id}
                  className="flex-1 min-w-[4px] rounded-sm flex-shrink-0"
                  style={{
                    height: "24px",
                    alignSelf: "flex-end",
                    background: t.tempC >= 38 ? "#e87474" : "var(--coral)",
                    opacity: 0.6 + (t.tempC - minT) / range * 0.4,
                  }}
                  title={`${format(new Date(t.timestamp), "dd/MM HH:mm")} — ${t.tempC}°C`}
                />
              );
            })}
          </div>
        </div>
      )}

      {last7Symptoms.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Symptoms
          </p>
          <div className="flex flex-wrap gap-2">
            {last7Symptoms.map((s) => (
              <span
                key={s.id}
                className="rounded-full px-2.5 py-1 text-[12px]"
                style={{ background: "var(--bg2)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              >
                {format(new Date(s.timestamp), "dd MMM")} — {s.symptoms.slice(0, 2).join(", ")}{s.symptoms.length > 2 ? "…" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {last7Meds.length > 0 && (
        <div>
          <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Medication
          </p>
          <ul className="space-y-1 list-none p-0 m-0">
            {last7Meds.slice(0, 10).map((m) => (
              <li key={m.id} className="text-[13px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                {format(new Date(m.timestamp), "dd MMM HH:mm")} — {m.medication}
                {m.doseML != null ? ` ${m.doseML}ml` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {last7Temps.length === 0 && last7Symptoms.length === 0 && last7Meds.length === 0 && (
        <p className="text-[13px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          No health entries in the last 7 days. Use the Health button on the home screen to log temperature, symptoms, or medication.
        </p>
      )}
    </div>
  );
}
