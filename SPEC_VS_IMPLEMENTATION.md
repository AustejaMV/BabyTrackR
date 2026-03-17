# Your 10-Point Spec vs Current Cradl Implementation

This doc maps each item from your product spec to what’s already in the app and what’s missing.

---

## 1. Cradl Concierge — anti-anxiety layer

**Spec:** Every prediction/insight/range has a “reassurance mode”: when something is out of range, show calm, specific copy (e.g. nap window passed, feeds low) — not generic, not clinical.

**Current:** **Partial.**  
- `reassuranceUtils.ts`: `REASSURANCE_MAP` + `getReassuranceForKey(key)` for warning keys (`no-poop`, `feed-overdue`, `no-sleep`, etc.).  
- `ReassuranceBanner` in `WarningIndicators` shows one reassurance line under the alert pills.  
- **Gaps:** Reassurance is only on the **warning pills**. It’s not yet on: nap window card when “past window”, comparative insights/range bars when below range, or feed/sleep stats when “low”. Copy is short one-liners; spec asks for slightly longer, context-rich paragraphs (e.g. “Audrone had 4 feeds today… If she seems content…”).

**Recommendation:**  
- Add reassurance messages to **NapPredictionCard** when status is amber/red (e.g. “The nap window has passed — but that’s okay…”).  
- Add reassurance to **ComparativeInsights** / range bars when a metric is below range (use baby name from context).  
- Optionally extend `REASSURANCE_MAP` (or a new helper) to return 2–3 sentence paragraphs keyed by scenario (nap_passed, feeds_low, sleep_low, etc.) and surface them next to the relevant cards.

---

## 2. Custom tracking categories

**Spec:** Create your own tracker: name, log type (counter / timer / value / yes-no), icon from library (~40), colour, optional daily reminder. Show in log grid, Today’s Timeline, PDF.

**Current:** **Partial.**  
- Custom trackers exist: `CustomTrackerDefinition` (name, icon, optional unit), `CustomTrackerLogEntry` (timestamp, optional value, note).  
- UI: CreateCustomTrackerSheet, CustomTrackerDrawer, dashboard section, timeline “custom” events, PDF section.  
- **Gaps:** No “log type” (counter vs timer vs value vs yes/no) — everything is effectively value + note. No colour picker (only icon set). No reminders. Icon set is small (~10), not 40.

**Recommendation:**  
- Add `logType: 'counter' | 'timer' | 'value' | 'yes_no'` to the definition and adapt the drawer (e.g. counter = one-tap add; timer = start/stop; value = number+unit; yes_no = did it today).  
- Add optional `reminderTime?: string` (HH:mm) and use existing notification scheduler to remind.  
- Expand icon set and add optional `color` to the definition; use it in the dashboard and timeline.

---

## 3. Clock times everywhere

**Spec:** Show both clock time and “X ago”: e.g. “Last fed at 14:23 · 2h 40m ago”. Next feed as clock time: “Next feed: around 17:10” not just “in 40 min”.

**Current:** **Partial.**  
- `dateUtils.ts` has `formatClockTime`, `formatTimeAndAgo`, `formatETA`.  
- UI still uses `getTimeSince` in many places (e.g. Dashboard reminder card, log carousel) and does **not** show the actual clock time next to it.

**Recommendation:**  
- Replace or augment `getTimeSince` usage with `formatTimeAndAgo` and show both: e.g. “Last fed at 14:23 · 2h 40m ago”.  
- Where you show “next feed in X min”, add a line like “Next feed: around 17:10” using current time + interval (and `formatETA` if useful).

---

## 4. Sleep mood logging

**Spec:** Fall asleep method (Independent, Nursing, Rocking, Dummy, Car, Pram, Being held, Co-sleeping); mood on waking (Happy, Calm, Grumpy, Crying, Still tired); sleep location (Cot, Pram, Car seat, Arms, Co-sleeping, Floor). Surface patterns over time.

