# Cradl - Implementation Summary

## Implementation Checklist (Sections 1–14)

- **Section 1: Wake Window & Sweetspot Nap Prediction** — [DONE] (`src/app/data/wakeWindows.ts`, `src/app/utils/napPrediction.ts`, `src/app/components/NapPredictionCard.tsx`, `src/app/utils/napPrediction.test.ts`; card on Dashboard below reminder, above log buttons)
- **Section 2: Schedule Creator** — [DONE] (`src/app/data/napSchedules.ts`, `src/app/components/ScheduleCreator.tsx`, `src/app/utils/scheduleCreator.test.ts`; Schedule section on Journey below milestones, above "How is she doing?")
- **Section 3: Insights Engine** — [DONE] (`src/app/utils/insights.ts`, `src/app/components/InsightsSection.tsx`, `src/app/utils/insights.test.ts`; Insights section on Journey below Schedule; first 2 free, rest gated by isPremium)
- **Section 4: Comparative Insights ("Is This Normal?")** — [DONE] (`src/app/data/normalRanges.ts`, `src/app/components/ComparativeInsights.tsx`, `src/app/data/normalRanges.test.ts`; under "How is she doing?" on Journey)
- **Section 5: "Why Is She Crying?" Diagnostic Card** — [DONE] (`src/app/utils/cryingDiagnostic.ts`, `src/app/components/WhyIsCryingCard.tsx`, `src/app/utils/cryingDiagnostic.test.ts`; on Dashboard below NapPredictionCard when baby awake)
- **Section 6: Temperature & Symptom Tracking** — [DONE] (`src/app/types/health.ts`, `src/app/utils/healthStorage.ts`, `src/app/components/HealthLogDrawer.tsx`, `src/app/components/HealthHistorySection.tsx`, `src/app/utils/healthStorage.test.ts`; Health button on Dashboard, health in timeline, Health log on More)
- **Section 7: Solid Food Logging** — [DONE] (`src/app/types/solids.ts`, `src/app/utils/solidsStorage.ts`, `src/app/components/SolidFoodDrawer.tsx`, `src/app/components/FoodsIntroducedList.tsx`, `src/app/utils/solidsStorage.test.ts`; Solids button on Dashboard, Foods introduced on Journey when ≥17 weeks)
- **Section 8: Tooth Tracking** — [DONE] (`src/app/data/teethData.ts`, `src/app/types/teeth.ts`, `src/app/utils/teethStorage.ts`, `src/app/components/TeethTracker.tsx`, `src/app/utils/teethStorage.test.ts`; Teeth section on Journey when ≥20 weeks)
- **Section 9: Growth Chart with WHO Percentiles** — [DONE] (existing `whoGrowth.ts`, `GrowthChartSection.tsx`; added `growthStorage.ts`, `getPercentile`, `whoGrowth.test.ts`, `growthStorage.test.ts`; `growthMeasurements` in SYNCED_DATA_KEYS)
- **Section 10: Activity / Playtime Logging** — [DONE] (`src/app/types/activity.ts`, `src/app/utils/activityStorage.ts`, `src/app/components/ActivityDrawer.tsx`, `src/app/utils/activityStorage.test.ts`; Activity button on Dashboard, activity stat pill "Xm play", activityHistory in SYNCED_DATA_KEYS)
- **Section 11: Enhanced PDF Report (Premium)** — [DONE] (`pdfExport.ts`: `generatePediatricReport(isPremium)`; premium: cover page with photo + "Report for GP/health visitor" + 30-day range; footer branding; free: watermark on page 2+)
- **Section 12: History Gating (30-Day Free Limit)** — [DONE] (`src/app/utils/historyGating.ts`: `filterBySubscription`, `getDaysOfDataAvailable`; applied in `TodayTimelineModal` when `isPremium` false; `historyGating.test.ts`)
- **Section 13: Premium Gate Infrastructure** — [DONE] (`src/app/contexts/PremiumContext.tsx`: `usePremium`, `PremiumProvider`; `src/app/components/PremiumGate.tsx`; app wrapped in `PremiumProvider` in `main.tsx`; `cradl-premium` localStorage key)
- **Section 14: Developmental Leaps (Wonder Weeks Style)** — [DONE] (existing `leaps.ts`; added `isInLeap`, `getFreePreviewText`; `LeapsCard` shows free preview + "See more" → `PremiumGate` for full description/signs/tips; `leaps.test.ts`)
- **Handoff (Prompt 1 — original)** — [DONE] (`src/app/types/handoff.ts`, `src/app/utils/handoffGenerator.ts`, `src/app/utils/handoffApi.ts`, `src/app/pages/HandoffPage.tsx`; route `/handoff/:sessionId`; "Leaving now" button + bottom sheet on Dashboard; Supabase handoff routes; poll merge; tests)

