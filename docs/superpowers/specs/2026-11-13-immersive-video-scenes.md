# Immersive video scenes

## Approved direction

Sound Cocktail becomes a music-led place to spend time: Bali rainforest and a Chiang Mai-inspired forest-town café. The environment fills the screen. Warm ivory controls, terracotta accents, serif scene headings and small botanical marks preserve continuity with the earlier hand-drawn product.

Use actual silent looping video with an honest source credit and a static poster fallback. Never use a UI mockup as the background or represent a moving still as footage. Location-inspired stock must not be described as a local field recording. Keep video and audio lifecycles separate.

Reuse the existing V3.1 music and genuine stems. Do not recompose, overwrite the other working directory or offer pretend instrument controls. The new listening experience supports continuous playback during this building stage, with an optional sleep timer rather than the legacy ten-minute cutoff.

## Interaction

- Initial visit is silent; explicit Enter & listen starts audio.
- Two places, with a gallery and per-place saved mixes. Reset restores that place's defaults.
- A compact player provides pause/resume, volume, sound controls, timer and immersive mode.
- Immersive mode clears the main copy and navigation, while a reachable control dock and Escape provide an exit.
- Sound controls are a right panel on desktop and a bottom sheet on mobile. Keyboard focus stays in open dialogs and returns to the opener.
- Motion can pause independently of music; reduced-motion starts with a still frame.
- Audio loading errors are visible and retryable. Rapid place changes must not revive old audio.
- Preserve the classic studio, existing account/payment/source routes and existing audio work.

## Verification

Run the existing test suite and production build. Add behavior tests for per-scene preferences, invalid persisted values, independent audio controls, rapid scene changes and continuous listening. Inspect the implemented desktop and mobile layouts in the browser, including real advancing video, pause/resume, scene switching, save/reset, timer and keyboard exit.
