# Sound Lab: Bali + Chiang Mai AI Video Pilot

**Status: prompt and local encoding pipeline implemented; NO AI videos generated or published yet.** This environment has no connected video generation account or billing credentials. A prompt is not a finished MP4.

## Creative decisions

| Place | Desired visual | What changes from current footage |
| --- | --- | --- |
| Bali / Ubud | Tropical rain after sunrise, refined bamboo-and-volcanic-stone open-air spa pavilion, mist rising over jungle, frangipani petals and a stone water basin | Replace an unrelated rice-terrace aerial with a person-scale environment |
| Chiang Mai | Rainy afternoon in a warm teak café with modest Lanna woodwork, a ceramic mug and notebook, and rain-streaked glass facing an Old City lane | Replace Royal Park Rajapruek aerial with the intended rainy café atmosphere |

Each place has two 10-second original-motion prompts: HERO (arrive and settle) and DETAIL (specific water, rain and material texture). See src/scenes/ai-film-pilot.mjs. All AI footage is **place-inspired fiction**, not a documentary recording or an identifiable real venue.

### Geography and mood references — study only, do not reuse their images without permission

- Bali architecture and rainforest treatment pavilions: https://nandinibali.com/blog-news/wellness-in-the-jungle-reconnecting-mind-and-body-at-nandini-jungle ; video stock candidates: https://www.pexels.com/search/videos/bali%20spa/
- Chiang Mai warm interior / rain-lit city: https://hotelsensai.com/gallery.php ; stock candidates: https://www.pexels.com/search/videos/raining%20cafe/

## AI generation provider

First trial uses Gemini Omni 1.2 Flash through Runway Dev. Official documentation supports 3–15s clips at 1080p and 4K, including landscape and independently composed portrait. As of November 18, 2026, 1080p text-to-video is listed at 10 credits/sec and 1 credit is $0.01, so a 10-second clip is estimated at $1. Portrait is generated as its own clip, never faked by a distorted landscape stretch.

Official docs:
- https://docs.dev.runwayml.com/guides/using-the-api/
- https://docs.dev.runwayml.com/assets/inputs/
- https://docs.dev.runwayml.com/guides/pricing/

**The generator is dry-run by default; there is no automatic bill.** The --max-usd check is a local estimate, not an actual provider spending ceiling; verify the provider's current charge.

### 1. Inspect prompt; no key or spend

    pnpm film:plan -- --scene bali --shot hero
    pnpm film:plan -- --scene chiang-mai --shot detail

### 2. Generate each candidate with an account you control

Keep RUNWAYML_API_SECRET only in your local environment (never commit it or post it in chat). Then deliberately approve the budget for each clip:

    pnpm film:plan -- --scene bali --shot hero --ratio 1920:1080 --execute --max-usd 1
    pnpm film:plan -- --scene bali --shot detail --ratio 1920:1080 --execute --max-usd 1
    pnpm film:plan -- --scene chiang-mai --shot hero --ratio 1920:1080 --execute --max-usd 1
    pnpm film:plan -- --scene chiang-mai --shot detail --ratio 1920:1080 --execute --max-usd 1

Four landscape shots are approximately $4 at today's listed rate (no paid references). To get true mobile compositions, repeat the four shots with --ratio 1080:1920 and explicit budget. Full 2×2×2 batch: about $8. Runway can also generate in 4K, but shortlist at 1080p before paying for 4K candidates.

After a successful generation, source MP4 and provenance JSON are saved in private/ai-film-inputs/<scene>/ and are gitignored. Outputs are temporary provider URLs, so the script downloads them. On timeout it prints the task ID for resuming without a second generation.

### 3. Optimise with ffmpeg; make a review-only clip

    pnpm assets:sync
    pnpm film:build -- --scene bali --orientation desktop
    pnpm film:build -- --scene chiang-mai --orientation desktop

After independently generated portrait clips are available, repeat with --orientation mobile.

The scripts generate 1920×1080 desktop and 1080×1920 mobile H.264 video, CRF 19, preset slow, stripped audio, conservative grading, and posters extracted from frames. Two shots dissolve softly; the final-to-first loop still needs human evaluation. Candidate files are stored under public/assets/scenes/ai-pilot/ (gitignored), and **do not replace** the active production assets.

### 4. Compare generated clips to the original scene

Once desktop and mobile candidates exist for both places:

    pnpm film:review
    pnpm dev

Visit http://localhost:3000/ai-film-pilot-preview.html. The private preview compares the current video and AI candidate side-by-side in both orientations.

## QA criteria before anything goes live

1. Spatial realism: architectural joints, teak surfaces, roof shapes and stone details stay stable; no morphs, fake lettering, people or visual artifacts.
2. Living environment: rain and water ripple naturally, leaf motion is physically coherent, no implausible temporal changes.
3. Feel: camera moves slowly without artificial zoom, jitter, time-lapse or overwhelming effects.
4. Accessibility and performance: test video fallback, reduced motion and the Web Audio player independently.
5. Provenance: label as AI-generated and place-inspired, not authentic location footage or on-site audio. Credits and SEO descriptions must be changed if promoted.
6. Review the first/middle/last frames, dissolve and loop seam on desktop and mobile; record human approval before switching assets.

## Release boundary

This pilot does **not** alter src/scenes/catalog.mjs or the existing real-footage CI workflow. Those would need an explicit coordinated migration after visual approval: new media source manifest, true AI provenance and credits, SSR/SEO descriptions, Cloudflare generated media deployment and fallback QA. Publishing the pilot under existing real-footage credits is forbidden.

**Not completed:** generation itself, paid model run, actual MP4 frame review, approved production replacement, real-device viewing. Source photos have not been copied.
