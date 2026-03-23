# Cradl — Cursor prompts
# Work through these in order. Each prompt is self-contained and safe to run independently.
# Estimated total: ~2–3 days of focused implementation.

---

## PROMPT 1 — Today tab: move log grid above the fold

The log grid (Feed, Sleep, Nappy, Tummy, Bottle, More) is currently the third major section on the Today screen, buried below the "Why timing matters" explainer and the sleep sweet spot card. A parent at 3am with a crying baby should be able to log without scrolling. Fix the order:

New order for the Today screen top-to-bottom:
1. Greeting row + stat strip (unchanged)
2. Log grid (move here — must be visible without any scrolling on any modern phone screen)
3. Sleep sweet spot card (compact version — see Prompt 3)
4. Why is she crying card (unchanged)
5. Colic tracker collapsed row (see Prompt 5)
6. Cradl noticed collapsed row (see Prompt 6)
7. Handoff share strip
8. End of Today scroll

Remove from Today entirely: Health log, appointments calendar, "I need a moment" card, Patterns section, Custom trackers section header. These move to new locations in later prompts.

Do not change any existing logic or data — only reorder and conditionally hide components.

---

## PROMPT 2 — Today tab: "Why timing matters" first-run only

The "Why timing matters" card (3 paragraphs + 3 badge legend + dismissal link) currently appears on every visit to the Today screen. This is educational content that should only appear once.

Changes:
- Add a boolean to user preferences/storage: `hasSeenSweetSpotExplainer` (default false)
- On first load where `hasSeenSweetSpotExplainer === false`, show the full "Why timing matters" card exactly as it is now
- When the user taps "Got it — show me her sweet spot →", set `hasSeenSweetSpotExplainer = true` and never show the full card again
- After dismissal, replace the card with a small "?" icon button positioned inline to the right of the "Sleep sweet spot" section label. Tapping "?" opens the full explainer content in a bottom sheet modal (so the information is never lost, just not shown every time)
- The bottom sheet should have the same content as the current card: the three zone explanations (Sweet spot / Closing / Overtired) and the two paragraphs of context

Do not change the content of the explainer — only when and how it appears.

---

## PROMPT 3 — Today tab: compact sleep sweet spot card

The sleep sweet spot card is currently always shown at full height regardless of the current zone. Replace it with a compact single-row version for most states, and only expand to full height when the window is actively open.

Compact row format (used when window is closed, missed, or not yet calculated):
- Left: small coloured dot (green = open, amber = closing, red = overtired, grey = pending)
- Middle: "Sleep sweet spot — [status text]" e.g. "Overtired now · window was 02:02–02:47"
- Right: small chevron to expand

Full card format (used ONLY when status is "Sweet spot" — window currently open):
- Show the full existing card with the arc animation, time range, and advice
- This is the moment that matters most — give it full visual weight

When status is "Overtired now":
- Show compact row in red/muted styling
- One-line advice inline: "Try extra soothing — she'll still settle"
- No separate advice box below

When status is "Pending / no data yet":
- Show compact row: "Sleep sweet spot — log a sleep to activate"
- Grey styling

The full expanded card can be reached by tapping the compact row in any state.

---

## PROMPT 4 — Today tab: hold-to-log (quick log with smart defaults)

Add a hold-to-log interaction to the four primary log buttons: Feed, Sleep, Nappy, Tummy.

Behaviour:
- User presses and holds any of these four buttons
- After 150ms of holding, begin showing a progress indicator: a thin coloured bar that fills along the bottom edge of the button over exactly 2 seconds
- If the user releases before 2 seconds: cancel, no log created, button returns to normal state. Do not open the regular log form.
- If the user holds for the full 2 seconds: auto-log with smart defaults (see below), show a brief haptic feedback pulse, show a toast notification at the bottom of the screen
- A normal tap (under 150ms or released early) opens the existing full log form as normal — do not change tap behaviour

Smart defaults per button:
- **Feed**: log a feed starting now, side = opposite of the last logged side (if last was Left → log Right, if last was Right → log Left, if no history → log Left). Duration = not set (start timer). Toast: "Right breast started — tap to edit"
- **Sleep**: if current time is between 19:00–06:00 → log as "Night sleep, started now". If between 06:00–19:00 → log as "Nap, started now". Toast: "Nap started — tap to stop"
- **Nappy**: log as "Wet" (most common type), time = now. Toast: "Wet nappy logged — tap to edit"
- **Tummy**: log tummy time started now. Toast: "Tummy time started — tap to stop"

