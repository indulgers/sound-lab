#!/usr/bin/env python3
"""Sound Cocktail Issue #6 DIY: organic pilot stems from real recordings.

Replaces the procedural V3.2 stems for Chiang Mai + Bali with stems built
from freely-licensed real recordings (CC0 / CC-BY / CC-BY-SA / Pixabay
License only — see sources/organic/sources.json for the inventory with
per-file URL, author and license). Nothing here is commissioned; no
sample-pack loop is used as a standalone stem (see docs/issue-6-organic-
production-proposal.md §7.1 — recordings are layered, sliced and
re-arranged into original compositions, never re-exported whole).

Pilot scope (this script): 90-second stems + 90-second mix excerpts for
Chiang Mai first, then Bali, loudness-matched to the V3.2 0–90s mixes
(Chiang Mai −27.3 LUFS, Bali −27.5 LUFS integrated at the app's default
layer levels .78/.54/.47) so a blind A/B is fair. Full 15-minute mixes
are the next step after limer approves the pilot — the same arrangement
code runs with DURATION=900.

Outputs (never committed to git — generated artifacts, like V3.2):
  pilot/organic/<slug>-{harmony,details,atmosphere}-90s.wav  (48 kHz / 24-bit masters)
  pilot/organic/<slug>-{harmony,details,atmosphere}-90s.mp3  (24 kHz app stems)
  pilot/organic/<slug>-mix-90s.mp3                          (listening excerpt, 44.1 kHz)
  pilot/organic/qa.json                                     (durations, LUFS, peaks)
  pilot/organic/v32-mix-90s-<slug>.mp3                      (V3.2 reference excerpt, loudness-matched)

Sources live in sources/organic/ (gitignored). The script downloads them
from their canonical URLs on first run (stable direct links: Wikimedia
Commons upload.wikimedia.org, Internet Archive, Pixabay CDN, ccMixter).
Freesound full files need login and are NOT used — preview-only entries
are listed in sources.json as rejected for final stems.

Arrangement (keys verified by spectral analysis 2026-11-16):
  Chiang Mai — F major. Harmony: Scott Buckley "The Long Dark" ambient
    piano (CC-BY 3.0, F major). Details: Hasenchat fingerpicked guitar
    (CC-BY-SA 3.0, Eb major) pitch-shifted +2 semitones to F major with
    rubberband (pitch only, tempo unchanged). Atmosphere: Marble Toast
    café ambience (CC0, 20 min) + faint Taipei Botanical Garden birds
    (Public Domain Mark).
  Bali — D natural minor. Harmony: Alexander Blu tibetan-bowl warm pad
    (CC-BY 4.0, F major = relative major of D minor, so F/A/C all sit
    inside D natural minor) + Doc bell meditation at low gain. Details:
    sparse real bowl strikes whose measured fundamentals are all in
    D natural minor — small tibetan bowl F4 (CC-BY-SA 4.0), yukatan bowl
    B4 (CC-BY-SA 3.0), trubin bowl E5 (CC-BY 4.0) — plus Koshi chimes
    (CC0). Atmosphere: Taipei birds + faint Alexander Blu bowls+birds.
  Iteration round 2 (limer's verdict 2026-11-16): Chiang Mai v1 REJECTED
    ("too weird, doesn't feel like sound therapy" — piano + café reads
    as background music); Bali v1 KEPT, strikes to be heavier + brighter.
    - chiang-mai-a "drone + kalimba": tibetan-bowl warm pad drone (slice
      100–190s) + 7 sparse coco-kalimba plucks (F-major notes only) +
      faint birds only. No piano, no café, no guitar — the most minimal,
      therapy-first attempt.
    - chiang-mai-b "sparse piano, no café": Long Dark piano, quietest
      (opening) 0–90s slice + 2 guitar phrases + faint birds only.
      Tests whether the café was the problem, or the piano itself.
    - bali-v2: same strike spacing as v1, strikes +2.5 dB (gain 0.9→1.2)
      + gentle +2 dB high shelf above 6 kHz on the details stem.
    - bali-v3: denser strikes (F4@2, B4@18, deep 11-inch G2@36, E5@54,
      F4@72) + chimes@82, same +2.5 dB / +2 dB shelf as v2 — v2 vs v3
      differ only in spacing and the extra low tone.
    Variants share their journey's V3.2 target LUFS and reference excerpt
    (REF_SLUG), so every A/B stays loudness-matched.
  NOT used: Sikarskie crystal bowls as a tuned chord — their labels are
    unreliable (measured partials share C4/A#4 across all six bowls, so
    no clean triad); they remain as backup individual strikes only.
"""
from __future__ import annotations
import json, math, os, re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / 'sources' / 'organic'
OUT = ROOT / 'pilot' / 'organic'
V32_DIR = ROOT / 'public' / 'assets' / 'audio' / 'journeys'
SR_MASTER = 48_000          # masters: 48 kHz / 24-bit WAV (proposal §1)
SR_APP = 24_000             # app stems: 24 kHz mp3, same as V3.2
PILOT_SECONDS = 90
LEVELS = (0.78, 0.54, 0.47)  # harmony / details / atmosphere, app defaults
STEM_BITRATES = {'harmony': '72k', 'details': '56k', 'atmosphere': '40k'}
# V3.2 0–90s integrated LUFS at default levels (measured 2026-11-16).
# Variants share their journey's target so every A/B is loudness-matched.
TARGET_LUFS = {'chiang-mai': -27.3, 'bali': -27.5,
               'chiang-mai-a': -27.3, 'chiang-mai-b': -27.3,
               'bali-v2': -27.5, 'bali-v3': -27.5}
