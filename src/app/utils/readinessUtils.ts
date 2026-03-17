/**
 * "Is she ready for..." advisor: nap drops, solids, night weaning, cot readiness.
 */

export type ReadinessType = "nap_drop" | "solids" | "night_feeds" | "cot";

export interface ReadinessCard {
  id: string;
  type: ReadinessType;
  title: string;
  body: string;
  ready: boolean;
  /** Optional age in weeks when typically relevant */
  ageWeeksMin?: number;
  ageWeeksMax?: number;
}

function ageWeeks(birthDateMs: number | null, nowMs: number): number | null {
  if (!birthDateMs || !Number.isFinite(birthDateMs)) return null;
  return Math.floor((nowMs - birthDateMs) / (7 * 24 * 60 * 60 * 1000));
}

export function generateReadinessCards(
  babyDobMs: number | null,
  options: {
    napCount?: number;
    solidsStarted?: boolean;
    nightFeedCount?: number;
    inCot?: boolean;
  },
  nowMs: number = Date.now()
): ReadinessCard[] {
  const age = ageWeeks(babyDobMs ?? 0, nowMs);
  const cards: ReadinessCard[] = [];

  if (age == null) return cards;

  const napCount = options.napCount ?? 0;
  if (age >= 48) {
    cards.push({
      id: "nap_drop_1",
      type: "nap_drop",
      title: "Ready to drop to one nap?",
      body: "Many toddlers move to one nap between 15–18 months. If she's fighting the morning nap or napping long and late, she might be ready.",
      ready: age >= 60 || napCount <= 1,
      ageWeeksMin: 48,
      ageWeeksMax: 78,
    });
  } else if (age >= 28) {
    cards.push({
      id: "nap_drop_2",
      type: "nap_drop",
      title: "Moving towards two naps",
      body: "Between 6–9 months many babies settle into two longer naps. Watch for longer wake windows and shorter catnaps.",
      ready: napCount <= 2,
      ageWeeksMin: 28,
      ageWeeksMax: 44,
    });
  }

  if (age >= 17 && age <= 35) {
    cards.push({
      id: "solids",
      type: "solids",
      title: "Ready for solids?",
      body: "Around 6 months babies can sit with support, show interest in food, and bring things to mouth. Start with iron-rich first foods.",
      ready: options.solidsStarted === true,
      ageWeeksMin: 17,
      ageWeeksMax: 35,
    });
  }

  if (age >= 26) {
    cards.push({
      id: "night_feeds",
      type: "night_feeds",
      title: "Night feeds",
      body: "Many babies still need one night feed until 9–12 months. If she's growing well and you're ready, you can work on reducing night feeds with gentle methods.",
      ready: (options.nightFeedCount ?? 1) === 0,
      ageWeeksMin: 26,
      ageWeeksMax: 52,
    });
  }

  if (age >= 16 && age <= 52) {
    cards.push({
      id: "cot",
      type: "cot",
      title: "Cot readiness",
      body: "Moving from Moses basket to cot often happens around 4–6 months when she's more mobile. Ensure a clear, flat sleep space.",
      ready: options.inCot === true,
      ageWeeksMin: 16,
      ageWeeksMax: 52,
    });
  }

  return cards;
}
