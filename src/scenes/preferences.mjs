import { SCENES, sceneById } from './catalog.mjs';
import { JOURNEYS, levelsForJourney, controlsForJourney } from './journeys.mjs';

const KEY = 'sound-cocktail.places.v1';
const clamp = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
export const levelsForScene = (scene, saved) => Object.fromEntries(scene.layers.map(layer => [layer.id, clamp(saved?.[layer.id], layer.defaultLevel)]));

export function readScenePreferences(storage) {
  let data = {};
  try { data = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* Storage is optional. */ }
  const mixes = {};
  for (const scene of SCENES) {
    if (data.mixes?.[scene.id] && typeof data.mixes[scene.id] === 'object') mixes[scene.id] = levelsForScene(scene, data.mixes[scene.id]);
  }
  // Journey mixes are saved independently, even when journeys share a place.
  for (const journey of JOURNEYS) {
    if (data.mixes?.[journey.id] && typeof data.mixes[journey.id] === 'object') mixes[journey.id] = { ...levelsForJourney(journey, data.mixes[journey.id]), ...controlsForJourney(journey, data.mixes[journey.id]) };
  }
  return {
    sceneId: sceneById(data.sceneId).id,
    master: clamp(data.master, .7),
    motion: typeof data.motion === 'boolean' ? data.motion : true,
    mixes,
  };
}

export function writeScenePreferences(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}
