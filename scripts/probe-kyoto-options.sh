#!/usr/bin/env bash
set -euo pipefail
mkdir -p preview-kyoto
probe() {
  local id="$1" link="$2"
  printf '%s,%s\n' "$id" "$link" >> preview-kyoto/sources.csv
  echo "PROBE $id $link"
  if ! curl --fail -L -sS --retry 2 --connect-timeout 20 --max-time 240 --user-agent 'Mozilla/5.0' "$link" -o "preview-kyoto/$id.source"; then
    echo "DOWNLOAD FAILED: $id" >> preview-kyoto/probe.log
    return
  fi
  ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -select_streams v:0 -of json "preview-kyoto/$id.source" | tee "preview-kyoto/$id.json"
  local duration
  duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "preview-kyoto/$id.source")
  for t in 1 6 15 28; do
    # A timestamp beyond media length would result in empty image; acceptable
    ffmpeg -hide_banner -loglevel error -nostdin -y -ss "$t" -i "preview-kyoto/$id.source" -frames:v 1 -vf "scale=800:-2" -q:v 3 "preview-kyoto/$id-$t.jpg" || true
  done
  # Quantitative estimate to distinguish moving water from an actual camera move is NOT implied.
  echo "$id duration=$duration" >> preview-kyoto/probe.log
}
probe waterfall-kyoto https://www.pexels.com/download/video/17982744/
probe fountain-kyoto https://www.pexels.com/download/video/32272459/
probe golden-temple-kyoto https://www.pexels.com/download/video/17055658/
echo "KYOTO PROBE DONE"