Run `npm test` to verify all tests pass before marking sections [DONE].

---

## Prompts to-do list (roadmap)

**Implementation order:** Complete all "Previously listed", "New prompts", and "Additional prompts" (skin, jaundice, onboarding, watch, a11y, offline, CSV, i18n, empty states) in any order. Then implement **Village** prompts last: Village 6 (safety) → Village 1 → 2 → 3 → 4 → 5 → Village 7 (Group Board).

**Previously listed (pending):**

- **Prompt 2 — Mum's recovery tracker + EPDS** — [DONE] `src/app/types/mumHealth.ts`, `src/app/utils/mumHealthStorage.ts`, `src/app/utils/epdsScoring.ts`; `MumWellbeingScreen.tsx` (tabs: Pain relief, Recovery, Pelvic floor, Mood check); route `/mum`; "You matter too" link on Dashboard and More; woundCareHistory, pelvicFloorHistory, breastPainHistory, epdsResponses in SYNCED_DATA_KEYS; tests: `epdsScoring.test.ts`, `mumHealthStorage.test.ts`.
- **Prompt 3 — GP prep one-pager** — [DONE] `gpSummary.ts` (generateGPSummary), `GPSummaryScreen.tsx` (one-pager), route `/gp-summary`, link on MoreScreen "Prepare for GP visit"; tests `gpSummary.test.ts`.
- **Prompt 4 — Sleep regression detector** — [DONE] `sleepRegression.ts` (detectSleepRegression), `RegressionCard.tsx` on Dashboard with dismiss (7-day); tests `sleepRegression.test.ts`.
- **Prompt 5 — "Is she ready for..." advisor** — [DONE] `readinessUtils.ts` (generateReadinessCards: nap drop, solids, night feeds, cot), `ReadinessCard.tsx` on Dashboard; tests `readinessUtils.test.ts`.
- **Prompt 6 — Partner / caregiver simplified mode** — [DONE] `RoleContext.tsx`: `FamilyRole` ('primary' | 'partner'), `useRole()`, localStorage `cradl-family-role`. `PartnerHomeScreen`: feed/sleep/diaper/bottle log buttons, "See today" (TodayTimelineModal), "Switch to full view" (setRole('primary'), navigate /). `HomeSwitch`: renders Dashboard or PartnerHomeScreen by role. Settings: "App view" — Full view / Partner view. RoleProvider in App.tsx.
- **Prompt 7 — Memory book** — [DONE] Premium. Types: `src/app/types/memory.ts` (MemoryDayEntry, MemoryMonthlyRecap). Storage: `memoryStorage.ts` (getMemoryDays, saveMemoryDay, getMemoryDayForDate, deleteMemoryDay; getMonthlyRecaps, saveMonthlyRecap, getMonthlyRecapFor, deleteMonthlyRecap). memoryDays + memoryMonthlyRecaps in SYNCED_DATA_KEYS. UI: DayCard, MonthlyRecapCard, AddDayMemorySheet (date, note, photo), AddMonthlyRecapSheet (yearMonth, note). MemoryBookScreen: days grouped by month, monthly recaps, Share recap (Web Share or clipboard). Route `/memories`, link on MoreScreen. Gate: PremiumGate wraps content. Tests: `memoryStorage.test.ts`.
- **Prompt 8 — Breastfeeding supply monitor** — [DONE] `src/app/utils/supplyAssessment.ts` (assessSupply), `SupplyMonitorCard.tsx` on Journey (Supply balance last 7 days).
- **Prompt 9 — Anti-anxiety reassurance (Cradl Concierge)** — [DONE] `src/app/utils/reassuranceUtils.ts` (REASSURANCE_MAP, getReassuranceForKey); `ReassuranceBanner.tsx` below warning pills in `WarningIndicators.tsx`. Tests: `reassuranceUtils.test.ts`.
- **Prompt 10 — Custom tracking categories** — [DONE] Types: `src/app/types/customTracker.ts` (CustomTrackerDefinition, CustomTrackerLogEntry). Storage: `customTrackerStorage.ts` (getCustomTrackers, saveCustomTracker, getCustomTrackerLogs, saveCustomTrackerLog); customTrackers + customTrackerLogs in SYNCED_DATA_KEYS. Data: `customTrackerIcons.ts` (CUSTOM_TRACKER_ICONS, getIconEmoji). UI: CreateCustomTrackerSheet, CustomTrackerDrawer; Dashboard "Custom trackers" section with Add tracker + per-tracker buttons; timeline kind "custom" in timelineUtils + TodayTimelineModal; PDF "Custom trackers" section. Tests: `customTrackerStorage.test.ts`.
- **Prompt 11 — Clock times + sleep mood** — [DONE] `dateUtils.ts`: formatClockTime, formatTimeAndAgo, formatETA; `SleepRecord` extended with optional fallAsleepMethod, wakeUpMood, sleepLocation.
- **Prompt 12 — Daily "good enough" card + playbook** — [DONE] `dailySummary.ts` (generateDailySummary, generatePlaybook), `DailySummaryCard.tsx` on Dashboard with parent acknowledgement; tummyTimeHistory state added for summary.

