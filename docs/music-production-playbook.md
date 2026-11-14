# Sound Cocktail · Music Production Playbook (v1)

Status: experimental soundtrack production standard; not medical or therapeutic certification. Updated 2026-11-13.

## 1. Product contract

**Intent → Journey → Place → Studio.** Music is the reason to stay; travel gives the experience a visual and emotional location. A soundtrack must be useful without video. During development all music may be heard without a paywall or forced 10-minute cut.

A Journey must always have:
- `id`, `intentId`, `sceneId`, accurate title/description, optional session length;
- a five-part listening arc: **Arrival → Settle → Stay → Variation → Return**;
- original/cleared sound sources, exact rightsholder/credit and raw project/version;
- aligned stereo or mono stems of matching length, starts, sample rate and exported gain;
- a complete default mix that can stand alone before personalization;
- an in-product, smooth replacement/loop mechanism when the user listens beyond 15 minutes.

## 2. The music brief is a production input, not just a prompt

For each Journey fill in:
1. **User task:** focus writing, seated meditation, relaxed reading or post-work release. Is vocal material acceptable? Default **no**.
2. **Context:** concrete time/place, but make it `inspired by` unless actually recorded there.
3. **Emotion:** 3 to 5 adjectives, e.g. warm / wooden / unhurried / gently curious.
4. **What NOT to do:** dramatic builds, sudden highs, sharp bell attacks, repetitive four-bar melodies, busy transient percussion, field-recording claims without proof.
5. **One signature:** a brief theme or texture that listeners can remember without foregrounding it.
6. **Listening arc:** five stage timestamps, two or three gentle return points, a long middle where novelty is low.
7. **Evidence:** metadata, contracts, stems and subjective listening feedback, not claims about guaranteed brain waves or medical outcomes.

## 3. Chiang Mai Café Flow — preserved identity, gentle middle

**Core:** a warm, melodic opening makes the first 45–90 seconds inviting. A recognizable phrase returns quietly; the sustained middle has harmonic variety but no event barrage. Avoid the previous V2/V3 feeling of synthetic keys endlessly looping the same figure.

| Time | Scene | Composition decision |
| --- | --- | --- |
| 0:00–2:35 | Arrival / the first coffee | Retain the acknowledged original V3.1 opening and first lift. Do not suddenly brighten or add synthetic percussion. |
| 2:35–4:00 | Settle / work begins | Crossfade to longer chords, softer details and a stable, warm lower-mid foundation. |
| ~4:07 | First recall | Short three-note wood-tone phrase (not a chorus). |
| 4:15–8:30 | Stay | Sparse motifs; chord inversions, humanized timing and gentle stereo depth. Keep plucks from demanding attention. |
| ~8:40 | Variation | Respond to the earlier phrase using a slightly different contour, then return to a low-density middle. |
| ~12:12 | Familiar return | A quieter, recognizable echo of the first motif. |
| 13:00–15:00 | Return / continuation | Do not manufacture a cliff-hanger; loop/crossfade gently into the next listening cycle. |

The current **V3.2 procedural reconstruction** maintains the prior opening and implements three soft mid/late motifs (at ~247, 520, 732 seconds). It is not a piano or guitar performance, and has not yet passed listening-preference validation. Future paid/mastered replacement should be made with professional sampled or performed stems using the same manifest and timing contract.

## 4. Bali, Da Lat, Kyoto, Lisbon and Hoi An briefs

| Journey | Signature | Motion rule | Listen for |
| --- | --- | --- | --- |
| Bali Sound Bath | spatial, inharmonic bowl-like overtones | very sparse distant answers and long release | metallic spikes, false 'real bowl' claims, fatigue |
| Da Lat Morning Mist | cool, misty harmonic bed and wood plucks | gentler rise than Chiang Mai, no dense rhythm | preserving the liked understated quality |
| Kyoto Still Water | rain-like air, very few notes | long silences between events | no artificial 'Zen' clichés |
| Lisbon Golden Hour | warm plucks with an organic pulse | moderate variation, fewer repetitive bars | can the listener still write uninterrupted? |
| Hoi An Lantern River | soft, warm evening harmonies | descending energy, distant low-level detail | no bright transient at bedtime |

## 5. Stems, signal path and streaming

In the current preview each original procedural Journey has:
- `harmony`: long tones and evolving chord colors;
- `details`: discrete melodies, call-and-response or bowl-like overtones;
- `atmosphere`: unobtrusive synthetic air texture;
- optional independently licensed ambiance, when a credible source is already in the repository.

All three 15-minute stems have identical start and decoded duration, exported as MP3 for the public preview. The app uses **HTMLMediaElement + MediaElementAudioSourceNode**, not `decodeAudioData` of three 15-minute files. Gain controls and dynamics are actual audio nodes, not visual fakes. A second group starts at the end and crossfades with the previous group. The musical-activity slider varies how often passages of the detail stem are audible; this is a prototype gate, not note-by-note resynthesis.

A commercial mastered handoff should export **48 kHz / 24-bit WAV** stems with no master bus limiting baked in, consistent zero time, plus a -14 to -20 LUFS listening reference as agreed per Journey (not a universal loudness claim). The final web encode should be chosen by ear across phones and headphones. Keep a true-peak margin, and do not rely on a compressor to fix flawed mixing.

## 6. Source rights and provenance

- For *every* field recording / instrument sample: asset name, producer, URL, license version, attribution text, allowed commercial use, territory, redistribution restrictions and edit permission.
- Store written permission for commissioned performers and explicitly define master, publishing, synchronization and derivative rights.
- This repository's current v3.2 long-form material is programmatically composed and synthesized; there are **no verified Chiang Mai, Bali or Japanese local field recordings** inside these new stems. The four concept SVGs are original illustrations, not travel photos.
- Reference recordings in ChatGPT Library `/Sound Cocktail/参考音频` are for analytic comparison only; never copy commercial audio into a shipped stem.

## 7. Quality gates (must pass before marking a soundtrack premium)

**Technical:** all stems present; matched length and sample format; no missing media, audible seam clicks, clipping, huge frequency spikes, major per-stem drift or abrupt cut; stable browser controls and looping after 15/45 minutes; headphones and smartphone playback; Safari/iOS and background tab checked. `scripts/validate_journey_audio.py` covers asset structure and reported peak, not all of this QA.

**Editorial:** listen to minutes 0–2, 4–6, 8–10 and 13–15 with matched volume, blind against v3.1 when possible. Record what feels repetitive, irritating or distracting. Test the default mix without interacting with sliders.

**Behavioral:** invite intended users to work or relax for 15–45 minutes; collect self-reported distraction, comfort and willingness to return. Self-report and subjective preference are not proof of medical efficacy.

**Ship decision:** do not advertise as a professional sound bath or clinically effective music therapy until supported by qualified production, proper licensing and relevant evidence.

## 8. Reproducible preview build

```bash
python -m pip install numpy==2.0.2 scipy==1.14.1
# ffmpeg and ffprobe must be installed
python scripts/render_journeys.py
python scripts/validate_journey_audio.py
npm test
npm run build
```

The separate `preview-immersive-pr5.yml` GitHub Action caches generated audio and deploys an isolated review Worker. Do not attach the review Worker to production routes, merge to main or enable production payments without explicit approval.

## 9. Human production handoff (future upgraded master)

DAW artist delivers: agreed brief, 15/30/45-minute structured programme, MIDI or score where rights allow, full session metadata, six to eight aligned stems, print of reverb/delay returns, acoustic sample credits, mix/master reference, instrumental timing sheet and export checksums. The user interface preserves the same Journey IDs and per-stem controls across replacements.
