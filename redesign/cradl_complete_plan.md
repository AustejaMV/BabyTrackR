# Cradl — Complete Supplementary Implementation Plan
# Addendum to Cursor Redesign Plan + Desktop Version

This document is the authoritative supplement to the Cursor redesign plan.
It covers every interaction, every drawer, every dialog, every state, every edge case,
and the complete desktop version. Cursor must implement everything here in addition to the
base plan. Where this document conflicts with the base plan, this document wins.

---

## PART 1 — DESKTOP VERSION

### 1.1 Desktop architecture

The desktop version is the same React app served at cradl.app in a browser. It uses the
same Supabase backend, the same localStorage/sync logic, and the same data. The difference
is layout: on screens ≥1024px wide, the app switches from single-column mobile layout to
a three-column desktop layout.

Breakpoint detection: use a `useIsDesktop()` hook that returns true when
`window.innerWidth >= 1024`. This hook uses a ResizeObserver. On server-side render, default
to false. The top-level AppLayout renders either `<MobileLayout>` or `<DesktopLayout>`
based on this hook. No separate routes — the same URL renders the appropriate layout.

### 1.2 Desktop top bar

Height: 50px. Background: #fff. Border-bottom: 1px solid #ede0d4.

Left to right:
1. Logo: "Cradl" in Georgia serif 17px font-weight 700, color #2c1f1f, letter-spacing -0.3px.
   Margin-right: 20px.
2. Tab navigation: four buttons (Today, Story, Village, Me). Each:
   padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; color: #9a8080;
   cursor: pointer; border: none; background: none.
   Hover: background: #f8f0e8; color: #6a4030.
   Active: background: #feeae4; color: #c04030; font-weight: 600.
   Tab icons: small SVG inline (clock for Today, book for Story, people for Village,
   person for Me). Icon 14x14px, margin-right: 6px.
