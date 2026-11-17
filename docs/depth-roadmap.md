# Sound Cocktail · Depth roadmap

Limer chose depth over breadth (2026-11-16): stop adding cities, make the
listening itself better. This doc is the prioritized list and the reasoning
behind it. Status is written as of the sleep-timer build (branch
`codex/sleep-timer-depth-20261116`).

## Where depth stands today (honest audit)

- **Sleep timer, basic version:** exists on the journey player only
  (20/30/45/60/90 min, countdown, toast when done). Its fade is **4
  seconds** — a cliff, not a drift-off — and the mixer (where `/sleep`
  users actually land) has no timer at all. No "end of journey" option,
  no memory of the last choice.
- **Focus session:** exists as a toast-only reminder (25/45/60 min,
  "your work block is complete", music never stops). No work/break
  cycles, no session count.
- **Breathing guide:** exists as a static toggle ("breathe in · breathe
  out" + pulsing circle, meditate intent only). No paced programme, no
  timing, no link to the audio.
- **Streaks / habit:** does not exist. `src/listening-session.mjs` is a
  10-minute free-listening window (a paywall nudge), not a habit log.
- **Offline listening:** does not exist. No service worker; audio and
  video are fetched live every session.
- **Personalized recommendations:** does not exist, and there is no usage
  history to learn from yet (SEO/GEO still ~0, no organic traffic).

## Prioritized list

1. **Sleep timer, done properly** — *sleep users, medium effort. Building
   now.* A long fade (last 2 minutes, not 4 seconds), on the journey
   player AND the mixer, with an "end of journey" option and memory of
   the last choice. This is the single most-used job on the site
   (fall asleep to sound) and the current version fails it in the last
   4 seconds.
2. **Focus sessions, real Pomodoro** — *focus users, medium effort.*
   Turn the toast into real work/break cycles (25/45/60-min blocks, a
   gentle end signal, a break prompt, a count of today's blocks). The
   focus landing page already promises "one timer, one cup of sound";
   today the timer does nothing.
3. **Guided breathing programmes** — *meditation + sleep-onset users,
   small–medium effort.* Paced programmes (4-7-8 for sleep, box 4-4-4-4
   for calm) with a visual pacer and the music dipping on the exhale.
   Small build, directly serves the meditation intent that already
   exists in the UI.
4. **Daily streaks & listening habit** — *all three audiences,
   small–medium effort, but only after #1–3.* A quiet local log
   (minutes listened per day, a small streak display, no gamification
   noise). Worthless until there are returning users; build it once
   retention is real.
5. **Offline listening** — *commuters, travellers, bad-wifi sleep users,
   bigger lift.* A service worker that caches journey audio (and
   posters) for offline use, with a per-journey download. Defer until
   there is demand — it is the most storage- and maintenance-heavy item
   here.
6. **Personalized recommendations** — *later, needs data.* "Because you
   slept to Bali…" requires usage history the product does not have
   yet. Revisit after #1–5 produce returning listeners.

Deliberately not on this list: more cities (breadth — limer chose
depth), social/sharing, and a native app (the web app is the product).

## #1 in detail: sleep timer, done properly

- **Fade:** the last 2 minutes of the timer are a smooth linear fade
  from full volume to silence, then playback stops. (Was: 4 seconds.)
  The fade length is a parameter in the engine (`FADE_SECONDS = 120`),
  not hard-coded in the UI.
- **Where:** journey player (existing picker, extended) and the mixer
  (new picker in the mixer bar). One behaviour in both places.
- **Options:** 15/30/45/60/90 minutes, "end of journey" (journeys
  only: stop at the end of the current 15-minute programme), and off.
- **Memory:** on the journey picker the last choice is remembered and
  pre-selected next time. It is never auto-armed — the timer only starts
  when the user picks it. The mixer select always shows the armed timer
  (or off) for the current session; it resets when a journey takes over.
- **Mixer + free session:** the mixer's 10-minute free window would
  otherwise cut a 30/60/90-minute sleep timer short. While a sleep
  timer is active, the session window is subsumed by it (no pause, no
  dialog at 10 minutes); the timer's own deadline governs. This is a
  deliberate product call: waking a sleeping user with a paywall
  dialog is worse than deferring the nudge.
- **Acceptance:** `node --test` green, `npm run build` green, fade
  schedule asserted in tests (ramp ends at the deadline, value 0),
  mixer timer stops playback at the deadline, journey "end of journey"
  stops at the programme end.

## Open questions for limer

- Should the long sleep timer (or the "end of journey" option) stay
  free, or become a Plus/pack perk later? Today everything on this
  list is free; the free-vs-paid research (parallel work) should
  answer this before #2 ships.
- Is 2 minutes the right fade, or should the fade length be a setting
  (1 / 2 / 5 min)? Default is 2; the engine already takes it as a
  parameter.
