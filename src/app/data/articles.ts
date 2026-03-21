/**
 * Contextual knowledge base articles. NHS-aligned, plain English.
 *
 * Stored in the client so the Library works offline and stays fast. For many more
 * or frequently updated articles, you could add a backend:
 * - A scheduled function (e.g. Supabase Edge Function cron) that fetches from
 *   curated RSS feeds, NHS/health APIs, or a CMS, normalises to ArticleContent,
 *   and writes to a table (e.g. `articles` in Supabase).
 * - An API route (e.g. GET /data/articles) that the app calls on load; fall back
 *   to this bundled list if offline or the request fails. That way you get
 *   fresh content when online without "scraping the net" arbitrarily — stick
 *   to trusted sources and review before publishing.
 */

import type { ArticleContent } from "../types/article";

const HEALTH_SECTION = "\n\nWhen to call your doctor or local health advice line\n\n";

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
      HEALTH_SECTION +
      "Call your doctor or local health advice line if your baby has a fever, is floppy or unresponsive, has a rash that doesn't fade when you press it, or if you're worried about their breathing or feeding.",
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
      HEALTH_SECTION +
      "Call your local health advice line or doctor if your baby has a swollen or tender tummy, is vomiting, has blood in their poo, or is not feeding or seems unwell.",
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
      HEALTH_SECTION +
      "If your baby stops breathing, turns blue, or you cannot wake them, call your local emergency number immediately and start CPR if you're trained.",
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
      HEALTH_SECTION +
      "Call your doctor or local health advice line if your baby has green poo with mucus or blood, is vomiting, has a fever, or seems dehydrated (fewer wet nappies, dry mouth, sunken fontanelle).",
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
      HEALTH_SECTION +
      "If your baby is extremely hard to settle, has a fever, or you're worried about their crying or feeding, contact your health visitor or GP.",
  },
  {
    id: "cluster-feeding",
    title: "Cluster feeding — why babies feed so often in the evening",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 26],
    tags: ["feeding", "breast"],
    lastReviewed: "2025-01-15",
    excerpt: "Many newborns want to feed frequently in the evening. It's normal and usually doesn't mean your supply is low.",
    body:
      "Cluster feeding is when a baby wants to feed very often over a short period, often in the evening. It's common in the early weeks and can feel exhausting, but it's usually normal. Babies may do it to fill up before a longer sleep, to boost your supply, or simply for comfort.\n\n" +
      "If you're breastfeeding, letting your baby feed on demand during these bursts helps establish supply. If you're formula-feeding, follow your baby's hunger cues but avoid overfeeding. It often peaks around 4–6 weeks and can ease as your baby gets older." +
      HEALTH_SECTION +
      "Contact your health visitor or GP if your baby isn't having enough wet nappies, seems lethargic, or you're worried about feeding.",
  },
  {
    id: "nappy-rash",
    title: "Nappy rash — prevention and treatment",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 104],
    tags: ["nappy", "nappies"],
    lastReviewed: "2025-01-15",
    excerpt: "Most babies get nappy rash at some point. Simple steps can prevent and soothe it.",
    body:
      "Nappy rash is redness or sore skin in the nappy area. It's often caused by wet or dirty nappies left on too long, or by friction. Change nappies frequently, clean the area gently with water or fragrance-free wipes, and use a thin layer of barrier cream (e.g. zinc-based) to protect the skin.\n\n" +
      "Let the skin dry before putting on a clean nappy when you can. If the rash doesn't improve after a few days, looks raw or blistered, or your baby seems in pain, see your GP or health visitor. They can check for thrush or other causes." +
      HEALTH_SECTION +
      "See your GP if the rash is severe, bleeds, or spreads beyond the nappy area.",
  },
  {
    id: "teething-and-sleep",
    title: "Teething and sleep",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [16, 78],
    tags: ["sleep", "development"],
    lastReviewed: "2025-01-15",
    excerpt: "Teething can disrupt sleep for some babies. What helps and when to look for other causes.",
    body:
      "Some babies sleep less well when a tooth is coming through; others seem unaffected. If your baby is dribbling more, chewing on things, or has red cheeks, teething may be part of the picture. You can offer a cooled (not frozen) teething ring, or gently rub the gums with a clean finger.\n\n" +
      "Don't assume every bad night is teething — illness, developmental leaps, or changes in routine can also affect sleep. If your baby has a high temperature, is very unsettled, or has other symptoms, contact your doctor or local health advice line." +
      HEALTH_SECTION +
      "A fever over 38°C in a baby under 3 months needs urgent medical attention. For older babies, see your GP if the fever is high or lasts more than a few days.",
  },
  {
    id: "paced-bottle-feeding",
    title: "Paced bottle feeding",
    triggerConditions: ["first_app_open", "first_bottle_logged_while_breastfeeding"],
    ageRangeWeeks: [0, 52],
    tags: ["feeding", "bottle"],
    lastReviewed: "2025-01-15",
    excerpt: "Slowing down bottle feeds can help mimic breastfeeding and reduce overfeeding.",
    body:
      "Paced bottle feeding means holding the bottle more horizontally and letting your baby take breaks, so they can feel full and stop when they've had enough. Use a slow-flow teat and tip the bottle down when your baby pauses, then offer again when they're ready. This can help whether you're combination feeding or fully bottle-feeding.\n\n" +
      "It can reduce gas, overfeeding, and may make it easier to combine bottle and breast if you're doing both. Let your baby set the pace rather than encouraging them to finish the bottle." +
      HEALTH_SECTION +
      "If your baby is struggling to feed, losing weight, or you're worried about intake, talk to your health visitor or GP.",
  },
  {
    id: "weaning-basics",
    title: "Starting solids — when and how",
    triggerConditions: ["first_app_open", "first_solid_logged"],
    ageRangeWeeks: [20, 36],
    tags: ["feeding", "weaning", "solids"],
    lastReviewed: "2025-01-15",
    excerpt: "Around 6 months most babies are ready for solid foods. Here's how to start safely.",
    body:
      "Start solid foods when your baby is around 6 months old and can sit with support, hold their head steady, and bring food to their mouth. You can offer mashed or soft finger foods. Go at your baby's pace; milk (breast or formula) remains the main source of nutrition until 12 months.\n\n" +
      "Introduce one new food at a time so you can spot any reactions. Avoid honey before 12 months and whole nuts until 5 years. Choking prevention: avoid small, hard, or round foods; cut grapes and cherry tomatoes; supervise every meal." +
      HEALTH_SECTION +
      "If your baby has an allergic reaction (rash, swelling, breathing difficulty), call your local emergency number. For milder concerns, speak to your health visitor or doctor.",
  },
  {
    id: "reflux-and-possetting",
    title: "Reflux and possetting — when it's normal and when to ask",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 26],
    tags: ["feeding", "development"],
    lastReviewed: "2025-01-15",
    excerpt: "Many babies bring up a little milk after feeds. When it might need a second look.",
    body:
      "Possetting (bringing up small amounts of milk after a feed) is common and often normal. Keeping your baby upright for a bit after feeds and burping gently can help. If your baby is gaining weight, has plenty of wet nappies, and seems content, no treatment is usually needed.\n\n" +
      "Reflux is when stomach contents come back up more often or in larger amounts. If your baby is in pain, refusing feeds, not gaining weight, or bringing up blood or green fluid, see your GP or health visitor. They can advise on positioning, feeding frequency, or further assessment." +
      HEALTH_SECTION +
      "Call your local health advice line or doctor if your baby is vomiting forcefully (projectile), has blood in their vomit, or shows signs of dehydration.",
  },
  {
    id: "room-temperature-sleep",
    title: "Room temperature for baby sleep",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 104],
    tags: ["sleep", "safety"],
    lastReviewed: "2025-01-15",
    excerpt: "Keeping the room between 16–20°C can help reduce SIDS risk and keep your baby comfortable.",
    body:
      "A cool room (16–20°C) is recommended for baby sleep. Use a room thermometer if you're unsure. Dress your baby in one more layer than you would wear; avoid hats indoors and heavy bedding. In hot weather, use lightweight clothing and a well-ventilated room; in winter, a well-fitting baby sleeping bag can be safer than blankets.\n\n" +
      "Feel your baby's chest or back to check they're not too hot or cold — hands and feet can feel cool even when they're fine. Overheating is a risk factor for SIDS, so err on the side of cooler." +
      HEALTH_SECTION +
      "If your baby feels very hot, is floppy, or has a temperature, seek medical advice.",
  },
  {
    id: "swaddling-safely",
    title: "Swaddling safely",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 12],
    tags: ["sleep", "safety"],
    lastReviewed: "2025-01-15",
    excerpt: "Swaddling can help some newborns settle, but it must be done safely and stopped when they roll.",
    body:
      "If you swaddle, use a thin, breathable cloth and leave the hips loose so your baby can move their legs. The chest can be snug but not tight; make sure your baby can breathe easily and doesn't overheat. Always place a swaddled baby on their back to sleep.\n\n" +
      "Stop swaddling as soon as your baby shows signs of rolling (usually around 3–4 months), or earlier if they prefer their arms free. Never swaddle with a blanket that could cover the face or come loose." +
      HEALTH_SECTION +
      "If your baby has hip concerns or you're unsure about safe swaddling, ask your health visitor or GP.",
  },
  {
    id: "colic-and-crying",
    title: "Colic and excessive crying",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 16],
    tags: ["crying", "development"],
    lastReviewed: "2025-01-15",
    excerpt: "Long bouts of crying in the first months can be distressing. What might help and when to seek support.",
    body:
      "Colic is often defined as crying for more than 3 hours a day, 3 days a week, in an otherwise healthy baby under 3 months. The cause isn't fully understood. Soothing techniques (white noise, movement, a dark room, holding) can help some babies. If you're breastfeeding, your diet is rarely the cause, but you can discuss with a health professional.\n\n" +
      "It usually improves by around 3–4 months. Look after yourself: hand your baby to someone else when you need a break, and ask for help. If the crying is accompanied by fever, poor feeding, or you're worried something is wrong, see your doctor or local health advice line." +
      HEALTH_SECTION +
      "If your baby has a weak cry, is floppy, has a bulging fontanelle, or you're struggling to cope, seek help immediately.",
  },
  {
    id: "tummy-time",
    title: "Tummy time — why and how",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 52],
    tags: ["development"],
    lastReviewed: "2025-01-15",
    excerpt: "Short sessions on their tummy help babies build strength and reduce flat head risk.",
    body:
      "Tummy time is time your baby spends on their tummy while awake and supervised. Start with a minute or two after a nappy change or when they're alert, and build up. It helps strengthen neck, back, and shoulder muscles and can reduce the chance of a flat spot on the head.\n\n" +
      "If your baby doesn't like it at first, try shorter bursts, on your chest, or with a rolled towel under their chest for support. Never leave them on their tummy to sleep — always place them on their back for sleep." +
      HEALTH_SECTION +
      "If your baby consistently refuses tummy time, has a strong head preference, or you notice a flat spot, mention it to your health visitor or GP.",
  },
  {
    id: "wet-nappy-count",
    title: "How many wet nappies?",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 26],
    tags: ["nappy", "feeding"],
    lastReviewed: "2025-01-15",
    excerpt: "Wet nappies are a good sign that your baby is getting enough milk.",
    body:
      "In the first few days, your baby may have only a few wet nappies; after about 5 days, expect at least 6 heavy wet nappies in 24 hours if they're getting enough milk. The urine should be pale, not dark. Fewer wet nappies or very dark urine can be a sign of dehydration.\n\n" +
      "If you're worried about feeding or nappy output, talk to your midwife, health visitor, or GP. They can help with positioning, supply, or formula amounts." +
      HEALTH_SECTION +
      "If your baby has fewer than half the expected wet nappies, seems drowsy, or has a sunken fontanelle, contact your doctor or local health advice line.",
  },
  {
    id: "tongue-tie",
    title: "Tongue tie — what it is and when to ask",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 52],
    tags: ["feeding", "breast"],
    lastReviewed: "2025-01-15",
    excerpt: "A tight tongue can sometimes affect feeding. How it's assessed and when treatment might help.",
    body:
      "A tongue tie is when the strip of tissue under the tongue is short or tight, which can make it harder for a baby to latch or feed effectively. Not all tongue ties cause problems. If feeding is painful, your baby isn't gaining weight well, or you're struggling despite support, ask your midwife, health visitor, or GP for an assessment.\n\n" +
      "If a tongue tie is thought to be affecting feeding, a simple division (frenulotomy) may be offered. It's a quick procedure. Your health professional can explain the benefits and any risks." +
      HEALTH_SECTION +
      "If your baby is not feeding at all, is losing weight, or seems dehydrated, seek urgent advice.",
  },
  {
    id: "combination-feeding",
    title: "Combination feeding — breast and bottle",
    triggerConditions: ["first_app_open", "first_bottle_logged_while_breastfeeding"],
    ageRangeWeeks: [0, 52],
    tags: ["feeding", "breast", "bottle"],
    lastReviewed: "2025-01-15",
    excerpt: "Mixing breast and bottle is possible. How to do it in a way that supports your supply.",
    body:
      "Many families combine breastfeeding with expressed milk or formula in a bottle. To protect your supply, try to establish breastfeeding first (around 6 weeks) before introducing regular bottles if you can. When you do add bottles, paced feeding and a slow-flow teat can help your baby still enjoy the breast.\n\n" +
      "You can pump to replace a missed feed if you want to keep supply up. Any amount of breast milk is beneficial. There's no single 'right' way — do what works for you and your baby." +
      HEALTH_SECTION +
      "If you're in pain, your baby isn't latching, or you're worried about supply, see a breastfeeding supporter or your health visitor.",
  },
  {
    id: "newborn-sleep-patterns",
    title: "Newborn sleep — what to expect",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 12],
    tags: ["sleep", "naps"],
    lastReviewed: "2025-01-15",
    excerpt: "Newborns sleep in short bursts and don't know day from night yet. That's normal.",
    body:
      "Newborns typically sleep for 2–4 hours at a time and wake to feed. They don't yet have a strong circadian rhythm, so night and day can be mixed up. Over the first few months, longer stretches of night sleep often develop. Safe sleep rules still apply: back to sleep, clear cot, cool room.\n\n" +
      "You can gently encourage day–night difference by keeping daytime feeds and play in the light and night feeds calm and dim. Don't expect a schedule early on — following your baby's cues is enough." +
      HEALTH_SECTION +
      "If your baby is very sleepy and hard to wake for feeds, or you're concerned about their sleep, talk to your health visitor or GP.",
  },
  {
    id: "postnatal-low-mood",
    title: "Postnatal low mood and when to seek help",
    triggerConditions: ["first_app_open", "overwhelmed_mood_logged"],
    tags: ["mum", "wellbeing", "mental health"],
    lastReviewed: "2025-01-15",
    excerpt: "Many new parents feel low or overwhelmed. When it might be more than the baby blues.",
    body:
      "It's common to feel tearful, anxious, or overwhelmed in the first weeks. The 'baby blues' often peak around day 3–5 and ease within a couple of weeks. If low mood, anxiety, or difficulty coping last longer or get in the way of daily life, it could be postnatal depression or anxiety. You're not to blame — help is available.\n\n" +
      "Talk to your GP, health visitor, or midwife. They can offer support, talking therapies, or medication if needed. Self-care (rest, eating well, asking for practical help) matters too. You don't have to struggle alone." +
      HEALTH_SECTION +
      "If you have thoughts of harming yourself or your baby, contact your doctor, local health advice line, or a crisis service immediately.",
  },
  {
    id: "pelvic-floor-after-birth",
    title: "Pelvic floor after birth",
    triggerConditions: ["first_app_open"],
    tags: ["mum", "wellbeing"],
    lastReviewed: "2025-01-15",
    excerpt: "Gentle pelvic floor exercises can help recovery after pregnancy and birth.",
    body:
      "The pelvic floor muscles support your bladder, bowel, and uterus. Pregnancy and birth can weaken them, leading to leaks when you cough, laugh, or exercise. Gentle pelvic floor exercises (squeeze and lift, then release) can help. Start when you feel ready and build up gradually; your midwife or physio can guide you.\n\n" +
      "If you have pain, heaviness, or persistent leaking, see your GP or ask for a referral to a women's health physiotherapist. Don't suffer in silence — these issues are common and treatable." +
      HEALTH_SECTION +
      "If you have sudden heavy bleeding, severe pain, or difficulty passing urine after birth, seek urgent medical advice.",
  },
  {
    id: "when-to-call-health",
    title: "When to call your doctor or health advice line",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 104],
    tags: ["safety", "development"],
    lastReviewed: "2025-01-15",
    excerpt: "A quick guide to when to get medical advice for your baby.",
    body:
      "Call your local health advice line or doctor if your baby has a fever (38°C or above, or 37.5°C under 3 months), is feeding much less than usual, has fewer wet nappies, seems floppy or unusually sleepy, or has a rash that doesn't fade when you press a glass against it. Also if they have difficulty breathing, persistent vomiting, or you're worried and not sure what to do.\n\n" +
      "Call your local emergency number for emergencies: difficulty breathing, unconsciousness, fits, severe allergic reaction, or if you think your baby has swallowed something harmful. Trust your instincts — if something doesn't feel right, get advice." +
      HEALTH_SECTION +
      "For a baby under 3 months with a temperature of 38°C or higher, seek urgent medical attention.",
  },
  {
    id: "reducing-sids-risk",
    title: "Reducing the risk of SIDS",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 52],
    tags: ["sleep", "SIDS", "safety"],
    lastReviewed: "2025-01-15",
    excerpt: "Evidence-based steps to create a safer sleep environment for your baby.",
    body:
      "Place your baby on their back for every sleep. Use a firm, flat mattress in a cot or Moses basket with no pillows, bumpers, or loose bedding. Keep the room at 16–20°C. Don't smoke during pregnancy or after birth, and keep your baby away from smoky environments. Share a room with your baby for the first 6 months, but not the same bed. Avoid sleeping with your baby on a sofa or armchair.\n\n" +
      "Breastfeeding and using a dummy once breastfeeding is established are associated with a lower risk. Follow safe sleep advice even for naps." +
      HEALTH_SECTION +
      "If your baby stops breathing or you cannot wake them, call your local emergency number and start CPR if you're trained.",
  },
  {
    id: "growth-spurts",
    title: "Growth spurts and feeding",
    triggerConditions: ["first_app_open", "feeds_per_day_high"],
    ageRangeWeeks: [0, 52],
    tags: ["feeding", "development"],
    lastReviewed: "2025-01-15",
    excerpt: "Babies often want to feed more during growth spurts. It's normal and usually temporary.",
    body:
      "Growth spurts are times when your baby seems hungrier and may feed more often or for longer. They often happen around 2–3 weeks, 6 weeks, 3 months, and 6 months, but can vary. If you're breastfeeding, feeding on demand helps your supply match your baby's needs. It usually lasts a few days before settling again.\n\n" +
      "Trust your baby's cues. Extra night wakings during a growth spurt are also common. If you're worried about supply, weight gain, or feeding, your health visitor or a breastfeeding supporter can help." +
      HEALTH_SECTION +
      "If your baby is not gaining weight, has fewer wet nappies, or seems unwell, see your GP or health visitor.",
  },
  {
    id: "nap-transitions",
    title: "Nap transitions — dropping from 3 to 2 to 1",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [26, 78],
    tags: ["sleep", "naps"],
    lastReviewed: "2025-01-15",
    excerpt: "As your baby grows, nap patterns change. What to expect and how to adjust.",
    body:
      "Many babies move from 3 naps to 2 around 6–9 months, and from 2 to 1 nap around 12–18 months. The transition can be bumpy: some days they'll need the extra nap, others they'll resist. Follow your baby's cues and adjust bedtime if needed — an earlier bedtime can help when dropping a nap.\n\n" +
      "Don't rush the transition. If they're cranky or night sleep is disrupted, they may not be ready yet. Consistency and a calm routine help." +
      HEALTH_SECTION +
      "If your baby's sleep is severely disrupted for a long period or you're concerned, your health visitor can offer support.",
  },
  {
    id: "expressing-and-storing-milk",
    title: "Expressing and storing breast milk",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 104],
    tags: ["feeding", "breast"],
    lastReviewed: "2025-01-15",
    excerpt: "How to express, store, and use expressed milk safely.",
    body:
      "You can express by hand or with a pump. Wash your hands first and use clean, sterilised containers. Fresh milk can be stored in the fridge for up to 5 days (at 4°C or below) or in the freezer for up to 6 months. Thaw frozen milk in the fridge or in warm water; don't microwave. Use thawed milk within 24 hours.\n\n" +
      "Label with the date. Offer milk at room temperature or gently warmed; test on your wrist. Once your baby has drunk from a bottle, use the milk within 1 hour or discard." +
      HEALTH_SECTION +
      "If your baby was premature or unwell, follow any extra storage or handling advice from your healthcare team.",
  },
  {
    id: "baby-milestones",
    title: "Baby milestones — a rough guide",
    triggerConditions: ["first_app_open"],
    ageRangeWeeks: [0, 104],
    tags: ["development", "milestones"],
    lastReviewed: "2025-01-15",
    excerpt: "Every baby develops at their own pace. Here's a general idea of what to expect.",
    body:
      "Milestones (smiling, holding their head up, rolling, sitting, crawling, first words) are a guide, not a timetable. Some babies do things earlier, others later. What matters is that your baby is making progress over time. If you're concerned about development, your health visitor will check at reviews and can refer if needed.\n\n" +
      "Enjoy your baby's journey. Comparing with others can add stress — focus on your baby's own progress and talk to a professional if something doesn't feel right." +
      HEALTH_SECTION +
      "See your GP or health visitor if your baby loses skills they had, doesn't make eye contact, or you have persistent concerns about hearing or vision.",
  },
];

const BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));

export function getArticleById(id: string): ArticleContent | null {
  return BY_ID.get(id) ?? null;
}

export function getAllArticles(): ArticleContent[] {
  return [...ARTICLES];
}