Toast design:
- Dark pill at bottom of screen (above nav bar)
- Text: "[What was logged] — tap to edit"
- "Tap to edit" is a tappable link that opens the log entry for editing
- Toast disappears after 3 seconds if not tapped
- Do not show toast if user cancelled the hold

The progress bar fill colour should match the button's existing icon colour (Feed = terracotta, Sleep = sage, Nappy = neutral, Tummy = terracotta).

Do not add hold behaviour to Bottle or More — these require manual input.

---

## PROMPT 5 — Today tab: collapse colic tracker to a single row

The colic tracker currently takes the full width of the screen with a 14-day bar chart, weekly stats, PURPLE crying explanation, and a "5 S's soothing guide" footer. This is too much for Today's primary screen.

Replace with a collapsed single-row card:
- Left: small wave/cry icon in terracotta
- Middle: "Colic · [X] episodes this week" — e.g. "Colic · 12 episodes this week"
- Right: "Log episode" button (small, pill-shaped, existing terracotta style) + chevron to expand
- Tapping the row (anywhere except the log button) expands to show the full existing colic tracker inline — chart, stats, PURPLE crying explanation, 5 S's guide — exactly as currently built
- Tapping the chevron again collapses it
- Default state: collapsed

Show the colic tracker row only if colic has been logged at least once. If never logged, show nothing (the feature is discoverable from the crying diagnostic "Try colic tracker" link and from the Health tab).

The collapsed state should still allow logging an episode via the "Log episode" button without expanding the full card — tapping "Log episode" opens the existing log episode modal directly.

---

## PROMPT 6 — Today tab: collapse "Cradl noticed" and "Patterns" into one row

Currently there are two separate sections on Today: "CRADL NOTICED" and "Patterns". Each takes a full-width card with its own label. Merge these into a single collapsed row.

New design:
- A single row with a small terracotta dot + "Cradl noticed [X] things" where X is the count of active insights
- Tapping the row expands to show all insights as a stacked list, each as a short single-line observation with a coloured left border (green for positive/growth, amber for watch items, purple for leap/developmental)
- Each insight item can be tapped to go to the relevant detail in Story
- Collapses again on second tap

If there are no insights yet (early user), show: "Cradl noticed · keep logging" with a grey dot — do not show "Nothing yet — keep logging" as a full-width card

The leap banner ("Leap 3 is happening now — extra fussiness is normal") should also be folded into this collapsed row as one of the insight items, not as a separate banner above the crying card.

---

## PROMPT 7 — New Health tab (5th tab in nav)

Add a fifth tab to the bottom navigation bar called "Health". Icon: a small stethoscope or heart-with-pulse line (consistent with existing icon style — outlined, not filled).

Tab order: Today · Story · Health · Village · Me

Move the following from Today into the Health tab:
- Health log section (temperature chart, symptoms, medication log)
- Appointments calendar (full monthly calendar, appointment list, past appointments, + New appointment, Export to calendar)
- Medication reminder card
- Pain relief card ("Safe to take now · 28h since last dose")
- Custom trackers section (Vitamin D and any user-added trackers)
- "I need a moment" breathing card (make this the first item at the top of Health)

Health tab structure top-to-bottom:
1. "I need a moment" — 60-second breathing exercise card (always at top, always accessible)
2. Custom trackers (Vitamin D, any added trackers) — compact log rows
3. Medication reminders — upcoming doses, pain relief safety indicator
4. Health log — temperature chart (last 7 days), symptoms log, medication log
5. Appointments — upcoming appointments as a list (not a calendar by default — show calendar as an optional expanded view), + New appointment button

The monthly calendar view should be collapsed by default, showing only the next 3 upcoming appointments as a list. A "See calendar →" link expands the full monthly calendar.

Skin tracker (currently in Me → Tools) should also move here as a section.

Do not remove anything from the existing screens — only move to Health. Then in Prompt 8 we remove from their old locations.

---

## PROMPT 8 — Remove moved items from Today and Me after Health tab is built

After Prompt 7 is working:

Remove from Today:
- Health log section (now in Health)
- Appointments calendar (now in Health)
- "I need a moment" card (now in Health — but also add it to the 3am mode, see Prompt 14)
- Medication reminder card (now in Health)
- Pain relief card (now in Health)
- Custom trackers section (now in Health)
- Patterns section (merged into Cradl Noticed row — see Prompt 6)

Remove from Me → Tools & Admin:
- Skin tracker pill button (now a full section in Health)
- Medication pill button (now in Health)

Keep in Me → Tools & Admin:
- Export data, Memory book, GP summary, Shopping list, Handoff, Return to work, Library, My notes to myself, Quick notes, Safety

---

## PROMPT 9 — Today tab: daily personalised sign-off card

