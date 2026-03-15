/**
 * Journey milestones matching the example exactly: order, labels, typical ranges.
 * Ids match babyUtils.DEFAULT_MILESTONES for load/save. "Add your own" is the last node (custom).
 */
export const JOURNEY_MILESTONES: {
  id: string;
  label: string;
  typicalLabel: string;
  typicalWeeksMin: number;
  typicalWeeksMax: number;
}[] = [
  { id: "first-smile", label: "First smile", typicalLabel: "1–3 mo", typicalWeeksMin: 4, typicalWeeksMax: 13 },
  { id: "rolls-tummy-back", label: "Rolling over", typicalLabel: "3–6 mo", typicalWeeksMin: 12, typicalWeeksMax: 26 },
  { id: "crawls", label: "Crawling", typicalLabel: "7–10 mo", typicalWeeksMin: 28, typicalWeeksMax: 44 },
  { id: "sits-unsupported", label: "Sitting up", typicalLabel: "~Mo 9", typicalWeeksMin: 26, typicalWeeksMax: 40 },
  { id: "walks", label: "First steps", typicalLabel: "~Mo 12", typicalWeeksMin: 40, typicalWeeksMax: 52 },
  { id: "first-tooth", label: "First tooth", typicalLabel: "~Mo 6–10", typicalWeeksMin: 24, typicalWeeksMax: 44 },
];

export const CUSTOM_MILESTONE_ID = "add-your-own";
