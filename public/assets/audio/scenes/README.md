# Sound Cocktail V3.1 scene music

These six MP3 files are copied unchanged from the project's earlier
`Sound-Cocktail-v3.1-World-Atlas` listening experiment. `manifest.json` records
their SHA-256 hashes. They decode to 180 seconds, 32 kHz stereo; the additional
MP3 container duration is encoder information.

## What the layers contain

- **Bali score:** the previous project-generated singing bowls and sustained
  harmony, with the V3.1 filtering and simulated room treatment retained.
- **Bali resonance:** sparse additional synthesized responses.
- **Chiang Mai score:** the previous project-generated warm keys, harmony and
  gentle rhythm, with the V3.1 treatment retained.
- **Chiang Mai wood:** sparse synthesized wooden/plucked tones added in V3.1.
- **Air:** an algorithmically generated texture for each scene.

These are original programmatic arrangements created for Sound Cocktail. The
V3.1 authoring README and `scripts/audio_render.py` state that the score stems
derive from the project's earlier Work-generated music and do not incorporate
third-party commercial tracks or excerpts from the reference recordings. They
are not authentic local field recordings, live instrument recordings, or
clinically validated music therapy. No new third-party sample license is
introduced by these six files. The existing optional forest/café ambience files
retain the separate authors and licenses in `src/audio/catalog.mjs`.

## Playback

Play each scene's three stems together; do not also play its pre-mixed export.
The new player uses one audio clock, retains the full opening on first play,
crossfades the final 12 decoded seconds with the opening in memory, and then
loops from 12 to 180 seconds using native Web Audio scheduling. The stored MP3s
remain untouched. Continuous playback repeats this existing composition; it is
not a newly authored long-form chapter sequence. The video has no audio and
does not control the music transport.

The initial UI mix is intentionally restrained (music 0.85, additional texture
0.80, air 0.55, optional ambience 0.12, master 0.70). V3.1's warmth/space settings
are retained: Bali 0.46/0.37, Chiang Mai 0.55/0.28.
