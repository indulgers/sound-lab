# Intent-first sound journeys — PR #5 integration

Updated 2026-11-13. This implements the new-user flow on the existing immersive UI branch, without merging or deploying production.

## User journey

1. The initial page is silent and asks **Focus / Meditate / Unwind**. It does not restore a previously selected intention or auto-play audio.
2. Choosing an intention stages a recommended **Journey** and place, with no sound until the user presses **Enter & listen**.
3. The existing full-screen silent place film, synced stem player, saved mix controls and adjustable ambience remain in place.
4. The goal can be changed from the Journey header; the player pauses before presenting the intention selector again.
5. The Places gallery lists real Journeys, not just films, and shows their matching intention. Multiple Journeys in one place can save different stem balances.
6. A session has **no forced timer** in this build; an optional 20/30/45/60/90-minute timer can be selected.
7. The original /en/studio and /zh/studio remain available. No legacy-user flow or migration has been introduced.

## Implemented journey mapping

| Intention | Default | Existing audio used | Recommended timer |
| --- | --- | --- | --- |
| Focus | Chiang Mai · Café Flow | V3.1 Chiang Mai stems | 45 min, optional |
| Meditate | Bali · Sound Bath | V3.1 Bali stems | 20 min, optional |
| Unwind | Bali · Rainforest Exhale | The same Bali stems, but with an independent, lower-music/wetter mix | None |
| Unwind alternative | Chiang Mai · One More Coffee | The same Chiang Mai stems, with a lighter mix | None |

These names distinguish curation/mix, **not four separately composed pieces of music**. The actual location of the stock footage is described in docs/immersive-video-review.md. Do not misrepresent it as local footage.

## Audio boundary and next ingestion step

This PR still contains **two original V3.1 compositions of about three minutes**, replayed with a join for indefinite listening. The V3.2 15-minute stems and Da Lat, Kyoto, Lisbon and Hoi An compositions are in a separate local archive, *not* in the PR assets. Neither the soundtrack length nor the number of destinations has been silently changed.

To ingest the V3.2 audio responsibly, add a Journey audio manifest with chapters, duration, stems and provenance. Do **not** pass every 15-minute decoded stereo stem into the present Web Audio buffer player on mobile: memory use becomes excessive. Provide incremental delivery or a streaming/media-source-based arrangement with seam tests and a bounded buffer policy, then verify background tab/mobile playback, sync, music/video independence and crossfade before switching the catalogue. Keep the V3.1 files until the replacement is actually verified.

## Validation

- Module tests in `tests/scene-journeys.test.mjs` verify recommendations, real audio paths, mix separation and preference persistence.
- All previous player tests remain unmodified.
- Full repository `npm test`, application build, authenticated browser listening and mobile acceptance have **not** been rerun in this chat. The earlier 136-pass figure predates this feature and must not be treated as a fresh result.
- No merge to `main` or deployment to `soundcocktail.app` occurred.

## Manual acceptance checklist

- First visit: goals visible, no music, no displaced or clipped controls on 390px and desktop.
- Pick Focus → Chiang Mai; pick Meditate → Bali; pick Unwind → Bali and change to Chiang Mai.
- Check video movement, pause-motion fallback and keyboard Escape.
- Enter playback, pause/resume, switch goals and switch places while playing. Ensure no overlap or stale fetch restart.
- Compare the four Journey stem balances; adjust, save, revisit and reset each independently.
- Check saved/places dialogs, localised text, optional timers and indefinite playback.
- Repeat in Chrome, Safari and iOS/Android with headphones.
