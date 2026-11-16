# Immersive video scenes: review and verification

Updated 2026-11-13. Implementation, code review fixes and isolated draft PR delivery are complete. Browser acceptance remains pending.

Code review: [PR #5 — immersive video listening scenes](https://github.com/indulgers/sound-lab/pull/5), branch `codex/immersive-video-scenes`. The production branch has not been merged or deployed.

## Private review preview

[Sound Cocktail immersive review](https://sound-cocktail-immersive-review.weiyezhu180.chatgpt.site)

The private Site deployment succeeded, including the full TanStack Start/Cloudflare production build. Browser inspection currently stops at ChatGPT sign-in. No successful authenticated browser walkthrough or final desktop/mobile screenshots are claimed. Open the preview in an authorized signed-in session to complete the checklist below.

## Verified results

| Check | Result and scope |
| --- | --- |
| Automated suite | `npm test`: **136 passed, 0 failed, 0 skipped**; recorded in the session's `final-tests.log`. |
| Production build | Full TanStack Start/Cloudflare build succeeded during private Site publication. This is deployment build evidence, not a completed browser acceptance test. |
| Uploaded media | All **14 GitHub media blobs**—six MP3s, four MP4s and four JPGs—match the corresponding local hashes. |
| Original music | All six V3.1 stems are preserved **bit-for-bit**. Their hashes and source bundle are recorded in `public/assets/audio/scenes/manifest.json`. |
| Video structure | Four silent H.264 MP4s at 25 fps, with progressive-playback metadata and matching desktop/mobile posters. |
| Video motion and seams | Selected frames and frame-difference measurements were inspected; see [video-validation.json](video-validation.json). Each desktop clip completed **10 accelerated decode loops** without decode errors. These were not 10 real-time browser playback loops. |
| Browser QA and screenshots | **Pending:** private preview requires ChatGPT sign-in before the app can be inspected. |

The suite covers per-place saved mixes, corrupt/unavailable storage, explicit audio start, layer gains, synchronized loops, pause/resume, stale-load cancellation, error retry and disposal. Sleep-timer tests cover native scheduling, master-volume changes, cancellation, scene changes, paused time, expiry during decoding and delayed callbacks. Route tests cover distinct home/studio canonical URLs and updated home metadata. These checks do not establish rendered layout quality or subjective listening quality.

## Music and footage scope

The music uses the existing V3.1 **180-second compositions**, with three genuine stems per scene. The first play retains the complete opening. The player blends the last 12 decoded seconds with the opening in memory, then uses native Web Audio looping from 12 to 180 seconds. Continuous listening repeats this joined composition; no new long-form score or evolving chapter sequence was authored. Stored MP3s remain unchanged. Listening has no default three-minute or ten-minute cutoff; the optional sleep timer is user-selected.

The forest/café ambience layers are separate existing recordings. Their provenance remains in `src/audio/catalog.mjs`; the V3.1 music provenance is in `public/assets/audio/scenes/README.md`.

| Scene | Footage and actual location | Delivered loops |
| --- | --- | --- |
| Bali-inspired rainforest | [View of the Flowing Water in the Forest](https://www.pexels.com/video/view-of-the-flowing-water-in-the-forest-8310457/) by I Am Sorin. The source does not specify a location; Bali was not verified. | 28.52 seconds; desktop 1280×720, mobile 540×960. |
| Chiang Mai-inspired café | [Charming Cafe with Lush Garden View](https://www.pexels.com/video/charming-cafe-with-lush-garden-view-40913579/) by LayG Traveller. The source describes **Yangshuo, China**; the destination inspiration is Chiang Mai. | 6.8 seconds; desktop 1600×900, mobile 540×960. |

Both sources and the [Pexels License](https://www.pexels.com/license/) are recorded in `public/assets/scenes/credits.json` and `public/assets/scenes/README.md`. The café is a short stock-video loop, not a custom long-duration Chiang Mai filming. Video is silent and its lifecycle is independent of music.

## Code review fixes

| Finding | Implemented correction |
| --- | --- |
| Master control disappeared on mobile | Master volume is available in the sound dialog. |
| Responsive navigation hid Studio and Saved mixes | The Places/Saved dialog includes routes to those actions. |
| Classic shell lacked a return to immersive home | The shell brand links to the localized home. |
| Mobile Sound opener had no accessible name | An explicit sound label remains when its visible text is hidden. |
| Studio metadata pointed to home | Studio has its own localized canonical metadata; home describes the new experience. |
| Sleep expiry depended on UI polling | The audio controller schedules a native fade and source stops; UI polling updates the display. |
| Save/reset feedback was outside the modal | Status feedback is available inside the sound dialog. |

Review also checked generation/abort guards and the legacy ownership hook. Late scene loads cannot revive a superseded selection; late legacy decode completion checks whether the legacy player is still playing. These are code/test findings, with live handoff confirmation still pending.

## Run and finish review

Use Node.js 22.12 or newer and the repository's documented environment setup. From the repository root:

```sh
npm ci
npm test
npm run dev
```

The dev server uses port 3000. Review `/en`, `/zh`, `/en/studio` and `/zh/studio`. `npm run build` runs the full production build; it already passed in the private publication environment.

Complete these checks in an authorized preview session or a working local browser session:

- [ ] Desktop and phone widths, including a short viewport: confirm the dock, master control, dialog content, Studio/Saved navigation and safe-area spacing are reachable.
- [ ] Start silently, explicitly enter listening, then pause/resume. Confirm actual advancing video and native loop playback rather than inferring playback from screenshots.
- [ ] Switch scenes rapidly during loading; pause while decoding; leave and return through the classic studio. Confirm no stale audio or overlapping ownership.
- [ ] Change individual layers, save each scene, switch/reload, and reset. Verify visible modal feedback and graceful handling of corrupt or blocked storage.
- [ ] Pause video independently, enable reduced motion, and force a video-load failure. Confirm the poster fallback and continuing ability to listen.
- [ ] Check keyboard focus containment, Escape, return focus, immersive exit and accessible control names in both languages.
- [ ] Select, change and cancel a sleep timer; check expiry and background-tab behavior. Confirm unrestricted listening when no timer is selected.
- [ ] Listen across audio seams and video loop boundaries, then capture desktop/mobile screenshots and record the actual browser/device and duration tested.
- [x] Publish the isolated branch and draft PR with the preview link and the remaining verification limits.
