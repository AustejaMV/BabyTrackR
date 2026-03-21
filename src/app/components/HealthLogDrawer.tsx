/**
 * Health log drawer: Temperature | Symptoms | Medication tabs.
 */
import { useState } from "react";
import { Thermometer, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { saveTemperatureEntry, saveSymptomEntry, saveMedicationEntry } from "../utils/healthStorage";
import type { TemperatureMethod, SymptomType, SymptomSeverity } from "../types/health";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const TEMP_MIN = 30;
const TEMP_MAX = 42.5;
const METHODS: { value: TemperatureMethod; label: string }[] = [
  { value: "axillary", label: "Axillary" },
  { value: "rectal", label: "Rectal" },
  { value: "ear", label: "Ear" },
  { value: "forehead", label: "Forehead" },
];

const SYMPTOM_OPTIONS: { value: SymptomType; label: string }[] = [
  { value: "fever", label: "Fever" },
  { value: "rash", label: "Rash" },
  { value: "runny_nose", label: "Runny nose" },
  { value: "cough", label: "Cough" },
  { value: "vomiting", label: "Vomiting" },
  { value: "diarrhoea", label: "Diarrhoea" },
  { value: "ear_pain", label: "Ear pain" },
  { value: "eye_discharge", label: "Eye discharge" },
  { value: "reduced_appetite", label: "Reduced appetite" },
  { value: "unusual_crying", label: "Unusual crying" },
  { value: "other", label: "Other" },
];

const MED_SUGGESTIONS = ["Calpol", "Ibuprofen", "Nurofen for Children"];

export interface HealthLogDrawerProps {
  onClose: () => void;
  onSaved: () => void;
}

function PastPanel({ label, expanded, onToggle, children }: { label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-[14px] border px-4 py-3.5 mb-3 text-left min-h-[48px]"
        style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
        aria-expanded={expanded}
      >
        <span className="text-[14px]">{label}</span>
        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} style={{ color: "var(--mu)" }} />
      </button>
      {expanded && children}
    </>
  );
}

