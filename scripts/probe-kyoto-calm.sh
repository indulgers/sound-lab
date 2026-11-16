#!/usr/bin/env bash
set -euo pipefail
mkdir -p preview-qa/kyoto-candidates
for spec in 'garden:32309074' 'fountain:32272459' 'pavilion:17055658'; do
  name="${spec%%:*}"
  id="${spec##*:}"
  echo "PROBE_KYOTO:${name} id=${id}"
  curl -fL --retry 2 --connect-timeout 20 --max-time 200     "https://www.pexels.com/download/video/${id}/" -o "/tmp/${name}.mp4"
  ffprobe -hide_banner -v error -show_entries stream=codec_name,width,height -show_entries format=duration -of json "/tmp/${name}.mp4"
  for sec in 2 10 22; do
    ffmpeg -hide_banner -loglevel error -y -ss "$sec" -i "/tmp/${name}.mp4" -frames:v 1       -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360"       "preview-qa/kyoto-candidates/${name}-landscape-${sec}.jpg" || true
  done
  for sec in 2 10 22; do
    ffmpeg -hide_banner -loglevel error -y -ss "$sec" -i "/tmp/${name}.mp4" -frames:v 1       -vf "scale=300:533:force_original_aspect_ratio=increase,crop=300:533"       "preview-qa/kyoto-candidates/${name}-mobile-${sec}.jpg" || true
  done
done
