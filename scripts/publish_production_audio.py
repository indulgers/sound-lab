#!/usr/bin/env python3
"""Explicit handoff gate for professionally produced/cleared Sound Cocktail stems.

Inputs are zero-aligned 48kHz stereo WAVs: harmony.wav, details.wav,
atmosphere.wav in an artist-provided session. This tool does NOT generate music
or pretend a synthetic tone is a professionally recorded instrument.

Usage: python scripts/publish_production_audio.py --session /path/to/brief.json \
       --stems /path/to/exported/wavs --out /path/to/release --confirm
"""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

STEMS = ('harmony', 'details', 'atmosphere')
REQUIRED = ('journeyId', 'artist', 'rightsHolder', 'licenceEvidence',
            'commercialUsePermitted', 'musicBriefVersion', 'version')


def probe(path: Path):
    r = subprocess.run(['ffprobe','-v','error','-show_entries',
       'format=duration:stream=codec_name,sample_rate,channels,bits_per_raw_sample',
       '-of','json',str(path)],capture_output=True,text=True,check=True)
    obj=json.loads(r.stdout)
    assert len(obj.get('streams',[]))==1, f'{path} must contain one audio stream'
    return float(obj['format']['duration']), obj['streams'][0]


def validate(brief: dict, stems_dir: Path):
    for key in REQUIRED:
        if key not in brief or brief[key] in ('',None):
            raise ValueError(f'Production metadata missing {key}')
    if brief['commercialUsePermitted'] is not True:
        raise ValueError('Audio not cleared for commercial use')
    evidence = Path(brief['licenceEvidence'])
    if not evidence.is_file() or evidence.stat().st_size < 30:
        raise ValueError('Licence evidence file missing or empty')
    sources={}
    for name in STEMS:
        p=stems_dir/f'{name}.wav'
        if not p.is_file(): raise ValueError(f'Missing stem {p}')
        seconds, metadata=probe(p)
        if seconds < 890: raise ValueError(f'{p} too short for 15-minute session: {seconds}s')
        if metadata['codec_name'] not in ('pcm_s24le','pcm_s32le','pcm_f32le'):
            raise ValueError(f'{p} must be 24-bit or 32-bit PCM WAV')
        if int(metadata['sample_rate'])!=48000 or int(metadata['channels'])!=2:
            raise ValueError(f'{p} must be stereo 48kHz WAV')
        sources[name]={'wav':str(p),'seconds':seconds}
    duration=[v['seconds'] for v in sources.values()]
    if max(duration)-min(duration) > .02:
        raise ValueError(f'Stem timing does not align: {duration}')
    return sources


def publish(brief, stems_dir, destination, confirmed=False):
    sources=validate(brief, stems_dir)
    if not confirmed:
        return {'status':'validated-only','journeyId':brief['journeyId'], 'duration':next(iter(sources.values()))['seconds'], 'rightsHolder':brief['rightsHolder']}
    destination.mkdir(parents=True,exist_ok=True)
    files={}
    for name in STEMS:
        source=Path(sources[name]['wav']); target=destination/f'{brief["journeyId"]}-{name}.mp3'
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(source),
            '-codec:a','libmp3lame','-b:a','128k','-ar','48000',str(target)],check=True)
        files[name]={'url':target.name,'bytes':target.stat().st_size,
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    result={'status':'ready-for-review','journeyId':brief['journeyId'],
      'version':brief['version'],'artist':brief['artist'], 'rightsHolder':brief['rightsHolder'],
      'licenceEvidence':str(Path(brief['licenceEvidence']).resolve()),
      'commercialUsePermitted':True,'briefVersion':brief['musicBriefVersion'],
      'durationSeconds':next(iter(sources.values()))['seconds'], 'stems':files,
      'limitations':'Technical metadata only; no listening, iOS, true-peak or medical effect claims.'}
    (destination/f'{brief["journeyId"]}-release.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--session',type=Path,required=True)
    parser.add_argument('--stems',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--confirm',action='store_true',help='Encode outputs after validating rights')
    args=parser.parse_args(); brief=json.loads(args.session.read_text())
    print(json.dumps(publish(brief,args.stems,args.out,args.confirm),ensure_ascii=False,indent=2))

if __name__=='__main__': main()