**Current:** **Partial.**  
- Types: `SleepRecord` has optional `fallAsleepMethod`, `wakeUpMood`, `sleepLocation`.  
- **Gaps:** LogDrawer (sleep) and any sleep log UI may not expose these three fields. No “pattern” surface yet (e.g. “Wakes happy 80% from cot naps over 45 min”).

**Recommendation:**  
- In the sleep log flow (LogDrawer or dedicated sleep sheet), add optional selectors for fall-asleep method, wake-up mood, and sleep location using the spec’s options.  
- Persist them on the sleep record.  
- Add a small “Sleep patterns” block (e.g. on Journey or Dashboard) that aggregates last 2–4 weeks and shows 2–3 sentences like “Wakes happy 80% from cot naps over 45 min”.

---

## 5. Second-baby mode

**Spec:** Onboarding asks “Is this your first baby?”. If not: compact UI, fewer tooltips, one-tap logging, no beginner tips; same data and insights.

**Current:** **Not implemented.**  
- Onboarding does not ask first vs second baby.  
- No “experienced parent” or “second baby” mode that changes density or log flow.

**Recommendation:**  
- Add one step in onboarding (or in settings): “Is this your first baby?” Yes / No.  
- Store in localStorage (e.g. `cradl-first-baby: boolean`).  
- When `false`: use a more compact layout where applicable, skip explanatory tooltips, and offer one-tap quick log (e.g. “Log feed” without opening full drawer) where it makes sense.

---

## 6. Twins mode

**Spec:** When two babies: side-by-side panels, “Which baby?” before logging, nap prediction for both, Why is she crying for both, timeline interleaved with colour coding, combined + per-baby stats.

**Current:** **Partial.**  
- Multi-baby exists: `BabyContext`, `babies[]`, `activeBaby`, switcher.  
- **Gaps:** No dedicated “twins” layout (side-by-side), no “Which baby?” step in the log flow, no dual nap cards, no interleaved timeline with two colours, no combined vs per-baby stat breakdown.

**Recommendation:**  
- Detect “twins mode” when `babies.length === 2` (or an explicit setting).  
- Home: two columns or two panels (one per baby) with last feed/sleep/diaper per baby.  
- When logging: if twins mode, first step “Which baby?” then open the same drawer for that baby.  
- Nap prediction: show two cards or one card with two windows.  
- Today’s Timeline: interleave by time, colour or icon by baby.  
- Stats: one row “Combined” plus one row per baby.

---

## 7. “Good enough” daily reassurance

**Spec:** End of day (or after 8pm) one card: “Audrone had a good day. She fed 6 times (target 5–8 ✓), slept 11h ✓…” or “Today was a little short on sleep… That’s okay for one day.” Warm, non-alarmist.

**Current:** **Done (concept).**  
- `dailySummary.ts`: `generateDailySummary` (lines + acknowledgement), `getParentAcknowledgement`.  
- `DailySummaryCard` on Dashboard shows lines and a warm closing line.  
- **Gap:** Copy may not yet match the spec exactly (explicit “target 5–8 ✓” and “good enough” framing). Show time (e.g. after 8pm) could be made explicit.

**Recommendation:**  
- Adjust `generateDailySummary` (and any copy in `DailySummaryCard` / `parentAcknowledgement`) so the card explicitly states “had a good day”, shows targets with checkmarks where in range, and uses the “little short on sleep… okay for one day” style when something is off.  
- Optionally show the card only after 8pm or on first open after 8pm.

---

## 8. Spit-up / reflux tracker

**Spec:** Dedicated log: severity (small/moderate/large/forceful), timing (during feed / immediately after / 30+ min after), notes. Weekly summary and correlation with feed type / position for GP.

**Current:** **Not implemented.**  
- No dedicated spit-up log type. Could be approximated with a custom tracker but no severity/timing schema or weekly summary.