3. Right cluster (margin-left: auto, flex, gap: 10px):
   - Search icon button (28px rounded square, background: #f8f0e8)
   - PRO badge: font-size: 11px; font-weight: 600; background: #feeae4; color: #8a3020;
     padding: 3px 9px; border-radius: 8px.
   - Avatar circle: 30px, gradient background, contains user SVG icon.
   - Baby name label: 12px font-weight 500 color #2c1f1f.
   - "Settings →" text link: font-size: 11px; color: #9a8080; cursor: pointer.

Tab switching: clicking a tab updates the active screen. Keyboard: arrow keys navigate
between tabs when one is focused. No URL change on tab switch — desktop is SPA state only.

### 1.3 Desktop three-column layout

Every tab uses a three-column grid: `grid-template-columns: 256px 1fr 228px`.
Total height: viewport height minus top bar (50px). Each column scrolls independently.
Column borders: `border-right: 1px solid #ede0d4` on left and centre columns.
Left and right columns: `background: #fffdf8`. Centre column: `background: #fffbf5`.
All columns: `overflow-y: auto`. Custom scrollbar: width 4px, thumb color #ede0d4.
Column internal padding: 14px on all sides.

### 1.4 Desktop — TODAY tab

LEFT COLUMN (256px, context):
1. Greeting: 38px avatar circle (gradient), name 13px semibold, age 10px muted.
   Margin-bottom: 12px.
2. Stats: two rows of 3 pills each (2x3 grid, gap: 5px). Same stats as mobile.
   Pills: flex:1, min-width: 44px.
3. Sleep sweet spot card: same three-state design as mobile. Arc SVG 52px.
   Green action bar "She'll settle easily now · Start sleep →".
4. "If she's unsettled" card: same Likely/Possible/Unlikely rows.
5. Pain relief card.

CENTRE COLUMN (flexible):
1. "Log" section label.
2. Log grid: 4 columns (not 3 as on mobile). 8 buttons: Feed, Sleep, Nappy, Tummy, Bottle,
   Pump, Health, Solids. Each button: border-radius: 10px; padding: 10px 6px 8px.
   Icon 26px. Label 10px semibold. Sub-label 9px muted.
3. Custom trackers card: same as mobile.
4. Today's timeline: shown inline on desktop (not behind a modal tap). Shows all events
   for today in chronological order. Each event: time (10px muted, min-width 38px),
   3px coloured line, event description (11px). "NOW" row in coral for current position.
   Up to 20 events shown, "Show all" link if more.
5. "Cradl noticed" header + notice cards.

RIGHT COLUMN (228px, calendar + planning):
1. Month/year header with prev/next navigation arrows.
2. Day-of-week headers (S M T W T F S) in 9px muted.
3. Calendar grid: 7 columns, day cells 10px. Today: coral background. Days with events:
   coral text, semibold. Other month days: very muted colour.
4. Calendar sync badge: "Synced with Google Calendar" in blue tinted card (if connected).
   Or "Connect Google Calendar" link (if not connected). See section 1.13 for sync details.
5. "Upcoming" section label.
6. Appointment rows: time column (min-width 34px), coloured left line (3px), title + subtitle.
   "+ Add appointment" row at bottom (opacity 0.5, cursor pointer).
7. Weekly insight notice card (1 card, the most relevant insight from the engine).

### 1.5 Desktop — STORY tab

LEFT COLUMN:
1. Growth card (full detail — same as mobile growth card with plain-English descriptors,
   in-cell bars, trend chart, collapsible explainer).
2. Milestones horizontal scroll (same component as mobile).
3. Suggested schedule card.

CENTRE COLUMN:
1. Weekly narrative hero card.
2. "Cradl noticed" header + all insight notice cards.
3. "Is this normal?" header + card with all 4 metrics.

RIGHT COLUMN:
1. Leap card.
2. Memory book preview card: shows week highlights text, a "Add photo" placeholder,
   PRO badge. Tapping navigates to /memories.
3. Personal playbook card (if enough data + premium): shows first insight, PRO gate.
4. "Full history →" link card.

### 1.6 Desktop — VILLAGE tab

LEFT COLUMN:
1. Night card (23:00–06:00 only, dark background).
2. "My groups" section + group list rows.

CENTRE COLUMN:
1. "Ask other parents" header with "Ask a question" coral button top-right.
2. Q&A question cards (3 full questions with top answers visible).
3. Filter pills: All / [age]-week babies / General.

RIGHT COLUMN:
1. "Baby-friendly places" header with "+ Add place" link.
2. Venue cards stacked vertically (not horizontal scroll on desktop).
3. Each venue card: name, type + distance, feature tags, review summary.

### 1.7 Desktop — ME tab

LEFT COLUMN:
1. Personal hero card (same gradient design).
2. Mood check card.
3. Your sleep this week card.

CENTRE COLUMN:
1. "Cradl noticed" header + notice cards for mum.
2. Recovery card (all 3 rows).
3. Time capsule card with live textarea (user can type directly on desktop without
   opening a separate screen — textarea height 80px, auto-expands).

RIGHT COLUMN:
1. "Tools" section label.
2. Tools chip grid (same 9 chips — each navigates to the relevant sub-screen or opens
   a desktop dialog).
3. Account section (same menu rows as mobile).

### 1.8 Desktop log drawer behaviour

On desktop, clicking a log button opens a panel that slides in from the right side of the
centre column, overlaying it partially (not full-screen). The panel is 360px wide,
background #fff, border-left: 1px solid #ede0d4, height 100% of the centre column.
The drawer slides in with a 200ms ease-out animation (translateX from 360px to 0).
Clicking outside the drawer (on the left column or right column) closes it.
The left column content remains visible while the drawer is open.
All drawer content is identical to mobile drawers.

### 1.9 Desktop bottom sheet behaviour

On mobile, modals open as bottom sheets sliding up from the bottom.
On desktop, these same modals open as centred dialogs:
- max-width: 480px
- border-radius: 16px
- background: #fff
- border: 1px solid #ede0d4
- padding: 24px
- They appear with a fade-in (150ms).

A semi-transparent overlay covers the three columns behind them:
rgba(44, 31, 31, 0.3), not pure black.

Pressing Escape closes the dialog. Clicking outside the dialog closes it.
Focus is trapped inside the dialog while open (keyboard accessibility).

### 1.10 Desktop — login/signup page

Route: /login. No tab navigation visible. Centred single-column layout.
Max-width: 400px. Background: #fffbf5. Margin: auto. Padding-top: 80px.

Content:
1. Cradl logo (Georgia serif, 32px, centred).
2. Tagline: "The baby tracker that tells you why she's crying." (14px muted, centred).
3. Spacing: 40px.
4. "Sign in with Google" button: white background, Google SVG icon left, "Continue with
   Google" text, border: 1px solid #ede0d4, border-radius: 10px, height: 44px, full width.
5. "Sign in with Apple" button: black background, Apple SVG icon left, white text, same
   dimensions.
6. "or" divider with horizontal lines.
7. Email input: label "Email address" above, height 44px, border: 1px solid #ede0d4,
   border-radius: 10px.
8. Password input: label "Password" above, show/hide toggle (eye SVG icon, right side),
   height 44px.
9. "Sign in" coral button, full width, height 44px, border-radius: 10px.
10. "Forgot password?" link, 11px muted, centred.
11. Divider.
12. "Don't have an account?" text + "Sign up" coral link.
13. "Continue without account →" link (11px muted, centred). Navigates to onboarding.

FORGOT PASSWORD flow:
Tapping "Forgot password?" shows an inline section below the email field:
"We'll send a reset link to [email]." (11px muted).
"Send reset link" coral button. On click: calls Supabase `resetPasswordForEmail()`.
Success: "Check your email — reset link sent." Green notice. Button disabled.
Error: "We couldn't find an account with that email." Inline error below field.

SIGN UP page (/signup or toggled state):
Same as sign-in but adds:
- "Confirm password" field below password.
- Password strength indicator: 4 equal-width segments below the password field.
  Segment colours: all #f0e8e0 (empty), filling with #d4604a as strength increases.
  Strength rules: length ≥8 (+1), has number (+1), has symbol (+1), length ≥12 (+1).
- HaveIBeenPwned check: debounced 800ms after typing stops. On breach detected:
  amber inline notice "This password has appeared in a data breach. Please choose a
  different one." — advisory during typing, blocking on submit attempt.
- "Create account" coral button replaces "Sign in".
- On success: navigate to onboarding step 6 (already handled).

After successful sign-in or sign-up on desktop: redirect to / which shows the Today tab.

### 1.11 Desktop — Settings page

Route: /settings. Opens as a full-page route replacing the main layout.
Two-column layout on desktop: 220px left sidebar with navigation, flexible right content area.

Left sidebar:
- "← Back to Cradl" link at top (11px, coral).
- Navigation items list:
  Each item: 11px font, padding 8px 12px, border-radius 8px, cursor pointer.
  Hover: background: #f8f0e8.
  Active: background: #feeae4; color: #c04030.

Navigation items:
- Baby profile
- Alerts
- Notifications
- App view
- Accessibility
- Language
- Account
- Family sharing
- Voice commands
- Export data
- Danger zone

Right content area: 1fr flexible. Padding-left: 32px.
Each section has a 16px semibold Georgia serif header with a bottom border
(1px solid #ede0d4, margin-bottom: 16px), then the settings fields below.
Sections match exactly the specification in Part 11 of this document.

On mobile, Settings is a full-screen page with a single scrollable column.
The left sidebar is replaced by the section titles acting as accordion headers.
Default: all sections expanded on mobile (not collapsed behind accordions).

### 1.12 Desktop — Appointments full screen

Route: /appointments. Accessible from the "Open calendar →" link in Today right panel.
Full-width layout with a sidebar calendar and main appointment list.

Left: 280px mini calendar + navigation.
Right: appointment list grouped by month. Each appointment row: date badge, title,
type icon, notes preview. "Add appointment" coral button top-right.

### 1.13 Desktop — Google Calendar sync details

Same as mobile (see Part 3 of this document) except:
- OAuth popup: opens in a popup window (not a redirect). Use Supabase `signInWithOAuth`
  with `skipBrowserRedirect: true` and handle the response with
  `supabase.auth.getSessionFromUrl()` in the popup's callback page.
- Popup dimensions: 500×600px, centred on screen.
- After successful OAuth: popup sends a message to the parent window via
  `window.opener.postMessage({ type: 'calendar-connected' })` and closes.
  Parent window listens and refreshes connection status.

---

## PART 2 — FAMILY SHARING — COMPLETE SPECIFICATION

### 2.1 Family data model

```typescript
interface Family {
  id: string;           // UUID
  name: string;         // e.g. "Smith Family"
  created_by: string;   // user_id of creator
  created_at: string;   // ISO
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;   // null if pending invite
  email: string;
  display_name: string;
  role: 'owner' | 'partner' | 'caregiver' | 'viewer';
  status: 'active' | 'pending' | 'removed' | 'declined';
  invited_at: string;
  joined_at: string | null;
  invite_token: string;     // UUID, single-use
  avatar_colour: string;    // one of 6 predefined hex colours, assigned from name hash
}
```

Role permissions:
- owner: full access, can invite/remove members, can delete family, all logs
- partner: can log all events, can view all history, can edit own logs
- caregiver: can log all events, can view TODAY tab only (no Story, no history beyond today)
- viewer: read-only, can see all data but cannot log, cannot access Village or Me

### 2.2 Family sharing screen (Settings > Family sharing)

EMPTY STATE (no family):
Two large tappable cards (each: border: 1px solid #ede0d4, border-radius: 14px, padding: 16px):
1. "Create a family" card:
   Title: "Create a family" (13px semibold).
   Body: "Invite your partner, grandparents, or carer to see your baby's data." (11px muted).
   Arrow chevron on right.
   On tap: opens bottom sheet (mobile) or dialog (desktop):
   - "Family name" text input (default pre-filled with "[surname] Family" if available).
   - "Create" coral button.
   On create: INSERT into `families` table, INSERT into `family_members` as owner with
   status='active'. Navigate back to family sharing screen now showing HAS FAMILY state.

2. "Join a family" card:
   Title: "Join a family" (13px semibold).
   Body: "Someone shared an invite link with you." (11px muted).
   Arrow chevron on right.
   On tap: opens bottom sheet with a text input "Paste your invite link or code" +
   "Join" coral button.
   On join: extract token from URL or use input directly, navigate to
   /join-family/[token].

HAS FAMILY state:

Section header:
Family name (14px semibold Georgia serif). "[X] members" (11px muted).
"Sync my data to family" coral outline button (triggers manual Supabase sync).

MEMBERS LIST:
Rendered as a grouped card (same style as the groups list in Village tab).
Each member row:
- Avatar circle (28px, coloured background, initials in white 11px semibold).
  Colour assigned deterministically: hash the display_name, modulo 6 colours.
  Colours: #feeae4 / #e4eef8 / #e4f4e4 / #f0eafe / #fff0d4 / #fce8f8.
  Initials text: darkest shade of same colour family.
- Display name (12px semibold, #2c1f1f).
- Role badge (11px):
  Owner: background: #f0ece8, color: #6a5040.
  Partner: background: #e4eef8, color: #2a5080.
  Caregiver: background: #e4f4e4, color: #2a6040.
  Viewer: background: #f0e8f0, color: #6a4080.
- Status indicator: filled circle (6px), green if active, amber if pending.
- "You" tag (coral tinted, 9px) on current user's row.
- Pending row: "Resend invite" coral link (10px) + invite date "Sent [X] days ago" (10px muted).
- Three-dot menu button (owner only, on all non-self rows):
  Opens a small popup menu (desktop: dropdown; mobile: bottom sheet):
  - "Change role" → see change role flow below.
  - "Remove from family" → see remove flow below.

"+ Invite someone" section below members list:
Email input field (full-width, placeholder "partner@example.com").
Role selector: inline dropdown (Partner / Caregiver / Viewer).
"Invite" coral button.

INVITE FLOW:
On "Invite" tap:
1. Validate email format. If invalid: inline error "Please enter a valid email address."
2. Check if email already in family_members for this family (any status). If so:
   "This person is already in your family." inline error.
3. INSERT family_members row: email, role, status='pending', invite_token=UUID(),
   invited_at=now().
4. Call Supabase Edge Function `send-family-invite`:
   - Sends an email with subject "You've been invited to join [Family name] on Cradl"
   - Body includes: inviter name, family name, role description, CTA button linking to
     `cradl.app/join-family/[invite_token]`
   - Email from: noreply@cradl.app
5. Success banner below form: "[email] has been invited! They'll receive an email shortly."
   (green tinted, dismissible, auto-dismiss after 5 seconds).
6. The new pending member appears immediately in the members list.

RESEND INVITE:
Rate limited: one resend per invite per hour (check invited_at + resent_at fields).
If within rate limit: "Too soon to resend — wait X minutes." inline.
On resend: update resent_at timestamp, call the same Edge Function.

CHANGE ROLE flow:
Bottom sheet title: "Change [name]'s role"
Four radio options:
  Partner: radio + "Partner" label + "Can log and view everything" description (10px muted).
  Caregiver: radio + "Caregiver" + "Can log events and see today's timeline" description.
  Viewer: radio + "Viewer" + "Can view data but not log anything" description.
Current role pre-selected.
"Save" coral button. "Cancel" muted link.
On save: UPDATE family_members SET role=[new_role] WHERE id=[member_id].
No notification sent.
The changed member sees the new permission scope on next app open.

REMOVE MEMBER flow:
Bottom sheet / dialog:
Title: "Remove [name] from the family?"
Body: "They will immediately lose access to all family data. They will not be notified."
(The "will not be notified" language is critical — domestic safety design principle.)
Two buttons:
- "Cancel" (full-width, white background, coral border, coral text).
- "Remove" (full-width, background: #c04030, white text).
On "Remove":
1. UPDATE family_members SET status='removed' WHERE id=[member_id].
2. Call Supabase admin API `auth.admin.signOut([user_id])` to invalidate their session.
3. If the removed user is currently online with a Supabase Realtime subscription,
   their RLS policies are re-evaluated immediately — they can no longer read family data.
4. No email, no push notification, no in-app notification sent. Silence is mandatory.

### 2.3 Join family flow (from email link)

Route: /join-family/[invite_token]

NOT SIGNED IN state:
Show a notice banner at the top of the login page:
Background: #d4eaf7. Text: "You've been invited to join a Cradl family.
Sign in or create an account to accept the invitation." (11px, #1a4a8a).
After sign-in, redirect back to /join-family/[invite_token].

SIGNED IN state:
1. Look up invite_token in family_members table (Supabase RLS: anyone can read their own
   invite token row).
2. Token not found: show "This invite link has already been used or doesn't exist."
   with "Go to Cradl" button.
3. Token expired (invited_at > 7 days ago): show "This invite has expired. Ask [inviter]
   to send a new one." with "Go to Cradl" button.
4. Email doesn't match signed-in user: show "This invitation was sent to [email]. You're
   signed in as [other email]. Switch accounts or ask to be re-invited."
5. Valid token:
   Show confirmation card (centred, max-width 360px, white card):
   - "[Inviter display name] has invited you to join [Family name]"
   - "Your role: [role label]" + role description in muted text
   - "Join family" coral button (full-width)
   - "Decline" muted link below
6. On "Join family":
   - UPDATE family_members SET user_id=[current_user_id], status='active', joined_at=now()
   - Navigate to Today tab
   - Show welcome banner (blue tinted, 5 seconds): "Welcome to [Family name]!"
7. On "Decline":
   - UPDATE family_members SET status='declined'
   - Navigate to Today tab
   - No banner shown

### 2.4 Partner (simplified) view

Shown to users who have role='caregiver' AND have Settings > App view set to "Partner view".
Also shown by default on first login as a caregiver (they can switch later).

PARTNER HOME replaces Today tab content:

Section 1 — "Right now" card (background: linear-gradient(135deg, #fef5ee, #eef4f8)):
Three rows:
- Feed: clock icon (coral) + "Last fed at HH:mm · Xh Ym ago" + side if breast.
- Nappy: nappy icon (green) + "Last changed at HH:mm · Xh Ym ago" + type.
- Sleep state: moon icon (blue) + either "Sleeping since HH:mm · Xh Ym" or
  "Awake since HH:mm · Xh Ym ago".
Data pulled via Supabase Realtime subscription `family_live_state` view.
Realtime fallback: re-fetch every 60 seconds if Realtime disconnects.

Section 2 — "Do this next" card:
Single most important suggestion (same algorithm as "If she's unsettled" card but shows
only the #1 Likely item).
Large descriptive text (13px, Georgia serif): e.g. "Feed soon — last fed at 14:23, next
expected around 17:23." or "Nap time now — awake since 13:10."
Coral accent left border (3px).

Section 3 — Quick log (2×2 grid of large square buttons):
Each button: min 80px × 80px (fills grid cell). Border-radius: 16px. Gap: 8px.
- "Feed" (background: #feeae4, coral border) — opens feed drawer.
- "Sleep" (background: #e4eef8, blue border) — opens sleep drawer.
- "Nappy" (background: #e4f4e4, green border) — opens nappy drawer.
- "All good ✓" (background: #fff, border: 1px solid #ede0d4) — logs a check_in event.
  check_in event appears in Today timeline as "[caregiverName] checked in at 15:30 — all good."
  with a small person SVG icon.

"Switch to full view" link (10px muted, centred, below the grid). Tapping switches to the
full Today tab for the current session without changing the persistent setting.

### 2.5 "Ask someone to cover" — complete interaction

This button appears in the Me tab > Your sleep card as "Send message →" when
sleep has been under 6h for 3+ consecutive nights.

Full interaction:
1. User taps "Send message →".
2. Confirmation alert appears:
   Title: "Send a message for help?"
   Body: "This will open a pre-written message you can send to anyone."
   Buttons: "Cancel" (muted) and "Open message" (coral).
3. If "Open message" confirmed:
   - Compose the message text:
     "Hey, I'm really struggling with sleep today. Could you take [babyName] for an hour
     or two so I can rest? 🙏"
     If babyName not set: use "the baby".
   - On mobile (Capacitor): call `Share.share({ text: messageText })` from @capacitor/share.
     This opens the native iOS/Android share sheet — user picks any messaging app.
   - On web (desktop): copy the text to clipboard using `navigator.clipboard.writeText()`.
     Show toast notification (bottom of screen, 3 seconds):
     "Message copied to clipboard." (green tinted, 11px).

This interaction:
- Does NOT access contacts
- Does NOT select a recipient
- Does NOT send anything automatically
- Only composes and hands off to the user's choice of app

---

## PART 3 — CALENDAR AND APPOINTMENTS — COMPLETE SPECIFICATION

### 3.1 Appointment data model

```typescript
interface Appointment {
  id: string;           // UUID
  baby_id: string;
  title: string;        // max 80 chars
  appointment_type: 'gp' | 'health_visitor' | 'hospital' | 'other';
  date: string;         // YYYY-MM-DD
  time: string | null;  // HH:mm
  notes: string | null; // max 500 chars
  questions: string | null; // max 1000 chars
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}
```

### 3.2 Add appointment flow

Triggered by:
- Tapping "+ Add appointment" row in Today tab calendar section
- Tapping "+ Add appointment" in the right panel (desktop)
- "Prepare for visit →" link from an appointment detail

Bottom sheet (mobile) or centered dialog (desktop, max-width: 480px).
Title: "Add appointment" (16px Georgia serif).

Fields in order:
1. "Appointment name" label above text input. Placeholder "e.g. Health visitor check".
   Max 80 chars. Required. Full-width.
2. "Type" label above 4 pill buttons in a row:
   GP / Health visitor / Hospital / Other.
   Each pill: padding 6px 12px, border-radius: 20px.
   Selected: background: #feeae4; color: #c04030; border: 1px solid #d4604a.
   Unselected: background: #fff; border: 1px solid #ede0d4; color: #9a8080.
   Required. Show inline error "Please select a type" if save attempted without selection.
3. "Date" label above date input (dd/mm/yyyy).
   On mobile: tapping opens platform date picker.
   On desktop: text input with format validation — only allow dd/mm/yyyy pattern.
   Required.
   Past date warning: "This date is in the past — are you sure?" amber inline note.
   Future limit: if more than 2 years away: "This date is more than 2 years away."
   amber note (warn but don't block).
4. "Time" label above time input (HH:mm). Optional.
   Placeholder: "e.g. 14:30". If left empty: appointment shows as all-day.
5. "Notes" label above textarea. Max 500 chars. Placeholder "e.g. Bring red book, weight
   check, ask about feeding schedule". Optional.
   Character counter (10px muted) shown at bottom-right when >400 chars.
6. "Questions to ask" label above textarea. Max 1000 chars. Placeholder "e.g. Is her weight
   gain normal?". Optional.
   This field is pre-populated if the user has added questions in GP prep screen
   (pulled from localStorage `cradl-gp-questions`).
7. "Sync to Google Calendar" toggle (only shown if Google Calendar is connected).
   Default: ON. Label: "Add to Google Calendar". Sub-label: "Cradl — [babyName] calendar".
   If not connected: link "Connect Google Calendar →" (navigates to settings or opens
   OAuth flow in a bottom sheet).

"Save appointment" coral button (full-width, 44px, border-radius: 12px).
"Cancel" muted link below button.

On save:
1. Validate required fields. Show inline errors if missing.
2. Save to localStorage appointments array.
3. If signed in: INSERT to Supabase appointments table.
4. If Google Calendar toggle ON and connected: call sync endpoint (see 3.4).
5. Close the sheet/dialog.
6. Show brief toast: "Appointment saved." (bottom of screen, 2 seconds, green tinted).

### 3.3 Edit and delete appointments

Tapping an existing appointment row opens the same sheet pre-filled with all fields.
"Edit appointment" as the sheet title.
A "Delete appointment" red link at the very bottom of the sheet, below the save button.

Delete flow:
Tapping "Delete appointment" shows a confirmation:
Title: "Delete this appointment?"
Body: Shows the appointment title and date.
Buttons: "Cancel" (muted) and "Delete" (background: #c04030, white text).
On confirm:
1. Remove from localStorage appointments array.
2. DELETE from Supabase appointments table.
3. If google_calendar_event_id exists: call Edge Function to delete the Google Calendar event.
4. Close sheet. Toast: "Appointment deleted." (grey tinted, 2 seconds).

### 3.4 Google Calendar sync

Premium feature. Free users see appointments in Cradl only; the sync toggle is replaced
with a "Sync with Google Calendar — PRO" link.

SETUP FLOW:
1. User taps "Connect Google Calendar" (in Settings > Account or from the appointment sheet).
2. Bottom sheet / dialog title: "Connect Google Calendar".
   Body: "Your Cradl appointments will be added to a new calendar called
   'Cradl — [babyName]' in your Google Calendar. Existing events won't be touched."
   "Connect" coral button. "Not now" muted link.
3. "Connect" triggers Google OAuth:
   - Scopes: `https://www.googleapis.com/auth/calendar`
   - On mobile: `expo-auth-session` + `WebBrowser.openAuthSessionAsync`.
   - On web: popup window (see 1.13 for popup details).
4. After auth: Supabase Edge Function `save-google-calendar-token`:
   - Receives code, exchanges for access_token + refresh_token via Google OAuth.
   - Stores encrypted tokens in `user_calendar_credentials` table (encrypted with
     Supabase vault).
5. Create 'Cradl — [babyName]' calendar if it doesn't exist:
   Call Google Calendar API `POST /calendars`. Colour: #4a6ab4 (blue).
   Store calendar_id in user_calendar_credentials.
6. Back-sync: call `sync-all-appointments` Edge Function.
   Creates Google Calendar events for all future Cradl appointments.
   Show progress indicator: "Syncing [X] appointments..."
7. Success: "Google Calendar connected." toast. Sync badge appears in Today right panel.

ONGOING SYNC:
Cradl → Google (create/update/delete): triggered by appointment save/delete.
Calls Edge Function `sync-calendar-event` with the appointment data.
Uses stored refresh token to get a fresh access_token on each call.

Google → Cradl: NOT real-time. Only triggered by:
- "Refresh from Google" button in the appointments screen.
- App foreground, once per 30 minutes (check localStorage `cradl-calendar-last-pull`).
Pull calls `pull-google-events` Edge Function which reads the Cradl calendar's events
and updates matching Cradl appointments.

On any sync failure:
1. Log error to analytics (non-PII only — error code, not data).
2. Show amber notice: "Calendar sync failed — appointment saved to Cradl."
   "Retry" link triggers the same endpoint again.
3. Never block the appointment save. Local save always succeeds.

DISCONNECT:
Settings > Account > "Disconnect Google Calendar":
Confirmation dialog: "Disconnect Google Calendar? Your appointments will stay in Cradl
but won't sync to Google Calendar. Your Google Calendar events will remain."
"Cancel" and "Disconnect" buttons.
On disconnect:
1. Call Google OAuth revoke endpoint for the stored token.
2. DELETE from user_calendar_credentials table.
3. UPDATE appointments SET google_calendar_event_id = null.
4. Sync badge removed from Today right panel.

SYNC STATUS BADGE:
Desktop: shown below the calendar in Today right panel.
Mobile: shown above the upcoming appointments list.
States:
- Green: "Synced with Google Calendar · updated just now" (green background).
- Amber: "Sync pending" (amber, if last sync >30 min ago).
- Red: "Sync failed · tap to retry" (red, tap triggers manual resync).

---

## PART 4 — GP VISIT PREP — COMPLETE SPECIFICATION

### 4.1 What it is

A generated one-page summary formatted for a 10-minute GP appointment.
Accessible from Me > Tools > "GP visit prep" chip.

### 4.2 Screen layout

Full-screen route: /gp-summary.
Header: "Prepare for your visit" (Georgia serif 20px, padding: 16px).
If appointment logged within next 14 days: "Next appointment: [day, dd/mm/yyyy]"
subtitle in coral. Otherwise: "No appointment scheduled — add one below."

GENERATED SUMMARY SECTION:
Background card: background: #fff; border: 1px solid #ede0d4; border-radius: 16px;
padding: 16px; margin: 0 12px 12px.

All data is read-only here (auto-populated, cannot be edited in this view).

Row 1 — Baby header:
"[BabyName] · DOB [dd/mm/yyyy] · [X weeks Y days old] · Today: [dd/mm/yyyy]"
(11px, #2c1f1f, line-height 1.6).

Row 2 — Last 7 days summary:
Label "Last 7 days:" (10px muted, uppercase, letter-spaced).
2×2 grid of stat cells:
- "Avg feeds/day: [number]" + "(typical for age: [range])".
- "Avg sleep/day: [number]h" + "(typical: [range])".
- "Avg nappies/day: [number]" + "(typical: [range])".
- "Tummy time: [total]m this week" + "(aim: [range]m/day)".
Each cell: background: #f8f4f0; border-radius: 8px; padding: 8px; font-size: 11px.

Row 3 — Flagged concerns (conditional — only shown if any exist):
Background: #fff8e8; border-left: 3px solid #d4904a; border-radius: 0 10px 10px 0;
padding: 10px 12px; margin-bottom: 8px.
Title: "Worth mentioning:" (11px semibold, #8a5a00).
Bullet points (11px, #8a5a00):
- "No dirty nappy for [X]h on [date]" (for each gap >24h in last 14 days)
- "Temperature [temp]°C on [date]" (for each entry ≥38°C in last 14 days)
- "Symptom logged: [symptom] on [date]"
- "Weight gain has slowed since [date]"
If no concerns: this entire row is absent (no empty section).

Row 4 — Growth (conditional — only shown if 2+ measurements exist):
"Latest: [weight]kg · [height]cm · head [circumference]cm" (11px).
"Trend: [Gaining steadily / Weight gain has slowed / Insufficient data]" (11px).
Last 3 measurements as a list: "[dd/mm/yyyy]: [weight]kg" per line.

Row 5 — Current medications (conditional — only shown if medication entries in last 30 days):
"Current medications:" label.
List: "[medication name] · last dose [dd/mm/yyyy]" per line.

Row 6 — Vaccinations due (conditional — only shown if due within 30 days):
"Due soon:" label.
List: "[vaccine name] · due [dd/mm/yyyy]" per line.

QUESTIONS SECTION:
Title: "Your questions" (12px semibold, #2c1f1f). Separate from the generated card.
Margin: 0 12px 8px.
Description (10px muted): "Note down what you want to ask — these are private to you."
Large textarea:
- min-height: 120px
- border: 1px solid #ede0d4
- border-radius: 12px
- padding: 12px
- font-size: 12px
- line-height: 1.5
- Placeholder: "What do you want to ask? e.g. Is her weight gain normal? Should I worry
  about the rash?"
Saves to localStorage `cradl-gp-questions` on every keystroke (debounced 500ms).
Persists between visits — user manually clears.
"Clear questions" link (10px muted) below textarea, right-aligned.
On tap: confirmation "Clear all questions?" with "Cancel" and "Clear" buttons.

ACTION BUTTONS (in order, bottom of screen):
1. "Presentation mode" button (outlined, coral text, coral border, full-width):
   - Hides the tab navigation bar / bottom nav.
   - Increases all font sizes to 130% of normal.
   - Removes all padding/margins from the screen (full-bleed card).
   - Shows only the generated summary card and questions section.
   - Pins a small "Exit presentation" button in the top-right corner
     (background: rgba(255,255,255,0.9), border-radius: 8px, padding: 6px 10px, 11px text).
   - Designed to hand phone to a doctor at an appointment.
2. "Save as PDF" button (coral background, white text, full-width):
   Uses jsPDF to generate an A4 PDF document:
   - No Cradl branding on page 1. Looks like a medical form.
   - Page 1 content: all generated sections in clean table/list format.
     Baby name in large text at top. Date top-right.
   - Questions section in a bordered box at the bottom of page 1.
   - Footer: "Generated by Cradl · cradl.app" in 8pt, muted, page 1 only.
   - File name: "cradl-[babyName]-[dd-mm-yyyy].pdf" (hyphens not spaces).
   - On mobile: `Share.share({ url: pdfFilePath })` after writing to filesystem.
   - On desktop: triggers browser download.
3. "Share summary" link (11px muted, centred, below buttons):
   Opens native share with a plain-text version:
   "[babyName] — GP summary [date]\n\nFeeds: [avg]/day\nSleep: [avg]h/day\n..."

### 4.3 GP prep triggered from appointment

When an appointment within 7 days exists, a "Prepare for your visit →" coral link
appears at the bottom of that appointment's detail view (when opened from Today calendar).
Tapping navigates to /gp-summary.

---

## PART 5 — HANDOFF CARD — COMPLETE SPECIFICATION

### 5.1 What it is

A shareable link showing a live summary of the baby's current state.
The carer can log basic events without any Cradl account.

### 5.2 Generating a handoff card

Accessible from Me > Tools > "Handoff card" chip.

STEP 1 — "Leaving now" bottom sheet / dialog:

Title: "Leaving now" (Georgia serif 16px).
Body: "Create a simple card for whoever is caring for [babyName]." (11px muted).

Fields:
1. "Heads up" label above textarea.
   Placeholder: "Anything they should know? e.g. She's been fussy since 2pm, try white
   noise, nappy bag is on the kitchen table."
   Max 300 chars. Optional.
   Character counter shown when >200 chars.
2. "Carer's name" label above text input.
   Placeholder: "e.g. Grandma, Mark, Sarah."
   Max 40 chars. Optional.
   This is pre-filled with the last used value from localStorage `cradl-last-carer-name`.
   On save: updates `cradl-last-carer-name`.

"Generate handoff card" coral button (full-width, 44px, border-radius: 12px).
"Cancel" muted link.

STEP 2 — After generation:

Compute HandoffSession:
```typescript
interface HandoffSession {
  id: string;           // UUID
  createdAt: string;    // ISO
  expiresAt: string;    // ISO, 24h from now
  babyName: string;
  lastFeedTime: string | null;
  lastFeedSide: string | null;     // 'left' | 'right' | 'both' | 'bottle'
  lastFeedDuration: number | null; // minutes
  nextFeedEta: string | null;      // ISO timestamp
  lastNapEndTime: string | null;
  lastNapDuration: number | null;  // minutes
  napWindowStatus: 'open' | 'approaching' | 'closed' | 'unknown';
  napWindowOpensAt: string | null;
  napWindowClosesAt: string | null;
  isCurrentlySleeping: boolean;
  currentSleepStartTime: string | null;
  lastDiaperTime: string | null;
  lastDiaperType: string | null;   // 'wet' | 'dirty' | 'both'
  feedsToday: number;
  diapersToday: number;
  sleepToday: string;              // "10h 30m"
  headsUp: string | null;
  caregiverName: string | null;
  logs: HandoffLog[];              // starts empty
}
```

1. Save to Supabase `handoff_sessions` table (if signed in).
2. Save to localStorage `cradl-handoff-sessions` array (keep last 10).
3. Switch the bottom sheet to show the share state:

Share state UI:
- Large URL display: "cradl.app/handoff/[shortSessionId]"
  (show first 16 chars of UUID for readability, full UUID used for lookup).
  Displayed in a mono-style box: background: #f8f4f0; border-radius: 8px; padding: 10px 12px;
  font-size: 12px; font-family: monospace; color: #2c1f1f.
- "Copy link" coral button (full-width, 44px).
  On tap: copies full URL to clipboard. Button briefly shows "Copied! ✓" (1.5 seconds),
  then reverts.
- "Share via..." button (outlined, coral text, coral border, full-width).
  On mobile: opens native share sheet with URL and text "Here's the link for [babyName]'s info".
  On desktop: copies URL with toast "Link copied to clipboard."
- "Expires in 24 hours" notice (10px muted, centred).
- "Done" link (11px muted, centred). Closes the sheet.

### 5.3 Handoff page (public, no auth required)

Route: /handoff/:sessionId

This page has no Cradl navigation bar. It is a standalone public page.

LOADING STATE:
While fetching session: show "Cradl" logo + a subtle loading shimmer.

EXPIRED STATE:
If session.expiresAt < now(): full screen with:
- Grey background (#f8f4f0).
- "Cradl" logo centred.
- "This handoff card has expired." (16px Georgia serif, centred).
- "Handoff cards last 24 hours. Ask [babyName]'s parent for a new link." (11px muted).
- "Get Cradl" link (coral, links to cradl.app).

VALID STATE:

HEADER:
Small "Cradl" logo (12px, left-aligned). Not a link.
"[BabyName]'s handoff" (Georgia serif 16px, centred).
Expiry note: "Expires [HH:mm tonight / tomorrow at HH:mm]" (10px muted, centred).

INFO CARDS (5 cards, stacked):

Card 1 — Feed:
Left accent: 3px solid #d4604a.
Icon: feed SVG (coral, 20px).
Title: "Last fed" (10px muted).
Primary: "HH:mm · Xh Ym ago" (14px semibold, #2c1f1f).
Detail: "Left breast" or "Right breast" or "Xml formula/expressed" (11px muted).
Sub-row: "Next feed: around HH:mm" (11px, #4a8a4a). Or "Feed due now" in coral if overdue.

Card 2 — Nap:
Left accent colour varies by state.
Icon: moon SVG (20px).
Title: "Nap" (10px muted).
STATE: if currently sleeping:
  Accent: #4a7ab4 (blue). Primary: "Sleeping since HH:mm" (14px semibold).
  Detail: "[X]h [Y]m so far" (11px muted). Background: #f0f5ff tinted.
STATE: nap window open:
  Accent: #4a8a4a (green). Primary: "Nap time now" (14px semibold, green).
  Detail: "Sweet spot until HH:mm" (11px muted). Background: #f0f8f0 tinted.
STATE: nap window approaching (within 15 min):
  Accent: #d4904a (amber). Primary: "Nap soon · window opens ~HH:mm" (amber).
STATE: nap window past / no data:
  Accent: #ede0d4. Primary: "Last nap ended HH:mm" (14px semibold).
  Detail: "[X]h [Y]m ago" (11px muted).

Card 3 — Nappy:
Left accent: #4a8a4a (green).
Icon: nappy SVG (green, 20px).
Title: "Last nappy" (10px muted).
Primary: "HH:mm · Xh Ym ago" (14px semibold).
Detail: "Wet" or "Dirty" or "Wet and dirty" (11px muted).

Card 4 — Heads up (only shown if headsUp is not empty):
Left accent: #9a7ab4 (purple).
Icon: info circle SVG (purple, 20px).
Title: "Heads up" (10px muted).
Body: headsUp text (11px, #2c1f1f, line-height 1.5).

Card 5 — Today's summary:
Left accent: #ede0d4.
Three inline stats: "Xf feeds · Xh sleep · Xn nappies today" (11px, #9a8080).

LOG BUTTONS (3 buttons at bottom, above a safe-area spacer):
Each: full-width, 52px height, border-radius: 14px.

"Log a feed" (background: #d4604a, white text, white feed SVG icon).
"Log a nappy" (background: #4a8a4a, white text, white nappy SVG icon).
Third button TOGGLES based on sleep state:
- If not sleeping: "Start sleep" (background: #4a7ab4, white text, moon SVG).
- If sleeping: "She just woke up" (background: #7ab4d4, white text, sun SVG).

LOG A FEED sheet (bottom sheet):
Title: "Log a feed" (14px Georgia serif).
Three large tappable cards in a row:
- "Left breast" (cream background, feed SVG).
- "Right breast" (cream background, feed SVG, mirrored).
- "Bottle" (cream background, bottle SVG).
When "Bottle" selected: show a volume input (ml, stepper style 60/90/120/150ml presets +
custom input). Numeric only, 1–500ml guard.
"Save" coral button (full-width). Saves as a point-in-time event with current timestamp.
If caregiverName is set: a "Logged by [caregiverName]" caption shown below the save button.
After save: button shows "Saved! ✓" (green, 1.5 seconds). Info cards refresh.

LOG A NAPPY sheet:
Three large tappable cards: "Wet" / "Dirty" / "Both".
Each card: emoji + label + subtle tinted background.
"Save" button. Same save flow as feed.

SLEEP sheet:
If not sleeping: single large "She fell asleep just now" button (coral, full-width, 52px).
Below: "Log a past sleep →" link (11px muted).
If currently sleeping (live timer shown):
"Awake for: HH:mm:ss" live counter (mono font, 24px, #2c1f1f).
"She just woke up" button (blue, full-width).
After stopping: saves a sleep entry with start and end time.

On save (all log types):
1. INSERT to Supabase `handoff_logs`:
   `{ id, session_id, type, subtype, volume_ml, logged_at, logged_by_name }`.
   Supabase RLS policy: allows INSERT only when session exists and expiresAt > now().
   Uses public anon key (no auth required).
2. Button shows "Saved! ✓" green for 1.5 seconds.
3. Bottom sheet closes.
4. Info cards on the handoff page refresh from the new data.

GET CRADL BANNER:
At the very bottom of the page, below all content, a minimal non-intrusive banner:
"Powered by Cradl · cradl.app" in 10px muted. Not a sales pitch — just attribution.

### 5.4 Syncing handoff logs back to main account

Trigger: `App.addListener('appStateChange')` → when `isActive` becomes true.

Process:
1. Check localStorage `cradl-handoff-sessions` for any sessions created in last 24h.
2. For each session: call Supabase `SELECT * FROM handoff_logs WHERE session_id = [id]
   AND id NOT IN [localStorage set cradl-processed-handoff-ids]`.
3. For each unprocessed log: convert to the appropriate entry type and save via the
   normal save functions (which handle localStorage + Supabase + widget sync).
4. Add each log id to `cradl-processed-handoff-ids` (persisted to localStorage).
5. Show a Today tab banner for each synced log:
   "[caregiverName] logged a [feed/nappy/sleep] at [HH:mm]"
   (background: #d4eaf7, 11px, dismissible × button, auto-dismiss after 5 seconds).
   If caregiverName is null: "Someone logged a [type] at [HH:mm]".

Guard: if JSON parse fails or session is malformed: skip silently, log to console.error.

---

## PART 6 — RETURN TO WORK PLANNER — COMPLETE SPECIFICATION

### 6.1 Access and trigger

Accessible from Me > Tools > "Return to work" chip → /return-to-work.

Proactive trigger: when baby first reaches 26 weeks (triggered once, checked on app open):
A card appears on Today tab, above the greeting:
Background: #f0f8f0. Title: "Thinking about returning to work?" (12px semibold, #2a6a2a).
Body: "Cradl can build you a personalised transition plan for feeding, sleep, and your
carer." (11px, #9a8080). Two buttons: "Start planning →" (coral text, no background)
and × dismiss button (top-right).
Dismiss stores `cradl-rtw-prompt-dismissed = true` — never shown again.

### 6.2 Onboarding sheet (first time only)

Shows as a bottom sheet (mobile) or dialog (desktop) on first visit to /return-to-work.

Title: "Plan your return to work" (Georgia serif 16px).

Fields:
1. "When are you returning?" label + date input (dd/mm/yyyy).
   Required. Guard: must be in the future. If in the past: "This date has passed. Update it?"
   with the input still showing.
2. "What time do you start work?" label + time input (HH:mm). Required.
3. "How are you feeding [babyName]?" label + 3 pill buttons:
   Breastfeeding / Formula / Mixed. Required.
4. "Who will care for [babyName]?" label + 4 pill buttons:
   Nursery / Childminder / Family member / Other. Required.
5. "Their name (optional)" label + text input.
   Placeholder depends on selection: "e.g. Sunshine Nursery" / "e.g. Sarah" / "e.g. Grandma".
   Max 60 chars. Optional.

"Generate my plan →" coral button.
On generate:
1. Save to localStorage `cradl-return-to-work` and Supabase user_prefs.
2. Compute all three plan sections (see below).
3. Navigate to the plan screen (same route, onboarding sheet dismissed).

"Edit settings" link visible in the plan screen header at all times — reopens this sheet.

### 6.3 Plan screen

Three tabs: Feeding plan / Sleep shift / Handoff doc.
Tab bar: horizontal, pill style (same as milestone tabs).

TAB 1 — FEEDING PLAN:

Header row: "Week by week until your return" + return date label.

BREASTFEEDING with 4+ weeks until return:
Build week-by-week reduction starting 4 weeks before return date.

Algorithm:
1. Get currentFeeds = avg feeds/day from last 7 days of history.
2. Get targetFeeds = 0 (full formula) or 2 (maintain morning/evening if returning to BF).
3. For each of the 4 weeks before return:
   - targetFeedsForWeek = lerp(currentFeeds, targetFeeds, weekNumber / 4), rounded.
   - bottlesToIntroduce = currentFeeds - targetFeedsForWeek.

Each week card:
- Week label: "Week starting [dd/mm/yyyy]" or "Return week" for the final week.
- Progress bar: current feeds → target feeds visualised.
- "Breastfeeds: [target]x/day" (coral dot).
- "Bottle feeds to introduce: [number]x/day" (blue dot).
- Guidance text (11px muted):
  Week 1: "Replace one breastfeed with expressed milk or formula. Morning or evening is
           easiest to start."
  Week 2: "Replace another feed. Try doing this when [babyName] is calm, not hungry-crying."
  Week 3: "Building up — make sure you're expressing to maintain supply if you plan to
           continue any breastfeeding."
  Week 4 (return): "[caregiverName] will offer [N] bottles per day. Your body should
           have adjusted by now."

BREASTFEEDING with <4 weeks until return:
"Less than 4 weeks to go — here's a compressed plan." amber notice.
Show daily plan (not weekly): one card per day, same structure.

FORMULA only:
"You're already formula feeding — no feeding transition needed." green notice.
Show: "[caregiverName] will prepare [avg_volume]ml bottles approximately [N] times per day
based on [babyName]'s current schedule."

MIXED:
"You're already doing a mix of breast and bottle — here's how to adjust the balance."
Show the current ratio and a gentler reduction plan.

TAB 2 — SLEEP SHIFT:

Header: "Shifting [babyName]'s schedule to work for you"

Algorithm:
1. currentAvgWakeTime = avg first wake time from last 7 days sleep data (HH:mm).
2. requiredWakeTime = workStartTime minus 90 minutes.
3. If requiredWakeTime within 20 minutes of currentAvgWakeTime:
   Show green notice: "Her current wake time works well for your schedule.
   No adjustment needed."
4. If shift needed:
   totalShiftMinutes = absolute difference between currentAvgWakeTime and requiredWakeTime.
   Build 3-week plan: shift by ~10 minutes every 3 days.
   Each 3-day block: target wake time, target bedtime (maintaining consistent duration).

Visual timeline:
A horizontal bar showing current wake time on left, target on right.
Step markers at each 3-day block with target times.

Each block card:
"Days [X]–[Y]: Wake at [time] · Bedtime at [time]" (11px).
Brief guidance: "Move wake time forward by 10 min by setting your alarm and going to
her 10 min earlier each morning for 3 days."

"Start reminder" button: schedules a local notification for the first bedtime of the plan.
"Remind me at 7pm each evening during the shift." (11px muted below button).

TAB 3 — HANDOFF DOC:

Title: "Daily routine for [caregiverName/nursery]" (Georgia serif 16px).
Subtitle: "All fields are pre-filled from your logs — edit anything you need to." (11px muted).

All fields are inline-editable: tapping any value opens an inline text input.
Changes save immediately to localStorage on blur.

Fields (each as a row: label on left, value on right, tappable to edit):
- Baby's name: [babyName] (read-only, from profile).
- Date of birth: [DOB in dd/mm/yyyy] (read-only).
- Typical wake time: [computed from sleep averages]. Editable.
- Typical bedtime: [computed from sleep averages]. Editable.
- Nap schedule: auto-generated in plain English:
  e.g. "Usually 2–3 naps: first around 09:30 (45–60 min), second around 13:00 (1–1.5h),
  catnap around 15:30 (20–30 min)." Editable.
- Feeding: auto-generated:
  e.g. "Breastfed, usually left breast first. Feeds every 2.5–3h. Takes a bottle of
  expressed milk when needed." Editable.
- How she settles: from most common fallAsleepMethod:
  e.g. "Usually settles with rocking. A dummy helps. White noise recommended." Editable.
- What to try if unsettled: from playbook if available, else:
  "Being held upright after feeds helps with wind. Try tummy massage." Editable.
- Emergency contact: text input, placeholder "Parent's phone number". Required before PDF export.
- Allergies/notes: text input, placeholder "None known". Optional.

"Save as PDF" coral button:
Guard: if Emergency contact is empty: show inline error "Please add an emergency contact
before generating the PDF."
On tap: generate PDF titled "[babyName]'s Daily Routine"
Subtitle: "For [caregiverName/nursery] · from [returnDate]"
Professional layout: no Cradl branding on page 1.
Footer: "Prepared by Cradl · cradl.app"
File name: "cradl-routine-[babyName]-[dd-mm-yyyy].pdf".

"Share" link below button: plain text version via native share.

### 6.4 Countdown card (7 days before return date)

When returnDate is within 7 days from today: card shown on Today tab ABOVE the greeting.
Background: #faf6ff; border: 1px solid #e4d4f4; border-radius: 14px; padding: 14px.
× dismiss button top-right. Dismiss stores `cradl-rtw-countdown-dismissed-[YYYY-MM-DD]`.

Day 7: Title: "7 days to go." Body: "The logistics are mostly sorted. How are you feeling
        about it? Take a moment for yourself if you can."
Day 5: Title: "5 days to go." Body: "Check in with your plan. Is the feeding transition
        going as expected?"
Day 3: Title: "3 days to go." Body: "It's okay to feel all the feelings about this.
        You're allowed to be sad and excited and terrified all at once."
Day 1: Title: "1 day to go." Body: "You have done something extraordinary this year.
        Tomorrow is just the next chapter."
Day 0: Title: "Today is your first day back." Body: "You've got this. [babyName] is in
        good hands." (Show only if this day's card hasn't already been dismissed.)

---

## PART 7 — MEMORY BOOK — COMPLETE SPECIFICATION

### 7.1 Access and premium gate

Accessible from Me > Tools > "Memory book" chip → /memories.
Free users: can view text-only day cards for the current week and all past months.
Photos, adding photos, and the monthly share feature are PRO-gated.
When a free user taps "Add photo": show PremiumGate MODE A paywall.

### 7.2 Memory book screen

Header: "[babyName]'s memory book" (Georgia serif 20px, padding: 16px).

LAYOUT: vertically scrollable. Each month section:
1. Month header: "[Month YYYY] · [X weeks old – Y weeks old]" (14px semibold, sticky
   while scrolling through that month).
2. Horizontal scroll row of day card thumbnails (scrollable, no snap).
3. Monthly recap card (at the bottom of the month section).

LAZY LOADING: generate month sections lazily. On scroll within 200px of an unrendered
month: generate that month's day cards. Cache in memory (not localStorage).

Day card thumbnail:
Width: 120px. Height: 100px. Border-radius: 12px.
Background: #fff. Border: 1px solid #ede0d4.

Content layout:
- If photo exists: photo fills the top 60px (object-fit: cover, border-radius: 12px 12px 0 0).
- Date (9px muted, top-left, padding: 4px 6px).
- Primary stat bottom section (40px if no photo, 40px if photo present below it):
  Shows the most notable stat for that day:
  If milestone achieved: milestone name in coral, 10px semibold.
  Else if long sleep: "Xh Ym sleep" in blue, 10px semibold.
  Else: "X feeds" in muted, 10px.
- Weekly birthday badge: if this date is the same weekday as baby's DOB: small coral dot
  top-right corner of the card.

Tapping any thumbnail → DayCardModal.

### 7.3 DayCardModal

Full-screen modal. Slides up from bottom with 300ms ease-out.
"Close" button top-right (chevron-down SVG, accessible).
Keyboard: Escape closes.

HEADER:
"[Day of week, dd Month yyyy]" (14px semibold, #2c1f1f).
"[babyName] was [X weeks Y days] old" (11px muted).
If weekly birthday: "★ [X] weeks old today!" coral badge (background: #feeae4, coral text).

STATS SECTION:
2×2 grid of stat cells. Auto-computed from logs for that specific date:
- Feeds: "[N] feeds" value + "0" default if no logs.
- Sleep: "[Xh Ym]" or "—" if no sleep entries.
- Nappies: "[N]" or "—".
- Tummy: "[Xm]" or "—".
Each cell: background: #f8f4f0; border-radius: 8px; padding: 10px; text-align: center.
Value: 20px semibold, #2c1f1f. Label: 10px muted.

MILESTONE BADGE (conditional):
If any milestone has achievedDate matching this date:
Full-width coral banner: "★ [milestone name]" (13px semibold, white text on coral background,
border-radius: 10px, padding: 10px, margin-bottom: 8px).

PHOTOS SECTION:
If PRO:
  If no photos: "Add a photo to remember this day" (11px muted, centred) + large "+" button
  (60px circle, background: #feeae4, coral + SVG icon, border: 2px dashed #d4604a).
  If photos exist: horizontal scroll of photo thumbnails (100px × 100px, border-radius: 8px,
  object-fit: cover). "+" button at the end of the scroll.
  Photo count: "[N] photo[s]" label (10px muted) above scroll.
If free:
  Show the section title and "+" button but tapping the "+" opens PremiumGate paywall.

ADD PHOTO flow (PRO):
Bottom sheet: "Add a photo" title.
Two options (each a large card):
- "Choose from library" (image SVG, 44px icon) → expo-image-picker `launchImageLibraryAsync`.
- "Take a photo" (camera SVG) → expo-image-picker `launchCameraAsync`.
Both options: `allowsEditing: true`, `aspect: [4, 3]`, `quality: 0.8`.

After selection:
1. Compress with expo-image-manipulator: max 1200px longest side, JPEG 80%.
2. Show upload progress bar on the photo slot (0% → 100%).
3. Upload to Supabase Storage: `baby-memories/[user_id]/[baby_id]/[YYYY-MM-DD]/[uuid].jpg`.
4. Get a 1-hour signed URL. Display photo immediately.
5. Save metadata to Supabase `memory_photos` table AND localStorage.
   `{ id, baby_id, date, storage_path, caption: null, created_at }`.
6. If upload fails: show inline error on the photo slot, retry button.

CAPTION:
Below each photo thumbnail: 1-line text input (placeholder "Add a caption...").
`onBlur` handler: save caption to `memory_photos.caption` + localStorage. Debounced 800ms.
Shown as italic 10px text below the photo when not editing.

DELETE PHOTO:
Long-press on thumbnail → contextual menu (iOS) or bottom sheet (Android):
"Delete photo" option. Opens confirmation: "Remove this photo?" with "Cancel" and
"Remove" (red text) buttons.
On confirm: DELETE from Supabase Storage, DELETE from memory_photos, remove from local state.

NOTES SECTION:
Below the photos section.
Label "Notes for this day" (11px semibold, #2c1f1f).
Multiline text input: min-height: 80px; border: 1px solid #ede0d4; border-radius: 10px;
padding: 10px; font-size: 11px.
Placeholder: "Anything you want to remember? Something funny she did, how you were feeling..."
Max 500 chars.
Saves on blur (debounced 800ms) to localStorage `memory-notes-[baby_id]-[YYYY-MM-DD]`
and Supabase `memory_notes` table.

### 7.4 Monthly recap card

Appears at the bottom of each month section.
Background: `linear-gradient(135deg, #fde8d8, #e8d4f5)`.
Border-radius: 16px. Padding: 16px. Margin: 0 12px 8px.

Header: "[Month YYYY]" (Georgia serif 16px, #2c1f1f).
Age range: "[babyName] was [X]–[Y] weeks old" (11px, #7a6050, margin-bottom: 12px).

AUTO-GENERATED HIGHLIGHTS (up to 5 bullets):
Each is a sentence computed from the month's data. Sources:

1. Best sleep (if best sleep this month > all-time previous best):
   "First time sleeping [X]h [Y]m in a row — [baby's name]'s longest sleep yet. [date ordinal]."
2. First milestone this month (if any):
   "First time [milestone name] — [date ordinal]."
3. Most active feeding day:
   "Busiest feeding day: [N] feeds on the [date ordinal]." + context if growth spurt.
4. Sleep comparison vs prior month:
   "Sleep averaged [Xh Ym]/day, [up from/down from/same as] [Yh Zm] last month."
5. Tummy time progress:
   "Tummy time: averaged [Xm]/day." Or "Tummy time really picked up this month — up [X]%."

If no data for a highlight type: skip that bullet.
If fewer than 2 highlights can be computed: show "Not enough data this month to generate
highlights — keep logging!" in muted italic text.

FUN FACT:
One sentence from a hardcoded array indexed by baby's age in months at that month.
Example at ~3 months: "At 3 months, babies start to recognise familiar voices even
across a room."
Example at ~6 months: "At 6 months, your baby's brain is 50% of its adult size — growth
at its fastest."

PHOTOS STRIP (PRO only, if photos exist for the month):
Horizontal row of up to 4 circular photo thumbnails (40px diameter, border-radius 50%,
object-fit: cover), overlapping slightly like an avatar group.
If more than 4 photos: "+ [N] more" text.

SHARE BUTTON (PRO only):
"Share this month" coral button (full-width within the card).
On tap:
1. Use react-native-view-shot to capture the MonthlyRecapCard as a PNG at 2× resolution.
2. Open native share sheet with the image.
3. On desktop: trigger browser download of the PNG.
   File name: "cradl-[babyName]-[month-year].png".

### 7.5 Memory book data storage and privacy

Photos: Supabase Storage, private bucket (no public access). All URLs are signed with
1-hour expiry. URLs re-fetched from Supabase when they expire.

CSAM scanning: all uploads pass through PhotoDNA API before being committed to storage.
If flagged: immediately DELETE the uploaded file, do NOT save metadata, do NOT return
a signed URL. Log to NCMEC CyberTipline automatically via Edge Function. Never store
the file, never show an error message that reveals detection (show generic "Upload failed,
please try again").

Photos are never:
- Synced to family members' devices
- Included in CSV export
- Included in PDF export
- Accessible via the handoff page
- Viewable by anyone other than the signed-in owner

---

## PART 8 — KNOWLEDGE LIBRARY — COMPLETE SPECIFICATION

### 8.1 Article data structure

Articles are bundled in the app as markdown files with YAML frontmatter.
They work offline. They do not require an internet connection.

Frontmatter structure:
```yaml
---
id: four-month-sleep-regression
title: The 4-month sleep regression
category: Sleep
triggerConditions:
  - sleep_regression_detected
ageRangeWeeks: [14, 22]
lastReviewed: 2025-01-15
wordCount: 520
---
```

Required final section in every article body (rendered with rose-tinted background):
## When to call your GP or 111

Article guidelines: 400–600 words. Plain English. No jargon. NHS-aligned advice.
No brand mentions. No affiliate links.

### 8.2 Library screen (/library)

Header: "Knowledge library" (Georgia serif 20px, padding: 16px).

SEARCH:
Full-width search bar: "Search articles" placeholder.
Search runs client-side over title and article body.
Results update on each keystroke (debounced 150ms).
Empty search results: "No articles found for '[query]'. Try a different search term."

CATEGORY TABS:
Horizontal pill scroll:
All / Sleep / Feeding / Nappies / Development / Mum's health
Active tab: coral background. Inactive: border only.

ARTICLE LIST:
Article cards in a vertical list. Each card:
- Title (12px semibold, #2c1f1f).
- First sentence of article body (11px muted, 1 line, truncated with ellipsis).
- Row below: category badge (coloured tag) + "Last reviewed [Month YYYY]" (9px muted, right).
- Border: 1px solid #ede0d4. Border-radius: 12px. Padding: 12px 14px. Margin-bottom: 6px.
Tapping opens ArticleModal.

### 8.3 Contextual article triggering on Today tab

Up to 2 triggered article cards shown below the Cradl noticed section on Today tab.
Each triggered card: same style as library article card but with a "Why this?" link
(10px muted, right side of card). Tapping "Why this?" shows a tooltip: the trigger reason
in plain English (e.g. "Shown because you logged a green nappy today").

"Dismiss — don't show again for a week" link (10px muted) below each card.
On dismiss: add to localStorage `cradl-dismissed-articles` as `{ id, dismissedAt }`.
Filter: articles dismissed within 7 days are not re-triggered.

COMPLETE TRIGGER MAP:
sleep_regression_detected + age 14–22 wks → four-month-sleep-regression.md
sleep_regression_detected + age 24–28 wks → six-month-sleep-regression.md
sleep_regression_detected + age 32–44 wks → eight-month-sleep-regression.md
sleep_regression_detected + age 52–56 wks → twelve-month-sleep-regression.md
no_poop_alert (gap >24h) → no-dirty-nappy.md
first_solid_logged → starting-solids.md
age crosses 17 weeks (once only, checked on app open) → starting-solids.md
feed_duration_dropping (avg duration down >20% over last 7 days) → is-baby-getting-enough-milk.md
nap_window_past_by_30min → overtired-baby.md
diaper_colour_green (from nappy guide) → green-poo.md
feeds_per_day_high (>9 in 24h) → cluster-feeding.md
breast_pain_logged → breast-engorgement.md
breast_pain_logged + severity ≥ 4 → mastitis-signs.md
first_bottle_logged_while_breastfeeding → introducing-bottle-to-breastfed-baby.md
first app open ever (age 0–26 weeks, shown once) → safe-sleep-guide.md
overwhelmed_mood_logged (first occurrence only) → postnatal-rage.md

### 8.4 ArticleModal

Full-screen modal. Slides up from bottom.

HEADER:
Article title (17px Georgia serif, #2c1f1f). Margin-bottom: 4px.
Category badge. "Close" button (top-right, accessible: accessibilityLabel="Close article").

SCROLL BODY:
Markdown rendered with react-native-markdown-display (or marked.js on web).
Standard prose sizes. Line-height: 1.7.

WHEN TO CALL YOUR GP section:
Always rendered with a special wrapper:
Background: #fde8e8; border-radius: 10px; padding: 12px; margin: 8px 0.
This section is visually distinct and always readable.

FOOTER (pinned at bottom of modal, above keyboard):
"Last reviewed [Month YYYY]" (10px muted, left-aligned).
"Was this helpful?" label + two buttons:
- "Yes ✓" (background: #e4f4e4, color: #2a6a2a, border-radius: 12px, padding: 5px 12px).
- "Not really" (background: #f0ece8, color: #6a5040, same size).
Response saved to Supabase analytics table (non-PII: article_id + helpful bool + timestamp).
Never shown to user. Never required.
"Dismiss — don't show again for a week" (10px muted, centred, below buttons).
If the article was triggered contextually: tapping this dismisses the trigger.

---

## PART 9 — SAFETY SCREEN — COMPLETE SPECIFICATION

### 9.1 Access

Me > Tools > "Safety" chip (border: 1px solid #f4d4d4; color: #9a7070).
Route: /safety.

### 9.2 Screen layout

No tab navigation visible on this screen (hidden for safety reasons).
"← Back" button top-left. On tap: navigate to previous screen.

Header: "Safety" (Georgia serif 20px). Subtitle: "Tools to help you stay safe." (11px muted).

QUICK EXIT (most prominent element, at the very top):

"Quick exit" button:
Background: #c04030. Color: white. Font-size: 14px; font-weight: 600.
Full-width. Height: 56px. Border-radius: 14px.
Instruction above button: "Tap to immediately close the app." (11px muted, centred).

On tap:
1. On iOS (Capacitor): call `App.exitApp()` from @capacitor/app.
   This moves the app to background (iOS does not allow force-quit from code, but this
   is the closest possible). On iOS: additionally navigate to a blank white screen first
   so if the user returns to the app, they don't see baby data.
2. On Android (Capacitor): call `App.exitApp()` which finishes the Android activity.
3. On web: navigate to a blank page (`window.location.href = 'about:blank'`).
No confirmation dialog. This button must respond instantly.

---

SECTION: "Remove someone from your family"

List of current family members (excluding self).
Each row: avatar circle + name + "Remove without notifying them →" link (11px, coral).
Tapping opens the same remove confirmation as Settings > Family sharing, with the same
silent behaviour.
If no family members: "You don't have any family members to remove." (11px muted).

---

SECTION: "Hide this app icon"

Toggle switch. Label: "Change app icon."
Sub-label: "Replaces the Cradl icon with a neutral calendar icon."
On iOS: uses `UIAlternateIconName` capability via a Capacitor plugin.
On Android: uses Activity Alias to switch to an alternative launcher entry.
On web: not supported. Show "Available in the Cradl mobile app." (11px muted, greyed out).

---

SECTION: "Your location data"

Body: "Cradl uses your approximate location at night to count how many parents are
also awake nearby. We store only a rough area (about 50km radius), never your exact
address. No personal data is attached to these counts." (11px, #2c1f1f, line-height 1.5).

"Delete all my location data" outlined red button.
On tap: confirmation "Delete all location data? This will also opt you out of the
night count feature." with "Cancel" and "Delete" (red background) buttons.
On confirm: calls Edge Function `delete-night-ping-data` which deletes all rows in
`night_pings` where hashed_user_id = hash(user_id). Clears localStorage
`cradl-night-ping-consent`.
Success toast: "Location data deleted." (green, 2 seconds).

---

SECTION: "Helplines"

Three rows, each: 
Background: #fff. Border: 1px solid #ede0d4. Border-radius: 12px. Padding: 12px 14px.
Margin-bottom: 6px.

Row 1: National Domestic Abuse Helpline
Phone icon SVG (red, 18px). "National Domestic Abuse Helpline" (12px semibold).
"0808 2000 247" (14px, coral, font-weight 600). Rendered as a `<a href="tel:08082000247">`.
"Free and confidential · 24/7" (10px muted).

Row 2: PANDAS Foundation
Phone icon SVG (purple, 18px). "PANDAS Foundation" (12px semibold).
"0808 1961 776" (14px, coral, font-weight 600). `<a href="tel:08081961776">`.
"Postnatal mental health · Mon–Sat 11am–10pm" (10px muted).

Row 3: NHS 111
Phone icon SVG (blue, 18px). "NHS 111" (12px semibold).
"111" (14px, coral, font-weight 600). `<a href="tel:111">`.
"24/7 health advice" (10px muted).

These phone numbers must NEVER be truncated, clipped, or cut off under any circumstances.
They must be tappable on mobile and must open the phone dialler.
On desktop: render as a link that copies the number with a "Copied" toast.

---

## PART 10 — ASK CRADL AI — COMPLETE SPECIFICATION

### 10.1 The floating button

Position: absolute, bottom: 80px (above nav bar safe area), right: 16px.
Size: 56px circle. Background: #d4604a. Shadow: none.
Icon: speech bubble SVG (white, 22px).
For free users: same button visible, tapping opens PremiumGate MODE A.
For PRO users: tapping opens AskCradlSheet.
accessibilityLabel: "Ask Cradl a question about your baby."

### 10.2 AskCradlSheet

Bottom sheet (mobile, `snapPoints: ['80%', '95%']`) or centered dialog (desktop,
max-width: 500px, max-height: 80vh).

Header row:
"Ask Cradl" (Georgia serif 16px, left).
"[N] of 10 questions today" (10px muted, right).
"×" close button (top-right corner, 24px tappable area).

QUICK QUESTIONS row (horizontal scroll):
4 pills: "Is this normal?" / "Should I call the GP?" / "Why won't she sleep?" /
"Is she eating enough?".
Each: border: 1px solid #ede0d4; border-radius: 20px; padding: 5px 12px; font-size: 11px.
On tap: fills textarea with that question (user can edit before sending).

QUESTION INPUT:
Textarea: min-height: 80px, border: 1px solid #ede0d4, border-radius: 12px, padding: 12px,
font-size: 12px, line-height: 1.5. Placeholder: "What's on your mind?".
Max 500 chars. Character counter (10px muted) at bottom-right when >300 chars.
"Ask →" coral button (below textarea, right-aligned or full-width on mobile).
Disabled state (greyed) when textarea is empty.

LOADING STATE:
"Ask →" button replaced by a pulsing animation: 3 coral dots scaling in sequence.
"Thinking..." label (11px muted).

RESPONSE STATE:
Answer text rendered as markdown (react-native-markdown-display or marked.js).
Font size: 13px. Line-height: 1.6. Max readable width.

Immediately below the answer:

ESCALATION CARD (always present after every answer):
Based on the [ROUTINE] / [MONITOR] / [URGENT] tag parsed from the Edge Function response:

ROUTINE:
Background: #e8f4e8; border-left: 3px solid #4a8a4a; border-radius: 0 10px 10px 0;
padding: 10px 12px.
Icon: green checkmark SVG.
Text: "This is common and usually nothing to worry about." (11px, #2a6a2a).

MONITOR:
Background: #fff8e8; border-left: 3px solid #d4904a; border-radius: 0 10px 10px 0;
padding: 10px 12px.
Icon: amber eye SVG.
Text: "Keep an eye on this. If it continues beyond [timeframe from answer] or gets worse,
contact your health visitor or GP." (11px, #8a5a00).

URGENT:
Background: #fce8e8; border-left: 3px solid #c04030; border-radius: 0 10px 10px 0;
padding: 10px 12px.
Icon: red alert SVG.
Text: "This is worth calling 111 about now. Don't wait." (11px semibold, #8a2020).
PLUS a "Call 111 now" button:
background: #c04030; color: white; border-radius: 10px; padding: 10px 16px; width: 100%;
height: 44px; font-size: 12px; font-weight: 600.
`href="tel:111"`. This button must always be rendered above the disclaimer.

DISCLAIMER (always present, below escalation card):
"This is general information, not medical advice. Always trust your instincts —
if you're worried, call your GP or 111." (10px muted, line-height: 1.5).

Below disclaimer:
"Ask another question" link (11px coral) — clears the textarea and scrolls to input.
"Close" muted link.

HISTORY:
"Previous questions" link in the sheet header (left side, 10px coral).
Tapping shows a list of the last 20 Q&A pairs from localStorage `cradl-ask-history`.
Format: question (12px semibold) + answer (11px muted, 2 lines truncated) + timestamp (9px muted).
Tapping an old item shows it full-screen in the same modal.
History is completely private. Never synced to family. Never exported.

### 10.3 The Edge Function

Route: `POST /ask-cradl` (Supabase Edge Function, TypeScript/Deno).

Request body:
```typescript
{
  question: string;          // max 500 chars
  context: {
    babyAgeWeeks: number;
    lastFeedHoursAgo: number | null;
    lastSleepHoursAgo: number | null;
    lastDiaperHoursAgo: number | null;
    currentAlerts: string[];  // e.g. ["no_poop_48h", "sleep_regression"]
    recentSymptoms: string[]; // from health log last 7 days
  }
}
```

Server-side validation (before calling Claude API):
1. Verify Supabase JWT. If invalid: return 401.
2. Check user_entitlements table for 'premium' entitlement. If not premium: return 403
   with `{ error: "premium_required" }`.
3. Check `ask_cradl_usage` table: count rows for this user_id in last 24h.
   If ≥ 10: return 429 with `{ error: "rate_limit", message: "You've reached today's
   question limit (10/day with Premium). Try again tomorrow." }`.
4. Validate question length (>0, ≤500). If invalid: return 400.
5. INSERT a row to `ask_cradl_usage` (user_id, asked_at, question_hash — SHA256 of question,
   NOT the question itself for privacy).

Build Claude API call:
Model: `claude-sonnet-4-20250514`.
Max_tokens: 600.
System prompt (stored in Edge Function environment, NEVER sent to client):
  [See system prompt in original addendum Part 10.4 — do not modify]

User message:
"Baby context: [babyAgeWeeks] weeks old. Last feed [X]h ago. Last sleep [X]h ago.
Last nappy [X]h ago. Active alerts: [list]. Recent symptoms: [list].
Parent's question: [question]"

Parse response:
1. Extract last line from response content.
2. If last line is exactly "[ROUTINE]", "[MONITOR]", or "[URGENT]": set escalationLevel.
3. Remove the last line from the displayed answer.
4. If no escalation tag found: default to "MONITOR" (conservative fallback).

Return:
```typescript
{
  answer: string;
  escalationLevel: 'routine' | 'monitor' | 'urgent';
  disclaimer: "This is general information, not medical advice. Always trust your
               instincts — if you're worried, call your GP or 111."
}
```

On any Claude API error: return 500 with
`{ error: "service_error", message: "Unable to answer right now. Please call your GP or
  111 if you have an urgent concern." }`.

---

## PART 11 — COMPLETE SETTINGS SPECIFICATION

### 11.1 Baby profile section

PHOTO:
Circular avatar (80px diameter). Tappable.
If no photo: dashed border (2px dashed #f5c4c4), background: #feeae4, camera SVG icon.
On tap: bottom sheet / dialog with "Choose from library" / "Take a photo" / "Cancel".
After selection: compress to 200×200 JPEG 85%. Upload to Supabase Storage private bucket.
Store URL in babyProfile.photoUrl. Photo fills circle (object-fit: cover).
"Remove photo" link (10px muted, centred) below circle if photo exists.

FIELDS:
Baby's name: text input. Max 40 chars. Optional.
  Placeholder: "e.g. Audrone".

Your name: text input. Max 40 chars. Optional.
  Helper text: "We'll use this to talk to you as a person, not just as a parent."
  (10px muted, below input).

Birth date: date input (dd/mm/yyyy). Required for predictions.
  Shows computed age below: "Age: [X] weeks [Y] days" (if <12 weeks) or
  "[X] months [Y] days" (if ≥12 weeks). 10px muted.
  Future date (>2 weeks ahead): show muted note "Looks like a due date — we'll switch
  to pregnancy mode until baby arrives." (pregnancy mode flag set in profile).
  Very old date (>3 years past): amber note "Cradl is designed for babies up to 2 years
  old. Some features may be limited."

Sex: three pill buttons: Girl / Boy / Prefer not to say.
  Helper text: "Used only for WHO growth percentile accuracy." (10px muted).

Blood type: dropdown. Options: A+, A−, B+, B−, AB+, AB−, O+, O−, Don't know.
  Optional. Shown at bottom of section, collapsible under "More details ↓".

ADD ANOTHER BABY:
"+ Add another baby" button at the TOP of the baby profile section, before the current
baby's fields.
On tap: creates a new empty baby profile and opens the baby profile section for the new baby.
A baby switcher (small avatar row) appears in the Today tab header when multiple babies exist.
Max 4 babies per account.
Each baby: independent log history, predictions, insights.
Current baby shown with a coral border on the switcher.

REMOVE THIS BABY:
Red outlined button at the BOTTOM of the baby profile section.
"Remove [babyName]" (or "Remove this baby" if no name).
Two-step confirmation:
Step 1: "Remove [babyName]? This will permanently delete all logs, growth data, and
milestones for this baby. This cannot be undone."
"Cancel" + "Yes, remove [babyName]" (red background) buttons.
Step 2: Text input "Type [babyName] to confirm." (or "Type REMOVE if no name).
"Confirm removal" button disabled until correct text is entered.
On confirm: delete all baby_id data from localStorage and Supabase.
If this was the only baby: navigate to onboarding step 3.
If others remain: switch to the next baby, show "Removed." toast.

### 11.2 Alert thresholds section

Four adjustable settings, each with − / value / + increment buttons:
(Button size: 32×32px, border: 1px solid #ede0d4, border-radius: 8px)

- "No dirty nappy alert (hours)": default 24, range 4–72. Step: 1.
  Helper: "You'll be notified if no dirty nappy logged in this time."
- "Feed overdue buffer (minutes)": default 30, range 0–120. Step: 5.
  Helper: "Alert this many minutes after the predicted next feed time."
- "Tummy time daily target (minutes)": default 20, range 5–60. Step: 5.
  Helper: "Alert if this total not reached by the set check time."
- "Tummy check time (hour)": default 16 (shows as "4:00 PM"), range 6–23. Step: 1.
  Helper: "Alert at this time if daily tummy target not yet reached."

"Reset to defaults" link (10px muted, right-aligned) at bottom of section.
On tap: confirmation "Reset alert settings to defaults?" with "Cancel" and "Reset".

### 11.3 Notifications section

Six toggle rows. Each: label (12px semibold) + helper text (10px muted) + toggle switch.

- "Feed reminder" (default ON):
  "Notified when a feed is overdue based on your predicted interval."
- "Nap window opening" (default ON):
  "15 minutes before the sweet spot opens, based on current wake time."
- "Pain relief safe" (default ON):
  "When it's safe to take your next painkiller dose."
- "Vaccination due" (default ON):
  "7 days before a UK vaccination milestone is due."
- "Nap stage transition" (default ON):
  "When [babyName] may be ready to drop a nap."
- "Daily tummy reminder" (default ON):
  "If your tummy time goal isn't reached by [check time]."

Below toggles:
"Request notification permission" button (shown only if `Notification.permission !== 'granted'`
on iOS/Android). Tapping calls `Notifications.requestPermissions()`.

### 11.4 App view section

Two large tappable cards side-by-side:
Each: border: 1px solid #ede0d4; border-radius: 14px; padding: 16px; flex: 1.
Selected: border: 2px solid #d4604a; background: #fff8f5.

Card 1 — "Full view":
SVG illustration of a full dashboard (simple abstract lines).
"Full view" (13px semibold).
"See everything — all tabs, full history." (11px muted).

Card 2 — "Partner view":
SVG illustration of 4 simple large buttons.
"Partner view" (13px semibold).
"Quick log buttons and today's summary only." (11px muted).

Switching between views takes effect immediately.

### 11.5 Accessibility section

"Reduce motion" toggle (default OFF):
When ON: disables all Animated transitions (fade-ins, slide-ups, timer animations).
Stored in localStorage `cradl-reduce-motion`.
Applied globally via a `ReduceMotionContext` that wraps all components.
All components check `useReduceMotion()` before starting animations.

"Text size" dropdown (three options):
100% (default), 120%, 140%.
Applied via `fontScale` multiplier in `useAccessibleFontSize()` hook.
Every `<Text>` component reads this multiplier. fontScale does NOT affect fixed UI elements
(nav bar icons, tags) — only prose text.

"High contrast" toggle (default OFF):
When ON:
- `#b09080` (muted text) → `#6a5040`
- `#c4a8a0` (very muted) → `#7a5a50`
- `#ede0d4` (border) → `#c4a8a0`
All muted colours darken to meet WCAG AA 4.5:1 contrast on cream (#fffbf5) background.
Stored in localStorage `cradl-high-contrast`. Applied via CSS variables override.

Note: `#b09080` on `#fffbf5` has a contrast ratio of approximately 3.8:1, which fails
WCAG AA. When implementing, ensure all muted text meets WCAG AA before shipping.
High contrast mode raises all failing colours to pass. The default theme must be
verified with a colour contrast checker before release.

### 11.6 Language section

Dropdown with current selection displayed (language name in its native script):
- English (selected by default if device locale is not Lithuanian)
- Lietuvių (selected by default if device locale is lt)
- Deutsch — coming soon (greyed out, not selectable)
- Français — coming soon (greyed out)
- Español — coming soon (greyed out)

On selection: `i18n.changeLanguage(code)`. Store in localStorage `cradl-language`.
App re-renders immediately (react-i18next handles this without a reload).
A brief toast: "Language changed to [name]." (2 seconds).

### 11.7 Account section

Signed in state:
- "Signed in as" label (10px muted) above the email address (12px semibold).
- "Sign out" link (11px, #c04030).
  Confirmation bottom sheet: "Sign out of Cradl?"
  Body: "Your logs are saved locally and will sync when you sign back in."
  "Cancel" + "Sign out" (red text, no background) buttons.
  On sign out: call `supabase.auth.signOut()`. Navigate to /login.
  Do NOT delete localStorage (data stays for when they sign back in).

- "Active sessions" row (chevron right):
  Opens a screen showing all devices with active Supabase sessions.
  Each row: device icon (phone/desktop SVG), "iPhone · London, UK" approximation,
  "Last active [relative time]" (10px muted). "Sign out this device" (11px coral).
  Bottom of list: "Sign out all other devices" coral outlined button.

- "Connected accounts" section:
  Google row: "Google" (12px semibold) + google SVG icon (20px) + either
  "Connected · [email]" (tg badge) or "Connect" coral link.
  "Disconnect" link (10px muted) if connected.
  Apple row: same pattern. iOS only.
  If disconnecting a social account that is the only sign-in method: show warning
  "You need at least one sign-in method. Add an email password first."

Not signed in state:
- "You're not signed in" title.
- "Sign in or create account" coral button.
- "Your data is saved locally on this device." (10px muted).

### 11.8 Family sharing section

(Full specification in Part 2 of this document.)

### 11.9 Voice commands section

Intro: "Tap the mic button (floating above the nav bar), then speak a command."
"The 'Cradl,' prefix is optional." (11px muted, below intro).

Commands list: scrollable. Each row:
Command text in a code-style pill:
background: #f8f4f0; border: 1px solid #ede0d4; border-radius: 6px; padding: 4px 8px;
font-size: 11px; font-family: monospace; color: #4a3030.
Description below command (10px muted).

(Full command list in Part 11 of prior addendum — 17 commands.)

### 11.10 Export data section

"Export all data as CSV" coral button (full-width, 44px, border-radius: 12px).
"Download all your logs as spreadsheet files." (11px muted, below button).
"Last exported: [dd/mm/yyyy at HH:mm]" (10px muted) shown after first export.

On tap:
1. Show inline loading: button text becomes "Preparing..." + subtle animation.
2. Generate all CSV files (see Part 16 for complete column specifications).
3. Zip using fflate library.
4. On mobile: save to FileSystem.cacheDirectory, call Share.share({ url: path }).
5. On desktop: trigger browser download. File name: "cradl-export-[dd-mm-yyyy].zip".
6. On success: button reverts to "Export all data as CSV".
   Update localStorage `cradl-last-csv-export` with ISO timestamp.
   Show toast: "Export ready. [N] files, [X]KB." (green, 3 seconds).

### 11.11 Danger zone section

Background: #fff8f8. Border: 1px solid #f4d4d4. Border-radius: 12px. Padding: 14px.
Title: "Danger zone" (12px semibold, #c04030). Margin-bottom: 10px.

"Delete my Village data" button (outlined, border-color: #f4a0a0, color: #c04030,
full-width):
Confirmation dialog:
"Delete your Village data?"
"This removes your night-ping location data and Village profile. Your baby tracking data
is not affected."
"Cancel" + "Delete Village data" (red background) buttons.
On confirm: call Edge Function `delete-village-data`.

"Wipe all baby data" button (same style):
Step 1 dialog: "Wipe all data for [babyName]? This permanently deletes all logs,
growth records, and milestones. This cannot be undone."
"Cancel" + "Yes, continue" buttons.
Step 2: text input "Type WIPE to confirm." "Confirm wipe" button disabled until
user types exactly "WIPE" (case-sensitive).
On confirm: delete all data for current baby_id. Navigate to Today tab. Show
"All data wiped." toast.

"Delete account" button (same style):
Step 1: "Delete your Cradl account? This permanently deletes all data for all babies,
all family connections, and your account. GDPR deletion within 30 days."
Step 2: text input "Type DELETE to confirm."
On confirm: call Supabase admin delete-user Edge Function.
Sign user out immediately. Navigate to /login.
Show full-screen confirmation: "Your account has been scheduled for deletion.
All data will be permanently removed within 30 days."

---

## PART 12 — SHOPPING LIST AND NOTES

### 12.1 Shopping list screen (/shopping-list)

Header: "Shopping list" (Georgia serif 20px, padding: 16px).

QUICK-ADD CHIPS (horizontal scroll, no snap):
Chips: Nappies / Wipes / Formula / Diaper cream / Baby shampoo / Expressed milk bags /
Breast pads / Nipple cream.
Each: background: #fff; border: 1px solid #ede0d4; border-radius: 20px; padding: 5px 12px;
font-size: 11px; font-weight: 500.
If item already on list: chip shows a checkmark prefix, background: #feeae4, color: #d4604a.
Tapping adds to list. Tapping again removes from list.

CUSTOM ITEM INPUT:
A row with a text input (flex: 1) and a "+" button (coral, 36px circle).
Input placeholder: "Add a custom item..."
On "+" tap: if input non-empty: add item to list, clear input.
On Enter/Return key: same behaviour.

LIST (unchecked items):
Each row: checkbox circle (24px, unchecked = border-only, checked = coral fill with white
checkmark) + item name (12px, #2c1f1f) + × delete icon (right side, 24px tappable area).
Tapping checkbox: mark as done (strikethrough, opacity 0.5) + move to Done section.
Tapping ×: remove immediately (no confirmation).

DONE SECTION (collapsible):
Header: "Done ([N])" + chevron toggle. Default: collapsed.
When expanded: same row style but with strikethrough text and muted opacity.
"Clear completed" link (11px muted) at the bottom of the Done section.
On tap: remove all done items. Confirmation: "Clear X completed items?" with
"Cancel" and "Clear" buttons.

Persistence: localStorage `cradl-shopping-list` as:
`{ items: [{ id: string, name: string, done: boolean, addedAt: string }] }`.
Sync to Supabase user_data if signed in.

### 12.2 Notes screen (/notes)

Header: "Notes" (Georgia serif 20px, padding: 16px).
Subtitle: "Notes for GP visits, reminders, or anything you want to remember." (11px muted).
"GP summary notes are added separately in GP prep." (10px muted, margin-top: 4px).

ADD NOTE:
Full-width textarea (min-height: 60px) + "Add" coral button below.
Placeholder: "Add a note..."
Max 500 chars. Character counter when >400 chars.
On "Add": create note, save, clear textarea.

NOTES LIST (reverse chronological):
Each note card: date/time top-right (10px muted) + note body (11px, #2c1f1f, line-height 1.5)
+ "Delete" link bottom-right (10px muted).
Delete: confirmation "Delete this note?" with "Cancel" and "Delete".

Empty state: "No notes yet." (11px muted, centred).

---

## PART 13 — 3AM COMPANION AND NIGHT MODE

### 13.1 Night mode behaviour (23:00–05:00)

The night mode is NOT a separate screen or overlay. It is a subtle ambient shift on
the Today tab.

On app open between 23:00 and 05:00:
1. Screen brightness suggestion: (iOS only) call `Brightness.setBrightness(0.3)` from
   expo-brightness. Restore on app foreground exit.
2. A dismissible banner appears ONCE per app-open session, below the greeting card:
   Background: #1c1428. Border-radius: 14px. Padding: 12px 14px. Margin: 0 12px 8px.
   Purple dot (7px, #c4a0d4) + rotating message text (11px, #e4d4f4).
   × button (top-right, dismisses for current session).
   After dismiss: banner gone until next app open.
3. "I need a moment" button (10px, #c4a0d4, centred) below the message text.
   On tap: opens BreathingExerciseModal.

ROTATING MESSAGES (20 messages, sequential within session, random start):
1. "You're up at 3am doing the hardest job in the world. That counts for everything."
2. "The nights feel endless. They aren't. Each one ends."
3. "Millions of parents are doing exactly this right now. You are not alone."
4. "This is the part nobody tells you about. It gets better. You are in it right now."
5. "The fact that you're awake and caring is proof enough of your love."
6. "You've kept a human alive today. That is no small thing."
7. "This too shall pass. Tonight, that's just enough to hold onto."
8. "You are doing so much better than you think."
9. "She knows you're there. That is everything to her."
10. "The middle of the night has its own kind of quiet. You're in it. You're okay."
(And 10 more in the same tone — warm, brief, non-clinical, not preachy.)

### 13.2 Breathing exercise modal

Full-screen modal. Background: #1a1428.
Close button: top-right, "×" (white, 24px). accessibilityLabel: "Close breathing exercise".

Centre of screen:
Animated circle (80px diameter at inhale, 60px at start/rest).
Animation: expand 0 → 80px over 4 seconds (inhale), hold at 80px for 4 seconds,
shrink 80px → 60px over 4 seconds (exhale), hold at 60px for 2 seconds (rest).
Circle colour: #c4a0d4 (lavender). No shadow.
If reduce-motion ON: no circle animation. Show only text phases.

Text below circle (changes with animation phase):
Inhale phase: "Breathe in..." (14px, #e4d4f4, Georgia serif, fade-in 200ms).
Hold phase: "Hold..." (14px, #e4d4f4).
Exhale phase: "Breathe out..." (14px, #e4d4f4).
Rest phase: "Rest..." (14px, #e4d4f4).

After 4 complete cycles (56 seconds total):
Circle stops. Text: "Take your time. You're doing great." (14px, #e4d4f4, Georgia serif).
"Done" coral button appears (full-width, max 240px, centred, margin-top: 24px).

No sound. No haptics. No data saved. No premium gate.
Accessible: the breathing phases are announced via accessibilityLiveRegion='assertive'.

---

## PART 14 — ONBOARDING — COMPLETE SPECIFICATION

(See prior addendum Parts 14.1–14.7 for full step-by-step specification.)

### 14.8 Returning user guard

`isOnboardingComplete()` check:
Returns true if: babyProfile.dob is set in localStorage.
If true AND user opens the app: skip onboarding entirely, go directly to Today tab.

Pre-redesign users (data exists but no onboarding flag):
On app mount: check if any log entries exist in localStorage.
If yes: call `markOnboardingComplete()` silently. Never show onboarding to existing users.

### 14.9 Multiple baby switching

When multiple babies exist: a baby switcher appears in the Today tab header.
Layout: small avatar circles (28px) + current baby name (11px semibold) + chevron-down.
Tapping opens a bottom sheet: list of all babies with name + age + last log time.
Tapping a baby: set as active baby. All tabs immediately reflect the new baby's data.
"+ Add baby" option at bottom of the list.
The switcher replaces the calendar icon in the header when multiple babies exist.

---

## PART 15 — PROGRESSIVE UNLOCK SPECIFICATION

### 15.1 Unlock conditions and placeholder states

`UnlockStatus` computed from localStorage on every app open:
```typescript
interface UnlockStatus {
  whyIsCryingUnlocked: boolean;     // true after first log saved
  napPredictionUnlocked: boolean;   // true after 3+ completed sleeps with endTime
  isThisNormalUnlocked: boolean;    // true after 3+ distinct days with logs
  cradlNoticedUnlocked: boolean;    // true after 7+ distinct days with logs
  personalPlaybookUnlocked: boolean; // true if isPremium AND 28+ distinct days with logs
}
```

### 15.2 Placeholder cards

For each locked feature: show a `ProgressiveUnlockPlaceholder` component in the exact
position where the feature will appear.

Design: background: #f8f4f0; border: 1.5px dashed #ede0d4; border-radius: 14px;
padding: 12px 14px; margin: 0 12px 8px.

Content:
- Lock SVG icon (16px, #c4a8a0, left-aligned inline with title).
- Feature name (12px semibold, #9a8080).
- Unlock condition text (11px muted): "Unlocks after [condition]".
- Progress indicator (only for count-based conditions):
  e.g. "2 of 3 sleeps logged" as a 3-segment progress bar.
  Filled: coral. Empty: #f0e8e0.

This placeholder ensures no empty spaces ever appear in the UI.

---

## PART 16 — CSV EXPORT — COMPLETE SPECIFICATION

(Per-file column specifications from prior addendum remain authoritative.)

### Additional rules:

CSV injection safety: ANY field value starting with = + − @ receives a single-quote
prefix prepended. Applied to ALL string values, not just known-dangerous ones.

All files generated even if history array is empty — headers only, no data rows.
This ensures the user always receives a predictable set of files.

File encoding: UTF-8 with BOM (byte order mark: \uFEFF at start of each file).
This ensures correct rendering in Excel on Windows.

Line endings: CRLF (\r\n) per RFC 4180.

Header names: exactly as specified. Do not modify capitalisation.

Date format: dd/mm/yyyy throughout. Never ISO 8601. Never mm/dd/yyyy.
Time format: HH:mm (24-hour). Never 12-hour AM/PM.

---

## PART 17 — SUPABASE EDGE FUNCTIONS — COMPLETE LIST

All Edge Functions are TypeScript/Deno. All require valid Supabase JWT except
`handoff-log-insert` (public with RLS guard).

| Route | Method | Auth | Description |
|---|---|---|---|
| /ask-cradl | POST | Required + premium | AI Q&A (see Part 10.3) |
| /calendar/sync-event | POST | Required + premium | Create/update Google Cal event |
| /calendar/delete-event | POST | Required | Delete Google Cal event |
| /calendar/pull-events | GET | Required | Pull Google Cal events → Cradl |
| /calendar/save-token | POST | Required | Store OAuth tokens encrypted |
| /send-family-invite | POST | Required | Send family invite email |
| /family/sync-live-state | GET | Required | Return current baby state for partner view |
| /handoff-log-insert | POST | Public (RLS guard) | Carer logs event on handoff page |
| /handoff-sync-back | GET | Required | Return unprocessed handoff logs |
| /gp-summary/generate-pdf | POST | Required | Generate GP summary PDF server-side |
| /night-ping | POST | Optional | Anonymous night ping with lat/lng |
| /night-ping/count | GET | Optional | Return count for given geohash |
| /village/delete-my-data | DELETE | Required | Delete all Village data for user |
| /delete-village-data | DELETE | Required | Same as above |
| /delete-night-ping-data | DELETE | Required | Delete night ping rows for user |
| /qa/post-question | POST | Required | Post anonymous Q&A question |
| /qa/post-answer | POST | Required | Post anonymous Q&A answer |
| /qa/heart | POST | Required | Heart a question or answer |
| /qa/report | POST | Required | Report question or answer |
| /memory/upload-photo | POST | Required | Process photo upload, run CSAM check |
| /memory/delete-photo | DELETE | Required | Delete photo from storage |
| /send-account-deletion-confirmation | POST | Required | Send deletion confirmation email |
| /account/delete | DELETE | Required | Delete user account (GDPR) |

---

## PART 18 — SUPABASE DATABASE TABLES — COMPLETE LIST

All tables have RLS enabled. Migrations should be written in order.

```sql
-- Babies
babies (id, user_id, name, dob, sex, blood_type, photo_url, created_at, updated_at)

-- All log types
feed_logs (id, baby_id, user_id, started_at, ended_at, side, duration_sec, volume_ml,
           type, note, source, created_at)
sleep_logs (id, baby_id, user_id, started_at, ended_at, position, fall_asleep_method,
            wake_mood, sleep_location, note, source, created_at)
diaper_logs (id, baby_id, user_id, logged_at, type, note, source, created_at)
tummy_logs (id, baby_id, user_id, started_at, ended_at, duration_sec, note, source, created_at)
bottle_logs (id, baby_id, user_id, logged_at, volume_ml, type, note, source, created_at)
pump_logs (id, baby_id, user_id, logged_at, left_ml, right_ml, total_ml, duration_sec,
           note, source, created_at)
health_logs (id, baby_id, user_id, logged_at, record_type, temperature_c, temp_method,
             symptoms, severity, medication_name, dose_ml, note, source, created_at)
activity_logs (id, baby_id, user_id, logged_at, type, duration_min, note, source, created_at)
solid_logs (id, baby_id, user_id, logged_at, food_name, first_time, reaction,
            allergens, note, source, created_at)
spitup_logs (id, baby_id, user_id, logged_at, severity, timing, note, source, created_at)

-- Health tracking
growth_measurements (id, baby_id, user_id, measured_at, weight_kg, height_cm,
                     head_cm, note, created_at)
milestones (id, baby_id, name, achieved_at, note, created_at)
custom_trackers (id, baby_id, user_id, name, type, unit, created_at)
custom_tracker_logs (id, tracker_id, baby_id, logged_at, value, note, source, created_at)
jaundice_checks (id, baby_id, user_id, checked_at, colour_level, feeds_since_last,
                 checked_in_daylight, alert_level, note, created_at)
skin_flares (id, baby_id, user_id, logged_at, severity, areas, appearance, note, created_at)
skin_creams (id, baby_id, user_id, logged_at, product_name, areas, note, created_at)
skin_triggers (id, baby_id, user_id, logged_at, type, description, note, created_at)

-- Appointments
appointments (id, baby_id, user_id, title, appointment_type, date, time, notes,
              questions, google_calendar_event_id, created_at, updated_at)

-- Mum data
mum_sleep_logs (id, user_id, logged_at, sleep_range, created_at)
mood_logs (id, user_id, logged_at, mood, note, created_at)
recovery_logs (id, user_id, logged_at, type, severity, details, note, created_at)
epds_results (id, user_id, completed_at, score_band, created_at) -- score_band not score
time_capsule_entries (id, user_id, written_at, prompt_age_weeks, content, shown_back_at,
                      created_at) -- content encrypted at rest

-- Family
families (id, name, created_by, created_at)
family_members (id, family_id, user_id, email, display_name, role, status,
                invite_token, invited_at, resent_at, joined_at, avatar_colour)

-- Handoff
handoff_sessions (id, user_id, baby_id, created_at, expires_at, baby_name,
                  last_feed_time, last_feed_side, last_feed_duration,
                  last_nap_end_time, last_nap_duration, last_diaper_time,
                  last_diaper_type, feeds_today, diapers_today, sleep_today,
                  nap_window_status, nap_window_opens_at, nap_window_closes_at,
                  heads_up, caregiver_name)
handoff_logs (id, session_id, type, subtype, volume_ml, logged_at, logged_by_name,
              synced_back_at)

-- Village
night_pings (id, hashed_user_id, geohash4, pinged_at)
venues (id, name, type, address, lat_approx, lng_approx, created_by, is_removed,
        report_count, created_at)
venue_reviews (id, venue_id, user_id, display_name, would_return, has_changing,
               is_bf_friendly, is_pram_friendly, is_step_free, noise_level,
               note, is_removed, report_count, created_at)
groups (id, name, creator_id, join_shortcode, member_count, is_archived,
        report_count, created_at)
group_members (id, group_id, user_id, display_name, joined_at, role)
group_messages (id, group_id, sender_id, content, edited_at, is_deleted,
                report_count, created_at)
group_board_items (id, group_id, author_id, type, content, is_pinned, created_at)
group_events (id, group_id, creator_id, title, event_date, event_time,
              location_label, rsvp_going, rsvp_maybe, rsvp_no, created_at)
group_event_rsvps (id, event_id, user_id, rsvp, created_at)
qa_questions (id, baby_age_band, content, poster_token_hash, is_removed,
              report_count, expires_at, created_at)
qa_answers (id, question_id, content, heart_count, is_removed, report_count, created_at)
qa_hearts (id, content_type, content_id, user_id, created_at)

-- Memory book
memory_photos (id, baby_id, user_id, date, storage_path, caption, created_at)
memory_notes (id, baby_id, user_id, date, content, created_at)

-- User prefs
user_prefs (id, user_id, language, theme, reduce_motion, font_scale, high_contrast,
            notifications_enabled, notification_settings, alert_thresholds,
            app_view, onboarding_complete, rtw_plan, calendar_connected,
            night_ping_consent, created_at, updated_at)
user_calendar_credentials (id, user_id, google_access_token_encrypted,
                            google_refresh_token_encrypted, google_calendar_id,
                            connected_at, last_sync_at)

-- Auth/analytics
ask_cradl_usage (id, user_id, asked_at, question_hash)
article_feedback (id, user_id, article_id, helpful, created_at)
```

---

## PART 19 — COMPLETE TEST SPECIFICATION

(Prior addendum lists 13 test groups. These additions complete it.)

Test: Night mode — banner shown on first app open between 23:00–05:00, NOT shown outside
those hours, dismissed state persists for session, "I need a moment" opens breathing modal.

Test: Breathing exercise — cycles through 4 phases correctly, "Done" button appears after
4 cycles, reduce-motion skips animation but shows text phases, modal closes on "Done" tap.

Test: Return to work planner — onboarding sheet shows on first visit, not on return visits,
feeding plan correct for breastfeeding 4+ weeks, compressed for <4 weeks, formula shows
no transition needed, countdown card appears 7 days before return, dismissed daily.

Test: Memory book — day cards generated for each day from DOB to today, lazy loading
triggers on scroll, DayCardModal shows correct stats for the day, photo upload flow
(mock expo-image-picker), caption saves on blur, monthly recap generates correct highlights.

Test: Shopping list — quick-add chips add/remove items, custom item input adds on Enter,
checkbox moves to Done section, clear completed removes all Done items.

Test: Ask Cradl — rate limit blocks 11th question in 24h, URGENT response contains "Call
111 now" button, [ROUTINE]/[MONITOR]/[URGENT] always parsed from response, disclaimer
always present, history stores last 20 Q&As.

Test: Safety screen — quick exit calls App.exitApp(), remove member fires no notification
event, all helpline numbers render as tappable tel: links, numbers never truncated.

Test: Desktop layout — useIsDesktop returns true at 1024px, false at 1023px, three-column
grid renders on desktop, single column on mobile, tab switching works correctly.

Test: Desktop settings — sidebar navigation shows all sections, clicking each section
scrolls to or shows that section's content, Settings accessible from "Settings →" link.

Test: Google Calendar sync — connect flow triggers OAuth, disconnect clears credentials,
sync failure shows amber notice without blocking appointment save, sync badge shows correct
state (synced/pending/failed).

---

## PART 20 — COMPLETE COMPONENT INVENTORY (FINAL)

### New components (complete list, supplements base plan):

**Desktop layout:**
- `DesktopLayout.tsx` — three-column grid wrapper
- `DesktopTopBar.tsx` — top nav bar with tab buttons
- `DesktopDrawerPanel.tsx` — right-side sliding panel for log drawers
- `DesktopDialog.tsx` — centred dialog wrapper (replaces bottom sheets on desktop)
- `useIsDesktop.ts` — hook returning boolean, ResizeObserver-based

**Family sharing:**
- `FamilyMemberRow.tsx` — member row with avatar, role, status, actions
- `InviteMemberForm.tsx` — email + role selector + invite button
- `ChangeRoleSheet.tsx` — role selection bottom sheet/dialog
- `RemoveMemberConfirm.tsx` — silent removal confirmation
- `JoinFamilyPage.tsx` — /join-family/:token route handler
- `PartnerHomeScreen.tsx` — simplified view for caregivers

**Appointments and calendar:**
- `AppointmentSheet.tsx` — add/edit appointment (bottom sheet on mobile, dialog on desktop)
- `AppointmentRow.tsx` — single appointment display row
- `CalendarSyncBadge.tsx` — sync status badge (synced/pending/failed)
- `GoogleCalendarConnect.tsx` — OAuth connect flow component
- `FullCalendarScreen.tsx` — /appointments full-screen route (desktop layout)

**GP prep:**
- `GpSummaryCard.tsx` — auto-generated summary card
- `GpQuestionsField.tsx` — persistent questions textarea
- `GpPresentationMode.tsx` — full-screen presentation wrapper

**Handoff:**
- `HandoffGeneratorSheet.tsx` — "Leaving now" generation sheet
- `HandoffShareScreen.tsx` — share URL + copy/share buttons
- `HandoffPage.tsx` — /handoff/:sessionId public page
- `HandoffInfoCard.tsx` — one of the 5 info cards on handoff page
- `HandoffLogSheet.tsx` — simplified logging sheet for carer

**Return to work:**
- `ReturnToWorkOnboarding.tsx` — first-time input sheet
- `ReturnToWorkScreen.tsx` — three-tab plan screen
- `FeedingPlanWeekCard.tsx` — one week in feeding plan
- `SleepShiftTimeline.tsx` — visual timeline for sleep shift
- `HandoffDocEditor.tsx` — inline-editable handoff document
- `ReturnToWorkCountdown.tsx` — countdown card on Today tab

**Memory book:**
- `MemoryBookScreen.tsx` — scrollable month sections
- `MemoryDayCardThumb.tsx` — 120×100px thumbnail
- `DayCardModal.tsx` — full-screen day card
- `MonthlyRecapCard.tsx` — gradient recap with share
- `PhotoUploadSheet.tsx` — library/camera selection sheet

**Knowledge library:**
- `LibraryScreen.tsx` — searchable article library
- `ArticleCard.tsx` — article card (library + contextual trigger)
- `ArticleModal.tsx` — full article with markdown rendering
- `ContextualArticleCard.tsx` — triggered article card on Today tab

**Safety:**
- `SafetyScreen.tsx` — all safety features page
- `QuickExitButton.tsx` — the prominent exit button
- `HelplineRow.tsx` — helpline with tappable phone number

**Shopping and notes:**
- `ShoppingListScreen.tsx` — shopping list with quick-add chips
- `NotesScreen.tsx` — notes with add/delete
- `QuickAddChip.tsx` — reusable tappable chip

**Night mode / 3am:**
- `NightModeBanner.tsx` — rotating message banner (23:00–05:00)
- `BreathingExerciseModal.tsx` — 4-phase breathing animation
- `BreathingCircle.tsx` — animated circle component

**AI / Ask Cradl:**
- `AskCradlFloatingButton.tsx` — floating coral button on Today
- `AskCradlSheet.tsx` — full Q&A interface
- `AskCradlQuickPills.tsx` — preset question pills
- `EscalationCard.tsx` — ROUTINE/MONITOR/URGENT card
- `AskCradlHistoryScreen.tsx` — list of previous questions

**Skin tracker:**
- `SkinTrackerScreen.tsx` — three-tab skin tracking
- `SkinBodySelector.tsx` — SVG body with 12 tappable zones
- `SkinFlareEntry.tsx` — flare log card
- `SkinCorrelationInsight.tsx` — auto-generated correlation insight card

**Jaundice:**
- `JaundiceCard.tsx` — Today tab card (shown under 21 days)
- `JaundiceCheckSheet.tsx` — 3-step check bottom sheet
- `JaundiceResultCard.tsx` — full-screen result with escalation
- `JaundiceColourSwatch.tsx` — one colour option card in step 2

**Onboarding:**
- `OnboardingNavigator.tsx` — 7-step onboarding flow (rewrite)
- `ProgressDots.tsx` — 7-dot progress indicator
- `FeatureUnlockRow.tsx` — one row in the step 7 unlock map

**Miscellaneous:**
- `BabySwitcher.tsx` — avatar row for multiple babies in Today header
- `PregnancyModeCard.tsx` — shown when DOB is a future date
- `ProgressiveUnlockPlaceholder.tsx` — locked feature placeholder
- `VoiceCommandSheet.tsx` — floating mic + command list
- `NightPingConsentCard.tsx` — consent card for night ping feature
- `CalendarSyncSetup.tsx` — step-by-step Google Calendar connection UI
- `SmallSyncIcon.tsx` — sync status indicator in stats row
- `SyncQueueSheet.tsx` — "Sync status" bottom sheet
- `AdRewardModal.tsx` — web fallback for rewarded ad (mobile only)
- `ReturnToWorkPromo.tsx` — 26-week proactive trigger card on Today

---

*End of document. This specification, combined with the base Cursor redesign plan,
covers every feature, interaction, edge case, and component required to implement
the full Cradl redesign including the desktop version.*
