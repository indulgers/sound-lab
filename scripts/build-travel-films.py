#!/usr/bin/env python3
"""Licensed, place-specific motion films for the six Sound Journey destinations.

Run on CI with ffmpeg + curl. The film bytes are built artifacts, NOT Git source.
Every shot is source-attributed and derived from footage whose publisher describes
that actual destination. The script does not claim GPS or independent camera proof.
"""
from __future__ import annotations
import hashlib
import json
import math
import os
import pathlib
import subprocess
import tempfile
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "scenes"
FILMS = {
 "chiang-mai": {
   "url": "https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3d/Drone_footage_of_temple_in_Chiang_Mai%2C_Thailand.webm/Drone_footage_of_temple_in_Chiang_Mai%2C_Thailand.webm.720p.vp9.webm",
   "sourcePage": "https://commons.wikimedia.org/wiki/File:Drone_footage_of_temple_in_Chiang_Mai,_Thailand.webm",
   "creator": "Free Stock Vids", "license": "CC BY 3.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
   "sourceDescription": "Drone footage of a Lanna-style pavilion in Chiang Mai, Thailand; original 2018 Commons footage",
   "placeEvidence": "Publisher names Chiang Mai; recognizable Ho Kham Luang pavilion in Royal Park Rajapruek, Chiang Mai.",
   "travelView": "Royal Park Rajapruek aerial flyover; NOT a café interior",
   "duration": 48, "start": 3.0, "saturation": .83, "exposure": -.035, "position": .50,
 },
 "bali": {
   "url": "https://www.pexels.com/download/video/36492277/",
   "sourcePage": "https://www.pexels.com/video/stunning-aerial-view-of-balinese-rice-terraces-36492277/",
   "creator": "Florian Delée", "license": "Pexels License",
   "licenseUrl": "https://www.pexels.com/license/",
   "sourceDescription": "Drone footage of Balinese rice terraces and traditional landscape",
   "placeEvidence": "Pexels publisher describes the location as Bali; precise village/coordinates unverified.",
   "travelView": "Bali rice terrace aerial travel", "duration": 20, "start": .2,
   "saturation": .83, "exposure": -.05, "position": .50,
 },
 "da-lat": {
   "url": "https://www.pexels.com/download/video/31597905/",
   "sourcePage": "https://www.pexels.com/video/4k-aerial-view-of-pine-forest-in-vietnam-31597905/",
   "creator": "Hữu Thịnh 79", "license": "Pexels License",
   "licenseUrl": "https://www.pexels.com/license/",
   "sourceDescription": "Drone footage of pine forest in Da Lat, Vietnam",
   "placeEvidence": "Videographer's Pexels description names Da Lat; precise coordinates unverified.",
   "travelView": "Da Lat pine-forest drone flight", "duration": 19, "start": .2,
   "saturation": .78, "exposure": -.02, "position": .50,
 },
 "kyoto": {
   "url": "https://www.pexels.com/download/video/32309074/",
   "sourcePage": "https://www.pexels.com/video/tranquil-japanese-garden-in-kyoto-32309074/",
   "creator": "Brian Zhang", "license": "Pexels License",
   "licenseUrl": "https://www.pexels.com/license/",
   "sourceDescription": "Source-described Kyoto garden with moss, rock formations and natural moving water",
   "placeEvidence": "Three Kyoto-labelled Pexels sources (Kinkaku-ji arrival, moss garden, bamboo fountain); no independent GPS metadata verification.",
   "travelView": "Kinkaku-ji arrival pan, then quiet Kyoto garden-to-bamboo-fountain film sequence; gentle real camera movement and water, no crowds or signs",
   "duration": 84.0, "start": 1, "saturation": .78, "exposure": -.026, "position": .52,
   "posterAt": 20.0,
   "arrivalUrl": "https://www.pexels.com/download/video/37901319/",
   "arrivalSourcePage": "https://www.pexels.com/video/stunning-view-of-kinkaku-ji-temple-in-kyoto-37901319/",
   "arrivalCreator": "Stephan Leuzinger",
   "arrivalSourceDescription": "Slow panoramic reveal of Kinkaku-ji (Golden Pavilion) across Mirror Pond, Kyoto",
   "arrivalDuration": 13.0,
   "secondUrl": "https://www.pexels.com/download/video/32272459/",
   "secondSourcePage": "https://www.pexels.com/video/tranquil-kyoto-temple-bamboo-fountain-32272459/",
   "secondSourceDescription": "Brian Zhang: bamboo water fountain in a lush Kyoto temple garden",
   "secondCreator": "Brian Zhang"
 },
 "lisbon": {
   "url": "https://www.pexels.com/download/video/19909760/",
   "sourcePage": "https://www.pexels.com/video/lisbon-aerial-19909760/",
   "creator": "Aaron Hairston", "license": "Pexels License",
   "licenseUrl": "https://www.pexels.com/license/",
   "sourceDescription": "Drone footage of Lisbon's colorful rooftops at sunset",
   "placeEvidence": "Pexels publisher identifies Lisbon, Portugal; location not camera-GPS validated.",
   "travelView": "Golden-hour aerial movement above Lisbon", "duration": 22, "start": .2,
   "saturation": .84, "exposure": -.025, "position": .50,
 },
 "hoi-an": {
   "url": "https://www.pexels.com/download/video/37510579/",
   "sourcePage": "https://www.pexels.com/video/nightlife-on-lantern-lit-river-in-hoi-an-37510579/",
   "creator": "Khanh Hoang Minh", "license": "Pexels License",
   "licenseUrl": "https://www.pexels.com/license/",
   "sourceDescription": "Moving footage of lantern-lit boats on Hoi An river at night",
   "placeEvidence": "Vietnamese contributor's Pexels source describes Hoi An; coordinates not independently checked.",
   "travelView": "Evening lantern river scene in Hoi An", "duration": 48, "start": 2,
   "saturation": .75, "exposure": -.015, "position": .50,
 },
}
CREDIT_FIELDS = ("sourcePage", "creator", "license", "licenseUrl", "sourceDescription", "placeEvidence", "travelView")

