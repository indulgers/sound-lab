#!/usr/bin/env bash
# Make auditable, level-matched listening excerpts from the *same stems* used
# by the web app. They are editorial previews, not separate compositions.
set -euo pipefail
mkdir -p preview-qa/listening
root=public/assets/audio/journeys

render() {
  local slug="$1" start="$2" duration="$3" label="$4" harmony="$5" details="$6" air="$7"
  local stem="$root/$slug"
  for lane in harmony details atmosphere; do test -s "$stem-$lane.mp3"; done
  ffmpeg -hide_banner -loglevel error -nostdin -y \
    -ss "$start" -i "$stem-harmony.mp3" \
    -ss "$start" -i "$stem-details.mp3" \
    -ss "$start" -i "$stem-atmosphere.mp3" \
    -filter_complex "[0:a]volume=$harmony[h];[1:a]volume=$details[d];[2:a]volume=$air[a];[h][d][a]amix=inputs=3:duration=shortest:normalize=0,loudnorm=I=-24:TP=-3.0:LRA=8[out]" \
    -map "[out]" -t "$duration" -ac 2 -c:a libmp3lame -b:a 112k "preview-qa/listening/$label.mp3"
}

# The café voice track is intentionally not included in these focus previews.
render chiang-mai 0 75 chiang-mai-quiet-opening 0.78 0.40 0.54
render chiang-mai 240 75 chiang-mai-unobtrusive-middle 0.78 0.40 0.54
render chiang-mai 720 65 chiang-mai-soft-return 0.78 0.40 0.54
render bali 260 65 bali-spatial-bowl 0.74 0.67 0.44
render da-lat 250 65 da-lat-morning-pages 0.76 0.40 0.47

cat > preview-qa/listening/README.txt <<'END'
Sound Cocktail - editorial blind-listening clips
These excerpts were derived from the same procedural 15-minute stereo stems as
the PR 5 review app, volume-normalized to -24 LUFS target and -3 dBTP ceiling.
They omit UI reverb, EQ, dynamic activity gating and separately licensed ambience,
so they are a dry reference, NOT a bit-identical recording of the web player.
Chiang Mai clips intentionally contain ZERO café conversation track.
Timings: 0-75s / 240-315s / 720-785s of the 15m composition.
Compare headphones and speaker playback at matched actual volume.
No clinical effects or authentic local recordings are claimed.
END
test "$(find preview-qa/listening -name '*.mp3' | wc -l)" -eq 5
echo 'PASS five normalized, conversation-free editorial listening clips'
