/**
 * Clinically relevant nappy (stool) types for parent reference.
 */

export type NappyNormal = "always" | "sometimes" | "rarely" | "call_gp" | "call_999";

export interface NappyEntry {
  id: string;
  label: string;
  colourHex: string;
  colourHex2: string | null;
  consistency: string;
  ageContext: string;
  meaning: string;
  isNormal: NappyNormal;
  whenToCallGP: string | null;
  whenToCall999: string | null;
}

export const NAPPY_GUIDE: NappyEntry[] = [
  {
    id: "meconium",
    label: "Black / dark green (tarry)",
    colourHex: "#1a1a0a",
    colourHex2: null,
    consistency: "Thick and sticky",
    ageContext: "First 1–3 days",
    meaning: "Meconium — normal for first days. Passes as milk feeding establishes.",
    isNormal: "always",
    whenToCallGP: "If still black/tarry after day 4 of life.",
    whenToCall999: null,
  },
  {
    id: "transitional",
    label: "Dark green / khaki",
    colourHex: "#3a4a20",
    colourHex2: null,
    consistency: "Soft",
    ageContext: "Days 3–5",
    meaning: "Transitional stool — normal as meconium clears and milk comes in.",
    isNormal: "always",
    whenToCallGP: null,
    whenToCall999: null,
  },
  {
    id: "breastfed_normal",
    label: "Mustard yellow (seedy)",
    colourHex: "#c8a030",
    colourHex2: null,
    consistency: "Runny to soft, often seedy or grainy",
    ageContext: "Breastfed babies",
    meaning: "Completely normal for breastfed babies. May look like Dijon mustard.",
    isNormal: "always",
    whenToCallGP: null,
    whenToCall999: null,
  },
  {
    id: "formula_normal",
    label: "Pale to medium brown",
    colourHex: "#a07840",
    colourHex2: null,
    consistency: "Firmer than breastfed, pasty",
    ageContext: "Formula-fed babies",
    meaning: "Normal for formula-fed babies. Tends to be firmer and more predictable than breastfed stools.",
    isNormal: "always",
    whenToCallGP: null,
    whenToCall999: null,
  },
  {
    id: "green_occasional",
    label: "Green",
    colourHex: "#5a7830",
    colourHex2: null,
    consistency: "Soft",
    ageContext: "Any age",
    meaning: "Occasional green poos are normal — can be caused by overactive letdown, a cold, or iron in formula. One green poo is rarely a concern.",
    isNormal: "sometimes",
    whenToCallGP: "If consistently green for more than 3 days, or if baby seems unwell.",
    whenToCall999: null,
  },
  {
    id: "watery",
    label: "Very watery / liquid",
    colourHex: "#c8b870",
    colourHex2: null,
    consistency: "Liquid",
    ageContext: "Any age",
    meaning: "May indicate diarrhoea. Watch for signs of dehydration — fewer wet nappies, dry mouth, sunken fontanelle.",
    isNormal: "rarely",
    whenToCallGP: "If watery for more than 24h or baby shows dehydration signs.",
    whenToCall999: "If baby appears very unwell, lethargic, or has sunken eyes with dry mouth.",
  },
  {
    id: "pale_white",
    label: "Pale / white / grey",
    colourHex: "#d8d0c0",
    colourHex2: null,
    consistency: "Any",
    ageContext: "Any age",
    meaning: "Pale or chalky white stools can indicate a liver or bile duct issue. This needs prompt medical attention.",
    isNormal: "call_gp",
    whenToCallGP: "Contact your doctor today — do not wait.",
    whenToCall999: null,
  },
  {
    id: "red_blood",
    label: "Red streaks or blood",
    colourHex: "#c03030",
    colourHex2: null,
    consistency: "Any",
    ageContext: "Any age",
    meaning: "Red in the nappy could be blood. Small streaks may be from a small anal tear (common and harmless) but should be checked.",
    isNormal: "call_gp",
    whenToCallGP: "Contact your doctor or health visitor today to describe what you saw.",
    whenToCall999: "If there is significant blood or baby appears unwell.",
  },
  {
    id: "black_older",
    label: "Black (not newborn)",
    colourHex: "#1a1a1a",
    colourHex2: null,
    consistency: "Any",
    ageContext: "After week 1",
    meaning: "Black stools in a baby past the first week of life can indicate bleeding in the upper digestive tract.",
    isNormal: "call_gp",
    whenToCallGP: "Contact your doctor today.",
    whenToCall999: "If baby seems unwell or there is a large amount.",
  },
  {
    id: "solids_normal",
    label: "Brown, darker, firmer",
    colourHex: "#7a5030",
    colourHex2: null,
    consistency: "Firmer, more formed",
    ageContext: "After starting solids (6mo+)",
    meaning: "Normal change when solids are introduced. Poos become darker, firmer, and more varied in colour depending on what baby ate.",
    isNormal: "always",
    whenToCallGP: null,
    whenToCall999: null,
  },
];