def run(args):
    subprocess.run(args, check=True)

def probe(path):
    p=subprocess.check_output([
        "ffprobe","-v","error","-show_entries",
        "stream=width,height,codec_name:format=duration","-select_streams","v:0",
        "-of","json",str(path)
    ],text=True)
    doc=json.loads(p)
    if not doc.get("streams"): raise ValueError("Missing video track")
    stream=doc["streams"][0]
    duration=float(doc["format"]["duration"])
    if min(stream["width"], stream["height"]) < 540 or max(stream["width"], stream["height"]) < 960 or duration < 10:
        raise ValueError(f"Invalid video: {stream}, duration={duration}")
    return duration,stream

def export_frame(src, target, at):
    run(["ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
         "-ss",str(at),"-i",str(src),"-frames:v","1",
         "-vf","scale=960:-2","-q:v","3",str(target)])

def render(src, target, start, duration, width, height, saturation, exposure):
    # Cinematic color continuity without erasing the authentic picture. 24fps
    # with a small crossfade from tail to head for a soft visual return.
    flt=(f"fps=24,scale={width}:{height}:force_original_aspect_ratio=increase,"
         f"crop={width}:{height},eq=saturation={saturation}:brightness={exposure},"
         "format=yuv420p")
    overlap=1.35
    # Replay of the first seconds occurs at the end only; no reversed travel.
    graph=(f"[0:v]{flt},split=2[body_in][start_in];"
           f"[body_in]trim=duration={duration},setpts=PTS-STARTPTS[body];"
           f"[start_in]trim=duration={overlap},setpts=PTS-STARTPTS[head];"
           f"[body][head]xfade=transition=fade:duration={overlap}:offset={duration-overlap}[out]")
    run(["ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
         "-ss",str(start),"-i",str(src),"-filter_complex",graph,
         "-map","[out]","-an","-pix_fmt","yuv420p",
         "-c:v","libx264","-preset","veryfast","-crf","24",
         "-maxrate","2500k" if width >= 1000 else "1000k",
         "-bufsize","5000k" if width >= 1000 else "2000k",
         "-movflags","+faststart",str(target)])
    actual,stream=probe(target)
    if abs(actual-duration) > 1.5: raise ValueError(f"Unexpected output duration {actual} expected {duration}")
    if stream["width"] != width or stream["height"] != height:
        raise ValueError(f"Invalid output size {stream}")
    if target.stat().st_size > 16_000_000:
        raise ValueError(f"Video exceeds 16 MB per variant: {target.name}")

