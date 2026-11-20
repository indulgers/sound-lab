# Sound Lab 2.0 — implementation and release checklist

## Direction

Discover → Immerse → Studio → Save / Share.

“Cocktail” means a mix of sounds, not a visual drinking-glass metaphor. The immersive film and listening experience are the primary interface. A separate Studio deep link supports users who arrive with the goal of editing directly.

**Important:** the site is currently branded **Sound Cocktail** (soundcocktail.app), including commerce/legal pages. This branch changes the product information architecture without silently renaming that legal/commercial identity.

## Implemented in this branch

- Editorial Discover shelf with three truthful destination pages; each page uses existing credited footage and the corresponding original journey.
- /en/scenes/:slug and /zh/scenes/:slug with SSR-capable semantic story content, sound layers, explicit provenance, canonical, hreflang, social metadata, structured data and bilingual sitemap references.
- /en/studio and /zh/studio now open the existing live mixer instead of redirecting to the homepage. These tool pages are noindex.
- The scene page can open the same Studio panel without destroying the playing scene or audio engine.
- Studio now places actual sound stems first: volume, mute (M) and solo (S) are always visible, while ambience shaping and EQ remain secondary. Save/reset/share actions are kept near the panel bottom.
- Studio provides validated share links that round-trip mix settings without autoplay. Shared query mixes are intentionally not sitemap entries. There is no glass editor.
- The streaming engine crossfades for 9 seconds when changing scenes or A/B versions. During the fade, each deck retains its own stem levels and an incoming-track failure restores the outgoing track. Browser checks verify existing audio keeps playing when Studio opens.
- The sitemap avoids misleading dynamically generated modification dates; lastmod is only emitted when a known content update date is supplied.
- Existing Cloudflare Workers, TanStack Start, session system, payment routes, original music and film attribution are preserved.

## Evidence and limitations

The existing footage shows:
- Chiang Mai: Royal Park Rajapruek drone/landmark footage, **not** a rainy café interior.
- Bali: rice terrace aerial footage, **not** an indoor spa.
- Hoi An: lantern-lit river, **not** ocean coast.

Do not retitle these as actual rain-café, spa or ocean footage. The original, 15-minute musical arrangements are **place-inspired compositions**, not live local field recordings. The Hoi An journey is Plus-locked, but its editorial page remains publicly readable.

## Core user journey

1. Open /en or /zh, select a feeling or scroll to Discover.
2. Open a scene page, read the brief scene context and enter the immersive player (browser playback requires a user gesture).
3. Start music, then customize a real audio layer using Studio. The edit panel is overlaid within the same mounted scene player.
4. Adjust harmony/detail/atmosphere, use mute/solo to compare, reset if needed.
5. Share a URL with an encoded, validated scene mix. A recipient can open the public page with no account, but paywall restrictions remain in force.
6. Subscribers can use the previously implemented saved mix/entitlement features. Non-subscribers can share mixes, but premium saving/time-window rules are unchanged pending a commercial review.

## Manual release checks (required before merge)

- [x] CI Node 22: npm ci, npm test (188 tests), npm run build. CI workflow also validates six groups of real, 15-minute MP3 stems.
- [x] /en and /zh: Discover shelf renders in Chromium at desktop and mobile sizes with no horizontal overflow. The CI artifact contains browser screenshots.
- [x] /en/scenes/chiang-mai-focus: initial hero is Chiang Mai; actual MP3 streaming reaches playing state after a real browser click. Opening Studio keeps playback active.
- [ ] /en/scenes/bali-sound-bath: corresponding Bali arrangement, not the Chiang Mai arrangement.
- [ ] /en/scenes/hoi-an-evening: cannot play without a Plus entitlement.
- [x] /en/studio: Studio panel opens, with controllable layers. /en and /zh Studio SSR report noindex; Chinese interactive screen still merits final human review.
- [x] Browser: same-scene Studio opens without stopping audio, and layer controls (mute, solo, reset, advanced toggle) update. Unit tests cover audio gain logic and nine-second crossfade.
- [ ] Share a free scene mix, reopen the URL, confirm the controls and layers are restored. Human conversations must never silently opt in for Chiang Mai focus.
- [x] Automated desktop/mobile screenshot capture and responsive layout checks. Manual subjective design review and accessibility focus walk-through remain pending.
- [ ] Check video network fallback and audio errors on a throttled connection.
- [ ] Fetch /sitemap.xml, /robots.txt and scene-page HTML from the **deployed Worker** to verify canonical/hreflang and server-rendered text.
- [ ] Google Search Console / Bing submission after production deploy, monitor actual indexing rather than assuming it happens.

## Still pending after this branch

- Production-grade recording/selection/authorization for three *new* visual targets: rainy Chiang Mai café, Bali open-air spa morning, ocean after sunset.
- Human listening tests and mastering for the new target soundscapes; current tracks are preserved, not newly recorded or professionally remastered by this branch.
- New sound-library search and adding arbitrary stems in Studio; the current editor adjusts stems belonging to the selected journey.
- A noninterruptive, cross-route continuous playback service if a user leaves the scene route entirely; within a scene, opening Studio does not remount the engine.
- Reassessment of 10-minute free listening and subscriber-only saving, as these are active commercial rules. Do not silently change payment/entitlement assumptions.
- Production clickstream instrumentation and actual SEO/GEO indexing/traffic data, which require the live deployment.
- Real-device (not headless Chromium) screenshots / comparative human visual sign-off and production Cloudflare deployment. CI captures true browser screenshots; the before/after Studio layout can be compared from the saved artifact.

These gaps are explicitly **not complete**. Do not merge or deploy based only on the presence of this branch.