export function HealthLogDrawer({ onClose, onSaved }: HealthLogDrawerProps) {
  const [tab, setTab] = useState<"temperature" | "symptoms" | "medication">("temperature");
  const [tempC, setTempC] = useState("");
  const [method, setMethod] = useState<TemperatureMethod>("axillary");
  const [tempNote, setTempNote] = useState("");
  const [pastTemp, setPastTemp] = useState(false);
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");
  const [pastMed, setPastMed] = useState(false);
  const [pastMedDate, setPastMedDate] = useState("");
  const [pastMedTime, setPastMedTime] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>([]);
  const [severity, setSeverity] = useState<SymptomSeverity>("mild");
  const [symptomNote, setSymptomNote] = useState("");
  const [medication, setMedication] = useState("");
  const [doseML, setDoseML] = useState("");
  const [medNote, setMedNote] = useState("");

  const getTimestamp = (usePastMed = false): string => {
    const usePast = usePastMed ? pastMed : pastTemp;
    const dateStr = usePastMed ? pastMedDate : pastDate;
    const timeStr = usePastMed ? pastMedTime : pastTime;
    if (usePast && dateStr.trim()) {
      const [y, m, d] = dateStr.split("-").map(Number);
      const [h = 0, min = 0] = timeStr.split(":").map(Number);
      if (![y, m, d].some(isNaN)) {
        const ms = new Date(y, m - 1, d, h, min).getTime();
        if (Number.isFinite(ms)) return new Date(ms).toISOString();
      }
    }
    return new Date().toISOString();
  };

  const handleSaveTemperature = () => {
    const t = parseFloat(tempC);
    if (!Number.isFinite(t) || t < TEMP_MIN || t > TEMP_MAX) {
      toast.error(`Enter temperature between ${TEMP_MIN} and ${TEMP_MAX}°C`);
      return;
    }
    try {
      saveTemperatureEntry({
        id: `temp-${Date.now()}`,
        timestamp: getTimestamp(false),
        tempC: Math.round(t * 10) / 10,
        method,
        note: tempNote.trim() || null,
      });
      toast.success("Temperature saved");
      setTempC("");
      setTempNote("");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const handleSaveSymptom = () => {
    if (selectedSymptoms.length === 0) {
      toast.error("Select at least one symptom");
      return;
    }
    try {
      saveSymptomEntry({
        id: `sym-${Date.now()}`,
        timestamp: getTimestamp(false),
        symptoms: selectedSymptoms,
        severity,
        note: symptomNote.trim() || null,
      });
      toast.success("Symptoms saved");
      setSelectedSymptoms([]);
      setSymptomNote("");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const handleSaveMedication = () => {
    const name = medication.trim();
    if (!name) {
      toast.error("Enter medication name");
      return;
    }
    const dose = doseML.trim() ? parseFloat(doseML) : null;
    if (dose != null && (Number.isNaN(dose) || dose < 0.1 || dose > 30)) {
      toast.error("Dose must be 0.1–30 ml");
      return;
    }
    try {
      saveMedicationEntry({
        id: `med-${Date.now()}`,
        timestamp: getTimestamp(true),
        medication: name,
        doseML: dose != null ? Math.round(dose * 10) / 10 : null,
        note: medNote.trim() || null,
      });
      toast.success("Medication saved");
      setMedication("");
      setDoseML("");
      setMedNote("");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const tempNum = parseFloat(tempC);
  const showFeverAlert = Number.isFinite(tempNum) && tempNum >= 38;
  const showHighFeverAlert = Number.isFinite(tempNum) && tempNum >= 39.5;

  return (
    <div className="rounded-b-2xl border border-t-0 border-[var(--bd)] p-4 pb-6" style={{ background: "var(--card2)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, #e87474 25%, var(--card))" }}>
          <Thermometer className="w-6 h-6" style={{ color: "#e87474" }} />
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Health</h2>
          <p className="text-[13px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Temperature, symptoms, medication</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4" style={{ background: "var(--bg2)" }}>
          <TabsTrigger value="temperature" className="text-[13px]" style={{ fontFamily: "system-ui, sans-serif" }}>Temperature</TabsTrigger>
          <TabsTrigger value="symptoms" className="text-[13px]" style={{ fontFamily: "system-ui, sans-serif" }}>Symptoms</TabsTrigger>
          <TabsTrigger value="medication" className="text-[13px]" style={{ fontFamily: "system-ui, sans-serif" }}>Medication</TabsTrigger>
        </TabsList>

        <TabsContent value="temperature" className="mt-0">
          <label className="block text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            min={TEMP_MIN}
            max={TEMP_MAX}
            value={tempC}
            onChange={(e) => setTempC(e.target.value)}
            placeholder="e.g. 36.8"
            className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px] mb-3"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            aria-label="Temperature in Celsius"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
                style={{
                  borderColor: method === m.value ? "#e87474" : "var(--bd)",
                  background: method === m.value ? "color-mix(in srgb, #e87474 15%, transparent)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          {showHighFeverAlert && (
            <p className="text-[13px] mb-2 p-2 rounded-lg" style={{ background: "color-mix(in srgb, #e87474 20%, var(--card))", color: "var(--tx)" }}>
              High fever detected. Contact your doctor or local health advice line immediately.
            </p>
          )}
          {showFeverAlert && !showHighFeverAlert && (
            <p className="text-[13px] mb-2 p-2 rounded-lg" style={{ background: "var(--bg2)", color: "var(--tx)" }}>
              This temperature may indicate a fever. If baby is under 3 months, contact your doctor or local health advice line now.
            </p>
          )}
          <PastPanel label="Log a past reading" expanded={pastTemp} onToggle={() => setPastTemp((x) => !x)}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
              <input type="time" value={pastTime} onChange={(e) => setPastTime(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
            </div>
          </PastPanel>
          <input
            type="text"
            placeholder="Note (optional)"
            value={tempNote}
            onChange={(e) => setTempNote(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-[14px] mb-4"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />
          <button type="button" onClick={handleSaveTemperature} className="w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[52px]" style={{ background: "#e87474", fontFamily: "system-ui, sans-serif" }}>
            Save temperature
          </button>
        </TabsContent>

        <TabsContent value="symptoms" className="mt-0">
          <p className="text-[12px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Select all that apply</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SYMPTOM_OPTIONS.map((s) => {
              const on = selectedSymptoms.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelectedSymptoms((prev) => (on ? prev.filter((x) => x !== s.value) : [...prev, s.value]))}
                  className="rounded-full px-3 py-2 text-[13px] border min-h-[40px]"
                  style={{
                    borderColor: on ? "var(--coral)" : "var(--bd)",
                    background: on ? "color-mix(in srgb, var(--coral) 15%, transparent)" : "var(--card)",
                    color: "var(--tx)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <label className="block text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Severity</label>
          <div className="flex gap-2 mb-3">
            {(["mild", "moderate", "severe"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className="flex-1 rounded-lg py-2.5 text-[13px] border capitalize"
                style={{
                  borderColor: severity === s ? "var(--coral)" : "var(--bd)",
                  background: severity === s ? "color-mix(in srgb, var(--coral) 15%, transparent)" : "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Note for GP (optional)"
            value={symptomNote}
            onChange={(e) => setSymptomNote(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-[14px] mb-4"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />
          <button type="button" onClick={handleSaveSymptom} className="w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[52px]" style={{ background: "#e87474", fontFamily: "system-ui, sans-serif" }}>
            Save symptoms
          </button>
        </TabsContent>

        <TabsContent value="medication" className="mt-0">
          <label className="block text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Medication</label>
          <input
            type="text"
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder="e.g. Calpol"
            list="med-suggestions"
            className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px] mb-2"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            aria-label="Medication name"
          />
          <datalist id="med-suggestions">
            {MED_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <label className="block text-[12px] uppercase tracking-wider mb-2 mt-3" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Dose (ml, optional)</label>
          <input
            type="number"
            step="0.1"
            min={0.1}
            max={30}
            value={doseML}
            onChange={(e) => setDoseML(e.target.value)}
            placeholder="e.g. 2.5"
            className="w-full rounded-lg border px-3 py-2.5 text-[15px] min-h-[44px] mb-3"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
            aria-label="Dose in ml"
          />
          <PastPanel label="Log a past dose" expanded={pastMed} onToggle={() => setPastMed((x) => !x)}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="date" value={pastMedDate} onChange={(e) => setPastMedDate(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
              <input type="time" value={pastMedTime} onChange={(e) => setPastMedTime(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[14px]" style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }} />
            </div>
          </PastPanel>
          <input
            type="text"
            placeholder="Note (optional)"
            value={medNote}
            onChange={(e) => setMedNote(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-[14px] mb-4"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          />
          <button type="button" onClick={handleSaveMedication} className="w-full py-3.5 rounded-[14px] text-[15px] font-medium text-white border-none cursor-pointer min-h-[52px]" style={{ background: "#e87474", fontFamily: "system-ui, sans-serif" }}>
            Save medication
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
