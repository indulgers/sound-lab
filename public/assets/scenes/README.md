# Moving travel footage — source and rights inventory

The live PR #5 Journey experience now uses **actual video files from six destination-described locations**, NOT AI-generated geography, stock footage of unrelated towns, or animated still pictures. A moving video has its own desktop 16:9 and phone 9:16 encode, a still frame extracted from that video for reduced-motion / loading fallback, and a source reference. The long 15-minute audio programme is independent and these shorter travel clips repeat.

## Six film sources in the review experience

| Place | Source / creator | Source of location identification | License |
|---|---|---|---|
| Chiang Mai · Royal Park Rajapruek, Ho Kham Luang pavilion | [Free Stock Vids / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Drone_footage_of_temple_in_Chiang_Mai,_Thailand.webm) | Distinct landmark and video title identify Chiang Mai. **This is aerial garden footage, not a café interior.** | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| Bali · rice terraces | [Florian Delée / Pexels](https://www.pexels.com/video/stunning-aerial-view-of-balinese-rice-terraces-36492277/) | Source author names Bali; precise coordinates not independently GPS-verified | [Pexels](https://www.pexels.com/license/) |
| Da Lat · pine forest | [Hữu Thịnh 79 / Pexels](https://www.pexels.com/video/4k-aerial-view-of-pine-forest-in-vietnam-31597905/) | Source description names Da Lat; GPS not independently verified | Pexels |
| Kyoto · Kinkaku-ji arrival, mossy garden and bamboo fountain | [Stephan Leuzinger / Pexels — arrival](https://www.pexels.com/video/stunning-view-of-kinkaku-ji-temple-in-kyoto-37901319/), [Brian Zhang / Pexels — garden](https://www.pexels.com/video/tranquil-japanese-garden-in-kyoto-32309074/) and [bamboo fountain](https://www.pexels.com/video/tranquil-kyoto-temple-bamboo-fountain-32272459/) | Kinkaku-ji and both garden clips are Kyoto-labelled by their creators; GPS not independently verified. Selected for no visitors, signage, or crowds | [Pexels License](https://www.pexels.com/license/) |
| Lisbon · aerial rooftops | [Aaron Hairston / Pexels](https://www.pexels.com/video/lisbon-aerial-19909760/) | Source author names Lisbon; GPS not independently verified | Pexels |
| Hoi An · lantern-lit river | [Khanh Hoang Minh / Pexels](https://www.pexels.com/video/nightlife-on-lantern-lit-river-in-hoi-an-37510579/) | Source author names Hoi An; GPS not independently verified | Pexels |

This product's custom score is **place-inspired original procedural music**; the new video licence does not make its music an actual field recording. For Chiang Mai, Café Flow describes the *music's inspiration*, not a false claim that a real café is shown. For Kyoto, Still Water describes the *music and travel mood*, paired with two separate actual Kyoto-labelled clips. This is a cinematic scene sequence, not a single 72-second continuously moving camera shot.

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

## Kyoto quiet garden film sequence

The meditation scene now uses three source-labelled Kyoto recordings in one 84-second sequence: a **13-second slow panoramic arrival across Kinkaku-ji Mirror Pond** from **Stephan Leuzinger** under the **Pexels License**: [Stunning View of Kinkaku-ji Temple in Kyoto](https://www.pexels.com/video/stunning-view-of-kinkaku-ji-temple-in-kyoto-37901319/) (~15.4s original portrait 4K), followed by two **Brian Zhang** clips — [Tranquil Japanese Garden in Kyoto](https://www.pexels.com/video/tranquil-japanese-garden-in-kyoto-32309074/) (~60s, original portrait) and [Tranquil Kyoto Temple Bamboo Fountain](https://www.pexels.com/video/tranquil-kyoto-temple-bamboo-fountain-32272459/) (~30s, original portrait). The video compiler selects approximately 13, 52 and 22 seconds of the respective sources and blends them with 1.5-second dissolves into one ~84-second film for each screen layout. It uses actual flowing water and recorded camera motion, not still-picture zoom. The arrival is a **slow pan, not a walking/dolly travelling shot** — the UI labels it as such and the walking-shot bar stays open. Screenshots from 1, 7 and 14 seconds of the arrival original were visually reviewed before selecting it; the garden and fountain frames were reviewed at 2, 10 and 22 seconds. The portrait-origin sources permit a portrait mobile view; the 16:9 version is a deliberate centre crop, not a separate wide original. The gallery poster is taken at 20 seconds, inside the calm garden part, so the gallery keeps the quiet-garden identity.

These creators describe Kyoto but no camera GPS evidence is provided. **Do not claim independently verified temple identity or geotagging.** Edits: trimmed, graded, composited with gentle dissolves, rendered silent to H.264. The earlier Benlisquare CC BY-SA 4.0 geotagged Mount Atago video is archived as provenance history only and is no longer used as the Kyoto active scene.

## GPS verification status (checked 2026-11-16, Wikimedia Commons API)

- **Mount Atago video (archived): coordinates verified** — 35.042564°N, 135.661303°E on its Commons file page. It is the only GPS-verified Kyoto footage on hand, but it stays archived: an aerial mountain mood does not fit the garden meditation.
- **Chiang Mai drone footage (active): no coordinates** on its Commons file page. Location evidence stays "recognizable Ho Kham Luang pavilion + publisher description".
- **All six Pexels sources: no camera GPS published by Pexels.** "Uploader-described" remains the honest label; do not present Pexels location tags as GPS verification.

## Archived / no longer active

- Old `chiang-mai-cafe.mp4` was **filmed in Yangshuo, China**, not Chiang Mai. It is retained as an **archived stock asset only** in the PR while the migration is tested. No active `SCENES` entry or preview page references it.
- Old `bali-rainforest.mp4` is a real Pexels forest clip but its filming location could not be verified as Bali; also archived and no longer used.
- Four previous `*-concept.svg` files were **original illustrations**, not documentary footage. They are retained as historical design references but are no longer the active moving scene source.

The cinematic scene overhaul is documented in `docs/journey-visual-design.md`. Source pages establish a stronger provenance than generic travel tags, but **not a proof of camera GPS for every clip**. For eventual professional product, commission properly licensed multi-shot location videos and record permits, shot lists and co-ordinates.