**New prompts (to paste into Cursor one at a time):**

- **[DONE] New Prompt 1 — 3am companion mode** — `src/app/utils/nightMode.ts` (isNightHours, getNightMessage); `NightModeOverlay.tsx` (floating card 23:00–05:00, once per session, "I need a moment" → BreathingExerciseModal); `BreathingExerciseModal.tsx` (inhale 4s / hold 4s / exhale 4s / rest 2s, 4 rounds, Done + Skip); HomeScreen dimming (opacity 0.92 + warm tint) when isNightHours(); overlay not shown when feed/sleep/tummy timer active; `nightMode.test.ts`, `BreathingExerciseModal.test.tsx`.
**Village — implement LAST (after all other prompts in this doc). Order: do Village 6 first (safety infra), then 1, 2, 3, 4, 5, then Group Board.**

- **[DONE] Village 1 — Night-feed "who else is up"** — Edge `POST /village/night-ping` (KV: geohash + pinged_at, rate limit 1/10min). NightModeOverlay: consent prompt, villageNightPing when consented + signed in, formatNightCount (1–5 exact, A few/Many/Lots of). `villageApi.ts`, `villageApi.test.ts`. localStorage `cradl-night-ping-consent`.
- **[DONE] Village 2 — Venue reviews** — Edge KV: GET/POST /village/venues, POST/GET /village/venues/:id/reviews (contentFilter). villageVenueService.ts; VillagePlacesScreen: list, add venue, add review.
- **[DONE] Village 3 — Private invite-only groups** — Edge KV: POST /village/groups (8-char shortcode), POST /village/groups/join, GET /village/groups/mine, GET/POST /village/groups/:id/messages (contentFilter). villageGroupService.ts; VillageGroupsScreen (create/join), VillageGroupDetailScreen (Chat | Board | Events). Route /join/:shortcode → JoinRedirect to /village/groups?join=.
- **[DONE] Village 4 — Anonymous Q&A feed** — Edge KV: GET/POST /village/qa/questions, GET/POST /village/qa/questions/:id/answers (contentFilter). villageQaService.ts; VillageQAScreen, VillageQuestionDetailScreen.
- **[DONE] Village 5 — Village tab shell** — Fourth nav tab "Village". VillageScreen: four cards (Who else is up, Places, Groups, Ask other parents), first-visit Safety & Privacy sheet. `cradl-village-safety-shown`.
- **[DONE] Village 6 — Village safety infrastructure** — Edge: contentFilter (email/phone/URL), POST /village/delete-my-data (clear user village keys). Settings Danger Zone: "Delete my Village data". KV-based; no separate tables.
- **[DONE] Village 7 — Group Board** — Edge: GET/POST /village/groups/:id/board (title 3–100, body 500, contentFilter). VillageGroupDetailScreen Board tab: list items, add board item.

