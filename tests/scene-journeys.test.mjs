import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../src/scenes/catalog.mjs';
import { INTENTS, JOURNEYS, intentById, journeyById, journeysForIntent, recommendedJourneyForIntent, journeyForScene, levelsForJourney, sceneForJourney } from '../src/scenes/journeys.mjs';
import { readScenePreferences, writeScenePreferences } from '../src/scenes/preferences.mjs';

const storage = value => ({ getItem: () => value, setItem() {} });

test('every intention recommends a playable place with genuine scene stems', () => {
  for (const intent of INTENTS) {
    const journey = recommendedJourneyForIntent(intent.id);
    assert.ok(journey && journey.intentId === intent.id);
    const scene = sceneForJourney(journey);
    assert.ok(SCENES.some(item => item.id === scene.id));
    assert.ok(scene.layers.every(layer => layer.file.startsWith('/assets/audio/')));
    assert.ok(journeysForIntent(intent.id).includes(journey));
  }
});

test('focus and meditation lead to separate destinations; unsupported values fail safely', () => {
  assert.equal(recommendedJourneyForIntent('focus').sceneId, 'chiang-mai');
  assert.equal(recommendedJourneyForIntent('meditate').sceneId, 'bali');
  assert.equal(recommendedJourneyForIntent('unknown'), null);
  assert.equal(intentById('unknown'), null);
  assert.equal(journeyById('unknown'), null);
});

test('journeys in one place have different real stem levels but never invented audio', () => {
  const bath = journeyById('meditate-bali'), unwind = journeyById('relax-bali');
  assert.deepEqual(sceneForJourney(bath).layers, sceneForJourney(unwind).layers);
  assert.notDeepEqual(levelsForJourney(bath), levelsForJourney(unwind));
  assert.deepEqual(levelsForJourney(bath, { music: 4, texture: -1, ambience: 'wrong' }),
    { music: 1, texture: 0, air: .48, ambience: .10 });
  assert.equal(journeyForScene('bali', 'relax').id, 'relax-bali');
  assert.equal(journeyForScene('bali', 'focus').id, 'meditate-bali');
});

test('saved journey mixes stay separate and survive preference validation', () => {
  const state = { sceneId: 'bali', master: .6, motion: false,
    mixes: { 'meditate-bali': { music: .22 }, 'relax-bali': { music: .65 } } };
  let stored;
  assert.equal(writeScenePreferences({ setItem(key, raw) { stored = raw; } }, state), true);
  const saved = readScenePreferences(storage(stored));
  assert.equal(saved.mixes['meditate-bali'].music, .22);
  assert.equal(saved.mixes['relax-bali'].music, .65);
  assert.equal(saved.mixes['meditate-bali'].texture, .82);
  assert.equal(saved.mixes['relax-bali'].texture, .48);
  assert.equal('playing' in saved, false);
});

test('no intention is forced into a timer or paywall', () => {
  for (const journey of JOURNEYS) {
    assert.equal('paywall' in journey, false);
    assert.equal('timerRequired' in journey, false);
    assert.ok(Object.values(levelsForJourney(journey)).every(level => level >= 0 && level <= 1));
  }
});
