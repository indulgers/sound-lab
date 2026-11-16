# Issue #6 — DIY organic remake: credits, arrangement & pilot results

> Status: 90-second pilots rendered 2026-11-16 on branch
> `codex/organic-diy-20261116` (from main `6b855c0`). Full 15-minute mixes
> are NOT built yet — they wait on limer's listening verdict on the pilots.
> Render pipeline: `scripts/render_organic_pilot.py`. Source inventory:
> `sources/organic/sources.json` (38 entries, 31 accepted, 7 rejected).
> Pilot outputs are generated artifacts, never committed — see
> `pilot/organic/qa.json` for durations, LUFS and peaks.

## What "organic" means here

The Chiang Mai + Bali journey audio is rebuilt from real, freely-licensed
recordings instead of the procedural V3.2 mixes. Recordings are layered,
sliced and re-arranged into original compositions — never re-exported
whole — so no sample-pack loop is used as a standalone stem (proposal
§7.1). Nothing was commissioned.

## Pilot arrangement

**Chiang Mai — 90s, F major** (pilot key set by the piano; V3.2 was D major
— the pilot key does not need to match V3.2, only the mix itself must be
coherent, and the A/B is loudness-matched, not key-matched).
- Harmony: Scott Buckley "The Long Dark" ambient piano, slice 60–150s.
- Details: Hasenchat fingerpicked guitar, pitch-shifted +2 semitones
  (Eb major → F major, ffmpeg rubberband, pitch only), four phrases at
  0s / 28s / 55s / 78s, panned.
- Atmosphere: Marble Toast café ambience slice 600–690s + faint Taipei
  Botanical Garden birds (30–120s).

**Bali — 90s, D natural minor** (same key as V3.2 Bali).
- Harmony: Alexander Blu tibetan-bowl warm pad, slice 10–100s
  (**a pad, not real bowls — never claim real bowls for this layer**),
  + Doc bell meditation at low gain (60–150s).
- Details: sparse real bowl strikes, fundamentals all in D natural minor:
  small tibetan bowl F4 at 2s, yukatan bowl B4 at 24s, trubin bowl E5 at
  48s, Koshi chimes at 66s.
- Atmosphere: Taipei birds (120–210s) + faint Alexander Blu bowls+birds.

**Not used:** Sikarskie crystal bowls as a tuned chord — their IA labels
are unreliable (measured partials share C4/A#4 across all six bowls, so
no clean triad exists); they remain backup individual strikes only.

## Pilot results (90s, default levels .78/.54/.47)

| Journey | Organic mix | V3.2 ref mix | Peak |
|---|---|---|---|
| Chiang Mai | −27.3 LUFS (target −27.3) | −27.3 LUFS | −12.9 dBFS |
| Bali | −27.5 LUFS (target −27.5) | −27.5 LUFS | −15.9 dBFS |

Raw sources are mastered much louder than the quiet V3.2 beds (mixes
measured −16.7 / −15.8 LUFS before gain), so a single uniform gain
(0.295× / 0.257×) brings each mix to its target. Stems: Chiang Mai
harmony −26.5 / details −32.2 / atmosphere −28.1 LUFS; Bali harmony
−25.9 / details −30.3 / atmosphere −34.0 LUFS. (Details read quieter
because the phrases/strikes are sparse — the per-note level, not the
integrated LUFS, is what the ear judges. The mp3 excerpts measure ~0.3 LU
lower than the masters from encoding loss.)

## Listening samples (90s excerpts, 44.1 kHz mp3)

- `pilot/organic/chiang-mai-mix-90s.mp3` — organic Chiang Mai
- `pilot/organic/v32-mix-90s-chiang-mai.mp3` — V3.2 Chiang Mai (reference)
- `pilot/organic/bali-mix-90s.mp3` — organic Bali
- `pilot/organic/v32-mix-90s-bali.mp3` — V3.2 Bali (reference)

All four are loudness-matched, so the comparison is fair. What needs
limer's ears: does the organic Chiang Mai feel warmer / more "real" than
the procedural one, or does the piano + café read as a background track
rather than a journey? Does the Bali sound-bath feel sparse enough, or
too empty between strikes? Is the café murmur too present / too
recognisable as people talking?

## Credits — sources used in the pilots

Attribution is required for every CC-BY / CC-BY-SA source. These credits
belong on the app's Sources page (`/sources`) if the organic stems ship.