- **New Prompt 3 — Identity preservation** — [DONE] `BabyProfile`/`Baby`: parentName (max 40); `personalAddress.ts`: getGreeting(parentName, babyName, hour), getWeeklyYouMoment + markWeeklyYouMomentShown; `parentAcknowledgement.ts`: getParentAcknowledgement(parentName, stats). Dashboard greeting via getGreeting; DailySummaryCard uses getParentAcknowledgement; Settings "Your name" field; babyProfile sync includes parentName.
- **New Prompt 4 — Contextual knowledge base** — [DONE] `src/app/types/article.ts`, `src/app/data/articles.ts` (ARTICLES: four-month-sleep-regression, no-dirty-nappy, safe-sleep-guide, green-poo, overtired-baby; id, title, body, excerpt, triggerConditions, ageRangeWeeks, tags, lastReviewed). `articleTrigger.ts`: buildActiveTriggers(warnings, sleepRegressionDetected, firstAppOpen), checkArticleTriggers(activeTriggers, ageInWeeks), markArticleDismissed; cradl-dismissed-articles 7-day dismiss. `articleLoader.ts`: loadArticle(id). `ArticleCard.tsx`, `ArticleModal.tsx` ("When to call GP/111" highlighted, dismiss 7 days). Dashboard: up to 2 triggered article cards; More: "Library" link → `LibraryScreen.tsx` (search, categories). Route `/library`. Tests: `articleTrigger.test.ts`, `articleLoader.test.ts`, `articles.test.ts`.
- **New Prompt 5 — Return to work planner** — [DONE] `src/app/types/returnToWork.ts`, `returnToWorkGenerator.ts` (feeding transition, sleep shift, nursery handoff doc, countdown messages). `ReturnToWorkPlanner.tsx` (form → Feeding plan | Sleep shift | Handoff doc tabs). `ReturnToWorkCountdownCard` on Dashboard when return within 7 days (dismiss for today). Proactive card at 26 weeks with "Start planning" → `/return-to-work`. Route `/return-to-work`, link on MoreScreen. `returnToWorkStorage.ts`; `returnToWorkPlan` in SYNCED_DATA_KEYS. Tests: `returnToWorkGenerator.test.ts`.
- **New Prompt 6 — Postnatal rage tracker** — [DONE] MoodKey extended with "overwhelmed" in moodStorage; WellbeingCard: Overwhelmed option, inline acknowledgment card ("Thanks — save this" / "Tell me more"), support card when shouldSuggestSupport (dismiss 14 days via cradl-overwhelmed-support-dismissed). `ragePattern.ts`: detectOverwhelmedPattern. Mood history: CloudLightning icon + rose tint for overwhelmed. (Article postnatal-rage.md + auto-open "Tell me more" can be added later.)
- **New Prompt 7 — Ask Cradl (AI Q&A)** — [DONE] Premium. `src/app/utils/askCradl.ts`: askCradl(question, babyAgeWeeks, recentContext, accessToken) → POST /ask-cradl (client stub; 401/403/429 fallbacks). AskCradlSheet: input, quick questions, loading, answer + escalation card (routine/monitor/urgent), disclaimer; non-premium shows PremiumGate. Floating "Ask" button on Dashboard; cradl-ask-history local. Edge Function POST /ask-cradl and Claude integration to be added server-side.
- **New Prompt 8 — Nappy contents visual guide** — [DONE] `nappyGuide.ts`: NAPPY_GUIDE (10 entries, colourHex, isNormal, whenToCallGP/999). `NappyGuideSheet.tsx`: list + swatches, filter All / Normal / When to call GP. LogDrawer (diaper): "Not sure what you're seeing? Check the nappy guide" when Dirty/Both. Tests `nappyGuide.test.ts`.
- **New Prompt 9 — Mum's sleep debt tracker** — [DONE] `src/app/types/mumSleep.ts`, `mumSleepStorage.ts` (key mumSleepHistory, SYNCED_DATA_KEYS), `mumSleepAnalysis.ts` (analyseMumSleep, wasSupportCardShownRecently, markSupportCardShown). `MumSleepPrompt.tsx` on Dashboard (once/day after 05:30, cradl-mum-sleep-prompt-date). `MumSleepHistory.tsx` in Mum Wellbeing "Sleep" tab (7-day bar, support card, "Ask someone to cover" share). cradl-mum-sleep-card-shown 48h guard.
- **New Prompt 10 — "What I'd tell my past self" time capsule** — [DONE] Local only. `src/app/types/timeCapsule.ts`, `timeCapsuleStorage.ts`, `timeCapsuleTrigger.ts` (getTimeCapsuleTrigger 26/52/104 weeks, getTimeCapsuleShowBack, getDefaultShowBackWeeks). `TimeCapsulePromptCard`, `TimeCapsuleWriteScreen` (route `/time-capsule/write?weeks=`), `TimeCapsuleShowBackCard`. Dashboard: show-back priority, then prompt (above WellbeingCard). Mum Wellbeing: "Notes to self" tab with list and Delete. Tests: `timeCapsuleTrigger.test.ts`.

