#!/usr/bin/env python3
"""Build *unpublished QA candidates* from approved AI video source clips.

This script intentionally DOES NOT overwrite public/assets/scenes/{scene}-travel.*
or alter the active Scene catalog. AI footage must be visually inspected before
promotion. Produces separate desktop and mobile composites with proper credits.

Run:
 python scripts/build-ai-film-pilot.py --scene bali
 python scripts/build-ai-film-pilot.py --scene chiang-mai --orientation mobile

Source:
 private/ai-film-inputs/bali/bali-hero-1920x1080.mp4
 private/ai-film-inputs/bali/bali-detail-1920x1080.mp4
 ... portrait files end with -1080x1920.mp4
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / 'private' / 'ai-film-inputs'
OUTPUT = ROOT / 'public' / 'assets' / 'scenes' / 'ai-pilot'

SCENES = {'bali', 'chiang-mai'}
PRESETS = {
    'desktop': dict(raw='1920x1080', width=1920, height=1080, bitrate='6500k', bufsize='13000k', label='desktop'),
    'mobile': dict(raw='1080x1920', width=1080, height=1920, bitrate='5200k', bufsize='10400k', label='mobile'),
}
OVERLAP = 1.25

def run(cmd):
    return subprocess.run(cmd,check=True,capture_output=True,text=True)

def probe(path):
    info=json.loads(run(['ffprobe','-v','error','-show_entries',
        'stream=codec_type,codec_name,width,height,avg_frame_rate:format=duration,size',
        '-of','json',str(path)]).stdout)
    vids=[s for s in info.get('streams',[]) if s.get('codec_type')=='video']
    if len(vids)!=1: raise ValueError(f'Expected exactly one video: {path}')
    duration=float(info['format']['duration'])
    if duration<5.0: raise ValueError(f'Too short: {path} {duration}s')
    if min(vids[0]['width'],vids[0]['height']) < 720:
        raise ValueError(f'Source has too few pixels: {path} {vids[0]}')
    return vids[0],duration

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def process(scene, orientation):
    p=PRESETS[orientation]
    first = RAW / scene / f'{scene}-hero-{p["raw"]}.mp4'
    second = RAW / scene / f'{scene}-detail-{p["raw"]}.mp4'
    for item in (first,second):
        if not item.exists(): raise FileNotFoundError(
            f'Missing generated AI video: {item}. Use scripts/generate-ai-film.mjs to create it first.')
    a, da=probe(first); b, db=probe(second)
    # Prefer independently generated aspect ratios, not a 16:9 centre crop
    # masquerading as a portrait composition.
    for label, source in (('hero',a),('detail',b)):
        ratio=source['width']/source['height']
        if orientation=='desktop' and ratio<1.3: raise ValueError(label+' is not a landscape source')
        if orientation=='mobile' and ratio>0.8: raise ValueError(label+' is not a portrait source')
    OUTPUT.mkdir(parents=True,exist_ok=True)
    suffix='' if orientation=='desktop' else '-mobile'
    out=OUTPUT/f'{scene}-ai-travel{suffix}.mp4'
    poster=OUTPUT/f'{scene}-ai-travel{suffix}.jpg'
    width,height=p['width'],p['height']
    # Keep real motion from the model; no CSS Ken Burns, frame reversal or
    # artificial pan. Video has no audio; Web Audio owns the listening mix.
    vf=(f'fps=24,scale={width}:{height}:force_original_aspect_ratio=increase:flags=lanczos,'
        f'crop={width}:{height},setsar=1,eq=contrast=1.015:saturation=0.98,format=yuv420p')
    first_length=round(min(da,10),3)
    second_length=round(min(db,10),3)
    overlap=min(OVERLAP,first_length/4,second_length/4)
    offset=round(first_length-overlap,3)
    graph=(f'[0:v]{vf},trim=duration={first_length},setpts=PTS-STARTPTS[a];'
        f'[1:v]{vf},trim=duration={second_length},setpts=PTS-STARTPTS[b];'
        f'[a][b]xfade=transition=fade:duration={overlap}:offset={offset}[out]')
    run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
        '-i',str(first),'-i',str(second),'-filter_complex',graph,
        '-map','[out]','-an','-pix_fmt','yuv420p',
        '-c:v','libx264','-preset','slow','-crf','19',
        '-maxrate',p['bitrate'],'-bufsize',p['bufsize'],
        '-movflags','+faststart',str(out)])
    info, duration=probe(out)
    if (info['width'],info['height'])!=(width,height): raise ValueError('Encoder output size mismatch')
    if abs(duration-(first_length+second_length-overlap))>1.5:
        raise ValueError('Unexpected composite duration')
    if out.stat().st_size>32_000_000:
        raise ValueError('Candidate too large for review (32 MB limit); reduce rate or length.')
    run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
        '-ss','2','-i',str(out),'-frames:v','1','-q:v','2',str(poster)])
    meta={
        'status':'QA_CANDIDATE_NOT_PUBLISHED',
        'sceneId':scene,
        'assetType':'AI-generated video; place-inspired fictional set, NOT real location footage',
        'orientation':orientation,'dimensions':[width,height],
        'durationSeconds':round(duration,2),'fps':24,'codec':'h264',
        'originalInput':[str(first.relative_to(ROOT)),str(second.relative_to(ROOT))],
        'sha256':sha(out),'sizeBytes':out.stat().st_size,
        'poster':poster.name,'posterSha256':sha(poster),
        'requiresHumanApproval':True,
        'mustNotClaim':'Recorded at Bali or Chiang Mai, or any named real venue',
    }
    (OUTPUT/f'{scene}-ai-travel{suffix}.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    print(f'PASS AI candidate {scene} {orientation}: {width}x{height} {duration:.1f}s {out.stat().st_size/1e6:.2f}MB')
    print(f'NOT PUBLISHED: {out}; human visual QA and truthful attribution required.')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--scene',choices=sorted(SCENES),required=True)
    parser.add_argument('--orientation',choices=['desktop','mobile','both'],default='both')
    args=parser.parse_args()
    for orientation in (PRESETS if args.orientation=='both' else [args.orientation]):
        process(args.scene,orientation)

if __name__=='__main__':
    main()