**Recommendation:**  
- Add types and storage for spit-up entries (severity, timing, note, timestamp; optional link to feed id).  
- Add “Spit-up” to the log grid and a small SpitUpDrawer (or section in Health) with severity + timing.  
- Add a “Spit-up summary” (e.g. last 7 days: count, mostly after feeds, moderate; one line for GP).  
- Optionally correlate with feed type (breast/bottle) and sleep position if you store that.

---

## 9. White noise / sleep environment

**Spec:** Log per sleep: white noise yes/no, room temp (°C), light level (dark/dim/light), sleep aid (dummy, swaddle, sleeping bag, nothing). Surface patterns (e.g. longest sleeps when white noise + 18–19°C).

**Current:** **Not implemented.**  
- Sleep records have no white noise, temperature, light, or sleep aid fields.

**Recommendation:**  
- Extend `SleepRecord` (or a parallel “sleep environment” record keyed by sleep id) with optional: `whiteNoise?: boolean`, `roomTempC?: number`, `lightLevel?: 'dark'|'dim'|'light'`, `sleepAid?: string` (dummy, swaddle, etc.).  
- Add these as optional fields in the sleep log UI.  
- Add a small “Sleep environment” insight that correlates these with duration (e.g. “Longest stretches when white noise on and 18–19°C”).

---

## 10. “What worked” personal playbook

**Spec:** Over 4+ weeks, surface stats like: “Settles fastest when put down drowsy at 11:45”; “Longest sleeps after 20+ min left breast”; “Cot naps 47 min longer than pram”; gate behind premium after 4 weeks.

**Current:** **Partial.**  
- `dailySummary.ts` has `generatePlaybook`; types have `PlaybookTip`.  
- **Gaps:** Implementation may be stub or minimal; spec asks for concrete, data-driven lines (drowsy put-down time, breast duration, cot vs pram length). No clear premium gate at 4 weeks of data.

**Recommendation:**  
- Implement playbook logic that computes from last 4+ weeks: preferred put-down time window, breast duration vs sleep length, cot vs pram vs other location for nap length, tummy time vs settledness, etc.  
- Return 3–5 short “Audrone’s playbook” lines and show in a dedicated card (e.g. on Journey or Dashboard).  
- Gate the playbook card behind premium when `getDaysOfDataAvailable(...) >= 28` (or equivalent).

---

## Summary table

| # | Feature                     | Status   | Next steps |
|---|-----------------------------|----------|------------|
| 1 | Cradl Concierge             | Partial  | Add reassurance to nap card + range bars; longer, contextual copy |
| 2 | Custom trackers             | Partial  | Log type (counter/timer/value/yes_no), colour, reminders, bigger icon set |
| 3 | Clock times everywhere     | Partial  | Use formatTimeAndAgo + “Next feed: 17:10” everywhere |
| 4 | Sleep mood logging         | Partial  | Add fall-asleep/mood/location in sleep log UI; pattern summary |
| 5 | Second-baby mode           | Not done | Onboarding question + compact UI + one-tap log |
| 6 | Twins mode                 | Partial  | Side-by-side, “Which baby?”, dual nap, interleaved timeline |
| 7 | Good enough daily card     | Done     | Tweak copy to match spec; optional “after 8pm” |
| 8 | Spit-up / reflux tracker   | Not done | Types, storage, UI, weekly summary + GP correlation |
| 9 | White noise / environment  | Not done | Extend sleep (or env) model; log UI; pattern insight |
| 10| Personal playbook         | Partial  | Real playbook from 4+ weeks data; premium gate |

---

## Suggested order of work

1. **Quick wins:** (3) Clock times everywhere; (1) Reassurance on nap card + comparative insights.  
2. **High impact, medium effort:** (4) Sleep mood in log + pattern line; (7) Good-enough copy tweaks.  
3. **Differentiation:** (8) Spit-up tracker; (9) Sleep environment; (10) Playbook from real data + premium gate.  
4. **Larger UX:** (5) Second-baby mode; (2) Custom tracker log types + reminders; (6) Twins mode.

If you tell me which number(s) you want to do first, I can outline concrete code changes (files, types, and UI steps) next.