**Additional prompts (skin, jaundice, onboarding, watch, a11y, offline, CSV, i18n, empty states):**

- **Add Prompt 1 — Skin/eczema tracker** — [DONE] Types: `src/app/types/skin.ts`. Storage: `skinStorage.ts`; `skinCorrelation.ts`. UI: `SkinTrackerScreen.tsx` with AddFlareSheet, AddCreamSheet, AddTriggerSheet (severity, body areas, appearance, product, trigger type, description). Route `/skin`, link on MoreScreen. Tests: `skinStorage.test.ts`, `skinCorrelation.test.ts`. (PDF skin section and Health quick-log optional.)
- **Add Prompt 2 — Jaundice monitoring** — [DONE] Types: `src/app/types/jaundice.ts` (JaundiceSkinCheck, JaundiceColour, JaundiceArea, JaundiceAlert). Storage: `cradl-jaundice-checks` local only; `cradl-jaundice-card-dismissed` (YYYY-MM-DD) for Dashboard card. `jaundiceAssessment.ts`: assessJaundice(check, babyAgeHours), isJaundiceMonitoringActive(babyDob), getJaundiceAgeDays, computeJaundiceFeeds. `jaundiceStorage.ts`: getJaundiceChecks, saveJaundiceCheck. `jaundiceColours.ts`: JAUNDICE_COLOUR_OPTIONS (hex swatches). UI: JaundiceMonitorScreen (how-to-check, history, AddJaundiceCheckSheet); AddJaundiceCheckSheet (step 1 light checklist, step 2 colour cards, step 3 feeds stepper; on save assessment alert, 111 dialler, 3s min before dismiss). Route `/jaundice`; link on MoreScreen. Dashboard card when baby &lt;21 days: "Jaundice watch — day X", last check, "Check now", dismiss for today. Tests: `jaundiceAssessment.test.ts`.
- **Add Prompt 3 — Onboarding flow** — [DONE] `onboardingStorage.ts`: isOnboardingComplete (true if cradl-onboarding-complete or babies[0].birthDate), markOnboardingComplete, getOnboardingStep, saveOnboardingStep, clearOnboardingStep. `OnboardingNavigator.tsx`: 6 steps — 0 Welcome (Cradl + moon/star, 1.5s auto), 1 ValueProp (3 cards, 3s auto, Get started), 2 BabySetup (name optional, birth date/time required, icon/photo; pregnancy/age warning), 3 ParentSetup (your name, Skip), 4 Account (Skip), 5 Permissions (notifications, Go to Cradl). Progress dots, back on 2–5, Skip on 3–4. App.tsx BabyGate: show OnboardingNavigator when !firstLaunchDone && !isOnboardingComplete() && no babies; onComplete mark complete + refresh; else if no babies show OnboardingFlow (add baby); else app. Existing user: useEffect marks complete when babies.length > 0 && babies[0].birthDate. Dashboard: welcome banner once (cradl-welcome-banner-shown, dismiss sets key). babiesStorage loadBabyDataIntoCurrent includes parentName in legacy profile. Tests: `onboardingStorage.test.ts`.
- **Add Prompt 4 — Apple Watch & Wear OS complications** — [DONE] `src/app/utils/watchBridge.ts`: WatchState type, updateWatchState (web: no-op), getWatchState. Web bridge complete; native Watch/Wear OS out of scope. Tests: `watchBridge.test.ts`.
- **Add Prompt 5 — Accessibility** — [DONE] `accessibility.ts`: a11y(), a11yChart(), a11yLiveRegion(). `useAccessibleFontSize.ts`: getAccessibleFontScale, setAccessibleFontScale, useAccessibleFontSize(basePx). `minimumTapTargets.ts`: MIN_TAP_SIZE 44, ensureTapTarget(style). `contrastChecker.ts`: getContrastRatio, meetsWCAGAA. AccessibleDataTable.tsx (caption, headers, rows). Settings: Accessibility section — Reduce motion, Larger text (100/125/150/200%), High contrast; data-font-scale and data-high-contrast applied on root; theme.css overrides. Tests: `contrastChecker.test.ts`.
- **Add Prompt 6 — Offline indicator** — [DONE] `networkStatus.ts`: useNetworkStatus() → { isOnline, wasOffline }. `OfflineIndicator.tsx`: offline banner; "Back online — syncing..." when wasOffline. `AppLayout.tsx`: flushPendingSaves when back online. `dataSync.ts`: getPendingSavesCount(). Dashboard: "Syncing… X pending" when pending. Tests: `networkStatus.test.ts`.
- **Add Prompt 7 — CSV data export** — [DONE] `csvExport.ts`: generateCSV (RFC 4180, escape, injection guard), formatDateForCSV, formatDurationForCSV; generateAllCSVs(babyName) from localStorage (feeds, sleep, diapers, tummy, growth, temperature, solids, mum_sleep). CSVExportButton in Settings "Export data" section; downloads each CSV in browser. Last exported in cradl-last-csv-export. Tests: `csvExport.test.ts`.
- **Add Prompt 8 — Multi-language (i18n)** — [DONE] `languageStorage.ts`: getLanguage, setLanguage, SupportedLocale (en, lt), LOCALE_LABELS. `LanguageContext.tsx`: LanguageProvider, t(key); loads en.json and lt.json. `data/locales/en.json`, `data/locales/lt.json`: common, home, settings, nav. Navigation uses t() for nav labels. Further t() migration incremental.
- **Add Prompt 9 — Empty state strategy** — [DONE] `EmptyState.tsx`: illustration (ReactNode or EMPTY_ILLUSTRATIONS key), title, body, actions, compact; a11y. EMPTY_ILLUSTRATIONS: baby, log, calendar, journey, place, note. `appState.ts`: getAppCompleteness(). Applied on Dashboard (no DOB, no logs today), Journey (no baby), More (no notes). Tests: `appState.test.ts`.

