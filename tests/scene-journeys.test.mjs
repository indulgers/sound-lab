import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../src/scenes/catalog.mjs';
import { INTENTS, JOURNEYS, intentById, journeyById, journeysForIntent, recommendedJourneyForIntent, journeyForScene, levelsForJourney, controlsForJourney, sceneForJourney } from '../src/scenes/journeys.mjs';
import { readScenePreferences, writeScenePreferences } from '../src/scenes/preferences.mjs';
import { densityGate, suggestedChapter } from '../src/scenes/stream-player.mjs';

const storage = value => ({ getItem: () => value, setItem() {} });
const PLACE_IDS = ['bali','chiang-mai','da-lat','kyoto','lisbon','hoi-an'];

test('six distinct places have three genuine 15-minute stems, with accurate provenance', () => {
  assert.deepEqual(SCENES.map(x => x.id).sort(), PLACE_IDS.sort());
  for (const scene of SCENES) {
    assert.equal(scene.durationSeconds, 900);
    assert.equal(scene.chapters.length, 5);
    assert.equal(scene.layers.filter(x => /journeys\//.test(x.file)).length, 3);
    assert.ok(scene.layers.every(x => x.file.startsWith('/assets/audio/')));
    if (!scene.video) assert.match(scene.artworkProvenance, /not destination photography/);
  }
});

test('every intention recommends a playable original journey', () => {
  for (const intent of INTENTS) {
    const journey = recommendedJourneyForIntent(intent.id);
    assert.ok(journey && journey.intentId === intent.id);
    const scene = sceneForJourney(journey);
    assert.ok(PLACE_IDS.includes(scene.id));
    assert.equal(scene.audioVersion, '3.2');
    assert.equal(scene.durationSeconds, 900);
    assert.ok(journeysForIntent(intent.id).includes(journey));
  }
});

test('focus and meditation recommend the expected places, unsupported IDs fail safe', () => {
  assert.equal(recommendedJourneyForIntent('focus').sceneId, 'chiang-mai');
  assert.equal(recommendedJourneyForIntent('meditate').sceneId, 'bali');
  assert.equal(recommendedJourneyForIntent('unknown'), null);
  assert.equal(intentById('unknown'), null);
  assert.equal(journeyById('unknown'), null);
});

test('shared destination can offer multiple distinct mix intentions', () => {
  const bath = journeyById('meditate-bali'), unwind = journeyById('relax-bali');
  assert.deepEqual(sceneForJourney(bath).layers, sceneForJourney(unwind).layers);
  assert.notDeepEqual(levelsForJourney(bath), levelsForJourney(unwind));
  assert.deepEqual(levelsForJourney(bath, { harmony: 4, details: -1, atmosphere: 'wrong' }),
    { harmony: 1, details: 0, atmosphere: .44, ambience: .09 });
  assert.equal(journeyForScene('bali', 'relax').id, 'relax-bali');
});

test('per-journey sound levels and emotional controls persist independently', () => {
  const state = { sceneId:'bali',master:.6,motion:false,
    mixes:{'meditate-bali':{harmony:.22,space:.85},
      'relax-bali':{harmony:.65,space:.33}} };
  let stored;
  assert.equal(writeScenePreferences({setItem(key,value){stored=value;}},state),true);
  const saved=readScenePreferences(storage(stored));
  assert.equal(saved.mixes['meditate-bali'].harmony,.22);
  assert.equal(saved.mixes['relax-bali'].harmony,.65);
  assert.equal(saved.mixes['meditate-bali'].space,.85);
  assert.equal(saved.mixes['relax-bali'].space,.33);
  assert.equal(saved.mixes['meditate-bali'].details,.67);
  assert.equal(saved.mixes['relax-bali'].details,.35);
  assert.deepEqual(Object.keys(controlsForJourney(journeyById('meditate-bali'))),
    ['warmth','space','energy','nature','bass','mid','treble','width','reverb']);
});

test('the original 3-minute stems remain available only as labeled A/B references', () => {
  for (const id of ['meditate-bali','focus-chiang-mai']) {
    const scene=sceneForJourney(journeyById(id),'3.1');
    assert.equal(scene.audioVersion,'3.1'); assert.equal(scene.durationSeconds,180);
    assert.ok(scene.layers.some(x => /scenes\//.test(x.file)));
  }
  assert.equal(sceneForJourney(journeyById('focus-da-lat'),'3.1').audioVersion,'3.2');
});

test('musical activity gates actual detail passages, rather than a global volume multiplier', () => {
  for (let t=0;t<1000;t+=23) assert.equal(densityGate(t,1,5),1);
  const low=Array.from({length:30},(_,i)=>densityGate(i*23,.05,5));
  assert.ok(low.some(x=>x===0) && low.some(x=>x===1));
  assert.equal(suggestedChapter(0),0); assert.equal(suggestedChapter(480),2);
  assert.equal(suggestedChapter(900),4);
});

test('all prototypes allow unrestricted listening without clinical effect or price claims', () => {
  for (const j of JOURNEYS) {
    assert.equal('paywall' in j,false); assert.equal('timerRequired' in j,false);
    assert.ok(Object.values(levelsForJourney(j)).every(v=>v>=0&&v<=1));
    assert.ok(Object.values(controlsForJourney(j)).every(v=>v>=0&&v<=1));
  }
});

test('Chiang Mai focus defaults to no human conversation, but retains a separately adjustable optional recording', () => {
  const journey=journeyById('focus-chiang-mai');
  const place=sceneForJourney(journey);
  const speech=place.layers.find(layer=>layer.id==='ambience');
  assert.ok(speech && speech.containsSpeech);
  assert.equal(speech.defaultLevel,0);
  assert.equal(journey.mix.ambience,0);
  assert.equal(levelsForJourney(journey).ambience,0);
  assert.equal(levelsForJourney(journey,{ambience:.045}).ambience,0,'old saved voice level must not silently persist');
  assert.equal(levelsForJourney(journey,{ambience:.045,cafeVoicesOptIn:true}).ambience,.045);
  const legacy=sceneForJourney(journey,'3.1');
  assert.equal(legacy.layers.find(layer=>layer.id==='ambience').defaultLevel,0);
});

test('mood-specific scene suggestions never silently switch the chosen intention', () => {
  assert.deepEqual(journeysForIntent('focus').map(j=>j.sceneId),['chiang-mai','da-lat','lisbon']);
  assert.deepEqual(journeysForIntent('meditate').map(j=>j.sceneId),['bali','kyoto']);
  assert.deepEqual(journeysForIntent('relax').map(j=>j.sceneId),['da-lat','bali','hoi-an']);
});

test('old saved café mixes cannot resurrect speech; a newly explicit opt-in can', () => {
  const stale = readScenePreferences(storage(JSON.stringify({mixes:{
    'focus-chiang-mai':{ambience:.45,harmony:.76}
  }})));
  assert.equal(stale.mixes['focus-chiang-mai'].ambience,0);
  assert.equal(stale.mixes['focus-chiang-mai'].cafeVoicesOptIn,false);
  const chosen = readScenePreferences(storage(JSON.stringify({mixes:{
    'focus-chiang-mai':{ambience:.045,cafeVoicesOptIn:true}
  }})));
  assert.equal(chosen.mixes['focus-chiang-mai'].ambience,.045);
  assert.equal(chosen.mixes['focus-chiang-mai'].cafeVoicesOptIn,true);
});

test('all six destinations use attributed moving film instead of Yangshuo or concept art', () => {
 for(const scene of SCENES) {
   for(const [prop,suffix] of [['video','-travel.mp4'],['mobileVideo','-travel-mobile.mp4'],['poster','-travel.jpg'],['mobilePoster','-travel-mobile.jpg']]) {
     assert.equal(scene[prop], '/assets/scenes/' + scene.id + suffix);
   }
   assert.ok(scene.filmSourcePage?.startsWith('https://'));
   assert.ok(scene.filmCreator?.length > 2);
   assert.ok(['Pexels License','CC BY 3.0'].includes(scene.filmLicense));
   assert.ok(scene.filmPlace.en && scene.filmPlace.zh);
 }
 const chiang=SCENES.find(s=>s.id==='chiang-mai');
 assert.match(chiang.filmPlace.zh,/皇家花园/);
 assert.doesNotMatch(chiang.video,/cafe|yangshuo/);
 assert.match(SCENES.find(s=>s.id==='kyoto').location.zh,/神社/);
});
