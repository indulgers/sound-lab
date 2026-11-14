# Moving travel footage — source and rights inventory

The live PR #5 Journey experience now uses **actual video files from six destination-described locations**, NOT AI-generated geography, stock footage of unrelated towns, or animated still pictures. A moving video has its own desktop 16:9 and phone 9:16 encode, a still frame extracted from that video for reduced-motion / loading fallback, and a source reference. The long 15-minute audio programme is independent and these shorter travel clips repeat.

## Six film sources in the review experience

| Place | Source / creator | Source of location identification | License |
|---|---|---|---|
| Chiang Mai · Royal Park Rajapruek, Ho Kham Luang pavilion | [Free Stock Vids / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Drone_footage_of_temple_in_Chiang_Mai,_Thailand.webm) | Distinct landmark and video title identify Chiang Mai. **This is aerial garden footage, not a café interior.** | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| Bali · rice terraces | [Florian Delée / Pexels](https://www.pexels.com/video/stunning-aerial-view-of-balinese-rice-terraces-36492277/) | Source author names Bali; precise coordinates not independently GPS-verified | [Pexels](https://www.pexels.com/license/) |
| Da Lat · pine forest | [Hữu Thịnh 79 / Pexels](https://www.pexels.com/video/4k-aerial-view-of-pine-forest-in-vietnam-31597905/) | Source description names Da Lat; GPS not independently verified | Pexels |
| Kyoto · shrine grounds | [Sezaki Hiroyuki / Pexels](https://www.pexels.com/video/shrine-in-kyoto-11834439/) | Source author names Kyoto; exact shrine not independently identified | Pexels |
| Lisbon · aerial rooftops | [Aaron Hairston / Pexels](https://www.pexels.com/video/lisbon-aerial-19909760/) | Source author names Lisbon; GPS not independently verified | Pexels |
| Hoi An · lantern-lit river | [Khanh Hoang Minh / Pexels](https://www.pexels.com/video/nightlife-on-lantern-lit-river-in-hoi-an-37510579/) | Source author names Hoi An; GPS not independently verified | Pexels |

This product's custom score is **place-inspired original procedural music**; the new video licence does not make its music an actual field recording. For Chiang Mai, Café Flow describes the *music's inspiration*, not a false claim that a real café is shown. For Kyoto, Still Water is the *music*, not a claim that the visual shows a rainy tea room.

## Attribution and derivative notices

For the Wikimedia Commons Chiang Mai source, retain credit to **Free Stock Vids**, the original file page, a link to [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/), and clearly state the video was **cropped, color-graded, converted to silent MP4, and loop-blended**. Pexels allows commercial use of video as part of a larger designed product under the Pexels License; it forbids redistribution as unchanged stock/wallpaper or any suggestion of endorsement.

Source metadata for all six appears in `credits.json` (static authored catalogue) and the generated `real-travel-films.json` (runtime SHA hashes, actual video durations, dimensions, cameras and licenses). The UI credits each individual moving film through the `About this place` sheet and unobtrusive on-screen author link.

## Asset generation — no huge uncompressed original videos in Git

`scripts/build-travel-films.py` downloads the source, verifies it, exports **H.264 silent** desktop/phone variants and matching posters from the exact same source. For each scene:
- `<slug>-travel.mp4` 1280 × 720
- `<slug>-travel-mobile.mp4` 540 × 960
- `<slug>-travel.jpg` and `<slug>-travel-mobile.jpg` — extracted poster
- output provenance, duration, SHA256 in `real-travel-films.json`

The PR review workflow caches validated outputs and publishes them with the app, so users are not downloading hundreds of MB of original 4K footage. `scripts/validate-travel-films.py` fails the preview build if any source or derivative is missing, mismatched, oversize or contains an audio track. Two films may share visual styles but not a fake geographical label.

## Archived / no longer active

- Old `chiang-mai-cafe.mp4` was **filmed in Yangshuo, China**, not Chiang Mai. It is retained as an **archived stock asset only** in the PR while the migration is tested. No active `SCENES` entry or preview page references it.
- Old `bali-rainforest.mp4` is a real Pexels forest clip but its filming location could not be verified as Bali; also archived and no longer used.
- Four previous `*-concept.svg` files were **original illustrations**, not documentary footage. They are retained as historical design references but are no longer the active moving scene source.

The cinematic scene overhaul is documented in `docs/journey-visual-design.md`. Source pages establish a stronger provenance than generic travel tags, but **not a proof of camera GPS for every clip**. For eventual professional product, commission properly licensed multi-shot location videos and record permits, shot lists and co-ordinates.
