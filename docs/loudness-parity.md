# Sound Cocktail · Loudness parity (V3.1 vs V3.2) — measured 2026-11-16

Method: `ffmpeg` `ebur128` filter (EBU R128 gated integrated loudness),
measured on the **default mix** — the levels the app actually plays
(`longLayers`: harmony .78 / details .54 / atmosphere .47; legacy layers:
score .85 / texture .80 / air .55; Bali adds forest ambience .12).
`ebur128` agrees with `loudnorm` within ~0.1 LU on the same file
(chiang-mai-score V3.1: loudnorm −25.07, ebur128 −25.0) and is ~10× faster.
Do NOT measure with `loudnorm` + `-filter_complex` without a labelled
output and `-map`: the JSON summary is printed at info level, so
`-loglevel error` silently swallows it (this cost one 22-minute run
that measured nothing).

## Before (V3.2 as merged in PR #5)

| Mix (default levels) | Integrated LUFS | True peak |
|---|---|---|
| V3.2 chiang-mai | −29.3 | −14.2 dBTP |
| V3.2 bali | −29.9 | −15.2 dBTP |
| V3.2 da-lat | −30.9 | −19.3 dBTP |
| V3.2 kyoto | −34.3 | −21.4 dBTP |
| V3.2 lisbon | −30.3 | −19.0 dBTP |
| V3.2 hoi-an | −31.5 | −20.5 dBTP |
| V3.1 chiang-mai | −26.4 | −13.0 dBTP |
| V3.1 bali | −26.3 | −14.0 dBTP |

Within-journey step (V3.2, input seeking — output `-ss` after `-i`
does **not** seek with `-filter_complex`, it re-measures the full file):

| Scene | Head 0–146s (V3.1 audio) | New 225–800s | Gap |
|---|---|---|---|
| chiang-mai | −27.5 LUFS | −29.3 LUFS | **1.8 LU** |
| bali | −27.5 LUFS | −29.6 LUFS | **2.1 LU** |

Da Lat has no V3.1 files, so its head is new material too (0–160s =
−30.9, same as the full mix) — no step there.

## What was wrong

1. **Version regression (A/B):** the same journey got 2.9 LU
   (Chiang Mai) / 3.6 LU (Bali) quieter from V3.1 to V3.2. A listener
   switching from the V3.1 reference to the V3.2 journey hears it
   drop — and any preference test between the two is biased toward
   the louder one.
2. **Within-journey fade-down:** inside V3.2, the V3.1-derived opening
   is 1.8–2.1 LU louder than the continuation, so the journey gets
   audibly quieter across the ~30 s crossfade at ~2:40.

Both have the same root cause: the V3.2 render normalises the new
material to `scene_rms` targets that sit below the V3.1 head level,
and the V3.1 audio is blended in at unity gain.

## Fix (2026-11-16, `scripts/render_journeys.py`)

Raise the `scene_rms` targets for the two scenes that have a V3.1 head,
so the new material matches the head level:

- chiang-mai: `(.034, .009, .0025)` → `(.0418, .0111, .0031)` (×1.23, +1.8 dB)
- bali: `(.032, .009, .0018)` → `(.0408, .0115, .0023)` (×1.27, +2.1 dB)

The render's peak-based global scale (`min(1, 0.76/peak)`) still does
not engage: peaks rise to ≈ −9.8 / −10.5 dBFS, well below the cap.

## What was deliberately NOT changed

- **Cross-scene spread (5.0 LU: Kyoto −34.3 → Chiang Mai −29.3).**
  Kyoto is the quietest by design — sparse, long silences, lowest
  `scene_rms` targets (.021 harmony vs .034 Chiang Mai). The playbook
  sets the loudness reference "per Journey (not a universal loudness
  claim)". Flattening all six journeys to one LUFS would destroy the
  intended dynamic differences. Documented here instead of fixed.
- **Absolute level.** Mixes sit at −29 to −34 LUFS, far below the
  playbook's −14 to −20 LUFS handoff reference — that reference is for
  a commercial mastered handoff, not these quiet procedural beds at
  default levels with the player's master at 0.7. Users set volume;
  relative parity is what matters here.

## After (re-rendered 2026-11-16)

| Mix (default levels) | Integrated LUFS | Head 0–146s | New 225–800s | Gap |
|---|---|---|---|---|
| V3.2 chiang-mai | −28.0 (was −29.3) | −27.5 | −28.1 | **0.6 LU** (was 2.4) |
| V3.2 bali | −28.3 (was −29.9) | −27.5 | −28.3 | **0.8 LU** (was 2.8) |
| V3.2 da-lat | −30.9 (unchanged) | — | — | — |
| V3.2 kyoto | −34.3 (unchanged) | — | — | — |
| V3.2 lisbon | −30.3 (unchanged) | — | — | — |
| V3.2 hoi-an | −31.5 (unchanged) | — | — | — |

**Correction to the "before" segment numbers:** the pre-fix new-part
values first recorded (−29.3 / −29.6 LUFS) were wrong — they were the
full-mix values leaking in from the buggy output-seeking run. The true
pre-fix new-part levels were established by a controlled experiment
after the fix: the new stems attenuated by exactly the inverse of the
applied gain (÷1.23 Chiang Mai, ÷1.27 Bali) measure −29.9 / −30.3 LUFS,
i.e. the fix applied exactly the designed +1.8 / +2.1 dB (Bali shows
+2.0 dB because the unchanged forest ambience dilutes the rise by
0.1 dB). The head level (−27.5 LUFS both scenes) is identical before
and after, as it should be — the V3.1 audio is untouched.

Result: the within-journey step is now 0.6–0.8 LU (was 2.4–2.8 LU) —
below the ~1 LU audibility threshold for a slow crossfade. The
version gap vs the V3.1 mixes (−26.4 / −26.3) closed from 2.9 / 3.6 LU
to **1.6 / 2.0 LU**; the residual is the default-level difference
(legacy .85/.80/.55 vs journey .78/.54/.47), not an audio-level
problem. Any preference test must still loudness-match its clips to
the same LUFS before playing them (see
`docs/issue-6-organic-production-proposal.md`).

## Reproduce

```bash
python3 scripts/render_journeys.py        # regenerates public/assets/audio/journeys/
python3 scripts/validate_journey_audio.py # structure + peak + rms gate
python3 scripts/measure_loudness.py       # ebur128 mix/stem/segment table
```
