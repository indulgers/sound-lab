# Sound Cocktail — Cinematic Travel + Editorial Calm design system

Version: 2026-11-14 / PR #5 / Design direction V4. This is a product design implementation brief, not a generic UI-style prompt.

## North star

**Start with a feeling. Travel through an actual place. Let the music make the destination worth staying in.**

Visual footage is not just wallpaper. Place-appropriate moving camera should establish arrival, while sound must be useful with the image switched off. No generic waterfall relabelled as Bali; no Yangshuo café presented as Chiang Mai. Every claim about a shot refers to an accountable source and explicit attribution.

## References and how we applied them

| Reference | Extracted mechanism | Applied to Sound Journeys | Explicitly avoided |
| --- | --- | --- | --- |
| Design for AI: Editorial / magazine | A single high-quality full-bleed picture, clean serif headline, measured sans captions, image source | One cinematic journey image with discreet caption, place/title hierarchy, intentional whitespace | Print-style multi-column reading over the scene |
| Design for AI: Minimalism | Every element supports a next action, 8px spacing, few tokens, subtle states | Three clear intention choices, one primary listening action, compact playback dock | Repeated cards, giant translucent glass panels |
| VibeHub: editorial/organic design | Place story through image, caption and typography; nature-inspired palette | Warm paper, forest ink, low-saturation moving scene, readable bilingual text | Decorative flourishes and excessive page animation |
| Portal (product reference) | Motion visuals are intrinsic to an actual location | Authentic licensed video, mobile crop, pause-motion and source credit | Fake '12K/Spatial Audio' performance claims |
| Design Spells / Mobbin (reference pool) | Inspect real interaction states, not just hero mockups | Goal selection → journey recommendation → play → tune → save | Motion with no state/interaction feedback |

Links:
- https://designforai.dev/style/editorial-magazine
- https://designforai.dev/style/minimalism
- https://vibe-hub.org/en/style-editorial
- https://portal.app
- https://designspells.com
- https://mobbin.com

## Design tokens

### Palette
- `--sj-ink: #142821` — deep green-black base, not pure black.
- `--sj-ivory: #f7f3e9` — warm paper, readable labels and panels.
- `--sj-mist: #d4ded0` — secondary information.
- `--sj-brass: #d7bd8c` — one restrained travel accent.
- `--sj-border: rgba(246,240,222,.19)` — cinematic overlays only.
- Place-specific accent colors are subtle and never become large tinted gradients.

### Typography
- Display: `Cormorant Garamond` English; system CJK serif (`Noto Serif SC`/Songti) Chinese, only for title/brand.
- UI: `Manrope`/system sans, minimum 11–13px meta, 14–16px controls.
- Desktop Chinese journey headline ~52px, not a 100px block covering the moving film.
- Short descriptive line 13–15px, max-width ~450px. Real footage never needs a long paragraph over the screen.

### Layout
- Full-bleed travel film, picture/source label, left-aligned editorial title, right restrained optional journey strip.
- A floating bottom **compact dark audio dock** with strong primary Play target, adequate hit areas and one focus/rest timer.
- On phone, a single column, safe-area-aware player, horizontal scrolling alternate Journeys with clear affordance and zero body overflow.
- Destination gallery: two columns desktop, one on small phone, poster crop matched to actual film, description/author when appropriate.

### Animation
- Only authentic moving camera counts as 'Travel Motion'; CSS zoom on stills is not travel footage.
- Visual state changes in 350–700ms opacity/translate; never a rapid white flash, bounce, or looping decorative floating objects.
- Film content should have a softened loop seam if shorter than the audio programme. Keep audio independent of motion and respect `prefers-reduced-motion`.
- Loading/fallback: a poster extracted from that exact footage is immediately visible; no prior destination image left under new text.

## Authenticity tiers

1. **Recognizable landmark + licensed original footage:** Chiang Mai Royal Park Rajapruek/Ho Kham Luang, original Free Stock Vids CC BY 3.0. The video has real aerial motion but is *not* a coffee shop interior. The focus track remains titled Café Flow, while the visible place label tells the truth.
2. **Uploader-described destination, licensed original footage:** Bali rice terraces, Da Lat pine forest, Kyoto shrine, Lisbon rooftops, Hoi An lantern river. Pexels creator/source links identify the region; exact geolocation has not been independently camera-GPS-verified.
3. **Unverified or unrelated footage:** never show under a destination label. Use a plainly marked original concept illustration until verified material is available.

Publish no film without named creator, source page, license, actual duration, desktop/mobile dimensions, source-type caption and proof of clean silent export.

## Acceptance / visual release criteria

- 6 destination-specific desktop and mobile moving videos are generated without audio, with meaningful real movement, correct crop and source attribution.
- Chiang Mai Yangshuo footage is no longer referenced anywhere as an active travel video, nor claimed as actual Chiang Mai; source history is retained only in documentation.
- Browser screenshots: desktop goal selection, Chiang Mai Focus, Bali Meditate, Da Lat Slow Flow, Kyoto, Lisbon and Hoi An, plus 390x844 mobile and short-height view.
- First-frame backdrop matches title within 1s of switching and does not flash a previous scene.
- Reduced-motion setting shows the correct static frame and keeps all audio controls usable.
- On low bandwidth, video is optional: audio starts independently; user can disable motion.
- No silent auto-play of music, no excessive glass cards hiding the destination, no headline or control clipped in landscape or portrait.
- Humans should still listen with the video off: visual richness does not substitute for composition quality.

## Future asset-quality threshold

The first release uses individual sourced real-motion clips (15–48s source-backed segments). These can repeat visually during a 45-minute listening session. The long-term cinematic Journey should contain **three or more coordinated, geography-verified shots per place** with arrival/path/stay/return sequencing, natural lighting and shot continuity. Do not fake continuous movement by reversing video or scaling a static picture. Rights clearance and on-location geography verification must precede future commercial production.
