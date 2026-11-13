import { SCENES, sceneById } from './catalog.mjs';

const label = (en, zh) => ({ en, zh });
export const INTENTS = Object.freeze([
  { id:'focus', name:label('Focus','专注'),prompt:label('Find your flow','进入心流'),description:label('Music for writing, reading and working.','给写作、阅读和工作留一点安静。') },
  { id:'meditate',name:label('Meditate','冥想'),prompt:label('Make room to breathe','慢慢安静下来'),description:label('Resonance, space and unhurried breath.','颂钵、空间感与安静的呼吸。') },
  { id:'relax',name:label('Unwind','放松'),prompt:label('Let the day soften','把节奏放慢'),description:label('A gentle journey without a deadline.','不需要完成什么，只待在这里。') },
]);

// These are separate *mix intentions* on six existing original 15-minute
// procedural compositions, not claimed as new live performances or therapies.
export const JOURNEYS = Object.freeze([
  { id:'focus-chiang-mai',intentId:'focus',sceneId:'chiang-mai',name:label('Café Flow','花园咖啡馆心流'),description:label('Warm keys and slow returning motifs: a welcoming opening, an unobtrusive middle.','保留温暖的开场，中段主题自然回归，不抢走工作的注意力。'),suggestedMinutes:45,
    mix:{harmony:.78,details:.40,atmosphere:.54,ambience:0},
    controls:{warmth:.66,space:.3,energy:.33,nature:.22} },
  { id:'focus-da-lat',intentId:'focus',sceneId:'da-lat',name:label('Morning Pages','晨雾书页'),description:label('Soft wooden notes and misty harmony for reading.','雾气中的木质拨弦，适合阅读和轻创作。'),suggestedMinutes:45,
    mix:{harmony:.76,details:.40,atmosphere:.47},
    controls:{warmth:.62,space:.3,energy:.22,nature:.36} },
  { id:'focus-lisbon',intentId:'focus',sceneId:'lisbon',name:label('Golden Ideas','午后灵感'),description:label('A sunlit, lightly moving musical landscape.','有一点点轻盈律动，给创作留出空间。'),suggestedMinutes:45,
    mix:{harmony:.78,details:.51,atmosphere:.39},
    controls:{warmth:.68,space:.22,energy:.51,nature:.22} },
  { id:'meditate-bali',intentId:'meditate',sceneId:'bali',name:label('Sound Bath','乌布颂钵声浴'),description:label('Singing-bowl-inspired resonance, deep space and extended silence.','空间化颂钵泛音与留白缓缓交替。'),suggestedMinutes:20,
    mix:{harmony:.74,details:.67,atmosphere:.44,ambience:.09},
    controls:{warmth:.48,space:.75,energy:.17,nature:.23} },
  { id:'meditate-kyoto',intentId:'meditate',sceneId:'kyoto',name:label('Still Water','茶室静水'),description:label('Few notes, generous silence and rain-like air.','少一些音符，让安静和雨声慢慢展开。'),suggestedMinutes:20,
    mix:{harmony:.68,details:.31,atmosphere:.46},
    controls:{warmth:.46,space:.59,energy:.09,nature:.45} },
  { id:'relax-da-lat',intentId:'relax',sceneId:'da-lat',name:label('Morning Mist','山谷晨雾'),description:label('A small pause among pine hills.','山谷里的空气、拨弦与温柔和声。'),suggestedMinutes:null,
    mix:{harmony:.71,details:.42,atmosphere:.62},
    controls:{warmth:.61,space:.37,energy:.22,nature:.54} },
  { id:'relax-bali',intentId:'relax',sceneId:'bali',name:label('Rainforest Exhale','雨林慢呼吸'),description:label('The Bali score in a softer, more environmental mix.','同一首乌布原创音景，以雨林和更轻的音乐比例呈现。'),suggestedMinutes:null,
    mix:{harmony:.52,details:.35,atmosphere:.63,ambience:.26},
    controls:{warmth:.57,space:.62,energy:.12,nature:.78} },
  { id:'relax-hoi-an',intentId:'relax',sceneId:'hoi-an',name:label('Lantern River','灯笼河畔'),description:label('An unhurried evening along the river.','夜色里慢慢流动的声音与温暖和声。'),suggestedMinutes:null,
    mix:{harmony:.69,details:.39,atmosphere:.52},
    controls:{warmth:.67,space:.43,energy:.19,nature:.43} },
]);

export const intentById = id => INTENTS.find(intent => intent.id === id) || null;
export const journeyById = id => JOURNEYS.find(journey => journey.id === id) || null;
export const journeysForIntent = id => JOURNEYS.filter(journey => journey.intentId === id);
export const recommendedJourneyForIntent = id => journeysForIntent(id)[0] || null;
export const journeyForScene = (sceneId, intentId) =>
  journeysForIntent(intentId).find(j => j.sceneId === sceneId)
  || JOURNEYS.find(j => j.sceneId === sceneId)
  || null;

const clamp = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
export function levelsForJourney(journey, saved) {
  if (!journey) return {};
  const scene = sceneById(journey.sceneId);
  const levels=Object.fromEntries(scene.layers.map(layer => [
    layer.id, clamp(saved?.[layer.id],clamp(journey.mix[layer.id],layer.defaultLevel))
  ]));
  // Old saved focus mixes can contain speech from the previous default.
  // Do not revive it without a new, explicit user opt-in.
  if (journey.id==='focus-chiang-mai' && saved?.cafeVoicesOptIn!==true) levels.ambience=0;
  return levels;
}
export function controlsForJourney(journey, saved) {
  if (!journey) return {};
  return Object.fromEntries(['warmth','space','energy','nature','bass','mid','treble','width','reverb'].map(key => [
    key, clamp(saved?.[key],clamp(journey.controls[key],.5))
  ]));
}
export function sceneForJourney(journey, version = '3.2') {
  if (!journey) return SCENES[0];
  const place = sceneById(journey.sceneId);
  // A/B only when the source actually includes a preserved V3.1 score.
  const legacy = version === '3.1' && place.legacyLayers?.length;
  return { ...place,journeyId:journey.id,trackTitle:journey.name,
    audioVersion: legacy ? '3.1' : '3.2',
    layers:legacy ? place.legacyLayers : place.layers,
    durationSeconds:legacy ? 180 : place.durationSeconds,
  };
}