# Variant slug -> base journey slug (for the V3.2 reference excerpt).
REF_SLUG = {'chiang-mai-a': 'chiang-mai', 'chiang-mai-b': 'chiang-mai',
            'bali-v2': 'bali', 'bali-v3': 'bali'}


def run(cmd, **kw):
    p = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if p.returncode:
        raise RuntimeError(f"{' '.join(cmd)}\n{p.stderr[-2000:]}")
    return p


def decode(path, sr):
    """Decode any audio file to float32 stereo at `sr` Hz. Returns (N,2) array.
    -map 0:a:0 is required: several mp3s carry a mjpeg/png cover-art stream
    that otherwise confuses the decoder / channel count."""
    q = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(path),
                        '-map', '0:a:0', '-ac', '2', '-ar', str(sr), '-f', 'f32le', 'pipe:1'],
                       capture_output=True)
    if q.returncode:
        raise RuntimeError(q.stderr.decode()[-2000:])
    return np.frombuffer(q.stdout, dtype='<f4').reshape(-1, 2).copy()


def ffprobe_info(path):
    q = run(['ffprobe', '-v', 'error', '-show_entries',
             'format=duration,size:stream=sample_rate,channels,codec_name',
             '-of', 'json', str(path)])
    return json.loads(q.stdout)


def fetch_sources():
    """Download missing sources from sources.json (canonical direct URLs)."""
    inv = json.loads((SOURCES_DIR / 'sources.json').read_text())
    for entry in inv['sources']:
        if entry.get('status') not in ('accepted', 'accepted-with-caveats'):
            continue
        dest = SOURCES_DIR / entry['file']
        if dest.exists() and dest.stat().st_size > 0:
            continue
        print('FETCH', entry['file'], entry['url'], flush=True)
        run(['curl', '-L', '--fail', '-o', str(dest), entry['url']])
    return inv


def src(inv, entry_id):
    """Load one inventory entry as a float32 stereo array at SR_MASTER."""
    entry = next(e for e in inv['sources'] if e['id'] == entry_id)
    path = SOURCES_DIR / entry['file']
    if not path.exists():
        raise FileNotFoundError(f'missing source {entry_id}: {path} (run fetch first)')
    return decode(path, SR_MASTER), entry


