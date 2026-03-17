/**
 * Wonder Weeks developmental leaps (simplified). Age in weeks from due date.
 */
export interface Leap {
  leapNumber: number;
  name: string;
  startWeek: number;
  endWeek: number;
  description: string;
  signs: string[];
  tips: string[];
}

export const WONDER_WEEKS_LEAPS: Leap[] = [
  { leapNumber: 1, name: "The World of Sensations", startWeek: 4, endWeek: 5, description: "Baby's senses are waking up.", signs: ["May be fussier than usual", "Feeding more frequently", "Sleeping lighter"], tips: ["Offer comfort and cuddles", "Keep the environment calm", "Follow baby's cues"] },
  { leapNumber: 2, name: "The World of Patterns", startWeek: 7, endWeek: 9, description: "Baby starts to recognize simple patterns.", signs: ["More clingy", "Crying peaks", "Changes in sleep"], tips: ["Use consistent routines", "Gentle stimulation", "Skin-to-skin contact"] },
  { leapNumber: 3, name: "The World of Smooth Transitions", startWeek: 11, endWeek: 12, description: "Baby notices changes in the world.", signs: ["Fussier", "Wanting more attention", "Sleep regression"], tips: ["Smooth transitions between activities", "Predictable sequences", "Comfort objects"] },
  { leapNumber: 4, name: "The World of Events", startWeek: 14, endWeek: 19, description: "Baby learns that things can happen in a sequence.", signs: ["More demanding", "Testing boundaries", "Nap changes"], tips: ["Simple cause-and-effect play", "Peek-a-boo", "Structured day"] },
  { leapNumber: 5, name: "The World of Relationships", startWeek: 22, endWeek: 26, description: "Baby understands relationships between things.", signs: ["Stranger anxiety", "Separation anxiety", "Sleep disruption"], tips: ["Gradual separations", "Familiar faces", "Comfort routines"] },
  { leapNumber: 6, name: "The World of Categories", startWeek: 33, endWeek: 37, description: "Baby starts to categorize the world.", signs: ["Mood swings", "Testing limits", "Feeding changes"], tips: ["Sorting games", "Naming things", "Patience"] },
  { leapNumber: 7, name: "The World of Sequences", startWeek: 41, endWeek: 46, description: "Baby learns sequences of events.", signs: ["Frustration", "Wanting to do things alone", "Sleep issues"], tips: ["Step-by-step activities", "Let them try", "Praise efforts"] },
  { leapNumber: 8, name: "The World of Programs", startWeek: 50, endWeek: 54, description: "Baby can change programs to reach a goal.", signs: ["Tantrums", "Strong preferences", "Routine battles"], tips: ["Offer choices", "Clear boundaries", "Consistent responses"] },
  { leapNumber: 9, name: "The World of Principles", startWeek: 59, endWeek: 64, description: "Baby understands principles and values.", signs: ["Testing rules", "Negotiating", "Independence"], tips: ["Explain why", "Fair consequences", "Model behaviour"] },
  { leapNumber: 10, name: "The World of Systems", startWeek: 70, endWeek: 76, description: "Baby can understand whole systems.", signs: ["Philosophical phase", "Identity", "Peer focus"], tips: ["Discuss ideas", "Respect opinions", "Support identity"] },
];

export function getLeapAtWeek(ageWeeks: number): Leap | null {
  return WONDER_WEEKS_LEAPS.find((l) => ageWeeks >= l.startWeek && ageWeeks <= l.endWeek) ?? null;
}

export function getNextLeap(ageWeeks: number): { leap: Leap; inDays: number } | null {
  const next = WONDER_WEEKS_LEAPS.find((l) => l.startWeek > ageWeeks);
  if (!next) return null;
  const daysUntil = (next.startWeek - ageWeeks) * 7;
  return { leap: next, inDays: daysUntil };
}

export function isInLeap(ageInWeeks: number): boolean {
  return getLeapAtWeek(ageInWeeks) != null;
}

/** Free preview text: "Currently in Leap X" or "Leap X incoming in Y days" */
export function getFreePreviewText(ageInWeeks: number): string {
  const current = getLeapAtWeek(ageInWeeks);
  if (current) return `Currently in Leap ${current.leapNumber}`;
  const next = getNextLeap(ageInWeeks);
  if (next) return `Leap ${next.leap.leapNumber} incoming in ${next.inDays} days`;
  return "";
}
