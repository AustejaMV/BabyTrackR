/**
 * WHO growth reference percentiles (simplified) for 0–24 months.
 * Weight (kg): 5th, 50th, 95th by age in months.
 * Source: WHO Child Growth Standards (approximate values for chart bands).
 */
export type Sex = "girls" | "boys";

export interface WhoWeightPoint {
  month: number;
  p5: number;
  p50: number;
  p95: number;
}

/** Weight (kg) by month 0–24. Approximate WHO values. */
export const WHO_WEIGHT_GIRLS: WhoWeightPoint[] = [
  { month: 0, p5: 2.4, p50: 3.2, p95: 4.2 },
  { month: 1, p5: 3.2, p50: 4.2, p95: 5.5 },
  { month: 2, p5: 4.0, p50: 5.1, p95: 6.6 },
  { month: 3, p5: 4.6, p50: 5.8, p95: 7.5 },
  { month: 4, p5: 5.1, p50: 6.4, p95: 8.2 },
  { month: 5, p5: 5.5, p50: 6.9, p95: 8.8 },
  { month: 6, p5: 5.8, p50: 7.3, p95: 9.3 },
  { month: 7, p5: 6.1, p50: 7.6, p95: 9.8 },
  { month: 8, p5: 6.3, p50: 7.9, p95: 10.2 },
  { month: 9, p5: 6.6, p50: 8.2, p95: 10.5 },
  { month: 10, p5: 6.8, p50: 8.5, p95: 10.9 },
  { month: 11, p5: 7.0, p50: 8.7, p95: 11.2 },
  { month: 12, p5: 7.2, p50: 8.9, p95: 11.5 },
  { month: 15, p5: 7.6, p50: 9.4, p95: 12.1 },
  { month: 18, p5: 8.0, p50: 9.9, p95: 12.7 },
  { month: 21, p5: 8.4, p50: 10.4, p95: 13.3 },
  { month: 24, p5: 8.8, p50: 10.9, p95: 13.9 },
];

export const WHO_WEIGHT_BOYS: WhoWeightPoint[] = [
  { month: 0, p5: 2.5, p50: 3.3, p95: 4.4 },
  { month: 1, p5: 3.4, p50: 4.5, p95: 5.8 },
  { month: 2, p5: 4.3, p50: 5.6, p95: 7.1 },
  { month: 3, p5: 5.0, p50: 6.4, p95: 8.0 },
  { month: 4, p5: 5.6, p50: 7.0, p95: 8.7 },
  { month: 5, p5: 6.1, p50: 7.5, p95: 9.3 },
  { month: 6, p5: 6.5, p50: 7.9, p95: 9.8 },
  { month: 7, p5: 6.9, p50: 8.3, p95: 10.3 },
  { month: 8, p5: 7.2, p50: 8.6, p95: 10.7 },
  { month: 9, p5: 7.5, p50: 8.9, p95: 11.1 },
  { month: 10, p5: 7.7, p50: 9.2, p95: 11.4 },
  { month: 11, p5: 8.0, p50: 9.4, p95: 11.8 },
  { month: 12, p5: 8.2, p50: 9.6, p95: 12.1 },
  { month: 15, p5: 8.7, p50: 10.2, p95: 12.8 },
  { month: 18, p5: 9.2, p50: 10.8, p95: 13.5 },
  { month: 21, p5: 9.6, p50: 11.3, p95: 14.1 },
  { month: 24, p5: 10.1, p50: 11.9, p95: 14.8 },
];

export function getWhoWeight(sex: Sex): WhoWeightPoint[] {
  return sex === "girls" ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
}

/** Approximate percentile for a given weight at a given age in months (linear interpolation). */
export function getWeightPercentile(sex: Sex, ageMonths: number, weightKg: number): number {
  const data = getWhoWeight(sex);
  const points = data.filter((p) => p.month <= ageMonths);
  if (points.length === 0) return 50;
  const next = data.find((p) => p.month >= ageMonths);
  const prev = points[points.length - 1];
  if (!prev) return 50;
  if (!next || next.month === prev.month) {
    if (weightKg <= prev.p5) return 5;
    if (weightKg >= prev.p95) return 95;
    if (weightKg <= prev.p50) return 5 + (45 * (weightKg - prev.p5)) / (prev.p50 - prev.p5);
    return 50 + (45 * (weightKg - prev.p50)) / (prev.p95 - prev.p50);
  }
  const t = (ageMonths - prev.month) / (next.month - prev.month);
  const p5 = prev.p5 + t * (next.p5 - prev.p5);
  const p50 = prev.p50 + t * (next.p50 - prev.p50);
  const p95 = prev.p95 + t * (next.p95 - prev.p95);
  if (weightKg <= p5) return 5;
  if (weightKg >= p95) return 95;
  if (weightKg <= p50) return 5 + (45 * (weightKg - p5)) / (p50 - p5);
  return 50 + (45 * (weightKg - p50)) / (p95 - p50);
}

/** Get percentile for a value at given age. Guard: null if value <= 0, ageMonths < 0 or > 24, or sex invalid. */
export function getPercentile(
  value: number,
  ageMonths: number,
  metric: "weight" | "height",
  sex: "male" | "female"
): number | null {
  if (value <= 0 || !Number.isFinite(value)) return null;
  if (ageMonths < 0 || ageMonths > 24 || !Number.isFinite(ageMonths)) return null;
  const sexKey: Sex = sex === "female" ? "girls" : "boys";
  if (metric === "weight") return getWeightPercentile(sexKey, ageMonths, value);
  if (metric === "height") return null; // length/height percentiles not yet implemented
  return null;
}
