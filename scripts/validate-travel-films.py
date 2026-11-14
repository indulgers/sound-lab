#!/usr/bin/env python3
"""Fail closed if place-backed motion videos are absent, corrupt, silent, or mismatched."""
import hashlib
import json
import pathlib
import subprocess
import sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"public"/"assets"/"scenes"
EXPECTED={"chiang-mai","bali","da-lat","kyoto","lisbon","hoi-an"}

def probe(path):
    report=json.loads(subprocess.check_output(["ffprobe","-v","error",
      "-show_entries","stream=codec_name,codec_type,width,height:format=duration",
      "-of","json",str(path)],text=True))
    vids=[stream for stream in report["streams"] if stream["codec_type"]=="video"]
    audio=[stream for stream in report["streams"] if stream["codec_type"]=="audio"]
    assert len(vids)==1 and not audio,(path.name,"unexpected tracks",report["streams"])
    return vids[0],float(report["format"]["duration"])

def main():
    manifest=OUT/"real-travel-films.json"
    assert manifest.exists(),"No real travel film manifest; cannot publish illustrations under real-video names"
    info=json.loads(manifest.read_text())
    assert set(info["scenes"])==EXPECTED,set(info["scenes"])
    for scene,data in info["scenes"].items():
        assert data["creator"] and data["sourcePage"].startswith("https://")
        assert data["license"] in ("Pexels License","CC BY 3.0")
        assert data["placeEvidence"] and data["travelView"]
        for suffix, expected in (("travel",(1280,720)),("travel-mobile",(540,960))):
            path=OUT/f"{scene}-{suffix}.mp4"
            assert path.exists() and path.stat().st_size > 150000,path
            stream,duration=probe(path)
            assert stream["codec_name"]=="h264" and (stream["width"],stream["height"])==expected,(path,stream)
            assert duration>=9 and abs(duration-data["durationSeconds"])<1.5,(scene,duration)
            assert path.stat().st_size < 16_000_000,(path.name,path.stat().st_size)
            sha=hashlib.sha256(path.read_bytes()).hexdigest()
            assert sha==data["files"][path.name]["sha256"],path
        for suffix in ("travel","travel-mobile"):
            image=OUT/f"{scene}-{suffix}.jpg"
            assert image.exists() and image.stat().st_size > 4000,image
    print("PASS six licensed location-specific motion scenes, 12 silent H.264 variants, source SHA/credits",flush=True)

if __name__=="__main__":main()
