# Cursor prompt — Active timer indicator (Option A with smart colour shift)

## What to build

When a timed log entry is actively running (Sleep/nap, Feed, Tummy time), the log button for that entry should visually communicate that a timer is running AND warn when the duration becomes unusual.

---

## Base active state (always shown when timer is running)

Apply to the button of whichever log type has an active timer:

1. **Pulsing dot** — position `absolute`, `top: 8px`, `right: 8px`, `width: 7px`, `height: 7px`, `border-radius: 50%`, `background: #7A9080` (sage green).
   - Add a `::after` pseudo-element: same border-radius, `border: 1.5px solid #7A9080`, positioned `inset: -3px`, animated with:
   ```css
   @keyframes pulse-ring {
     0%   { transform: scale(1);   opacity: 0.6; }
     100% { transform: scale(2.2); opacity: 0;   }
   }
   animation: pulse-ring 1.8s ease-out infinite;
   ```

2. **Live elapsed time** — replace the static status text (e.g. "Sleeping now") with a live MM:SS counter that updates every second. Once elapsed time exceeds 60 minutes, switch format to Xh XXm. Use `font-family: 'Lora', serif`, `font-size: 15px`, `font-weight: 600`, `color: #0F6E56`. Use `font-variant-numeric: tabular-nums` so the digits don't shift width as they tick.

3. **Sub-label** — below the elapsed time, show the static text `"Hold to stop"` in `font-size: 9px`, `color: rgba(28,25,21,0.35)`. Holding the button for 2 seconds stops and saves the timer (same hold-to-log mechanic already built). A normal tap opens the entry for editing.

4. **Button background** — when active, change from `#FFFDF9` to `#E4EDEA` (sage light). Border changes to `0.5px solid rgba(122,144,128,0.25)`. Icon background changes to `rgba(255,255,255,0.5)`.

5. **Icon stroke** — change the icon stroke colour from its resting colour to `#0F6E56` (sage dark) while active.

---

## Smart colour shift — when duration becomes unusual

The dot, elapsed time, and border all change colour based on how long the timer has been running relative to what is typical for the baby's age and recent patterns. There are three thresholds:

### Threshold logic per timer type

**Sleep / nap:**
- Calculate the baby's average nap duration from the last 14 days of logged naps (minimum 5 naps required; fall back to age-typical values below if insufficient data).
- Age-typical nap durations to use as fallback:
  - 0–8 weeks: 30–45 min
  - 8–16 weeks: 35–50 min
  - 4–6 months: 45–90 min
  - 6–12 months: 60–120 min
  - 12–18 months: 60–90 min (single nap)
- **Warning threshold**: elapsed time > (average nap duration × 1.4), OR elapsed time > age-typical upper bound
- **Alert threshold**: elapsed time > (average nap duration × 1.8), OR elapsed time > (age-typical upper bound × 1.3)

**Feed (breast or pump):**
- Warning: elapsed > 35 minutes
- Alert: elapsed > 50 minutes
- (Bottle feeds: no timer alert — bottle volume is self-limiting)

**Tummy time:**
- Warning: elapsed > 20 minutes (continuous tummy time can become uncomfortable)
- Alert: elapsed > 35 minutes

---

### Three visual states

**State 1 — Normal (within expected duration)**
- Dot colour: `#7A9080` (sage)
- Elapsed time colour: `#0F6E56`
- Border: `0.5px solid rgba(122,144,128,0.25)`
- Background: `#E4EDEA`
- Pulse animation: standard (1.8s, `ease-out`)
- No flashing

**State 2 — Warning (approaching or past typical duration)**
Transition smoothly when warning threshold is crossed — do not snap suddenly.
- Dot colour: `#C17D5E` (terracotta)
- Dot `::after` border: `#C17D5E`
- Elapsed time colour: `#8A5240`
- Border: `0.5px solid rgba(193,125,94,0.3)`
- Background: `#FDF4EF`
- Pulse animation: slightly faster (1.2s)
- Sub-label changes from `"Hold to stop"` to `"Nap running long — hold to stop"` (or `"Feed running long — hold to stop"` etc.)
- **No flashing yet** — this is a gentle nudge, not an alarm

**State 3 — Alert (significantly past typical duration)**
- Dot colour: `#C17D5E`
- **Dot flashes**: add a second animation layer that toggles `opacity` between 1 and 0.2 every 0.6 seconds
  ```css
  @keyframes dot-flash {
    0%, 100% { opacity: 1;   }
    50%       { opacity: 0.2; }
  }
  animation: pulse-ring 1s ease-out infinite, dot-flash 0.6s step-end infinite;
  ```
- **Elapsed time flashes** with the same 0.6s rhythm (opacity 1 → 0.4 → 1)
- Elapsed time colour: `#C17D5E` (full terracotta — the only time elapsed time uses the accent colour)
- Border: `1px solid rgba(193,125,94,0.4)`
- Background: `#FEF8F4`
- Sub-label: `"Running very long — hold to stop"`

---

## Colour rule note (important)

In all three states, the terracotta `#C17D5E` only appears on the active timer button. If the Feed button is the primary action button (terracotta fill at rest), and Sleep is the active timer, Sleep shows sage in State 1/2 and terracotta in State 3. The two never compete simultaneously — when Sleep enters State 3 and takes terracotta, the Feed button's fill should temporarily mute to `#E8C9B8` (a desaturated terracotta) so there is still only one fully saturated terracotta element on screen at a time.

---

## Transition timing

- Rest → State 1: immediate when timer starts
- State 1 → State 2: smooth `transition: background-color 1.5s ease, border-color 1.5s ease, color 1.5s ease` — no jarring snap
- State 2 → State 3: same smooth transition for background/border, but the flash animation starts immediately once threshold is crossed (no fade-in on the flash)
- State 3 → stopped: when the timer is stopped, all active states clear instantly, button returns to resting style, elapsed time is replaced with the standard status text (e.g. "Slept 1h 12m")

---

## Hold-to-stop behaviour (reuses hold-to-log mechanic)

The same 2-second hold interaction used for hold-to-log also stops the timer:
- Press and hold the active timer button
- Progress bar fills from left to right over 2 seconds (same as hold-to-log)
- On completion: save the log entry with start time = when timer started, end time = now, duration = elapsed
- Show toast: `"Nap saved — 1h 12m · tap to edit"` (or Feed/Tummy equivalent)
- A normal tap (under 150ms) opens the log entry for editing, does not stop the timer

---

## Multiple simultaneous timers

Feed and Sleep can theoretically run simultaneously (nursing to sleep). Tummy time can also overlap. Rules:
- Each active button shows its own pulsing dot and elapsed time independently
- Colour state is evaluated independently per timer
- If two timers are both in State 3 simultaneously: both flash. This is an extreme edge case and the visual chaos is intentional — something is genuinely wrong and the parent needs to attend to it.

---

## Implementation note

Store timer start times in the existing Supabase session or local state alongside the log entry. The elapsed time calculation is simply `Date.now() - startTime`. Recalculate threshold states every 10 seconds (not every second — threshold crossing doesn't need second-level precision). Update the elapsed time display every second.