---

## Data keys (localStorage)

Synced (SYNCED_DATA_KEYS): `sleepHistory`, `feedingHistory`, `diaperHistory`, `tummyTimeHistory`, `bottleHistory`, `pumpHistory`, `currentSleep`, `currentTummyTime`, `feedingInterval`, `feedingActiveSession`, `painkillerHistory`, `notes`, `shoppingList`, `babyProfile`, `milestones`, `temperatureHistory`, `symptomHistory`, `medicationHistory`, `solidFoodHistory`, `growthMeasurements`, `activityHistory`, `woundCareHistory`, `pelvicFloorHistory`, `breastPainHistory`, `epdsResponses`, `skinFlares`, `skinCreams`, `skinTriggers`, `mumSleepHistory`, `returnToWorkPlan`, `memoryDays`, `memoryMonthlyRecaps`, `customTrackers`, `customTrackerLogs`.

Other: `toothHistory`, `babytrackr-schedule-prefs`, `babytrackr-last-nap-stage`, `cradl-premium`, `cradl-handoff-sessions`, `cradl-mum-sleep-prompt-date`, `cradl-mum-sleep-card-shown`, `cradl-overwhelmed-support-dismissed`, `cradl-time-capsules`, `cradl-last-csv-export`, `cradl-rtw-countdown-dismissed`, `cradl-family-role`, `cradl-reduce-motion`, `cradl-dismissed-articles`, `cradl-jaundice-checks`, `cradl-jaundice-card-dismissed`, `cradl-onboarding-complete`, `cradl-onboarding-step`, `cradl-welcome-banner-shown`, `cradl-larger-text`, `cradl-high-contrast`, `cradl-ask-history`, `cradl-language`, `cradl-night-ping-consent`, `cradl-village-safety-shown`.

---

## Premium gates

- **Insights**: First 2 insights free; rest behind `isPremium` (InsightsSection).
- **Today timeline**: Last 30 days only when `!isPremium` (filterBySubscription in TodayTimelineModal).
- **Leaps**: Free preview text only; full description/signs/tips behind PremiumGate (LeapsCard).
- **PDF report**: Premium gets cover page, 30-day range, no watermark; free gets watermark on page 2+.
- **Memory book**: Full screen behind PremiumGate (MemoryBookScreen); day entries, monthly recaps, shareable recaps.

---

## Tests (test files)

