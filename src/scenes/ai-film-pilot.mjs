/**
 * Sound Lab 2.0 — first two AI-film candidates.
 *
 * Direction: place-inspired cinematic audiovisual spaces, not documentary
 * footage. Never claim a generated room is a real named establishment.
 * A candidate only becomes a live scene after explicit visual QA.
 */
const GLOBAL_CAMERA = 'Photorealistic real-time cinematography, natural dynamic range and organic fine detail. Continuous 24fps shot with physically plausible perspective, geometry and shadows; subtle camera motion without cuts or time-lapse. No people close to camera, no text, no signs, no logos, no watermarks, no surreal architecture, no artificial glow, no oversaturation, no oversharpening, no uncanny AI texture or morphing.';
const scenes = [
  {
    id: 'bali',
    pilotTitle: 'Ubud Rainforest Spa · After the Rain',
    locationBasis: 'Ubud, Bali — fictional environment inspired by Balinese open-air spa architecture and jungle valleys',
    editorialDisclosure: { en: 'AI-generated place-inspired scene; not footage of a real Bali spa.', zh: 'AI 生成的巴厘岛氛围场景，并非某家真实 SPA 的现场录像。' },
    palette: 'weathered black volcanic stone, warm honey bamboo, muted tropical greens, natural soft morning mist and scattered frangipani',
    shots: [
      {
        id: 'hero',
        duration: 10,
        label: 'An open-air spa pavilion overlooking the rainforest',
        prompt: 'Eye-level view from inside a refined Balinese Ubud open-air spa pavilion just after tropical rainfall. Weathered volcanic stone floor, polished teak beams, woven bamboo canopy and a small copper bathing vessel with a few frangipani petals, not a swimming pool. The edge of an open treatment deck looks onto layered lush jungle and a distant green valley, delicate mist drifting between leaves. Tiny raindrops glide from the roof edge and the leaves move subtly in a mild breeze. The camera glides forward only about 30 centimetres, with no cuts, then gradually settles. Natural overcast early morning light, credible Balinese craftsmanship, serene and deeply immersive, detailed foreground and background, cinematic documentary realism. ',
      },
      {
        id: 'detail',
        duration: 10,
        label: 'Rain beads, carved stone basin and tropical foliage',
        prompt: 'Cinematic wide close-up in the same Ubud Balinese open-air spa pavilion: a carved dark lava stone water basin in the foreground, several small frangipani blossoms floating in it, fine raindrops landing and forming delicate expanding rings. Beyond it: wet bamboo floor edge, draping hanging vines, dense tropical ferns and a distant blurred rainforest valley in gentle grey daylight. The camera is nearly locked and slides sideways only a few centimetres; leaves and water move naturally. No people, no massage therapists, no artificial dramatic beams, no excessive blur. Natural photographic optics, finely resolved stone and leaf textures. ',
      },
    ],
  },
  {
    id: 'chiang-mai',
    pilotTitle: 'Chiang Mai Rainy Café · Late Afternoon',
    locationBasis: 'Chiang Mai, northern Thailand — fictional café inspired by Lanna-era woodwork and rainy Old City lanes',
    editorialDisclosure: { en: 'AI-generated Chiang Mai–inspired café; not an identifiable real business or location recording.', zh: 'AI 生成的清迈风格雨季咖啡馆，并非真实店铺或现场拍摄影像。' },
    palette: 'deep brown northern Thai teak, linen cream, green plants, muted rain blue, soft amber lamps',
    shots: [
      {
        id: 'hero',
        duration: 10,
        label: 'Rainy street seen from a warm teak café',
        prompt: 'Cinematic eye-level interior of a small intimate Chiang Mai Old City café on a tropical rainy afternoon. Authentic northern Thai teak wood window frames with modest Lanna carved details, warm low amber pendant lamps, textured plaster and rattan stools. A simple ceramic coffee mug and an open notebook rest on a weathered teak table near the large glass window. Through the rain-covered glass: a plausible narrow Chiang Mai lane with low old-town shophouses, leafy plants, wet pavement, occasional distant parked motorbikes and a soft grey sky. Raindrops trickle down the glass continuously; outdoor leaves sway gently. The camera performs a barely perceptible 20-centimetre slow push toward the window, no cuts, no people in foreground, balanced warm interior and cool rainy exterior exposure. Documentary realism, correct Thai proportions and materials. ',
      },
      {
        id: 'detail',
        duration: 10,
        label: 'Quiet Lanna café desk and rain on the window',
        prompt: 'A second complementary cinematic shot inside the same imagined northern Thai Chiang Mai teak café: side view of the writing desk by the rain-streaked window. Subtle natural steam rises from a matte handmade ceramic cup, a modest brass lamp illuminates an open notebook without legible writing, dense tropical foliage and a weathered shophouse porch appear outside in soft focus. Dripping rain creates small ripples in puddles beyond the sill. The camera stays steady, shifting almost imperceptibly left; natural atmospheric depth and gentle physically plausible movement only. Warm amber interior with muted cool green rainy exterior, highly detailed wood grain and realistic glass water trails. ',
      },
    ],
  },
];

export const AI_FILM_PILOT = Object.freeze(scenes);
export const AI_FILM_MODEL = 'gemini_omni_flash_1.2';
export const AI_FILM_DURATION_SECONDS = 10;
export const AI_FILM_REFERENCE_ONLY = true;

export function getAiFilmShot(sceneId, shotId = 'hero') {
  const scene = AI_FILM_PILOT.find(item => item.id === sceneId);
  const shot = scene?.shots.find(item => item.id === shotId);
  if (!shot) return null;
  return {
    sceneId, shotId, label: shot.label, title: scene.pilotTitle,
    locationBasis: scene.locationBasis, disclosure: scene.editorialDisclosure,
    duration: shot.duration,
    promptText: shot.prompt + GLOBAL_CAMERA,
  };
}
