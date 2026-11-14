#!/usr/bin/env python3
"""CI gate for six 15-minute streamable stem groups (not a clinical claim)."""
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / 'public' / 'assets' / 'audio' / 'journeys'
MANIFEST = ASSET_DIR / 'manifest.json'
EXPECTED = {'chiang-mai', 'bali', 'da-lat', 'kyoto', 'lisbon', 'hoi-an'}
STEMS = {'harmony', 'details', 'atmosphere'}


def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration:stream=sample_rate,channels,codec_name', '-of', 'json', str(path)],
        capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    streams = [s for s in data.get('streams', []) if s.get('codec_name')]
    assert len(streams) == 1, f'{path}: expected one audio stream'
    return float(data['format']['duration']), streams[0]


def main():
    data = json.loads(MANIFEST.read_text())
    assert set(data['scenes']) == EXPECTED, f'Wrong scenes: {set(data["scenes"])}'
    assert data['priceGateEnabled'] is False
    result = {'version': data['version'], 'scenes': {}, 'checks': []}
    for slug, scene in data['scenes'].items():
        assert scene['durationSeconds'] == 900
        assert set(scene['stems']) == STEMS
        durations = []
        for stem, filename in scene['stems'].items():
            path = ASSET_DIR / filename
            assert path.is_file() and path.stat().st_size > 300_000, f'Missing/tiny: {path}'
            seconds, stream = probe(path)
            assert abs(seconds - 900) < 1, (path, seconds)
            assert stream['codec_name'] == 'mp3', (path, stream)
            assert int(stream['channels']) == 2
            durations.append(seconds)
        assert max(durations) - min(durations) < .12, (slug, durations)
        assert math.isfinite(scene['peakDbFS']) and scene['peakDbFS'] < -1.0, slug
        result['scenes'][slug] = {'durations': durations, 'peakDbFS': scene['peakDbFS'],
                                  'bytes': sum((ASSET_DIR / x).stat().st_size for x in scene['stems'].values())}
    result['checks'] = ['six scene groups', 'three independently encoded stereo stems per scene',
                        'near 900-second aligned durations', 'file sizes', 'peak below 0 dBFS by render report']
    out = ROOT / 'journey-audio-qa.json'; out.write_text(json.dumps(result, indent=2))
    print('PASS six 15-minute streamed journey groups', ' '.join(result['scenes']))


if __name__ == '__main__':
    main()