def slice_at(audio, sr, start, dur):
    """Extract [start, start+dur) seconds; zero-pad if the source is shorter.
    Uses round() (not int() truncation): 21.4*48000 is 1027199.999… in
    float, and truncating it gave a 48001-sample slice for a 48000-sample
    output — a crash the v1 round-number slices never hit."""
    a, b = int(round(start * sr)), int(round((start + dur) * sr))
    out = np.zeros((int(round(dur * sr)), 2), dtype='f4')
    s0, s1 = max(a, 0), min(b, len(audio))
    if s1 > s0:
        n = min(s1 - s0, len(out) - (s0 - a))
        out[s0 - a:s0 - a + n] = audio[s0:s0 + n]
    return out


def pitch_shift(audio, sr, semitones):
    """Pitch-shift by `semitones` without changing tempo (rubberband)."""
    ratio = 2.0 ** (semitones / 12.0)
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error',
                        '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', 'pipe:0',
                        '-af', f'rubberband=pitch={ratio:.6f}',
                        '-f', 'f32le', 'pipe:1'],
                       input=np.asarray(audio, dtype='<f4').tobytes(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(p.stderr.decode()[-2000:])
    return np.frombuffer(p.stdout, dtype='<f4').reshape(-1, 2).copy()


def eq_highshelf(audio, sr, freq=6000, gain_db=2.0):
    """Gentle high shelf (ffmpeg highshelf) — brightness without harshness.
    Used on the Bali details stem only, so the pad/birds stay untouched."""
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error',
                        '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', 'pipe:0',
                        '-af', f'highshelf=f={freq}:g={gain_db}',
                        '-f', 'f32le', 'pipe:1'],
                       input=np.asarray(audio, dtype='<f4').tobytes(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(p.stderr.decode()[-2000:])
    return np.frombuffer(p.stdout, dtype='<f4').reshape(-1, 2).copy()


def kalimba_note(kal, onset, dur=1.0, peak_db=-12.0):
    """One isolated kalimba note from the coco-notes file, normalized to
    `peak_db` dBFS with a short fade-out (keeps the next note's bleed out).
    `kal` is the decoded file array at SR_MASTER; `onset` in seconds.
    Only F-major notes are ever requested (E4/F4/G4/C4/D4/C5 — B4, the #4,
    is excluded; pitches verified by spectral analysis 2026-11-16)."""
    note = slice_at(kal, SR_MASTER, onset, dur)
    fo = int(0.35 * SR_MASTER)
    note[-fo:] *= np.linspace(1, 0, fo, dtype='f4')[:, None]
    pk = np.max(np.abs(note)) + 1e-12
    return note * (10 ** (peak_db / 20.0) / pk)


def fade_edges(audio, sr, fade_in=3.0, fade_out=3.0):
    """Gentle equal-power-ish fades at both ends so a stem loops cleanly."""
    out = audio.copy()
    fi, fo = int(fade_in * sr), int(fade_out * sr)
    if fi > 0:
        out[:fi] *= np.linspace(0, 1, fi, dtype='f4')[:, None]
    if fo > 0:
        out[-fo:] *= np.linspace(1, 0, fo, dtype='f4')[:, None]
    return out


def loop_bed(src, seconds, sr, fade=2.0):
    """Tile a bed recording to `seconds` with equal-power crossfades at seams."""
    need = int(seconds * sr)
    if len(src) >= need:
        out = src[:need].copy()
    else:
        reps = math.ceil(need / len(src))
        out = np.tile(src, (reps, 1))[:need].copy()
    # Seamless loop: blend the last `fade` seconds into the first `fade`
    # seconds, so the end of the stem flows back into its start.
    f = int(fade * sr)
    if f > 0 and len(out) > 2 * f:
        t = np.linspace(0, 1, f, dtype='f4')[:, None]
        out[:f] = out[:f] * t + out[-f:] * (1 - t)
    return out


def place_event(dest, clip, start, sr, gain=1.0, pan=0.0, fade_in=0.05, fade_out=None):
    """Add stereo `clip` into `dest` at `start` seconds with fades.
    `pan` in [-1, 1] is a simple balance trim (left down when pan>0)."""
    at = int(start * sr)
    n = min(len(clip), len(dest) - at)
    if n <= 0:
        return
    seg = clip[:n].astype('f4') * gain
    fi = int(fade_in * sr)
    fo = int((fade_out if fade_out is not None else fade_in) * sr)
    if fi > 0:
        seg[:fi] *= np.linspace(0, 1, fi, dtype='f4')[:, None]
    if fo > 0:
        seg[-fo:] *= np.linspace(1, 0, fo, dtype='f4')[:, None]
    if pan > 0:
        seg[:, 0] *= (1 - pan)
    elif pan < 0:
        seg[:, 1] *= (1 + pan)
    dest[at:at + n] += seg


def lufs_of_array(audio, sr):
    """Integrated LUFS + true peak of a float array via ffmpeg ebur128."""
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        tmp = tf.name
    try:
        p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                            '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', 'pipe:0',
                            '-c:a', 'pcm_f32le', tmp],
                           input=np.asarray(audio, dtype='<f4').tobytes(),
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if p.returncode:
            raise RuntimeError(p.stderr.decode()[-1500:])
        q = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'info',
                            '-i', tmp, '-filter_complex', 'ebur128=peak=true',
                            '-f', 'null', '-'], capture_output=True, text=True)
        m = re.search(r'Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS', q.stderr)
        tp = re.search(r'True peak:\s*\n\s*Peak:\s*(-?[\d.]+) dBFS', q.stderr)
        if not m:
            raise RuntimeError('ebur128 parse failed:\n' + q.stderr[-1500:])
        return float(m.group(1)), (float(tp.group(1)) if tp else None)
    finally:
        os.unlink(tmp)


