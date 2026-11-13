# Immersive Video Scenes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the main implementation, with independent media sourcing and audio review delegated in parallel. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Bali/Chiang Mai video listening experience using the existing V3.1 music.

**Architecture:** An isolated `src/scenes/` experience owns scene presentation and preferences. A dedicated scene audio controller consumes genuine stems and claims playback from the existing mixer; the classic studio remains available on a separate route. Video has its own lifecycle and never drives audio timing.

**Tech Stack:** Existing React 19, TanStack Start, Web Audio, native video, CSS and Node tests.

**Spec:** `docs/superpowers/specs/2026-11-13-immersive-video-scenes.md`

**Status (2026-11-13):** Implementation and code review fixes are complete. The test suite passes 136/136, and the full TanStack/Cloudflare production build succeeded during private Site publication. The private preview deployed successfully, but browser QA and screenshots are blocked at ChatGPT sign-in. Branch/PR delivery remains in progress. See `docs/immersive-video-review.md` for evidence and the remaining checks.

## Global Constraints

- Two scenes: Bali rainforest and Chiang Mai-inspired forest-town café.
- Actual silent looping video, honest credits, poster fallback and reduced-motion support.
- Reuse genuine V3.1 stems, retain original files, no invented stems or medical claims.
- Explicit audio start and continuous listening by default; optional user-chosen timer.
- Independent branch, existing studio/payment/auth behavior retained.

## Review Focus

- Rapid switches during loading must not restart a superseded scene.
- Corrupt or unavailable local storage must not break playback or leak another scene's levels.
- Mobile controls and dialogs remain reachable above browser safe areas.
- Video load failure or reduced motion must not prevent audio listening.
- Legacy studio audio and scene audio must not play concurrently.

### Task 1: Assets and state

**Files:** `public/assets/scenes/*`, `public/assets/audio/scenes/*`, `src/scenes/catalog.mjs`, `src/scenes/preferences.mjs`, `tests/scene-preferences.test.mjs`.

**Interfaces:** Scene records expose `id`, localized `name/title/description`, `video`, `poster`, `position`, `layers: [{id,label,file,defaultLevel}]`. Preferences expose `readScenePreferences(storage)`, `writeScenePreferences(storage,state)`, `levelsForScene(scene,saved)` and validated master/scene/motion settings.

- [x] Verify sources, inspect video frames/motion and copy original music stems.
- [x] Add passing state tests for isolation, reset and corrupt/out-of-range preferences.
- [x] Implement catalog and preferences; rerun tests.

### Task 2: Long listening audio

**Files:** `src/scenes/player.mjs`, `tests/scene-player.test.mjs`, minimal ownership hook in `src/sound-lab.mjs`.

**Interfaces:** `createScenePlayer({onState,claimAudio})` produces `setScene(scene,levels,{play})`, `play()`, `pause()`, `setLevel(id,value)`, `setMaster(value)`, `setSleepTimer(millisecondsOrNull)`, `dispose()`. `onState` reports `{status,sceneId,error}`. Listening has no default deadline; an explicitly chosen sleep timer schedules its fade and source stops on the audio clock.

- [x] Add passing tests for no auto-start, actual layer gain, pause/resume, stale-load cancellation and disposal.
- [x] Implement synchronized looping stems and short fades, with visible/retryable failure state.
- [x] Review ownership handoff logic to and from the classic mixer; live browser verification remains in Task 4.
- [x] Add audio-clock sleep scheduling and regression tests for cancellation, loading, scene changes and expiry races.

### Task 3: Immersive scene UI

**Files:** `src/scenes/SceneExperience.jsx`, `src/scenes/scenes.css`, `src/HomePage.jsx`, `src/SoundLabView.jsx`, `src/routes/en/studio.tsx`, `src/routes/zh/studio.tsx`.

**Interfaces:** React UI consumes the catalog/preferences/player contracts above. Native silent video is independent of player state. Classic studio uses existing `MixerSection`.

- [x] Implement scene selection, Enter & listen, sound drawer, per-scene save/reset, master volume and optional timer.
- [x] Add immersive mode, motion toggle, reduced-motion handling, accessible dialogs and responsive composition.
- [x] Preserve classic navigation and source credits; localize English/Chinese copy.
- [x] Run existing suite and production build (136 tests passed; production build succeeded during private Site publication).

### Task 4: Review and delivery

**Files:** branch diff and review screenshots.

- [ ] Browser-check desktop/mobile, video advancement/loop, audio controls, error and fallback states.
- [x] Review the whole branch independently and fix material findings in mobile controls/navigation, accessible names, modal feedback, SEO and sleep scheduling.
- [x] Publish the private review Site and verify successful deployment; access currently stops at ChatGPT sign-in.
- [x] Verify all 14 MP4/JPG/MP3 GitHub blobs against local hashes and preserve all six V3.1 stems bit-for-bit.
- [ ] Complete authenticated browser QA and capture desktop/mobile screenshots.
- [ ] Finish pushing the tested isolated branch, create a reviewable PR and provide final delivery links and verification limits.
