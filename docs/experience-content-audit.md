# Sound Cocktail · Experience & Content Quality Audit

Reviewed 2026-11-14 on PR #5 (`codex/immersive-video-scenes`).
This is a working **evidence-based product backlog**, not a list of claimed finished experiences. Sources: current source files, the prior desktop/mobile Chromium screenshots, and direct user feedback. Listening taste must be validated with actual people and devices.

## Product principle

**Choose a need → enter one Journey → stay in a place → optionally tune the music.**
The first listening experience should already be comfortable. Sound Cocktail is not a noise generator or a cocktail simulation; music has to be worth returning to without its attractive scene imagery. Discovery/navigation should not distract users who came to focus.

## P0 fixes implemented in PR (regression coverage required)

| ID | Observed problem | Specific change | Acceptance |
| --- | --- | --- | --- |
| SC-01 | Chiang Mai café background contains distracting conversation | Focus default ambience is **0**, dialogue is clearly named, simple control offers **No conversations** and small optional voice amount; old V3.1 is also quiet by default | With fresh state and focus chosen, sound layer ambience=0; opt-in sounds without affecting harmony; returning to quiet sets exact 0 |
| SC-02 | Nature slider previously amplified both air and café conversation | Speech metadata (`containsSpeech`) separates conversational ambience from natural air | Raise Nature to 100% while dialogue at zero or slight opt-in; it must never raise human speech |
| SC-03 | Destination shortcuts in a Focus/Meditate session could silently change the user’s intention through the `journeyForScene` fallback | Shortcuts now use `journeysForIntent(intentId)` only | Focus offers Chiang Mai/Da Lat/Lisbon; Meditate Bali/Kyoto; Unwind Da Lat/Bali/Hoi An. Switching within shortcuts never changes intent |
| SC-04 | Places gallery displayed eight Journeys with no state distinction | Default to matching current intention, with explicit **Explore all states** toggle; preserve all eight for discovery | Focus shows 3, Meditate shows 2, Explore all shows 8 |
| SC-05 | Information panel misleadingly referred to two places and V3.1 3-minute tracks after six 15-minute assets were added | Dynamic V3.1/V3.2 credit and per-place video or illustration disclaimer; admit 15-min programming with repeats | A/B credit reflects actual playing source; concepts never claimed to be on-location films |
| SC-06 | Chiang Mai V3.2 middle had synthetic brightness and repeated plucked events | Retain the successful opening; soften pluck harmonics and attack; extend the sparse motif interval and lower middle event level | Rendered stereo stems still match in duration, pass peaks and source checks; editorial excerpts cover 0–75, 240–315, 720–785 seconds; human preference remains unproven |

## Listening test protocol (sound is the priority)

Run 3 independent versions for Chiang Mai before deciding which should be the default: previous V3.1, current V3.2, and the **V3.2.1 quiet-focus edit**. Compare at matched perceived loudness, with café conversation muted, and include a visual-off round to avoid scenic priming.

- Listen at 0–2min (**opening**), 4–6min (**working middle**), 8–10min (**development**) and 13–15min (**return and seam**). 
- Ask: did it steal attention, feel electronic/cheap, become tedious, or remain comfortable? What exact time and sound caused it?
- Repeat as a real 30–45 minute work session, not just 20-second previews. Observe if the listener mutes it, switches Journey, turns down details, or comes back next workday.
- Log headphones vs laptop speakers; use actual listening and self-report, not spectral values as supposed clinical efficacy.
- Keep any effects/health language careful: this is relaxation and focus environment design, not evidence-based treatment or a medically delivered sound bath.

## P0 blockers before any commercial-quality declaration

