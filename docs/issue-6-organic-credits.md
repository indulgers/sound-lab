# Issue #6 — DIY organic remake: credits, arrangement & pilot results

> Status: 90-second pilots rendered 2026-11-16 on branch
> `codex/organic-diy-20261116` (from main `6b855c0`). Full 15-minute mixes
> are NOT built yet — they wait on limer's listening verdict on the pilots.
> Render pipeline: `scripts/render_organic_pilot.py`. Source inventory:
> `sources/organic/sources.json` (v3, 42 entries, 33 accepted, 9 rejected).
> Pilot outputs are generated artifacts, never committed — see
> `pilot/organic/qa.json` for durations, LUFS and peaks.
>
> **Round 2 (2026-11-16, limer's verdict on the v1 pilots):** Chiang Mai v1
> REJECTED as-is — "too weird, doesn't feel like sound therapy" (piano +
> café reads as background music). Bali v1 KEPT — explore more variants,
> strikes a bit heavier and brighter. Two new Chiang Mai attempts + two
> Bali iterations were rendered (see below); same branch, same pipeline.
>
> **Round 3 (2026-11-16):** the other four cities, one 90s pilot each —
> **Da Nang** (replaces Da Lat per limer's scope change 2026-11-16; no
> Da Lat pilot was built), Kyoto, Lisbon, Hoi An. Da Nang has no V3.2
> reference of its own, so its target is the Da Lat slot's V3.2 level
> (−32.5 LUFS) and its reference excerpt is Da Lat's V3.2 mix.

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

## Round 2 — iteration on limer's verdict (2026-11-16)

**Chiang Mai variant A — "drone + kalimba"** (90s, F major). The most
therapy-like attempt: tibetan-bowl warm pad drone (slice 60–150s) as the
bed, 7 sparse coco-kalimba plucks (F-major notes only — E4/F4/G4/C4/D4/C5,
pitches verified by spectral analysis; B4 excluded as the #4), faint
Taipei birds only. No piano, no café, no guitar.

**Chiang Mai variant B — "sparse piano, no café"** (90s, F major). Same
Long Dark piano as v1 but the quietest (opening) 0–90s slice, only 2
guitar phrases, faint birds only (café removed). Tests whether the café
was the problem, or the piano itself.

**Bali v2 — heavier + brighter, same spacing** (90s, D natural minor).
Same three strikes (F4@2, B4@24, E5@48) + chimes@66; strike gain 0.9→1.2
(+2.5 dB) and a gentle +2 dB high shelf above 6 kHz on the details stem
(measured HF 4–12 kHz share 27.6% → 29.8%). Sparse sound-bath character
unchanged.

**Bali v3 — denser + one extra deep bowl** (90s, D natural minor). Five
strikes (F4@2, B4@18, deep 11-inch bowl G2@36, E5@54, F4@72) + chimes@82;
same +2.5 dB / +2 dB shelf as v2, so v2 vs v3 differ only in spacing and
the extra low tone.

| Variant | Mix | V3.2 ref | Peak | Stems H / D / A (LUFS) |
|---|---|---|---|---|
| Chiang Mai A | −27.3 LUFS | −27.3 | −16.5 dBFS | −25.2 / −38.2 / −40.5 |
| Chiang Mai B | −27.3 LUFS | −27.3 | −11.0 dBFS | −25.5 / −30.5 / −40.4 |
| Bali v2 | −27.5 LUFS | −27.5 | −13.6 dBFS | −26.2 / −28.1 / −34.3 |
| Bali v3 | −27.5 LUFS | −27.5 | −12.4 dBFS | −26.4 / −28.0 / −34.5 |

All four are 90.000s, loudness-matched to their journey's V3.2 reference.
Bugs caught in round 2 and fixed in `render_organic_pilot.py`: `slice_at`
truncated float sample positions (21.4×48000 = 1027199.999… → a 48001-sample
slice for a 48000-sample output — now rounds + guards the copy length);
the CM-A pad slice 100–190s ran past the 161s pad file and left the last
~29s silent (now 60–150s, mix RMS steady −29 to −31 dB across all 90s);
the CM-A/B birds bed at ×0.25 measured −55.6/−51.5 LUFS (inaudible —
rebalanced to ×1.5/×0.9, now −40.2/−40.4 LUFS, faint but present).

Listening samples: `pilot/organic/chiang-mai-a-mix-90s.mp3`,
`chiang-mai-b-mix-90s.mp3`, `bali-v2-mix-90s.mp3`, `bali-v3-mix-90s.mp3`
(plus the V3.2 references, unchanged from round 1).

## Round 3 — the other four cities (2026-11-16)

**Scope change:** limer replaced Da Lat with Da Nang. No Da Lat pilot
was built. Da Nang is a coastal city (beaches, Marble Mountains, Han
River), so the pilot is a beach evening, not Da Lat's misty mountain
morning. Da Nang has no V3.2 reference of its own; its target (−32.5
LUFS) is the Da Lat slot's V3.2 level and its reference excerpt is
Da Lat's V3.2 mix, so the A/B is "new Da Nang vs the journey it replaces".
The full swap (catalog entry, video, credits) comes later.

**Da Nang — 90s, E major / A major** (coastal evening). Harmony: real
tropical ocean waves (CC0, Jarrod Stanley, 6.4 min, slice 60–150s) —
the waves themselves, steady −10 to −12 dB RMS, no voices/music, broad
low spectrum. Details: nylon guitar, two warm phrases (0–25s @10s,
120–145s @55s, gain 0.9, panned) — the evening melody over the sea.
Atmosphere: faint Taipei birds ×0.4 only. No pad: the tibetan pad is
F major and would clash with the guitar's E major.

**Kyoto — 90s, no key** (the quietest journey by design, target −36.4
LUFS). Harmony: real close-up stream (CC0, jackthemurray), tiled ×8.0
(it was recorded very quiet, RMS ~−54 dB). Details: two very soft
temple-bell strikes (gain 0.10 — at 0.30 the loud bell file set the mix
level and pushed the water bed down) at 25s/65s. Atmosphere: real
windchimes (slice 20–67s, ×0.20) + very faint birds ×0.20. No real
bamboo-fountain (shishi-odoshi) recording was found; the bell is a
distant temple bell, disclosed as such.

**Lisbon — 90s, E major / A major** (the warmest journey, target −31.7
LUFS). Harmony: nylon guitar, continuous slice 0–90s. Details: Meekness
piano, two low phrases (60–85s @15s, 90–115s @55s) — gain 1.2, not
0.35: at 0.35 the quiet piano file was 18 LU below the guitar bed and
inaudible; at 1.2 it sits ~7 LU below, a melody passing the corner.
Atmosphere: faint birds ×0.4.

**Hoi An — 90s, D natural minor / F major** (lantern-lit river evening,
target −33.6 LUFS). Harmony: the same close-up stream as Kyoto but a
different slice (10–68.9s), tiled ×24.0 — at ×8 the river bed was 17 LU
below the chimes and pad, the foundation the quietest stem; at ×24 the
river leads again. Details: Koshi chimes at 15s/60s (gain 0.4, not 0.9 —
at 0.9 the 60–70s window jumped +7 dB over its neighbours) + one soft
yukatan bowl B4 at 40s (gain 0.35). Atmosphere: tibetan-bowl warm pad
×0.25 + faint birds ×0.15 (at 0.5/0.3 the atmosphere was the loudest
stem — a continuous drone must not outrun the river bed).

| City | Mix | V3.2 ref | Peak | Stems H / D / A (LUFS) |
|---|---|---|---|---|
| Da Nang | −32.5 LUFS | −32.5 (Da Lat V3.2) | −19.5 dBFS | −30.8 / −33.7 / −60.1 |
| Kyoto | −36.4 LUFS | −36.4 | −10.2 dBFS | −37.0 / −33.0 / −37.0 |
| Lisbon | −31.7 LUFS | −31.7 | −17.3 dBFS | −29.8 / −37.3 / −57.1 |
| Hoi An | −33.6 LUFS | −33.6 | −7.0 dBFS | −33.6 / −32.4 / −33.3 |

All four are 90.000s. Per-10s mix RMS is steady in every city (Da Nang
−31.6 to −34.7 dB; Kyoto −32.5 to −40.4 dB, quietest at the 3s fade-in;
Lisbon −32.9 to −36.4 dB; Hoi An −30.1 to −33.3 dB, with a +3 dB bump
in the 60–70s window from the second chimes — a lantern accent, not a
jump). Tests 157/157, build OK, journey-audio + travel-films validators
PASS.

**Water sources:** one CC0 close-up stream (jackthemurray) serves both
Kyoto and Hoi An (different slices/treatment — flagged honestly; the
full 15-min version wants a second water source). Two other water files
were checked and rejected: the Broad Creek file (CC BY-SA 4.0) carries
a persistent narrow ~113 Hz tone in every window checked (reads as a
low hum, not a clean river); the trickling file (Public domain) is
episodic, with a narrow ~321 Hz whistle in its loud sections, and its
only clean window is 10–20s — too short to tile alone. The ocean waves
(Jarrod Stanley, CC0) are mastered hot (decoded peaks +2.1 to +2.7 dBFS)
but are gained down hard in the mix, so no clipping is introduced by
the pipeline.

Listening samples: `pilot/organic/da-nang-mix-90s.mp3`,
`kyoto-mix-90s.mp3`, `lisbon-mix-90s.mp3`, `hoi-an-mix-90s.mp3` (plus
the four V3.2 references; Da Nang's reference is Da Lat's V3.2 mix).

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
| "Tibetan Bowl Meditation Music" (pad) | Alexander Blu | CC-BY 4.0 | Bali harmony + Hoi An atmosphere (low) |
| "Bell Meditation" | Doc | CC-BY 3.0 | Bali harmony (low) |
| "Small tibetan singing bowl" | Cassa342 | CC-BY-SA 4.0 | Bali details |
| "Singing bowl" | Юкатан | CC-BY-SA 3.0 | Bali details + Hoi An details (B4 @40s) |
| "The sound of a singing bowl" | Valera N. Trubin | CC-BY 4.0 | Bali details |
| "Windglockenspiel.Koshi" (Koshi chimes) | Membeth | CC0 1.0 | Bali details + Hoi An details |
| "Singing Bowls And Birds Chirping" | Alexander Blu | CC-BY 3.0 | Bali atmosphere (low) |
| "Kalimba de coco (notas sueltas) 02" | Luis Alvaz | CC-BY-SA 4.0 | Chiang Mai A details (7 plucks) |
| "Tibetan Singing Bowl hit 11inch" | דג בלי מלח | CC-BY-SA 4.0 | Bali v3 details (deep strike @36s) |
| "Ocean Waves on a Tropical Beach" | Jarrod Stanley | CC0 1.0 | Da Nang harmony |
| "stream-river-water-up-close" | jackthemurray | CC0 1.0 | Kyoto + Hoi An harmony |
| "long_temple_bell" | long_temple_bell | Public Domain Mark 1.0 | Kyoto details (2 strikes) |
| "Windchime" | stephan (PDSounds) | Public domain | Kyoto atmosphere |
| "Meekness" | Kai Engel | CC-BY 4.0 | Lisbon details (2 phrases) |
| "Relaxing music on Nylon Guitars in Stereo 44khz 16bit wavefile" | ROCKSTARMONO ALIENBABA | CC-BY-SA 4.0 | Lisbon harmony + Da Nang details |

**ShareAlike note:** the Hasenchat guitar, Cassa342 bowl, Юкатан bowl,
kalimba de coco and 11-inch bowl are CC-BY-SA. If the soundtrack counts
as an adaptation, share-alike may require sharing the adapted audio under
the same license — CC0/CC-BY picks are the cleanest where a choice exists.
(Legal review is limer's call; this file records the facts, not legal advice.)

**Public Domain Mark note:** the Taipei birdsong is labelled Public
Domain Mark 1.0 on Internet Archive — a label, not a license. Treat as
accepted but flagged.

## Full inventory

`sources/organic/sources.json` (v3) — 42 entries with URL, author, exact
license, duration, sample rate, quality notes and journey/layer fit.
Accepted (33): the 19 above, plus backups — Zabriskie piano, El Noi
guitar, kalimba sample, crystal bowls C/D/E/F/G/A (individual strikes
only), bowls improvisation, 20090610 birds ambience, dream keeper +
parler piano + kuldrum kalimba (sparse slices only).
Rejected (9): Did You Ever + Bells for nothing + Kalimba IA 201705
(content: dense produced tracks, verified by spectrogram), windchimes
ccMixter + 3 Freesound previews (download: 403 from this VM), water
trickling (episodic, ~321 Hz whistle in loud sections; clean window
too short) + Broad Creek (persistent ~113 Hz tonal drone).

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
