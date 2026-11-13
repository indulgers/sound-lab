import { SCENES, sceneById } from './catalog.mjs';

const label = (en, zh) => ({ en, zh });

// An intention recommends a music journey; the place supplies the film.
// A journey uses only existing, genuinely separate V3.1 audio stems.
export const INTENTS = Object.freeze([
  { id: 'focus', name: label('Focus', '专注'), prompt: label('Find your flow', '进入心流'), description: label('A warm place to write, read or work.', '给写作、阅读和工作留一点安静。') },
  { id: 'meditate', name: label('Meditate', '冥想'), prompt: label('Make room to breathe', '慢慢安静下来'), description: label('Slow tones, deep space and room to exhale.', '在悠长的回响和留白里放松呼吸。') },
  { id: 'relax', name: label('Unwind', '放松'), prompt: label('Let the day soften', '把节奏放慢'), description: label('A gentle escape with nothing to finish.', '暂时不需要完成任何事情。') },
]);

export const JOURNEYS = Object.freeze([
  { id: 'focus-chiang-mai', intentId: 'focus', sceneId: 'chiang-mai', name: label('Café Flow', '咖啡馆心流'), description: label('Warm keys, quiet air and an unhurried desk.', '暖琴、空气感，以及不需要着急的书桌。'), suggestedMinutes: 45,
    mix: { music: .82, texture: .55, air: .60, ambience: .10 } },
  { id: 'meditate-bali', intentId: 'meditate', sceneId: 'bali', name: label('Sound Bath', '颂钵声浴'), description: label('Resonance in the distance, quiet in between.', '让远近回响与安静交替。'), suggestedMinutes: 20,
    mix: { music: .80, texture: .82, air: .48, ambience: .10 } },
  { id: 'relax-bali', intentId: 'relax', sceneId: 'bali', name: label('Rainforest Exhale', '雨林慢呼吸'), description: label('The same original score, softened by the forest.', '同一首原创音乐，以更多雨林空间轻柔混音。'), suggestedMinutes: null,
    mix: { music: .57, texture: .48, air: .63, ambience: .28 } },
  { id: 'relax-chiang-mai', intentId: 'relax', sceneId: 'chiang-mai', name: label('One More Coffee', '再喝一杯咖啡'), description: label('A lighter mix of warm keys and café air.', '更轻盈的琴声与咖啡馆环境比例。'), suggestedMinutes: null,
    mix: { music: .63, texture: .38, air: .62, ambience: .22 } },
]);

export const intentById = id => INTENTS.find(intent => intent.id === id) ?? null;
export const journeyById = id => JOURNEYS.find(journey => journey.id === id) ?? null;
export const journeysForIntent = id => JOURNEYS.filter(journey => journey.intentId === id);
export const recommendedJourneyForIntent = id => journeysForIntent(id)[0] ?? null;
export const journeyForScene = (sceneId, intentId) =>
  journeysForIntent(intentId).find(journey => journey.sceneId === sceneId)
  ?? JOURNEYS.find(journey => journey.sceneId === sceneId)
  ?? null;

const clamp = (value, fallback) => typeof value === 'number' && Number.isFinite(value)
  ? Math.min(1, Math.max(0, value)) : fallback;
export function levelsForJourney(journey, saved) {
  if (!journey) return {};
  const scene = sceneById(journey.sceneId);
  return Object.fromEntries(scene.layers.map(layer => [
    layer.id,
    clamp(saved?.[layer.id], clamp(journey.mix[layer.id], layer.defaultLevel)),
  ]));
}
export function sceneForJourney(journey) {
  if (!journey) return SCENES[0];
  const scene = sceneById(journey.sceneId);
  return { ...scene, journeyId: journey.id, trackTitle: journey.name };
}
