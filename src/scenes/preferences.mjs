import { SCENES, sceneById } from './catalog.mjs';

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
