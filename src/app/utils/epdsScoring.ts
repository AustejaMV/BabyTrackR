/**
 * Edinburgh Postnatal Depression Scale scoring.
 * Questions 3, 5, 6, 7, 8, 9, 10 are reverse-scored (score = 3 - answer).
 */

const REVERSE_QUESTIONS = new Set([3, 5, 6, 7, 8, 9, 10]);

export type EPDSSeverity = "none" | "mild" | "moderate" | "high";

export interface EPDSResult {
  total: number;
  flagged: boolean;
  severity: EPDSSeverity;
}

/**
 * Score EPDS: 10 answers, each 0–3. Reverse-scored items: 3, 5, 6, 7, 8, 9, 10.
 * Total 0–9: none. 10–12: mild. 13–14: moderate. 15+: high (flagged).
 */
export function scoreEPDS(answers: number[]): EPDSResult {
  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new Error("EPDS requires exactly 10 answers");
  }
  for (let i = 0; i < 10; i++) {
    const a = answers[i];
    if (typeof a !== "number" || a < 0 || a > 3 || !Number.isInteger(a)) {
      throw new Error(`EPDS answer ${i + 1} must be 0, 1, 2, or 3`);
    }
  }
  let total = 0;
  for (let i = 0; i < 10; i++) {
    total += REVERSE_QUESTIONS.has(i + 1) ? 3 - answers[i]! : answers[i]!;
  }
  const flagged = total >= 13;
  let severity: EPDSSeverity = "none";
  if (total >= 15) severity = "high";
  else if (total >= 13) severity = "moderate";
  else if (total >= 10) severity = "mild";
  return { total, flagged, severity };
}
