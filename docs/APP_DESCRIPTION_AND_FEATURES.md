# Cradl — App description and features

## What this app is

**Cradl** is a mobile-first baby tracking app for caregivers. It helps you log and view feeds (breast and bottle), sleep, diaper changes, tummy time, pumping, and pain relief, and see a single baby’s stats and reminders on a dashboard. The app works fully offline: all core tracking is stored in the browser’s `localStorage`. Sign-in and cloud sync are optional; when you sign in, data can be synced to a backend so multiple family members can share the same baby’s data.

The design is based on the [BabyTrackR Figma](https://www.figma.com/design/vmMQeSNjcXlJeUwX2HuCV0/BabyTrackR) (Cradl). and uses a warm, consistent theme (e.g. coral, peach, soft backgrounds) across the dashboard, log drawers, journey/milestones, more screen, and settings.

---

## List of all features

### Dashboard (home)
- Baby greeting card with optional photo, name, age (from birth date), and weight/height if set.
- Add / edit baby profile (name, birth date, photo) with optional sync when signed in.
- Warning/alert pills (e.g. feed overdue, no poop, no sleep, tummy low) with configurable thresholds and dismiss-for-2-hours; tooltips via portal.
- Quick log drawers: Feed, Sleep, Diaper, Tummy time, Bottle, Pump — each with its own form (e.g. breast side, duration picker with seconds, timer start/stop, “log a past…” with date/time, optional note for feed).
- Today’s stats: feeds count, sleep hours, diapers, tummy time (minutes), total ml (bottle).
- “See today” reminder card linking to today’s timeline modal.
- Pain relief (painkiller) card with last dose and “Log it,” plus optional 8‑hour reminder notification.
- Nursery essentials (shopping list) with quick-add chips and sync when signed in.
- Journey/milestones link to the Journey screen.
- Leaps card (Wonder Weeks–style leaps by baby age).
- Wellbeing/mood card (local only).
- “Today’s timeline” modal: filter by feed/sleep/diaper/tummy, jump to date, list of events with edit/delete via LogEditSheet.
- Edit/delete log entries from the timeline (feeding, sleep, diaper, tummy, etc.) with optional sync when signed in.
- PWA-style quick actions via URL params (e.g. open a specific drawer).
- Notifications: permission request, painkiller reminder scheduling, and warning-based notifications (e.g. feed due).

### Logging (drawers and flows)
- **Feed**: Breast (Left/Right/Both) with “next up” hint, duration picker (minutes/seconds), start/pause/switch breast/stop timer, “log a past feed” (date/time), optional note; segments and last-fed side persisted; mutual exclusivity with sleep/tummy timers.
- **Sleep**: Position (Left/Right/On back), duration picker with seconds, start/stop; sleep timer continues in background when drawer is closed; stopped when starting feed/tummy or logging diaper/bottle.
- **Diaper**: Type (Wet/Dirty/Both), optional “log a past change” (date/time).
- **Tummy time**: Duration picker with seconds, start/stop; mutual exclusivity with feed/sleep.
- **Bottle**: Volume (ml), type (Formula/Expressed/Mixed), optional “log a past bottle” (date/time).
- **Pump**: Side (Left/Right/Both), volume per side, duration picker with seconds, start/stop, optional “log a past session” (date/time).
- All drawers: shared layout (header with icon, section labels, past panel with chevron, save button); feed “Stop timer” resets picker to 0; starting any of feed/sleep/tummy stops the others; saving diaper or bottle stops sleep (and feed/tummy where applicable).

### Journey screen
- Milestones timeline (from `journeyMilestones` data) with typical day ranges and achieved dates.
- Edit milestone achieved date; persisted and synced when signed in.
- Growth chart section (WHO-style, birth date, sex) — local only.
- Theme toggle.
- UK vaccinations reference data (local only).

### More screen
- Appointments section: calendar with events (GP, Health visitor, Hospital); add/edit/delete; stored in `localStorage` only (not in SYNCED_DATA_KEYS).
- Family section: list of members (local “family” list), invite by email (UI only here; real invites in Settings).
- Notes: add/remove notes (local storage key `babytrackr-notes`).
- Shopping list with presets and checkboxes (synced when signed in via `shoppingList`).
- Export / Summary buttons (e.g. for export or summary flows).
- Theme toggle.

### Settings
- Baby: photo upload (with compression), name, birth date, age in days; synced when signed in (`babyProfile`).
- Alert thresholds: no poop (hours), no sleep (hours), feed overdue buffer (minutes), tummy low target and check-by hour; stored in `alertThresholdsStorage` (local); alerts themselves are front-end only.
- Account: show current user email.
- Family sharing: create family, invite by email, accept/decline invites, sync my data to family, current family name and member count — all via backend.
- Voice commands: list of example commands (VoiceControl) and short explanation.
- Danger zone: wipe all baby data (resets synced keys to defaults and can push to server so family sees wipe).
- Sign out.

### Auth and navigation
- Login/sign-up (Supabase Auth) and optional session; app usable without signing in.
- Bottom navigation: Home, Journey, More; Settings via link; Voice control floating mic (VoiceControl) for voice commands that can create logs and sync when signed in.

### Other
- Theme: light/dark via CSS variables and ThemeToggle (e.g. More, Journey).
- Voice control: parse commands (e.g. “log feed left 10 minutes”, “log sleep”, “log diaper”) and create/update records; when signed in, uses `saveData` for the relevant keys.
- Duration picker: scrollable minutes/seconds (and hours where used), theme-aware, min-width 226px, used in feed/sleep/tummy/pump.
- Last feed side: stored locally and used for “next up” in feed drawer.
- Error boundary: route-level error UI for runtime errors.
- Data sync: when signed in, `saveData` and `loadAllDataFromServer` (and optional polling) for SYNCED_DATA_KEYS; pending-saves queue and retries for offline resilience.

---

## Features that need backend

These features only work when the backend (Supabase Auth + Edge Function “server”) is available and the user is signed in.

1. **Sign-in / sign-up**  
   Supabase Auth (email/password). Session is required for all other backend features.

2. **Family and sharing**  
   - Create family (`POST /family/create`).  
   - Invite by email (`POST /family/invite`).  
   - List pending invites (`GET /family/invites`).  
   - Accept invite (`POST /family/accept-invite`) — can load family data after accept.  
   - Decline invite (`POST /family/decline-invite`).  
   - Get current family (`GET /family`).  
   All family and invite state is stored on the server (e.g. KV store).

3. **Syncing baby data**  
   - **Save**: After local writes (e.g. feed, sleep, diaper, tummy, bottle, pump, baby profile, milestones, shopping list, painkiller, etc.), the app can call `saveData` → `POST /data/save` (or batch `POST /data/save-many`) so data is stored per family.  
   - **Load**: On login or when opening dashboard/tracking screens, `loadAllDataFromServer(session.access_token)` → `GET /data/all` to overwrite or merge local state with the family’s data.  
   - **Sync my data to family**: In Settings, “Sync my data to family” pushes current local synced keys to the server so other members see the same data after they refresh/load.  
   Data types that are synced when backend is used include: `sleepHistory`, `feedingHistory`, `diaperHistory`, `tummyTimeHistory`, `bottleHistory`, `pumpHistory`, `currentSleep`, `currentTummyTime`, `feedingInterval`, `feedingActiveSession`, `painkillerHistory`, `notes`, `shoppingList`, `babyProfile`, `milestones`. The Edge Function’s `DATA_TYPES` (and any `/data/all` implementation) must include all keys the client sends for full sync.

4. **Wipe all data**  
   Settings “Wipe all baby data” pushes default empty values for all synced keys to the server so the whole family’s view is wiped.

5. **Voice commands that write data**  
   When the user is signed in, VoiceControl uses `saveData(..., session.access_token)` so that logs created by voice (e.g. feed, sleep, diaper, painkiller, shopping) are persisted to the backend.

6. **Polling / live sync**  
   When signed in, the app may poll `loadAllDataFromServer` (e.g. on Dashboard, Tracking, Sleep, Feeding, Diaper, TummyTime) so that changes from other devices or family members appear after a short delay.

7. **Pending-saves queue**  
   If a save fails (e.g. network error), the client can persist the pending save and replay it when the session is available again (`flushPendingSaves` in AuthContext), so backend is required to actually complete those saves.

---

## Features that work without backend (local only)

- All logging (feed, sleep, diaper, tummy, bottle, pump) and viewing on dashboard and today’s timeline.  
- Baby profile (name, birth date, photo) and age — stored in `localStorage`; sync is optional.  
- Alert thresholds and warning pills (logic and storage are local).  
- Appointments (More screen) — `babytrackr-appointments` in `localStorage` only.  
- Notes and family list on More screen — their storage keys are local.  
- Journey milestones and growth chart — local; only milestone achieved dates are in SYNCED_DATA_KEYS when signed in.  
- Shopping list and painkiller log — work locally; sync when signed in.  
- Theme (light/dark), duration picker, navigation, error boundary, and all UI flows.  
- Notifications (browser APIs); no server needed.  
- UK vaccinations and leaps data — static/local.  
- Export/Summary on More screen (if implemented without server).  
- PDF export (e.g. pediatric report) — if present, typically generated in the client; no backend required for the report content itself.
