#!/usr/bin/env python3
"""Measure integrated loudness (EBU R128 via ffmpeg ebur128) of Sound Cocktail
journey mixes at the app's default layer levels. ebur128 agrees with loudnorm
within ~0.1 LU (verified: chiang-mai-score V3.1: loudnorm -25.07, ebur128 -25.0)
and is ~10x faster (loudnorm's 192kHz true-peak upsampling is the bottleneck).

V3.2 mix (longLayers defaults): harmony .78, details .54, atmosphere .47
  + ambience: bali forest.mp3 .12, chiang-mai cafe.mp3 0 (off)
V3.1 mix (legacyLayers defaults): score .85, texture .8, air .55
  + ambience: bali forest.mp3 .12, chiang-mai cafe.mp3 0 (off)

Segments (input seeking — output -ss after -i is IGNORED with -filter_complex
and silently re-measures the full file; that bug cost one full run):
  head 0-146s = pure V3.1-derived audio (crossfade starts at 146s)
  new  225-800s = pure new material (crossfade ends at 180s; margin added)
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path('/home/hatch/workspace/sound-lab-pr5')
SCENES = ROOT / 'public/assets/audio/scenes'
JOURNEYS = ROOT / 'public/assets/audio/journeys'
AUDIO = ROOT / 'public/assets/audio'

V32 = {'chiang-mai': ('harmony', 'details', 'atmosphere'),
       'bali': ('harmony', 'details', 'atmosphere'),
       'da-lat': ('harmony', 'details', 'atmosphere'),
       'kyoto': ('harmony', 'details', 'atmosphere'),
       'lisbon': ('harmony', 'details', 'atmosphere'),
       'hoi-an': ('harmony', 'details', 'atmosphere')}
V32_LEVELS = [0.78, 0.54, 0.47]
V32_AMBIENCE = {'bali': ('forest.mp3', 0.12), 'chiang-mai': ('cafe.mp3', 0.0)}
V31 = {'chiang-mai': ('score', 'wood', 'air'), 'bali': ('score', 'resonance', 'air')}
V31_LEVELS = [0.85, 0.80, 0.55]
V31_AMBIENCE = {'bali': ('forest.mp3', 0.12), 'chiang-mai': ('cafe.mp3', 0.0)}


def measure(inputs, start=None, dur=None):
    """inputs: list of (path, volume). Returns dict with I/LRA/TP or error.
    start/dur use INPUT seeking (-ss/-t before each -i)."""
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'info']
    for path, vol in inputs:
        if start is not None:
            cmd += ['-ss', str(start)]
        if dur is not None:
            cmd += ['-t', str(dur)]
        cmd += ['-i', str(path)]
    filt = ''.join(f'[{i}:a]volume={vol}[a{i}];' for i, (_, vol) in enumerate(inputs))
    filt += ''.join(f'[a{i}]' for i in range(len(inputs)))
    filt += f'amix=inputs={len(inputs)}:normalize=0[mix];[mix]ebur128=peak=true[out]'
    cmd += ['-filter_complex', filt, '-map', '[out]', '-f', 'null', '-']
    p = subprocess.run(cmd, capture_output=True, text=True)
    out = p.stderr
    m_i = re.search(r'Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS', out)
    m_lra = re.search(r'Loudness range:\s*\n\s*LRA:\s*(-?[\d.]+) LU', out)
    m_tp = re.search(r'True peak:\s*\n\s*Peak:\s*(-?[\d.]+) dBFS', out)
    if not m_i:
        return {'error': (out[-300:] if out else 'no output') + f' rc={p.returncode}'}
    return {'I': float(m_i.group(1)),
            'LRA': float(m_lra.group(1)) if m_lra else None,
            'TP': float(m_tp.group(1)) if m_tp else None}


def show(label, d):
    if 'error' in d:
        print(f'{label:46s} ERROR {d["error"][:150]}')
        return
    print(f'{label:46s} I {d["I"]:7.2f} LUFS  TP {d["TP"]:6.2f} dBTP  LRA {d["LRA"]:5.1f}')


def main():
    scenes = sys.argv[1:] or list(V32)
    for slug in scenes:
        files = [(JOURNEYS / f'{slug}-{stem}.mp3', lv) for stem, lv in zip(V32[slug], V32_LEVELS)]
        if slug in V32_AMBIENCE and V32_AMBIENCE[slug][1] > 0:
            files.append((AUDIO / V32_AMBIENCE[slug][0], V32_AMBIENCE[slug][1]))
        if all(p.exists() for p, _ in files):
            show(f'V3.2 {slug} mix (default levels)', measure(files))
            if slug in ('chiang-mai', 'bali', 'da-lat'):
                show(f'V3.2 {slug} mix 0-146s (V3.1 head)', measure(files, 0, 146))
                show(f'V3.2 {slug} mix 225-800s (new part)', measure(files, 225, 575))
        else:
            print(f'V3.2 {slug}: stems not rendered yet, skipping')
        if slug in V31:
            files31 = [(SCENES / f'{slug}-{stem}.mp3', lv) for stem, lv in zip(V31[slug], V31_LEVELS)]
            if slug in V31_AMBIENCE and V31_AMBIENCE[slug][1] > 0:
                files31.append((AUDIO / V31_AMBIENCE[slug][0], V31_AMBIENCE[slug][1]))
            show(f'V3.1 {slug} mix (default levels)', measure(files31))
            for stem in V31[slug]:
                show(f'V3.1 {slug} stem {stem}', measure([(SCENES / f'{slug}-{stem}.mp3', 1.0)]))
        for stem in V32[slug]:
            p = JOURNEYS / f'{slug}-{stem}.mp3'
            if p.exists():
                show(f'V3.2 {slug} stem {stem}', measure([(p, 1.0)]))


if __name__ == '__main__':
    main()