def render_kyoto_trio(arrival, first, second, target, width, height, saturation, exposure):
    """Three-part Kyoto sequence: arrival -> calm garden -> fountain.

    Arrival: 13s slow pan across Kinkaku-ji Mirror Pond (Stephan Leuzinger).
    Garden: 52s moss-garden flowing water; fountain: 22s bamboo fountain
    (both Brian Zhang). 1.5s dissolves between parts plus a subtle
    end-to-head dissolve for the loop. The arrival is a slow pan, NOT a
    walking/dolly travelling shot; the UI labels it as such.
    """
    overlap=1.5
    a_len,b_len,c_len=13.0,52.0,22.0
    ab_len=a_len+b_len-overlap
    duration=ab_len+c_len-overlap
    f=(f"fps=24,scale={width}:{height}:force_original_aspect_ratio=increase,"
       f"crop={width}:{height},eq=saturation={saturation}:brightness={exposure},format=yuv420p")
    graph=(f"[0:v]{f},trim=start=1:duration={a_len},setpts=PTS-STARTPTS[a];"
           f"[1:v]{f},trim=start=1:duration={b_len},setpts=PTS-STARTPTS[b];"
           f"[2:v]{f},trim=start=1:duration={c_len},setpts=PTS-STARTPTS[c];"
           f"[a][b]xfade=transition=fade:duration={overlap}:offset={a_len-overlap}[ab];"
           f"[ab][c]xfade=transition=fade:duration={overlap}:offset={ab_len-overlap}[travel];"
           f"[travel]split=2[all][loopHead];"
           f"[all]trim=duration={duration},setpts=PTS-STARTPTS[whole];"
           f"[loopHead]trim=duration={overlap},setpts=PTS-STARTPTS[head];"
           f"[whole][head]xfade=transition=fade:duration={overlap}:offset={duration-overlap}[out]")
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
         "-i",str(arrival),"-i",str(first),"-i",str(second),"-filter_complex",graph,
         "-map","[out]","-an","-pix_fmt","yuv420p",
         "-c:v","libx264","-preset","veryfast","-crf","28",
         "-maxrate","1500k" if width>1000 else "700k",
         "-bufsize","3000k" if width>1000 else "1400k",
         "-movflags","+faststart",str(target)]
    run(cmd)
    actual,stream=probe(target)
    if abs(actual-duration)>1.5 or (stream["width"],stream["height"])!=(width,height):
        raise ValueError(f"Invalid Kyoto result: {actual} {stream}")
    if target.stat().st_size>16_000_000:
        raise ValueError(f"Kyoto result too large: {target.stat().st_size}")
    return duration

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    metadata={"version":"1.0-real-motion","checkedOn":str(date.today()),
      "mediaContract":"Location described by named source; exact GPS not guaranteed. No generic or AI-generated geographic substitutes.",
      "licenseNotes":"All footage edited without audio. Pexels License or CC BY 3.0; CC BY attribution shown in UI and manifest.",
      "scenes":{}}
    selected=os.getenv("PLACE_ONLY")
    with tempfile.TemporaryDirectory() as temp:
        root=pathlib.Path(temp)
        for slug,s in FILMS.items():
            if selected and selected!=slug: continue
            print("FILM",slug,s["sourcePage"],flush=True)
            source=root / f"{slug}.source"
            run(["curl","--fail","--location","--silent","--show-error","--retry","2",
                 "--connect-timeout","20","--max-time","240",
                 "--user-agent","Mozilla/5.0 SoundCocktail/0.1 licensed-scene-asset-build",
                 s["url"],"--output",str(source)])
            duration,stream=probe(source)
            requested=s["duration"]
            chosen=min(requested,math.floor((duration-s["start"]-.4)*24)/24)
            if chosen<9.5: raise ValueError(f"Short input for {slug}: {duration}")
            second=None
            arrival=None
            if slug=="kyoto":
                arrival=root/"kyoto-arrival.source"
                run(["curl","--fail","--location","--silent","--show-error","--retry","2",
                    "--connect-timeout","20","--max-time","240",
                    "--user-agent","Mozilla/5.0 SoundCocktail/0.1 licensed-scene-asset-build",
                    s["arrivalUrl"],"--output",str(arrival)])
                arrivalDuration,_=probe(arrival)
                second=root/"kyoto-bamboo.source"
                run(["curl","--fail","--location","--silent","--show-error","--retry","2",
                    "--connect-timeout","20","--max-time","240",
                    "--user-agent","Mozilla/5.0 SoundCocktail/0.1 licensed-scene-asset-build",
                    s["secondUrl"],"--output",str(second)])
                duration2,_=probe(second)
                if arrivalDuration<14 or duration<54 or duration2<24:
                    raise ValueError(f"Kyoto originals too short: arrival={arrivalDuration}, garden={duration}, fountain={duration2}")
                chosen=84.0
            files={}
            for suffix,(w,h) in (("travel",(1280,720)),("travel-mobile",(540,960))):
                dest=OUT / f"{slug}-{suffix}.mp4"
                if slug=="kyoto":
                    render_kyoto_trio(arrival,source,second,dest,w,h,s["saturation"],s["exposure"])
                else:
                    render(source,dest,s["start"],chosen,w,h,s["saturation"],s["exposure"])
                files[dest.name]={"sizeBytes":dest.stat().st_size,"sha256":sha(dest),"dimensions":[w,h]}
            for suffix,videoSuffix in (("travel","travel"),("travel-mobile","travel-mobile")):
                target=OUT / f"{slug}-{suffix}.jpg"
                run(["ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
                     "-ss",str(s.get("posterAt",3.0)),"-i",str(OUT/f"{slug}-{videoSuffix}.mp4"),
                     "-frames:v","1","-q:v","3",str(target)])
                files[target.name]={"sizeBytes":target.stat().st_size,"sha256":sha(target)}
            metadata["scenes"][slug]={key:s[key] for key in CREDIT_FIELDS}
            metadata["scenes"][slug].update({"motionType":"real source footage","durationSeconds":round(chosen,2),
                "sourceDimensions":[stream["width"],stream["height"]],"files":files})
            if slug=="kyoto":
                metadata["scenes"][slug]["additionalSources"]=[
                    {"sourcePage":s["arrivalSourcePage"],"creator":s["arrivalCreator"],
                     "description":s["arrivalSourceDescription"],"license":"Pexels License",
                     "licenseUrl":"https://www.pexels.com/license/","role":"arrival"},
                    {"sourcePage":s["secondSourcePage"],"creator":s["secondCreator"],
                     "description":s["secondSourceDescription"],"license":"Pexels License",
                     "licenseUrl":"https://www.pexels.com/license/","role":"closing"}]
            print(f"PASS FILM {slug}: {chosen:.1f}s; files={sum(v['sizeBytes'] for v in files.values())/1e6:.1f}MB",flush=True)
    (OUT/"real-travel-films.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n")
    print("PASS six destination-specific video sets",flush=True)

if __name__=="__main__":
    main()