Add a new card at the very bottom of the Today scroll (below the handoff share strip) that appears once the baby has been awake for at least 8 hours or it is after 19:00:

Design:
- Dark background card (same dark ink colour used in the 3am mode and PRO premium page)
- Text in cream: "You fed her [X] times, changed [Y] nappies, and did [Z] minutes of tummy time today."
- Second line in terracotta italic: "You are doing an extraordinary job, [mum's name]."
- [X], [Y], [Z], [mum's name] are all pulled from today's actual log data
- If tummy time is 0: omit the tummy time mention entirely ("You fed her 6 times and changed 4 nappies today.")
- If any count is 0 and all are 0: don't show the card (nothing logged yet)
- Card appears and disappears based on data — don't show a placeholder

This is one of the most important features in the pitch. It must be present in every build.

---

## PROMPT 10 — Ask Cradl AI button: label and visibility

The orange circular chat button in the bottom right of every screen currently appears as an unlabelled icon. This is a PRO headline feature and is invisible to users who don't already know what it is.

Changes:
- Add a small text label "Ask Cradl" below the button icon (8–9px, same cream/white colour)
- The button should only appear on Today and Story screens — remove it from Village and Me where it interrupts other interactions
- On Village: the button obscures the "Ask a question" button and the voice input button. Remove it entirely from Village.
- On Me: remove it. If the user wants to Ask Cradl, they can navigate to Today or Story.
- Keep the voice input button (microphone) as a separate control — do not merge with Ask Cradl
- For free users: tapping the button shows the PRO upsell with the rewarded video option ("Watch a short video for 7 days free"). For PRO users: opens the Ask Cradl chat interface directly.

---

## PROMPT 11 — Story tab: move "Is this normal?" above Growth

Currently the Story tab order is: Weekly narrative → Cradl Noticed → Growth → Is this normal? → Milestones → Developmental leap → Suggested schedule → Your playbook.

Change the order to:
1. Weekly narrative (unchanged — keep at top)
2. Cradl Noticed (unchanged)
3. Is this normal? (move above Growth — parents check this first when anxious)
4. Growth (move below Is this normal?)
5. Milestones (unchanged)
6. Developmental leap (unchanged)
7. Suggested schedule (unchanged)
8. Your playbook (unchanged — keep at bottom as the actionable summary)

No other changes to Story.

---

## PROMPT 12 — Story tab: playbook items as actionable rows

The personal playbook currently shows bullet points with text observations. Make each playbook item an actionable row.

Changes:
- Each playbook item gets a small coloured left border: green for positive observations, amber for suggestions, terracotta for action items
- Add a small arrow or action label on the right of each item where relevant: "Adjust bedtime →" links to the suggested schedule section. "Try left breast →" links to the feed log. "See tummy time →" links to tummy time history in Health.
- Items that are purely informational (no action) have no arrow

Do not change the content of the playbook items — only add the visual treatment and navigation links.

---

## PROMPT 13 — Me tab: "I need a moment" always accessible

"I need a moment" is currently a card that appears at scroll position 4 on Today (after health log, patterns, etc.). It's least accessible when most needed.

Changes:
- Remove from Today scroll (done in Prompt 8)
- Add to top of Health tab (done in Prompt 7)
- Additionally: in the Me tab, pin "I need a moment" as the first card below the greeting/stat strip, before the sleep question. It should always be the first interactive element on Me.
- The card design: soft purple background, "I need a moment" in Lora serif, "60-second breathing exercise" as subtitle, full-width tappable
- Tapping opens the breathing exercise full screen (existing implementation)
- Do not gate this behind PRO — it must always be free

---

## PROMPT 14 — 3am mode: tone shift and "I need a moment" prominence

Between 23:00 and 05:00, the Today screen should shift tone. This is described in the pitch as one of the most important features.

Changes when current time is between 23:00–05:00:
- Replace the greeting "Hello, Sarah." with "You're not alone in this."
- Below the greeting, show a rotating message (cycle through these on each app open or feed log during this window):
  - "Right now, thousands of other parents are doing exactly what you're doing."
  - "The nights are long. They do get shorter. You are doing it."
  - "She knows your voice better than anything else in the world."
  - "Every feed you do tonight is an act of love. Even the hard ones."
  - "You don't have to have it figured out. You just have to be here."
- These messages rotate in order, not randomly, so each feels intentional not arbitrary
- Show the stat strip as normal
- Show the log grid as normal (logging still the primary action)
- Below the log grid: "I need a moment" button — full width, soft and prominent, not just a card. This is the one time it should be impossible to miss.
- The sleep sweet spot card, crying diagnostic, and other cards appear below as normal
- The dark background treatment from the pitch (ink-coloured home screen) is optional — even just the copy change is sufficient and meaningful

Between 05:00–23:00: normal Today screen, no changes.

Store the message index in local state so it advances on each night session, not on each re-render.

---

## PROMPT 15 — Village tab: remove Ask Cradl button, fix layout

The Ask Cradl orange button overlaps the "Ask a question" button in the Q&A section and the voice input button. This creates two visual problems: a button identity crisis (which one do I tap?) and an accessibility issue (the buttons are too close together).

Changes:
- Remove the Ask Cradl floating button from Village entirely (done in Prompt 10)
- The voice input (microphone) button: evaluate whether this is needed on Village at all. If the voice input is for logging baby data, it's out of place in Village. If it's for dictating questions to the Q&A, keep it but move it inside the "Ask a question" card. Otherwise remove from Village.
- "Ask a question" button in the Q&A section: make it full-width, not a small pill — it's the primary action of the Village Q&A section
- Night companion card: this is the best card in Village — keep it exactly as-is

---

## PROMPT 16 — Nav bar: update for 5 tabs

Update the bottom navigation bar to include the new Health tab.

Tab order: Today · Story · Health · Village · Me

Health tab icon: use an outlined heart with a pulse line through it (EKG style), consistent weight and size with existing icons. Or a simple cross/plus in a circle. Do not use a filled icon — keep the outlined style.

Tab label: "Health" — same font size and style as other tab labels.

Ensure the nav bar handles 5 tabs without crowding — reduce icon size slightly if needed or reduce the label font size to 9px consistently across all 5 tabs.

Active tab colour: same terracotta (#C17D5E) as current active state.

---

## PROMPT 17 — Today tab: custom trackers into log grid

Custom trackers (Vitamin D and any user-added trackers) currently appear as a separate section below the log grid with a "+ Add" button. This adds visual weight for what is essentially a 7th log button.

Changes:
- Remove the "Custom trackers" section from Today entirely
- Custom trackers now live in the Health tab (done in Prompt 7)
- If a user has active custom trackers with a reminder due, show a small badge/dot on the Health tab icon in the nav bar (same pattern as notification badges)
- The "+ Add tracker" entry point moves to Health tab → Custom trackers section

---

## PROMPT 18 — Story tab: "Is this normal?" non-alarmist copy audit

The "Is this normal?" section currently shows three sliders (Feeds, Sleep, Nappies) all labelled "A little low" in amber. The advice text is good — non-alarmist. But the amber "A little low" labels on all three simultaneously look alarming even though the copy underneath reassures.

Changes:
- If a metric is within 1 standard deviation of typical for the age: show no badge at all, or show "Within range" in muted grey — not amber
- Only show "A little low" or "A little high" in amber when the value is more than 1.5 SD from typical
- Only show "Speak to your GP" in red when the value is more than 2 SD from typical or when the trend has been low/high for 3+ consecutive days
- The advice copy beneath each slider is already well-written — keep it exactly as-is
- This change reduces false alarm visual signals while keeping the genuine alerts meaningful

---

## PROMPT 19 — Me tab: Cradl Noticed overwhelmed card — safeguarding

The "Cradl Noticed — You've logged 'overwhelmed' several times recently" card with the PANDAS Foundation helpline is one of the best features in the app. Keep it exactly as-is with two small improvements:

1. The "Not a concern · dismiss" link should not use the word "dismiss" — it implies the concern is being waved away. Replace with "I'm okay, thank you" — warmer and more affirming.

2. After the user taps "I'm okay, thank you", do not re-show this specific card for 7 days even if they continue logging overwhelmed. The card should re-appear after 7 days if the pattern continues, but not immediately — give the user breathing room.

3. If the user has logged "Overwhelmed" or "Rage" on 5 or more of the last 7 days, elevate the card styling: add a soft border in the existing purple colour and move it above the sleep question rather than below "Your sleep this week". This is the only circumstance where the card appears above the fold on Me.

Do not add any new content to the card. The existing copy and helpline number are correct.

---

## PROMPT 20 — Me tab: weekly reflection prompt — save and history

The "What surprised you most about becoming a parent?" card currently has a text field and a Save button. There is no visible indication of whether previous responses were saved or how to access them.

Changes:
- After the user taps Save, show a brief confirmation: "Saved to your notes →" that links to Memory book → Notes section
- The weekly prompt question changes each week (week 12 shows "What surprised you most about becoming a parent?", week 13 shows a different question, etc.) — implement a question schedule of at least 18 questions mapped to weeks 1–18 postpartum. Examples:
  - Week 1: "What's one thing you want to remember about these first days?"
  - Week 2: "What has been harder than you expected? What has been easier?"
  - Week 4: "How are you and your partner doing? Really?"
  - Week 6: "What would you tell yourself from before she was born?"
  - Week 8: "What made you laugh this week?"
  - Week 12: "What surprised you most about becoming a parent?" (existing)
  - Week 16: "What is she doing now that she wasn't doing a month ago?"
  - Week 18: "What has she taught you?"
- Previous responses are accessible from Memory book → Notes (not from Me tab — keep Me clean)
- If the user has already answered this week's prompt, show the saved text (read-only with an Edit link) instead of the blank text field

---

## PROMPT 21 — Performance: Today tab scroll position memory

When a user navigates away from Today (to Story, Health, Village, or Me) and then returns, Today should return to the top of the screen — not to the last scroll position. The primary action (log grid) should always be immediately visible when returning to Today.

Additionally: when a user logs a feed, sleep, or nappy, scroll Today back to the top after the log modal closes, so the updated stat strip and any changed cards are visible.

This is a small change but meaningfully improves the one-handed 3am experience.

---

## PROMPT 22 — Onboarding: ask for mum's name in first run

During onboarding, explicitly ask: "What's your name?" (not "What's the mum's name?" — address her directly). This name is used:
- In the daily sign-off ("You are doing an extraordinary job, Sarah.")
- In the Me tab greeting ("Good morning, Sarah.")
- In the weekly reflection save confirmation

If the name was collected in the existing onboarding flow, no change needed — just confirm it's being used in all three places above. If onboarding currently does not collect this, add a step.

The field should be optional but strongly encouraged: "We use this so the app can speak to you as a person, not just as a parent. You can always change it in Settings." If skipped, all personalised copy uses "you" instead of the name — never "Mum".

---

## PROMPT 23 — PRO trial: rewarded video integration on free tier

Free users who tap "Ask Cradl" or any PRO-gated feature see the upsell sheet. The current upsell shows subscription options. Add the rewarded video option as the primary/most prominent choice:

Upsell sheet layout:
- Top: "Try PRO free for 7 days"
- Primary button: "Watch a short video · 7 days free" (full-width, terracotta, using existing rewarded video AdMob integration)
- Below the primary button: a divider line with "or"
- Below divider: the existing subscription options (Monthly / Annual / Lifetime) at smaller visual weight

After the video is watched successfully:
- Grant 7 days PRO access immediately
- Show: "7 days of PRO unlocked. [Feature the user was trying to access] is now available."
- The user can repeat this whenever their PRO trial expires — no limit on repeating

The "PRO · 7 days left" badge currently shown in Story should also appear in the nav bar or header when the user is on a rewarded video trial, so they're always aware of the countdown.

---

## PROMPT 24 — Global: remove floating Ask Cradl/chat button from Village and Me

The orange floating circular button appears on every screen. It overlaps content in Village (covers the "Ask a question" button) and is unnecessary on Me (where the user is in a reflective/personal context, not asking baby questions).

- Today: keep the button — this is where parents ask questions about the baby
- Story: keep the button — this is where parents want to ask "is this normal?"
- Health: keep the button — relevant for health questions
- Village: remove the button entirely
- Me: remove the button entirely

Voice input button (microphone):
- Today: keep
- Story: keep (for dictating notes or questions)
- Health: keep
- Village: remove (or move inside the "Ask a question" card if it's for Q&A input)
- Me: remove — Me is a personal reflection screen, not a logging or question screen

---

## SUMMARY: what these prompts produce

After all 24 prompts are implemented:

**Today tab** becomes a focused action screen: greeting → stats → log grid (above fold) → compact sweet spot → crying diagnostic → collapsed colic row → collapsed Cradl Noticed row → handoff strip → daily sign-off. Maximum 2 short scrolls. Log buttons always visible without scrolling.

**Story tab** is unchanged except order fix and playbook actionability.

**Health tab** (new) holds: breathing exercise → custom trackers → medication → health log → appointments → skin tracker. Everything medical in one place.

**Village tab** is unchanged except button cleanup.

**Me tab** is unchanged except "I need a moment" moves to top, and the overwhelmed card gets two small copy and timing improvements.

**Hold-to-log** is implemented on all four primary log buttons with smart defaults.

**3am mode** is implemented with copy shifts and rotating messages.

**Ask Cradl** button is labelled and visible only where relevant.

**Daily sign-off** appears every evening with personalised data.

**"Why timing matters"** is first-run only, accessible via "?" after dismissal.
