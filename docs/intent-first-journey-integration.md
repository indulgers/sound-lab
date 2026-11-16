# Sound Cocktail — six-place long-form Journey integration

Updated 2026-11-13. The working tree is PR #5 (`codex/immersive-video-scenes`). **Do not merge to `main` or publish production** without approval.

## Product flow

**Intent → Journey → Place → Studio**. First-time visitors select Focus / Meditate / Unwind, then receive a recommended journey; audio only begins after a user click. Once listening, they may change journeys without leaving the scenery. The existing brand is retained; cocktail visuals are not the development focus.

### Places & actual audio

| Place | Primary role | Media | Music |
| --- | --- | --- | --- |
| Chiang Mai | Focus / warm café | licensed Yangshuo stock film, explicitly not Chiang Mai photography | 15m original algorithmic composition with V3.1 opening retained |
| Bali / Ubud | Meditate / sound bath | licensed forest footage; location not verified as Bali | 15m programmatic resonance-based composition with V3.1 opening retained |
| Da Lat | Focus / relaxed reading | original illustrated concept, not travel film | 15m procedural original |
| Kyoto | Meditate | original illustrated concept, not travel film | 15m procedural original |
| Lisbon | Creative focus | original illustrated concept, not travel film | 15m procedural original |
| Hoi An | Unwind | original illustrated concept, not travel film | 15m procedural original |

All 6 currently have 3 aligned 15-minute stems (`harmony`, `details`, `atmosphere`). Optional existing licensed environmental loops can be adjusted independently. Shared places may have several mix-intention presets; these are **not** represented as independent compositions. The previous V3.1 3m Chiang Mai and Bali stems remain accessible through a labeled A/B option in advanced mixing. All prototype music is open for long listening; no mandatory 10-minute cutoff or paywall.

## Streaming engine

`src/scenes/stream-player.mjs` uses HTMLMediaElement-backed Web Audio layers rather than fully decoding three 15-minute stereo MP3s into unbounded PCM memory. Grouped media playback uses a shared Web Audio graph, time alignment, independent stem gains, ~9-second crossfade near the end, background-tab independent audio and a conservative dynamics guard. It supports a real elapsed-time clock for focus sessions and a separate optional sleep deadline.

Audio controls are **functional**, not decorative:

- **Simple:** warmth (tone), space (wet/dry depth), musical activity (gate of varying 23-second passages of the details stem), nature (atmosphere vs music ratio).
- **Advanced:** individual stems, low/mid/high EQ through BiquadFilters, convolution room reverb, mid/side stereo width with channel split/merge matrix, original V3.1 vs V3.2 where actually available.
- Controls are per-Journey, clamp to safe UI ranges and persist separately in local preferences.

The music-activity slider gates the rendered detail stem and **does not recompose notes**. The advanced EQ and stereo controls can improve a recording's balance but cannot make a weak arrangement a strong one. Multichannel width only applies if the exported stems have stereo information.

## State-specific P1 listening tools

- **Focus:** optional 25 / 45 / 60-minute work block with gentle completion reminder; pauses with audio and does not interrupt it.
- **Meditate:** optional on-screen breathing animation; can be dismissed and respects reduced-motion settings.
- **Unwind:** continuous playing without interruption is the default.
- **Visual:** five subtle light phases with scene chapter labels; user can pause video motion independently of music.
- **Customization:** the `Studio` entry in the Journey opens the in-place advanced mixer, retaining live controls; the classic /zh/studio and /en/studio remain available as separate legacy screens.

## Music production + composer

- `scripts/render_journeys.py`: reproducible six-destination procedural 15m stems and manifest, with the existing Chiang Mai/Bali opening (when compatible source stems exist).
- `scripts/validate_journey_audio.py`: validates durations, matching stem structure and basic peak/format constraints.
- `scripts/publish_production_audio.py`: future handoff utility for **rights-cleared** DAW WAV stems and delivery manifest; does not supply a professional score by itself.
- `docs/music-production-playbook.md`: detailed briefs, Chiang Mai motif timeline, instrument/realism choices, copyright evidence, technical quality gates, and human listening evaluation.

### Chiang Mai brief

Retain a welcoming, recognisable opening, then make the middle less repetitive using sparse reprises (~4:07, ~8:40, ~12:12), longer chords, less frequent distinct events, no aggressive or sudden crescendos. This is an iteration on an experimental synth piece; **real-world listener preference has not been proven**.

## QA status and scope

On isolated review run [#43459606679](https://github.com/indulgers/sound-lab/actions/runs/43459606679), actual Github Actions evidence showed:
- six 15-minute stem groups rendered / validated;
- **148 tests passed, 0 failed**, production build succeeded;
- isolated Cloudflare review Worker published and Chromium smoke succeeded on desktop, 390px mobile viewport and English interface;
- confirmed browser Focus playback, true 2-level mixer and stored levels, focus clock, Bali breathing guide, journey switch to Kyoto while playing, and long-form asset playback.

[Open review preview (Chinese)](https://sound-cocktail-pr5-review.weiyezhu180.workers.dev/zh). Production domain `soundcocktail.app` and branch `main` remain unchanged. PR remains draft.

## Incomplete, still requiring honest follow-up

1. New four destinations have **concept illustrations**, not verified local films. Chiang Mai video is filmed in Yangshuo; Bali film location is not proven. Source records must remain visible.
2. Professional recordings, human performances, DAW-produced alternate compositions and subjective musical quality gate remain future. Do not label this as clinically validated music therapy.
3. Real Safari/iOS playback, lock-screen/background hours-long session, 15m crossfade across multiple cycles, headset audio compatibility and accessibility audit need device-specific QA. Browser unit tests are not a substitute.
4. Professional audio publishing needs documented ownership, stems and master rights. Future payments are not enabled.
