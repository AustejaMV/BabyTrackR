# More Prompts — Implementation Progress

Source: `more_prompts/cradl-cursor-prompts.md`. Work through in order.

| # | Prompt | Status | Notes |
|---|--------|--------|-------|
| 1 | Today tab: move log grid above the fold | Done | Log grid after stats; removed Health, Appointments, I need a moment, Patterns, Custom trackers from Today |
| 2 | "Why timing matters" first-run only + ? sheet | Done | First-run via cradl-nap-explainer-seen; ? button + bottom sheet |
| 3 | Compact sleep sweet spot card | Done | Compact row for pre/amber/red; full when green or expanded |
| 4 | Hold-to-log (quick log with smart defaults) | Done | HoldToLogButton for Feed/Sleep/Nappy/Tummy; 150ms/2s; quickLog utils; toast + tap to edit |
| 5 | Collapse colic tracker to single row | Done | ColicSection collapsedRow; only show if hasData; expand inline |
| 6 | Collapse Cradl noticed + Patterns into one row | Done | CradlNoticedCollapsed: notices + insights + leapText; tap to expand |
| 7 | New Health tab (5th tab) | Done | HealthScreen: I need a moment, custom trackers, medication/pain, health log, appointments, skin |
| 8 | Remove moved items from Today and Me after Health | Done | Removed from Me TOOLS: Skin tracker, Medication; DESKTOP_TOOLS_CHIPS: Skin tracker |
| 9 | Daily personalised sign-off card | Done | DailySignOffCard: feeds/nappies/tummy + "You are doing an extraordinary job, [name]" |
| 10 | Ask Cradl: label and visibility | Done | "Ask Cradl" label below button; only on Today, Story, Health (not Village/Me) |
| 11 | Story: move "Is this normal?" above Growth | Done | JourneyScreen mobile order: Cradl noticed → Is this normal? → Growth |
| 12 | Story: playbook items as actionable rows | Done | Colored left border; action links (Log feed, See schedule, See tummy time, Log nappy) |
| 13 | Me: "I need a moment" always accessible | Done | First card on Me (desktop left + mobile); BreathingExerciseModal in both |
| 14 | 3am mode: tone shift and "I need a moment" prominence | Done | "You're not alone in this."; rotating messages; advance on leave; button below log grid |
| 15 | Village: remove Ask Cradl, fix layout | Done | Ask Cradl removed (P10); "Ask a question" full-width button in Q&A section |
| 16 | Nav bar: update for 5 tabs | Done | Health tab added between Story and Village; heart+pulse icon |
| 17 | Today: custom trackers into Health (badge on Health tab) | Done | hasCustomTrackerReminderDue(); badge dot on Health nav item |
| 18 | Story: "Is this normal?" non-alarmist copy audit | Done | Within 1 SD = "Within range"; >2 SD = "Speak to your GP"; else "A little low/high" |
| 19 | Me: Cradl Noticed overwhelmed card — safeguarding | Done | "I'm okay, thank you"; 7-day cooldown; elevated (purple border, above sleep) when 5+ of 7 days |
| 20 | Me: weekly reflection — save and history | Done | 18 questions (weeks 1–18); "Saved to your notes →" link; read-only + Edit when answered |
| 21 | Performance: Today tab scroll position memory | Done | Scroll to top on mount and when drawer closes |
| 22 | Onboarding: ask for mum's name | Done | "What's your name?"; parentName saved and used in sign-off + Me greeting |
| 23 | PRO trial: rewarded video integration | Done | PremiumGate: "Watch a short video for 7 days free" |
| 24 | Global: remove Ask Cradl from Village and Me | Done | Same as P10: only Today, Story, Health |

---

## Done (summary)

- **P1–P3**: Today layout, explainer, compact sweet spot.
- **P4**: Hold-to-log: HoldToLogButton, quickLog (feed/sleep/diaper/tummy), toasts.
- **P5**: ColicSection collapsedRow, show only if ever logged.
- **P6**: CradlNoticedCollapsed merges notices, insights, leap; tap to expand.
- **P7**: HealthScreen with I need a moment, trackers, medication, health log, appointments, skin.
- **P8**: Skin + Medication removed from Me Tools.
- **P9**: DailySignOffCard at bottom of Today (feeds/nappies/tummy + mum's name).
- **P10/P24**: Ask Cradl label; only on Today, Story, Health.
- **P11**: Story order: Is this normal? above Growth.
- **P13**: "I need a moment" first card on Me.
- **P14**: 3am mode: "You're not alone", rotating messages, I need a moment below log grid.
- **P15**: Village: Ask a question full-width; Ask Cradl not on Village.
- **P16**: Nav 5 tabs with Health.
- **P17**: Health tab badge when custom tracker reminder due.
- **P19**: Overwhelmed card: "I'm okay, thank you", 7-day cooldown, elevated when 5+ of 7 days.
- **P21**: Today scroll to top on return and after log.
- **P22**: Onboarding "What's your name?".

## Parity and shortcuts

- **Desktop + mobile**: "I need a moment" added as first card on Me in both desktop (left column) and mobile. BreathingExerciseModal rendered in both branches.
- **URL action shortcuts** (Dashboard `?action=`): feed, sleep, diaper, nappy, bottle, tummy, pump, timeline, pee, health (navigates to /health). VoiceCommandButton and CradlPullTab use same actions (e.g. nav("/?action=feed")).

## All 24 prompts done

- **P12**: PersonalPlaybook: left border color by insight type; action links (Log feed →, See schedule →, etc.).
- **P18**: JourneyScreen tagForValue by SD; IsThisNormalCard supports "Within range", "Speak to your GP".
- **P20**: weeklyReflectionStorage (18 questions weeks 1–18); save + "Saved to your notes →" link; read-only + Edit when already answered; both desktop and mobile reflection blocks updated.
- **P23**: PremiumGate already had rewarded video; label set to "Watch a short video for 7 days free".
