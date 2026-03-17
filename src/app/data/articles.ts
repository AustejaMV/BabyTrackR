/**
 * Contextual knowledge base articles. NHS-aligned, plain English.
 */

import type { ArticleContent } from "../types/article";

const GP_SECTION = "\n\nWhen to call your GP or 111\n\n";

export const ARTICLES: ArticleContent[] = [
  {
    id: "four-month-sleep-regression",
    title: "The 4-month sleep regression",
    triggerConditions: ["sleep_regression_detected"],
    ageRangeWeeks: [14, 22],
    tags: ["sleep", "regression"],
    lastReviewed: "2025-01-15",
    excerpt: "Around 4 months, many babies start waking more at night. This is a normal developmental stage.",
    body:
      "Around 4 months, many babies go through a noticeable change in how they sleep. They may wake more often at night, take shorter naps, or find it harder to settle. This is often called the 4-month sleep regression.\n\n" +
      "It happens because your baby's brain is maturing: sleep cycles become more like an adult's, so they briefly wake between cycles. Some babies quickly resettle; others need more help. This phase usually lasts a few weeks and is not harmful.\n\n" +
      "What can help: keep a consistent bedtime routine, offer feeds if they're hungry, and try not to introduce new sleep props you don't want to keep long term. Many families find that once the regression passes, sleep improves again." +
      GP_SECTION +
      "Call your GP or 111 if your baby has a fever, is floppy or unresponsive, has a rash that doesn't fade when you press it, or if you're worried about their breathing or feeding.",
  },
  {
    id: "no-dirty-nappy",
    title: "No dirty nappy for a while",
    triggerConditions: ["no_poop_alert"],
    ageRangeWeeks: [0, 52],
    tags: ["nappy", "poo", "constipation"],
    lastReviewed: "2025-01-15",
    excerpt: "It's common for babies to go a few days without a dirty nappy. When to mention it at the next check.",
    body:
      "How often a baby does a poo varies a lot. Breastfed babies can go several days without one and still be fine; formula-fed babies tend to go more often. What matters is whether your baby seems comfortable and is feeding well.\n\n" +
      "If your baby hasn't had a dirty nappy for more than a few days and is unsettled, straining, or has hard pellets, they may be constipated. Offering extra feeds (if breastfeeding) or a little cooled boiled water (if formula-fed and over 6 months, or as your health visitor advises) can sometimes help. For formula-fed babies, check you're making up the formula correctly.\n\n" +
      "Worth mentioning at the next GP or health visitor visit if it keeps happening, or if poos are very hard or painful." +
      GP_SECTION +
      "Call 111 or your GP if your baby has a swollen or tender tummy, is vomiting, has blood in their poo, or is not feeding or seems unwell.",
  },
  {
    id: "safe-sleep-guide",
    title: "Safe sleep for your baby",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 104],
    tags: ["sleep", "safety", "SIDS"],
    lastReviewed: "2025-01-15",
    excerpt: "Simple steps to reduce the risk of SIDS and create a safe sleep environment.",
    body:
      "Place your baby on their back to sleep for every sleep, in a clear, flat sleep space (e.g. a cot or Moses basket with a firm, flat mattress and no pillows, bumpers, or loose bedding). Keep the room cool (16–20°C).\n\n" +
      "Share a room with your baby for the first 6 months if you can, but not the same bed. Avoid smoking, alcohol, and drugs before or while caring for your baby. Breastfeeding and using a dummy when your baby is settled can also help reduce risk.\n\n" +
      "Do not sleep with your baby on a sofa or armchair. If you bring your baby into bed to feed, put them back in their own sleep space when you're done." +
      GP_SECTION +
      "If your baby stops breathing, turns blue, or you cannot wake them, call 999 immediately and start CPR if you're trained.",
  },
  {
    id: "green-poo",
    title: "Green poo — when to worry",
    triggerConditions: ["diaper_colour_green_logged"],
    ageRangeWeeks: [0, 52],
    tags: ["nappy", "poo", "feeding"],
    lastReviewed: "2025-01-15",
    excerpt: "Occasional green poos are often normal. Here's when they might need a mention.",
    body:
      "Green poo in babies can be normal. It often appears when milk moves through the gut quickly (e.g. after a foremilk-heavy feed, or during a growth spurt). Some formula-fed babies have greener poos, and starting solids can change colour too.\n\n" +
      "If green poos are occasional and your baby is feeding well and seems fine, you usually don't need to do anything. If they're consistently green for several days and your baby is fussy, not feeding well, or has other symptoms, mention it to your health visitor or GP. They can check for things like a foremilk–hindmilk imbalance (if breastfeeding) or a mild tummy bug." +
      GP_SECTION +
      "Call your GP or 111 if your baby has green poo with mucus or blood, is vomiting, has a fever, or seems dehydrated (fewer wet nappies, dry mouth, sunken fontanelle).",
  },
  {
    id: "overtired-baby",
    title: "Overtired baby — spotting the signs",
    triggerConditions: ["nap_window_passed_by_30min"],
    ageRangeWeeks: [0, 52],
    tags: ["sleep", "naps", "crying"],
    lastReviewed: "2025-01-15",
    excerpt: "Missing the nap window can make babies harder to settle. How to spot tired cues and get back on track.",
    body:
      "When babies stay awake too long, they can become overtired: wired, fussy, and harder to settle. Their body produces more cortisol, which makes sleep more difficult. Spotting early tired signs (e.g. staring, yawning, rubbing eyes) and offering a nap before they're overwhelmed can help.\n\n" +
      "If you've missed the window, keep the environment calm and dim, try a short wind-down (e.g. a cuddle, white noise), and offer the nap again. It may take a bit longer for them to drop off. Tomorrow, try offering the nap 10–15 minutes earlier. Consistency over time usually helps more than one perfect day." +
      GP_SECTION +
      "If your baby is extremely hard to settle, has a fever, or you're worried about their crying or feeding, contact your health visitor or GP.",
  },
];

const BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));

export function getArticleById(id: string): ArticleContent | null {
  return BY_ID.get(id) ?? null;
}

export function getAllArticles(): ArticleContent[] {
  return [...ARTICLES];
}
