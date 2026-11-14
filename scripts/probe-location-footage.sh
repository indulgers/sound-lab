#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/soundcocktail-footage
probe() {
  local name="$1" url="$2"
  echo "::group::PROBE $name"
  printf 'Source: %s\n' "$url"
  local filepath="/tmp/soundcocktail-footage/$name.source"
  if curl --fail --location --silent --show-error --retry 2 --connect-timeout 20 --max-time 160 \
    --user-agent 'Mozilla/5.0 SoundCocktailPreview/0.1 rights-cleared-asset-test' \
    "$url" --output "$filepath"; then
    file "$filepath"
    du -h "$filepath"
    ffprobe -v error -select_streams v:0 \
      -show_entries stream=codec_name,width,height,r_frame_rate \
      -show_entries format=duration,size -of json "$filepath"
    ffmpeg -hide_banner -loglevel error -y -ss 2 -i "$filepath" -frames:v 1 -vf 'scale=960:-2' "/tmp/soundcocktail-footage/$name.jpg"
  else
    echo "DOWNLOAD_FAILED:$name"
  fi
  echo "::endgroup::"
}
probe 'kyoto' 'https://www.pexels.com/download/video/11834439/'
probe 'lisbon' 'https://www.pexels.com/download/video/27404886/'
probe 'chiang-mai' 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3d/Drone_footage_of_temple_in_Chiang_Mai%2C_Thailand.webm/Drone_footage_of_temple_in_Chiang_Mai%2C_Thailand.webm.720p.vp9.webm'

probe 'kyoto-zen-garden' 'https://www.pexels.com/download/video/32309074/'
probe 'kyoto-arashiyama-waterfall' 'https://www.pexels.com/download/video/17982744/'
for name in kyoto-zen-garden kyoto-arashiyama-waterfall; do
  for second in 12 22; do
    ffmpeg -hide_banner -loglevel error -nostdin -y -ss "$second" \
      -i "/tmp/soundcocktail-footage/$name.source" -frames:v 1 -vf 'scale=960:-2' \
      "/tmp/soundcocktail-footage/$name-$second.jpg"
  done
done