- `napPrediction.test.ts` — nap/wake window
- `scheduleCreator.test.ts` — schedule builder
- `insights.test.ts` — insights engine
- `normalRanges.test.ts` — normal ranges/assessMetric
- `cryingDiagnostic.test.ts` — crying reasons
- `healthStorage.test.ts` — temperature/symptom/medication guards
- `solidsStorage.test.ts` — solid food guards
- `teethStorage.test.ts` — tooth save/remove, getExpectedTeeth
- `whoGrowth.test.ts` — getPercentile
- `growthStorage.test.ts` — growth entry guards
- `activityStorage.test.ts` — activity guards
- `historyGating.test.ts` — filterBySubscription, getDaysOfDataAvailable
- `leaps.test.ts` — getLeapAtWeek, getNextLeap, isInLeap, getFreePreviewText
- `epdsScoring.test.ts` — scoreEPDS (10 answers, 0–3, reverse items, flagged, severity)
- `mumHealthStorage.test.ts` — wound care, pelvic floor, breast pain, EPDS save/get guards
- `gpSummary.test.ts` — generateGPSummary overview and age
- `sleepRegression.test.ts` — detectSleepRegression guards and drop detection
- `readinessUtils.test.ts` — generateReadinessCards, solids card
- `nappyGuide.test.ts` — NAPPY_GUIDE pale_white, whenToCallGP/999, colourHex
- `personalAddress.test.ts` — getGreeting hours and names
- `parentAcknowledgement.test.ts` — getParentAcknowledgement
- `handoffGenerator.test.ts` — generateHandoffSession (empty/full), getHandoffShareUrl, getHandoffSessionFromLocal, isHandoffSessionExpired, mergeHandoffLogsIntoMain
- `HandoffPage.test.tsx` — render with valid session, expired session, missing session id
- `skinStorage.test.ts` — save flare/cream/trigger guards
- `skinCorrelation.test.ts` — computeSkinCorrelations, generateSkinInsights (no allergy wording)
- `ragePattern.test.ts` — detectOverwhelmedPattern
- `mumSleepAnalysis.test.ts` — analyseMumSleep, consecutive poor, support card
- `supplyAssessment.test.ts` — assessSupply low_data/balanced/left_favoured/right_favoured
- `reassuranceUtils.test.ts` — getReassuranceForKey, REASSURANCE_MAP
- `timeCapsuleTrigger.test.ts` — getTimeCapsuleTrigger, getTimeCapsuleShowBack, getDefaultShowBackWeeks
- `csvExport.test.ts` — generateCSV escape/injection, formatDateForCSV, formatDurationForCSV, generateAllCSVs
- `appState.test.ts` — getAppCompleteness hasBaby, hasDob, hasAnyLogs
- `returnToWorkGenerator.test.ts` — generateReturnPlan past date guard, nursery handoff, getCountdownMessageForToday, isReturnWithinSevenDays
- `networkStatus.test.ts` — useNetworkStatus export
- `articleTrigger.test.ts` — buildActiveTriggers, checkArticleTriggers, dismissed within 7 days
- `articleLoader.test.ts` — loadArticle valid/invalid id
- `articles.test.ts` — ARTICLES body length, getArticleById, getAllArticles
- `jaundiceAssessment.test.ts` — isJaundiceMonitoringActive, getJaundiceAgeDays, assessJaundice, computeJaundiceFeeds
- `onboardingStorage.test.ts` — isOnboardingComplete, markOnboardingComplete, getOnboardingStep, saveOnboardingStep, clearOnboardingStep
- `memoryStorage.test.ts` — day entries save/replace/delete, monthly recaps save/replace/delete
- `watchBridge.test.ts` — getWatchState default, updateWatchState no-op
- `villageApi.test.ts` — getNightPingConsent/setNightPingConsent, formatNightCount

---

## Accessibility & theme

- New interactive elements use `aria-label` where appropriate (e.g. PremiumGate "Premium feature", TeethTracker mouth diagram, HealthHistorySection "Health log").
- New cards use `role="region"` and `aria-label` (NapPredictionCard, WhyIsCryingCard, InsightsSection, ComparativeInsights, HealthHistorySection, FoodsIntroducedList, TeethTracker, PremiumGate).
- Styling uses CSS variables (`var(--tx)`, `var(--card)`, `var(--bd)`, etc.) for light/dark theme consistency.

---

## ✅ All Requested Features Implemented

### 1. Supabase Integration with Google OAuth ✅
- **Backend API**: Full REST API in `/supabase/functions/server/index.tsx`
  - Family management endpoints
  - Data sync endpoints
  - User authentication verification
- **Frontend Integration**: 
  - AuthContext provides authentication state
  - Automatic login/logout handling
  - Session management
- **Google OAuth**: Users sign in with Google (requires setup - see below)