def measure_lufs(paths_levels, seconds=90, sr=SR_APP):
    """Integrated LUFS of a mix of (path, gain) mp3/wav files via ffmpeg ebur128."""
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'info']
    for path, _ in paths_levels:
        cmd += ['-i', str(path)]
    filt = ''.join(f'[{i}:a]volume={v}[a{i}];' for i, (_, v) in enumerate(paths_levels))
    filt += ''.join(f'[a{i}]' for i in range(len(paths_levels)))
    filt += f'amix=inputs={len(paths_levels)}:normalize=0[mix];[mix]ebur128=peak=true[out]'
    cmd += ['-t', str(seconds), '-filter_complex', filt, '-map', '[out]', '-f', 'null', '-']
    p = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r'Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS', p.stderr)
    tp = re.search(r'True peak:\s*\n\s*Peak:\s*(-?[\d.]+) dBFS', p.stderr)
    if not m:
        raise RuntimeError('ebur128 parse failed:\n' + p.stderr[-1500:])
    return float(m.group(1)), (float(tp.group(1)) if tp else None)


def write_wav(path, audio, sr):
    """Write float32 stereo as 24-bit WAV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', 'pipe:0',
                        '-c:a', 'pcm_s24le', str(path)],
                       input=np.asarray(np.clip(audio, -1, 1), dtype='<f4').tobytes(),
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(p.stderr.decode())


def write_mp3(path, audio, input_sr, output_sr, bitrate):
    """Write float32 stereo as mp3, resampling from `input_sr` to `output_sr`.
    NOTE: the input -ar must be the array's true rate — declaring the
    output rate as the input rate silently plays the audio slow/flat."""
    path.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        '-f', 'f32le', '-ar', str(input_sr), '-ac', '2', '-i', 'pipe:0',
                        '-acodec', 'libmp3lame', '-b:a', bitrate, '-ar', str(output_sr), str(path)],
                       input=np.asarray(audio, dtype='<f4').tobytes(),
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(p.stderr.decode())


def peak_dbfs(audio):
    return float(20 * np.log10(np.max(np.abs(audio)) + 1e-12))


def build_chiang_mai(inv, sr):
    """90s Chiang Mai pilot, F major.
    Harmony: Long Dark piano slice 60–150s (sparse part).
    Details: Hasenchat guitar, +2 semitones (Eb→F), four phrases.
    Atmosphere: café slice 600–690s + faint Taipei birds."""
    dur = PILOT_SECONDS
    piano, _ = src(inv, 'piano-long-dark-scott-buckley')
    harmony = fade_edges(slice_at(piano, sr, 60, dur), sr, 3.0, 3.0)

    guitar, _ = src(inv, 'guitar-chill-hasenchat')
    guitar_f = pitch_shift(guitar, sr, +2)  # Eb major -> F major
    details = np.zeros((int(dur * sr), 2), dtype='f4')
    for (g0, glen), at, pan in [((0, 25), 0, -0.2), ((120, 25), 28, 0.25),
                                ((240, 25), 55, -0.15), ((330, 25), 78, 0.2)]:
        place_event(details, slice_at(guitar_f, sr, g0, glen), at, sr,
                    gain=0.9, pan=pan, fade_in=0.8, fade_out=0.8)

    cafe, _ = src(inv, 'cafe-ambiance-marble-toast')
    birds, _ = src(inv, 'birds-taipei-botanical')
    atmosphere = fade_edges(slice_at(cafe, sr, 600, dur), sr, 3.0, 3.0) * 0.9
    atmosphere += slice_at(birds, sr, 30, dur) * 0.30
    return {'harmony': harmony, 'details': details, 'atmosphere': atmosphere}


def build_bali(inv, sr):
    """90s Bali pilot, D natural minor.
    Harmony: tibetan-bowl warm pad (F major = D-minor relative) + faint
      bell meditation. Details: sparse real bowl strikes (fundamentals
      F4/B4/E5, all in D natural minor) + Koshi chimes. Atmosphere:
      Taipei birds + faint bowls+birds texture."""
    dur = PILOT_SECONDS
    pad, _ = src(inv, 'tibetan-bowl-meditation')
    bells, _ = src(inv, 'bell-meditation-doc')
    harmony = fade_edges(slice_at(pad, sr, 10, dur), sr, 3.0, 3.0)
    harmony += slice_at(bells, sr, 60, dur) * 0.30

    details = np.zeros((int(dur * sr), 2), dtype='f4')
    bowl_f, _ = src(inv, 'bowl-small-tibetan-cassa342')   # F4
    bowl_b, _ = src(inv, 'bowl-singing-yukatan')          # B4
    bowl_e, _ = src(inv, 'bowl-sound-trubin')             # E5
    chimes, _ = src(inv, 'chimes-koshi-membeth')
    place_event(details, bowl_f, 2, sr, gain=0.9, pan=-0.3, fade_in=0.1, fade_out=6.0)
    place_event(details, bowl_b, 24, sr, gain=0.9, pan=0.3, fade_in=0.1, fade_out=6.0)
    place_event(details, bowl_e, 48, sr, gain=0.9, pan=-0.2, fade_in=0.1, fade_out=5.0)
    place_event(details, chimes, 66, sr, gain=0.8, pan=0.25, fade_in=0.5, fade_out=8.0)

    birds, _ = src(inv, 'birds-taipei-botanical')
    bowls_birds, _ = src(inv, 'bowls-birds-alexander-blu')
    atmosphere = slice_at(birds, sr, 120, dur) * 0.70
    atmosphere += slice_at(bowls_birds, sr, 60, dur) * 0.50
    atmosphere = fade_edges(atmosphere, sr, 3.0, 3.0)
    return {'harmony': harmony, 'details': details, 'atmosphere': atmosphere}


def build_chiang_mai_a(inv, sr):
    """90s Chiang Mai variant A — 'drone + kalimba' (most therapy-like).
    Limer rejected v1 (piano + café reads as background music, not therapy).
    Harmony: tibetan-bowl warm pad drone (F major), slice 100–190s.
    Details: coco kalimba single notes (F-major only), 7 sparse plucks.
    Atmosphere: faint Taipei birds only — NO café, NO piano, NO guitar."""
    dur = PILOT_SECONDS
    pad, _ = src(inv, 'tibetan-bowl-meditation')
    # NOTE: the pad file is only 161s long — slice 60–150s, NOT 100–190s
    # (the first attempt ran past the end and the last ~29s went silent).
    harmony = fade_edges(slice_at(pad, sr, 60, dur), sr, 3.0, 3.0)

    kal, _ = src(inv, 'kalimba-coco-notes02')
    details = np.zeros((int(dur * sr), 2), dtype='f4')
    # (source onset s, note) — F-major only; B4 (#4) excluded.
    notes = [(5.5, 'E4'), (8.3, 'E4'), (11.1, 'F4'), (21.4, 'C5'),
             (23.0, 'G4'), (25.3, 'G4'), (27.4, 'E4')]
    pans = [-0.25, 0.2, -0.15, 0.25, -0.2, 0.15, -0.25]
    for (onset, _name), at, pan in zip(notes, [4, 16, 30, 44, 57, 70, 83], pans):
        place_event(details, kalimba_note(kal, onset), at, sr,
                    gain=1.0, pan=pan, fade_in=0.02, fade_out=0.05)

    birds, _ = src(inv, 'birds-taipei-botanical')
    atmosphere = fade_edges(slice_at(birds, sr, 30, dur), sr, 3.0, 3.0) * 1.5
    return {'harmony': harmony, 'details': details, 'atmosphere': atmosphere}


def build_chiang_mai_b(inv, sr):
    """90s Chiang Mai variant B — 'sparse piano, no café'.
    Same Long Dark piano as v1, but the quietest (opening) 0–90s slice
    (sparsest 90s window in the piece, −20.6 dB RMS), only 2 guitar
    phrases, atmosphere = faint birds only (café removed). Tests whether
    the café was the problem, or the piano itself."""
    dur = PILOT_SECONDS
    piano, _ = src(inv, 'piano-long-dark-scott-buckley')
    harmony = fade_edges(slice_at(piano, sr, 0, dur), sr, 3.0, 3.0)

    guitar, _ = src(inv, 'guitar-chill-hasenchat')
    guitar_f = pitch_shift(guitar, sr, +2)  # Eb major -> F major
    details = np.zeros((int(dur * sr), 2), dtype='f4')
    for (g0, glen), at, pan in [((0, 25), 10, -0.2), ((240, 25), 55, 0.2)]:
        place_event(details, slice_at(guitar_f, sr, g0, glen), at, sr,
                    gain=0.8, pan=pan, fade_in=0.8, fade_out=0.8)

    birds, _ = src(inv, 'birds-taipei-botanical')
    atmosphere = fade_edges(slice_at(birds, sr, 30, dur), sr, 3.0, 3.0) * 0.9
    return {'harmony': harmony, 'details': details, 'atmosphere': atmosphere}


def _bali_details(inv, sr, events, chimes_at, strike_gain=1.2, shelf_db=2.0):
    """Bali details stem for the v2/v3 iterations.
    `events`: (source_id, start_s, pan, fade_out_s, gain) per bowl strike.
    Strikes are +2.5 dB vs v1 (gain 1.2 vs 0.9) and the stem gets a gentle
    +2 dB high shelf above 6 kHz — heavier and a touch brighter, per limer.
    Chimes keep their v1 level (already bright)."""
    details = np.zeros((int(PILOT_SECONDS * sr), 2), dtype='f4')
    for entry_id, at, pan, fo, gain in events:
        clip, _ = src(inv, entry_id)
        place_event(details, clip, at, sr, gain=gain, pan=pan,
                    fade_in=0.1, fade_out=fo)
    chimes, _ = src(inv, 'chimes-koshi-membeth')
    place_event(details, chimes, chimes_at, sr, gain=0.8, pan=0.25,
                fade_in=0.5, fade_out=8.0)
    if shelf_db:
        details = eq_highshelf(details, sr, freq=6000, gain_db=shelf_db)
    return details


def _bali_harmony_atmosphere(inv, sr):
    """Bali harmony + atmosphere, unchanged from v1."""
    dur = PILOT_SECONDS
    pad, _ = src(inv, 'tibetan-bowl-meditation')
    bells, _ = src(inv, 'bell-meditation-doc')
    harmony = fade_edges(slice_at(pad, sr, 10, dur), sr, 3.0, 3.0)
    harmony += slice_at(bells, sr, 60, dur) * 0.30
    birds, _ = src(inv, 'birds-taipei-botanical')
    bowls_birds, _ = src(inv, 'bowls-birds-alexander-blu')
    atmosphere = slice_at(birds, sr, 120, dur) * 0.70
    atmosphere += slice_at(bowls_birds, sr, 60, dur) * 0.50
    atmosphere = fade_edges(atmosphere, sr, 3.0, 3.0)
    return harmony, atmosphere


def build_bali_v2(inv, sr):
    """90s Bali variant v2 — same spacing as v1, strikes heavier + brighter.
    Same three strikes (F4@2, B4@24, E5@48) + chimes@66; strike gain 0.9→1.2
    (+2.5 dB) and a gentle +2 dB high shelf above 6 kHz on the details stem.
    Sparse sound-bath character unchanged."""
    ha, at = _bali_harmony_atmosphere(inv, sr)
    events = [('bowl-small-tibetan-cassa342', 2, -0.3, 6.0, 1.2),
              ('bowl-singing-yukatan', 24, 0.3, 6.0, 1.2),
              ('bowl-sound-trubin', 48, -0.2, 5.0, 1.2)]
    return {'harmony': ha, 'details': _bali_details(inv, sr, events, 66),
            'atmosphere': at}


def build_bali_v3(inv, sr):
    """90s Bali variant v3 — denser strikes + one extra deep bowl tone.
    Five strikes (F4@2, B4@18, deep 11-inch G2@36, E5@54, F4@72) + chimes@82.
    Same +2.5 dB strike gain and +2 dB high shelf as v2, so v2 vs v3 differ
    only in spacing and the extra low tone. The 11-inch bowl (fundamental
    ~101 Hz G2, in D natural minor) is the 'heavier' voice."""
    ha, at = _bali_harmony_atmosphere(inv, sr)
    events = [('bowl-small-tibetan-cassa342', 2, -0.3, 6.0, 1.2),
              ('bowl-singing-yukatan', 18, 0.3, 6.0, 1.2),
              ('bowl-hit-11inch', 36, 0.0, 8.0, 1.0),
              ('bowl-sound-trubin', 54, -0.2, 5.0, 1.2),
              ('bowl-small-tibetan-cassa342', 72, 0.25, 6.0, 1.2)]
    return {'harmony': ha, 'details': _bali_details(inv, sr, events, 82),
            'atmosphere': at}


def render_journey(slug, stems, inv, ref_slug=None):
    """Normalize the mix to the V3.2 target LUFS, write stems + excerpts,
    and return a QA record. `ref_slug` is the base journey whose V3.2
    0–90s mix is the reference (variants share their journey's reference)."""
    ref_slug = ref_slug or slug
    target = TARGET_LUFS[slug]
    h, d, a = stems['harmony'], stems['details'], stems['atmosphere']
    mix = h * LEVELS[0] + d * LEVELS[1] + a * LEVELS[2]
    measured, tp = lufs_of_array(mix, SR_MASTER)
    gain = 10 ** ((target - measured) / 20.0)
    # Peak safety: never exceed -1 dBFS after the loudness gain.
    peak = peak_dbfs(mix * gain)
    if peak > -1.0:
        gain *= 10 ** ((-1.0 - peak) / 20.0)
        print(f'  {slug}: peak-limited, gain reduced (peak was {peak:.1f} dBFS)')
    stems = {k: v * gain for k, v in stems.items()}
    mix = mix * gain
    final_lufs, final_tp = lufs_of_array(mix, SR_MASTER)
    print(f'  {slug}: mix {measured:.1f} -> {final_lufs:.1f} LUFS '
          f'(target {target}), peak {peak_dbfs(mix):.1f} dBFS, gain {gain:.3f}x')

    qa = {'slug': slug, 'target_lufs': target, 'mix_lufs_before_gain': round(measured, 2),
          'mix_lufs': round(final_lufs, 2), 'mix_true_peak_dbtp': final_tp,
          'mix_peak_dbfs': round(peak_dbfs(mix), 2), 'gain': round(float(gain), 4),
          'duration_s': PILOT_SECONDS, 'stems': {}}
    for name, stem in stems.items():
        w = OUT / f'{slug}-{name}-90s.wav'
        m = OUT / f'{slug}-{name}-90s.mp3'
        write_wav(w, stem, SR_MASTER)
        write_mp3(m, stem, SR_MASTER, SR_APP, STEM_BITRATES[name])
        sl, stp = lufs_of_array(stem, SR_MASTER)
        qa['stems'][name] = {'wav': str(w.name), 'mp3': str(m.name),
                             'lufs': round(sl, 2), 'true_peak_dbtp': stp,
                             'peak_dbfs': round(peak_dbfs(stem), 2)}
    write_mp3(OUT / f'{slug}-mix-90s.mp3', mix, SR_MASTER, 44_100, '192k')

    # V3.2 reference excerpt: same 0–90s window, same levels, same target.
    v32 = {}
    for name in ('harmony', 'details', 'atmosphere'):
        v32[name] = slice_at(decode(V32_DIR / f'{ref_slug}-{name}.mp3', SR_MASTER),
                             SR_MASTER, 0, PILOT_SECONDS)
    ref = (v32['harmony'] * LEVELS[0] + v32['details'] * LEVELS[1]
           + v32['atmosphere'] * LEVELS[2])
    ref_lufs, _ = lufs_of_array(ref, SR_MASTER)
    rgain = 10 ** ((target - ref_lufs) / 20.0)
    if peak_dbfs(ref * rgain) > -1.0:
        rgain *= 10 ** ((-1.0 - peak_dbfs(ref * rgain)) / 20.0)
    ref = ref * rgain
    write_mp3(OUT / f'v32-mix-90s-{slug}.mp3', ref, SR_MASTER, 44_100, '192k')
    ref_final, _ = lufs_of_array(ref, SR_MASTER)
    qa['v32_reference'] = {'file': f'v32-mix-90s-{slug}.mp3',
                           'lufs_before_gain': round(ref_lufs, 2),
                           'lufs': round(ref_final, 2), 'gain': round(float(rgain), 4)}
    print(f'  {slug}: v32 ref {ref_lufs:.1f} -> {ref_final:.1f} LUFS')
    return qa


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    inv = fetch_sources()
    print('sources OK:', len([s for s in inv['sources']
                              if s.get('status') in ('accepted', 'accepted-with-caveats')]))
    builders = {'chiang-mai': build_chiang_mai, 'bali': build_bali,
                'chiang-mai-a': build_chiang_mai_a, 'chiang-mai-b': build_chiang_mai_b,
                'bali-v2': build_bali_v2, 'bali-v3': build_bali_v3}
    qa_path = OUT / 'qa.json'
    if qa_path.exists():
        qa_all = json.loads(qa_path.read_text())
    else:
        qa_all = {'pilot_seconds': PILOT_SECONDS, 'levels': LEVELS,
                  'targets': TARGET_LUFS, 'journeys': {}}
    qa_all.update({'pilot_seconds': PILOT_SECONDS, 'levels': LEVELS,
                   'targets': TARGET_LUFS})
    for slug, fn in builders.items():
        if only and only != slug:
            continue
        print(f'building {slug}...')
        stems = fn(inv, SR_MASTER)
        qa_all['journeys'][slug] = render_journey(
            slug, stems, inv, ref_slug=REF_SLUG.get(slug))
    qa_path.write_text(json.dumps(qa_all, indent=2, ensure_ascii=False))
    print('pilot render finished ->', OUT)


if __name__ == '__main__':
    main()
