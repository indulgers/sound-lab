# Local media: why films and sound vanish after a fresh clone

The React/TanStack Start application loads media from **public files**, not the Git repository itself. Generated 15-minute streaming stems and genuine location-specific moving film derivatives are deliberately *not committed* because they are large.

Without restoring them, the UI still loads, but Vite returns 404 for paths such as:

- /assets/scenes/chiang-mai-travel.jpg
- /assets/scenes/chiang-mai-travel.mp4
- /assets/audio/journeys/chiang-mai-harmony.mp3

The old short films (chiang-mai-cafe.mp4 and bali-rainforest.mp4) cannot safely replace the new footage. They are archived for provenance reasons, and do not represent the new destination-specific media.

## Fastest fix (macOS, Node.js >= 22.12)

From the repository root on the 2.0 branch:

    git pull
    pnpm assets:sync
    pnpm assets:check
    pnpm dev

Or use npm if you installed this project with npm:

    npm run assets:sync
    npm run assets:check
    npm run dev

The sync script downloads the **already published, CI-validated derivatives** and corresponding asset manifests from the public Cloudflare Worker used by the deployment workflow. No repository token or payment secret is required. It checks file size and signatures for MP3, MP4 and JPEG, plus per-file SHA-256 for the travel films/posters. Existing valid media is skipped, so rerunning the command is safe.

The default upstream is the Workers URL seen in the last successful main deployment log (2026-11-17). If that deployment changes, provide the current Worker URL:

    SOUNDLAB_MEDIA_ORIGIN=https://YOUR-WORKER.workers.dev pnpm assets:sync

Or:

    pnpm assets:sync -- --origin https://YOUR-WORKER.workers.dev

To sync only one destination for quicker local development:

    pnpm assets:sync -- --scene chiang-mai
    pnpm assets:check -- --scene chiang-mai

A single destination contains 4 video/poster files + 3 long MP3 stems. The player supports six destinations; a full validation requires all six.

## If the public Worker is inaccessible

Source generation can be run locally instead. It downloads licensed footage from original credits, then produces silent H.264 derivatives and separately rendered 15-minute original synthetic music. This does *not* turn the music into genuine field recordings.

    brew install ffmpeg
    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install 'numpy==2.0.2' 'scipy==1.14.1'
    python scripts/render_journeys.py
    python scripts/validate_journey_audio.py
    python scripts/build-travel-films.py
    python scripts/validate-travel-films.py
    pnpm assets:check
    pnpm dev

The original film download can fail if its upstream site is blocked or unavailable; do not silently replace it with an unrelated video or rename an old asset as if it were the destination. Use a working public media Worker or retry with access to the licensed source.

## Diagnostic checklist

    ls -lh public/assets/scenes/*-travel.mp4
    ls -lh public/assets/audio/journeys/*-harmony.mp3
    pnpm assets:check
    curl -I http://localhost:3000/assets/scenes/chiang-mai-travel.jpg
    curl -I http://localhost:3000/assets/audio/journeys/chiang-mai-harmony.mp3

Both HTTP checks should return 200 after syncing and starting the dev server. If you still get 404, run the sync command from the repository root and restart the Vite server.

Chromium blocks automatic audible playback until a user click. Even with every MP3 present, **you must click Play/Enter** to hear the scene. On devices with reduced-motion settings, the background intentionally stays on its poster instead of autoplaying the silent video. That is different from a missing resource.

## For contributors and CI

- Files in public/assets/audio/journeys and generated *-travel derivatives are gitignored, not source files.
- CI restores/creates and validates them before it builds the app.
- A successful TypeScript/Vite build alone cannot establish that public media exists.
- Never stage generated media or API/payment secrets in a PR. Keep asset filenames and film attribution consistent with src/scenes/catalog.mjs.