### 2. Family Sharing ✅
- **Create Family**: Automatic on first sign-in
- **Invite Members**: Send invites by email from Settings page
- **Auto-Accept**: Invitees automatically join when they sign in
- **Shared Data**: All family members see the same tracking data

### 3. PDF Export for Pediatrician ✅
- **Export Button**: In Settings page
- **Report Contents**:
  - 7-day summary statistics
  - Sleep analysis (positions, average duration)
  - Feeding analysis (types, intervals)
  - Diaper analysis (wet/dirty counts)
  - Tummy time totals
  - Detailed logs with timestamps
- **Format**: Professional PDF ready to email to doctor

### 4. PWA Home Screen Widgets ✅
- **Manifest**: `/public/manifest.json` with shortcuts
- **Quick Actions**:
  - Log Pee (instant entry)
  - Log Poop (instant entry)
  - Log Feeding (opens feeding page)
  - Start Sleep (opens sleep page)
- **URL Parameters**: `/?action=pee`, `/?action=poop`, etc.
- **Auto-Install**: Browser will prompt to install on mobile

## Architecture

```
Frontend (React)
    ↓
AuthContext (Google OAuth)
    ↓
Supabase Client
    ↓
Edge Function Server (Hono)
    ↓
KV Store (Database)
```

## Data Flow

1. **User Signs In** → Google OAuth → Supabase Auth
2. **Family Created/Joined** → Server API creates or joins family
3. **Track Data** → Saved to localStorage + Cloud (if authenticated)
4. **Sync** → On load, pull latest from server
5. **Family Sharing** → All family members access same data via familyId

## Pages

- `/login` - Google sign-in page
- `/` - Dashboard with overview
- `/sleep` - Sleep tracking
- `/feeding` - Feeding tracking
- `/diapers` - Diaper tracking
- `/tummy-time` - Tummy time tracking
- `/settings` - Settings, family management, PDF export

## 🚨 REQUIRED SETUP

### Google OAuth Configuration

**You MUST complete this for login to work:**

1. Go to: https://app.supabase.com/project/gmtqrtpqfmbkljagskfn/auth/providers

2. Enable Google provider

3. Follow this guide: https://supabase.com/docs/guides/auth/social-login/auth-google
   - Create Google Cloud Project
   - Enable Google+ API
   - Create OAuth credentials
   - Add redirect URI: `https://gmtqrtpqfmbkljagskfn.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase

**Without this setup, users will see "provider is not enabled" error**

## PWA Installation

### Android:
1. Open app in Chrome
2. Menu → "Add to Home screen"
3. Long-press icon → See quick action shortcuts

### iOS:
1. Open in Safari
2. Share → "Add to Home Screen"
3. Limited shortcut support on iOS

## Key Files Created/Modified

### Backend:
- `/supabase/functions/server/index.tsx` - API server with auth & family management

### Frontend:
- `/src/app/contexts/AuthContext.tsx` - Authentication context
- `/src/app/pages/Login.tsx` - Login page
- `/src/app/pages/Settings.tsx` - Settings with family & export
- `/src/app/utils/supabase.ts` - Supabase client
- `/src/app/utils/dataSync.ts` - Cloud sync utilities
- `/src/app/utils/pdfExport.ts` - PDF generation

### PWA:
- `/public/manifest.json` - PWA manifest with shortcuts

### Config:
- Updated `Dashboard.tsx` - Auth check, PWA actions, cloud sync
- Updated `SleepTracking.tsx` - Example of cloud sync
- Updated `Navigation.tsx` - Added Settings icon
- Updated `App.tsx` - Added AuthProvider
- Updated `routes.ts` - Added login & settings routes

## Testing Checklist

- [ ] Complete Google OAuth setup in Supabase
- [ ] Sign in with Google
- [ ] Verify family is created
- [ ] Track sleep/feeding/diaper/tummy time
- [ ] Verify data syncs to cloud
- [ ] Invite another email
- [ ] Sign in with invited email
- [ ] Verify shared data appears
- [ ] Export PDF from Settings
- [ ] Install PWA on mobile
- [ ] Test home screen shortcuts

## Next Steps for Production

1. **Add icons**: Replace placeholder icons with actual app icons (192x192, 512x512)
2. **Email notifications**: Add email service for invites
3. **Data backup**: Implement export/import all data
4. **Multiple babies**: Support tracking multiple children
5. **Analytics**: Add charts for trends over time
6. **Reminders**: Push notifications for feeding times