| ID | Requirement | Why it matters | Definition of done |
| --- | --- | --- | --- |
| SC-07 | Professionalise **two** flagship Journeys: Chiang Mai Focus and Bali Sound Bath | Procedural plucks/keys and simulated bowls still sound synthetic to the product owner | DAW-based or rights-cleared performed stems, artist/source credits, explicit usage rights, two listeners preferring default over prior version at matched volume plus broader user trial; no unverified medical claims |
| SC-08 | Live-device long playback | Chromium smoke tests are not a 60-min Safari/iOS or Android background test | >60 min on real phone, screen lock/background/resume, 15-min overlaps, changing networks, low-memory device, safe gain transitions; record device/time/error logs |
| SC-09 | Actual A/B quality controls | Current button replaces the source and restarts it from the beginning; compared sounds are not time/loudness matched | One-tap A/B with explicit version, matched loudness and comparable musical phase where arrangements allow; distinguish the experimental original and current version |
| SC-10 | Track-level content rights and masters | Current stems are programmatic sketches and the two stock videos are not verified destination captures | Export manifest, verified license/sync/master rights for every new production stem, truthful `inspired by` label, attribution visible |

## P1 usability and content requirements

| ID | Improvement | Definition of done |
| --- | --- | --- |
| SC-11 | **Smooth switch between Journeys** while music is already playing | Transitions gain-fade without clicks, 2 concurrent programmes have bounded memory, rapid re-selection does not replay stale requests; test both headphone and slow 4G |
| SC-12 | Keep intent tools separate | Focus work clock reminds without stopping music. Sleep timer genuinely stops sound. Their labels must not imply they do the same thing |
| SC-13 | Curated trial presets | Quiet Focus is the default; optional social ambience is explicit. Additional warmth/space variants should be well-composed starting balances, not arbitrary EQ gimmicks |
| SC-14 | Cohesive six-city scenic content | Bali and Chiang Mai use clearly credited stock (Chiang Mai café footage is from Yangshuo). New four use clearly labeled concept illustrations. Replace only with commissioned/cleared, destination-appropriate video later |
| SC-15 | Minimal full-screen view | The video or illustration should remain visible without permanent tool clutter. All important actions remain discoverable when needed; Escape/focus restore and reduced-motion behaviour must work |
| SC-16 | Studio continuity | Journey mixer opens with its live sound layers; classic legacy Studio remains accessible but is not mistaken for the active Journey editor |
| SC-17 | Mobile input comfort | Modal, voice toggle, gallery filters, saved controls and close buttons reachable on 390px/short screen, with no horizontal overflow |
| SC-18 | Better guided discovery | First visit chooses Focus/Meditate/Unwind; alternative cards respect chosen need; Explore all is explicit and informative rather than accidental |
| SC-19 | Focus/music listening instrumentation with privacy | Record at most minimal, opt-in/non-identifying local usage info and useful listener feedback. Do not silently collect sensitive mental-health information |

## Later / out of scope now

Payment gating/10-minute paywall, travel passports, achievement mechanics, mixing-glass UI and clinical/brainwave efficacy claims do not help us verify if the sound is actually enjoyable and comfortable, and should not lead the development plan.

## Release gate

- All automated tests + production build pass on the *latest* PR head, then isolated Cloudflare preview deploys.
- Browser test verifies voice-muted default, opt-in control, both mixers, intention-consistent alternatives, source credits, mobile viewport and audio playing.
- New audio manuscript has listening clips and an instrument/provenance manifest. **Human preference testing and real iOS/Safari background playback remain separate gates**; automated checks must not be represented as having completed them.

## Source references

- `src/scenes/catalog.mjs` and `src/scenes/journeys.mjs` — source attribution, default mix, intention recommendations
- `src/scenes/stream-player.mjs` — speech lane independence and smooth audio transitions
- `src/scenes/SceneExperience.jsx` — user choices and UI
- `scripts/render_journeys.py`, `scripts/export-listening-samples.sh` — original audio / review excerpts
- `docs/music-production-playbook.md` — production process and delivery standards
- Existing video provenance: `public/assets/scenes/README.md`
