
Now the elevator pitch.

The Cradl 5-minute elevator pitch

The problem
Every new parent does the same thing at 3am. Baby is crying. They don't know why. They open four different apps, Google "is it normal for a 14-week-old to...", read three contradictory forum posts, and spiral into anxiety. Meanwhile the baby is still crying.
Baby tracking apps exist — Huckleberry, Glow Baby, Baby Tracker. They all solve the same problem: logging. They're good at recording what happened. None of them tell you what to do next. They show you data. They don't interpret it. They track your baby. They don't help you understand her.

What Cradl is
Cradl is a baby tracking app that thinks. It takes the same log data every competitor collects, and uses it to answer the questions parents are actually asking at 3am.
When you open Cradl with a crying baby, you don't see a dashboard. You see a card that says: "Last fed 2h 40m ago — her usual interval is 3h, probably not hunger yet. Awake 1h 45m — she's approaching her nap window, that opens in 20 minutes. Last nappy change 45 minutes ago — unlikely. She's also 3 days away from Developmental Leap 4 — extra fussiness is completely normal right now." That's not AI. That's just good logic, applied at the right moment, with the right tone.

The core features
Cradl tracks everything the competitors track — feeds (breast, bottle, pump), sleep, nappies, tummy time, solids, health, growth — but adds an intelligence layer on top. The nap prediction card shows a live arc that tells you when the window opens and closes, personalised to your baby's actual patterns after a week of data. The insights engine quietly watches 14 days of logs and surfaces observations like "her longest sleeps follow feeds of 20+ minutes on the left breast" — things a parent would never notice but that change how they parent. The sleep regression detector watches for the known 4, 6, 8, 12, and 18-month regressions and tells you when one is happening, instead of letting you panic that you've broken something.
There's a GP prep tool that generates a clean one-pager for a 10-minute appointment. A handoff card parents share with grandma or a childminder via a link — no account needed, logs sync back. A return-to-work planner that builds a personalised week-by-week feeding transition and sleep schedule shift when a mum sets her return date. A contextual knowledge base that surfaces the right article at the right moment — not when you browse, but when your data triggers it. "Your baby's sleep has dropped this week and she's 16 weeks old. Here's what to know about the 4-month regression."

The thing no competitor does
Cradl is the only baby app that treats the mother as a human being, not just a data input device.
Every competitor calls the user "Mum." Cradl asks her name during onboarding and uses it. The daily summary closes with "You fed her 6 times, changed 4 nappies, and did 15 minutes of tummy time. You are doing an extraordinary job, Austeja." The app has a mum's wellbeing section — not bolted on, but first class. Her sleep tracker. Her recovery log. A postnatal depression screen (the validated Edinburgh scale) built in, framed warmly, with helpline numbers if needed. A postnatal rage tracker that acknowledges this completely normal hormonal response with "this is real and it is not a character flaw" instead of just logging a number.
Between 11pm and 5am, when a feed is logged, the home screen quietly shifts tone. It shows a rotating one-liner: "Right now, thousands of other parents are doing exactly what you're doing. You're not alone in this." A "I need a moment" button opens a 60-second breathing exercise. No data collected, no premium gate. Just a moment of calm.

The Village
Cradl has a carefully scoped community layer called The Village. Not a social network — we've seen what happens to those. Four features: an anonymous night-feed presence indicator (at 3am, "34 other parents nearby also logged a feed in the last hour" — just a count, no names, no locations); baby-friendly venue reviews rated by parents for parents (changing facilities, pram space, breastfeeding-friendly — the things Google Maps doesn't know); private invite-only groups for NCT classes and family groups; and an anonymous age-matched Q&A feed where every question is automatically tagged to your baby's age band so a mum of a 14-week-old gets answers from other parents of 14-week-olds, not randoms.

The business
Freemium. Free tier covers all core logging, 30 days of history, the crying diagnostic, and basic milestones. Premium at £2.99/month or £24.99/year unlocks unlimited history, full insights, the personal playbook, WHO growth percentile bands, PDF export, developmental leap detail, Google Calendar sync, and Ask Cradl — an AI-powered question feature backed by the Claude API with strict safety rails and three escalation levels. Family plan at £4.99/month adds family sync with up to four caregivers.
Revenue Cat handles subscriptions on iOS and Android. Supabase handles sync and the Edge Functions. The app is built on React with Capacitor for native distribution, with native Kotlin and Swift for widgets and Watch complications.