import test from 'node:test';
import assert from 'node:assert/strict';
import { readScenePreferences, writeScenePreferences, levelsForScene } from '../src/scenes/preferences.mjs';
import { SCENES } from '../src/scenes/catalog.mjs';

const storage = value => ({ getItem: () => value, setItem() {} });

test('saved mixes remain isolated by place and reset uses that place defaults', () => {
  const saved = readScenePreferences(storage(JSON.stringify({ sceneId:'bali', mixes:{ bali:{music:.23} } })));
  assert.equal(levelsForScene(SCENES[0], saved.mixes.bali).music, .23);
  assert.equal(levelsForScene(SCENES[1], saved.mixes['chiang-mai']).music, .85);
  assert.equal(levelsForScene(SCENES[0]).music, .85);
});

test('invalid saved values cannot create invalid gain or an unknown scene', () => {
  const saved = readScenePreferences(storage(JSON.stringify({sceneId:'unknown',master:19,mixes:{bali:{music:-3,texture:'loud',alien:.5}}})));
  assert.equal(saved.sceneId, 'bali');
  assert.equal(saved.master, 1);
  assert.deepEqual(levelsForScene(SCENES[0],saved.mixes.bali), {music:0,texture:.8,air:.55,ambience:.12});
});

test('corrupt or unavailable storage falls back to a silent-ready default', () => {
  for (const store of [storage('no json'),storage('null'),{getItem(){throw Error('denied')}}]) {
    const saved=readScenePreferences(store);
    assert.equal(saved.sceneId,'bali');
    assert.equal(saved.master,.7);
    assert.deepEqual(saved.mixes,{});
    assert.equal('playing' in saved,false);
  }
});

test('saved preference write reports storage failure instead of claiming success', () => {
  assert.equal(writeScenePreferences({setItem(){throw Error('full')}},{}),false);
  let result;
  assert.equal(writeScenePreferences({setItem(key,value){result=JSON.parse(value)}},{sceneId:'chiang-mai',master:.4,motion:false,mixes:{}}),true);
  assert.equal(result.sceneId,'chiang-mai');
  assert.equal(result.motion,false);
});
