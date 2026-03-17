/**
 * Health tracking: temperature, symptoms, medication.
 */

export type TemperatureMethod = 'axillary' | 'rectal' | 'ear' | 'forehead';

export interface TemperatureEntry {
  id: string;
  timestamp: string;
  tempC: number;
  method: TemperatureMethod;
  note: string | null;
}

export type SymptomType =
  | 'fever'
  | 'rash'
  | 'runny_nose'
  | 'cough'
  | 'vomiting'
  | 'diarrhoea'
  | 'ear_pain'
  | 'eye_discharge'
  | 'reduced_appetite'
  | 'unusual_crying'
  | 'other';

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export interface SymptomEntry {
  id: string;
  timestamp: string;
  symptoms: SymptomType[];
  severity: SymptomSeverity;
  note: string | null;
}

export interface MedicationEntry {
  id: string;
  timestamp: string;
  medication: string;
  doseML: number | null;
  note: string | null;
}
