# Scene footage sources

These are silent, edited stock-video backgrounds for the Sound Cocktail soundscape app. They are not recordings made by Sound Cocktail, and neither scene claims to be filmed at its music destination. Audio is supplied separately.

## Bali-inspired forest retreat

- Creator: **I Am Sorin**
- Original title: **View of the Flowing Water in the Forest**
- Source page: https://www.pexels.com/video/view-of-the-flowing-water-in-the-forest-8310457/
- Original video: https://videos.pexels.com/video-files/8310457/8310457-uhd_3840_2160_30fps.mp4
- Source location: **not specified by the source page; not verified as Bali**.
- Scene files: `bali-rainforest.mp4`, `bali-rainforest-mobile.mp4` and their matching `.jpg` posters.
- Edits: selected a 30-second segment beginning at 2 seconds; reduced saturation slightly, darkened slightly, and blended its end into its beginning over 1.5 seconds. No reverse playback. Silent H.264. Deliberate mobile crop keeps the stream centered.

## Chiang Mai-inspired garden cafe

- Creator: **LayG Traveller**
- Original title: **Charming Cafe with Lush Garden View**
- Source page: https://www.pexels.com/video/charming-cafe-with-lush-garden-view-40913579/
- Original video: https://videos.pexels.com/video-files/40913579/17492527_3840_2160_50fps.mp4
- Source location: **Yangshuo, China**, as described on the source page. This is not Chiang Mai footage.
- Scene files: `chiang-mai-cafe.mp4`, `chiang-mai-cafe-mobile.mp4` and their matching `.jpg` posters.
- Edits: virtual-tripod stabilization and slight fixed crop, small brightness adjustment, reduced saturation, one-second crossfade at the loop boundary. No reverse playback. Silent H.264. Deliberate mobile crop preserves the wood table, wicker seating, window frame and garden.
- Suggested visible source label: **Chiang Mai-inspired soundscape · filmed in Yangshuo** / **清迈灵感声景 · 影像摄于阳朔**.

## License

Both original clips are offered under the **Pexels License**, checked on 2026-11-13:
https://www.pexels.com/license/

The official license allows free use and modification, including use in a website or app. Attribution is optional, but this project credits the creators. The license prohibits selling unaltered copies, implying endorsement, redistributing as stock/wallpaper content, and using imagery as a trademark. These files form background scenes in an interactive audio product; do not add standalone stock/video download or wallpaper-resale functionality.

## Validation scope

- ffprobe confirmed H.264 video-only files, constant 25 fps, and correct desktop/mobile dimensions.
- MP4 metadata is placed before media data for progressive playback.
- Selected source frames and stabilized frames were visually inspected for camera drift and subject suitability.
- Frame-to-frame motion and seam differences were measured; metadata and measurements are in [video-validation.json](../../../docs/video-validation.json).
- A ten-iteration accelerated decode check exercises encoded loop boundaries. It is not a claim of ten real-time browser loops or audio synchronization; the app must verify those separately.
- The cafeteria clip is a short 6.8-second scene loop. It is suitable for a working first version; a custom longer Chiang Mai composition is still a future visual-content improvement.