| Source | Author | License | Used in |
|---|---|---|---|
| "The Long Dark" (Ambient Neoclassical Piano) | Scott Buckley | CC-BY 3.0 | Chiang Mai harmony |
| "Acoustic Chill Out Guitar" | Hasenchat | CC-BY-SA 3.0 | Chiang Mai details |
| "Cafe ambiance" | Marble Toast | CC0 1.0 | Chiang Mai atmosphere |
| "Taipei Botanical Garden — Birdsong" (aporee) | Wu, Tsan-Cheng | Public Domain Mark 1.0 | Both atmospheres |
| "Tibetan Bowl Meditation Music" (pad) | Alexander Blu | CC-BY 4.0 | Bali harmony |
| "Bell Meditation" | Doc | CC-BY 3.0 | Bali harmony (low) |
| "Small tibetan singing bowl" | Cassa342 | CC-BY-SA 4.0 | Bali details |
| "Singing bowl" | Юкатан | CC-BY-SA 3.0 | Bali details |
| "The sound of a singing bowl" | Valera N. Trubin | CC-BY 4.0 | Bali details |
| "Windglockenspiel.Koshi" (Koshi chimes) | Membeth | CC0 1.0 | Bali details |
| "Singing Bowls And Birds Chirping" | Alexander Blu | CC-BY 3.0 | Bali atmosphere (low) |

**ShareAlike note:** the Hasenchat guitar, Cassa342 bowl and Юкатан bowl
are CC-BY-SA. If the soundtrack counts as an adaptation, share-alike may
require sharing the adapted audio under the same license — CC0/CC-BY
picks are the cleanest where a choice exists. (Legal review is limer's
call; this file records the facts, not legal advice.)

**Public Domain Mark note:** the Taipei birdsong is labelled Public
Domain Mark 1.0 on Internet Archive — a label, not a license. Treat as
accepted but flagged.

## Full inventory

`sources/organic/sources.json` (v2) — 38 entries with URL, author, exact
license, duration, sample rate, quality notes and journey/layer fit.
Accepted (31): the 11 above, plus backups — Zabriskie + Kai Engel piano,
El Noi + nylon guitars, kalimba sample + kalimba de coco notes, 11-inch
bowl FLAC, crystal bowls C/D/E/F/G/A (individual strikes only), bowls
improvisation, temple bell, windchime, 20090610 birds ambience, dream
keeper + parler piano + kuldrum kalimba (sparse slices only).
Rejected (7): Did You Ever + Bells for nothing + Kalimba IA 201705
(content: dense produced tracks, verified by spectrogram), windchimes
ccMixter + 3 Freesound previews (download: 403 from this VM).

## Gaps & upgrade paths

- Freesound is blocked from this VM (cdn.freesound.org 403) and full
  files need a free login — the best upgrade for the final 15-min
  masters is a Freesound account: hollandm dry bowl (CC0, cleanest
  single-strike stem), felix.blume dawn chorus (CC0, 9-min birds),
  seriousmedium33 café (CC0, 3:01).
- Guitar is the thinnest category (2 verified Commons candidates);
  kalimba's only long-form pick was rejected on content.
- No file was auditioned by ear — every pick was verified by spectrogram
  + spectral-peak analysis only. Limer's listening verdict is the real
  check (keys, noise, stray voices, mood fit).

## What the full 15-minute remake would take

1. Limer's pilot verdict (keep / retune / drop per journey).
2. Extend the arrangement in `render_organic_pilot.py` from 90s to 900s:
   same sources, longer slices + seamless-loop tiling (`loop_bed` with
   crossfades), more strike/phrase placements following the proposal's
   motif positions (Chiang Mai ~247s / 520s / 732s), per-scene loudness
   parity per `docs/loudness-parity.md`.
3. Source upgrades if the verdict wants them: Freesound full WAVs
   (login needed), more Commons digging for guitar/kalimba.
4. Re-run the full validator + loudness check, blind listening test
   (proposal §6, n=30, ship if preference ≥70% and no worse on
   distraction / willingness-to-return).
5. Ship: replace the V3.2 stems via the existing CI generation step
   (deploy workflow must gain the organic render step, like the 404 fix
   in `0d758f7`), update `/sources` credits, keep the V3.2 mixes as
   fallback until the organic ones are proven live.
