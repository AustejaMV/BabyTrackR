/**
 * Health data: temperature, symptoms, medication. Guards on save.
 */

import type { TemperatureEntry, SymptomEntry, MedicationEntry, TemperatureMethod, SymptomType, SymptomSeverity } from '../types/health';

const TEMP_MIN = 30;
const TEMP_MAX = 42.5;
const DOSE_MIN = 0.1;
const DOSE_MAX = 30;

const TEMP_KEYS = ['id', 'timestamp', 'tempC', 'method', 'note'] as const;
const VALID_METHODS: TemperatureMethod[] = ['axillary', 'rectal', 'ear', 'forehead'];

const SYMPTOM_TYPES: SymptomType[] = [
  'fever', 'rash', 'runny_nose', 'cough', 'vomiting', 'diarrhoea',
  'ear_pain', 'eye_discharge', 'reduced_appetite', 'unusual_crying', 'other',
];
const SEVERITIES: SymptomSeverity[] = ['mild', 'moderate', 'severe'];

function readJson<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultVal;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : defaultVal;
  } catch {
    return defaultVal;
  }
}

export function getTemperatureHistory(): TemperatureEntry[] {
  return readJson<TemperatureEntry[]>('temperatureHistory', []);
}

function isValidMethod(m: unknown): m is TemperatureMethod {
  return typeof m === 'string' && VALID_METHODS.includes(m as TemperatureMethod);
}

export function saveTemperatureEntry(entry: unknown): TemperatureEntry {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid temperature entry');
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : `temp-${Date.now()}`;
  const timestamp = typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString();
  let tempC = Number(o.tempC);
  if (!Number.isFinite(tempC) || tempC < TEMP_MIN || tempC > TEMP_MAX) {
    throw new Error(`Temperature must be between ${TEMP_MIN} and ${TEMP_MAX}°C`);
  }
  tempC = Math.round(tempC * 10) / 10;
  const method = isValidMethod(o.method) ? o.method : 'axillary';
  const note = o.note != null && typeof o.note === 'string' ? o.note : null;
  const out: TemperatureEntry = { id, timestamp, tempC, method, note };
  const history = getTemperatureHistory();
  const idx = history.findIndex((e) => e.id === id);
  const next = idx >= 0 ? history.map((e, i) => (i === idx ? out : e)) : [...history, out];
  try {
    localStorage.setItem('temperatureHistory', JSON.stringify(next));
  } catch (e) {
    throw new Error('Failed to save temperature');
  }
  return out;
}

export function getSymptomHistory(): SymptomEntry[] {
  return readJson<SymptomEntry[]>('symptomHistory', []);
}

function isValidSymptom(s: unknown): s is SymptomType {
  return typeof s === 'string' && SYMPTOM_TYPES.includes(s as SymptomType);
}

export function saveSymptomEntry(entry: unknown): SymptomEntry {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid symptom entry');
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : `sym-${Date.now()}`;
  const timestamp = typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString();
  const rawSymptoms = Array.isArray(o.symptoms) ? o.symptoms : [];
  const symptoms = rawSymptoms.filter(isValidSymptom);
  if (symptoms.length === 0) throw new Error('At least one valid symptom required');
  const severity = SEVERITIES.includes(o.severity as SymptomSeverity) ? (o.severity as SymptomSeverity) : 'mild';
  const note = o.note != null && typeof o.note === 'string' ? o.note : null;
  const out: SymptomEntry = { id, timestamp, symptoms, severity, note };
  const history = getSymptomHistory();
  const idx = history.findIndex((e) => e.id === id);
  const next = idx >= 0 ? history.map((e, i) => (i === idx ? out : e)) : [...history, out];
  try {
    localStorage.setItem('symptomHistory', JSON.stringify(next));
  } catch {
    throw new Error('Failed to save symptoms');
  }
  return out;
}

export function getMedicationHistory(): MedicationEntry[] {
  return readJson<MedicationEntry[]>('medicationHistory', []);
}

export function saveMedicationEntry(entry: unknown): MedicationEntry {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid medication entry');
  const o = entry as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : `med-${Date.now()}`;
  const timestamp = typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString();
  const medication = typeof o.medication === 'string' && o.medication.trim() ? o.medication.trim() : '';
  if (!medication) throw new Error('Medication name required');
  let doseML: number | null = null;
  if (o.doseML != null && Number.isFinite(Number(o.doseML))) {
    const d = Number(o.doseML);
    if (d < DOSE_MIN || d > DOSE_MAX) throw new Error(`Dose must be between ${DOSE_MIN} and ${DOSE_MAX} ml`);
    doseML = Math.round(d * 10) / 10;
  }
  const note = o.note != null && typeof o.note === 'string' ? o.note : null;
  const out: MedicationEntry = { id, timestamp, medication, doseML, note };
  const history = getMedicationHistory();
  const idx = history.findIndex((e) => e.id === id);
  const next = idx >= 0 ? history.map((e, i) => (i === idx ? out : e)) : [...history, out];
  try {
    localStorage.setItem('medicationHistory', JSON.stringify(next));
  } catch {
    throw new Error('Failed to save medication');
  }
  return out;
}
