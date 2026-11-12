const assert = require('node:assert/strict');
const test = require('node:test');
const { PACKS, findPack, isMixUnlocked, soundsForPacks } = require('../src/packs.mjs');
const { RECIPES, SOUNDS } = require('../src/catalog.mjs');
const { isFreeSound } = require('../src/listening-session.mjs');

test('three packs with server-side prices', () => {
  assert.deepEqual(
    PACKS.map((pack) => pack.id),
    ['focus-pack', 'sleep-pack', 'rain-night-pack'],
  );
  assert.deepEqual(
    PACKS.map((pack) => pack.price),
    ['6.00', '9.00', '12.00'],
  );
  for (const pack of PACKS) {
    assert.equal(typeof pack.name, 'string');
    assert.ok(pack.name.length > 0);
    assert.equal(typeof pack.desc, 'string');
    assert.ok(pack.desc.length > 0);
  }
});

test('findPack returns null for unknown ids', () => {
  assert.equal(findPack('focus-pack').name, '专注包');
  assert.equal(findPack('nope'), null);
  assert.equal(findPack(''), null);
  assert.equal(findPack(undefined), null);
});

test('pack sounds: every premium channel is covered exactly once, no free channel in packs', () => {
  const premiumSounds = SOUNDS.filter((s) => !isFreeSound(s.id)).map((s) => s.id);
  const covered = [];
  for (const pack of PACKS) {
    assert.ok(Array.isArray(pack.sounds), `${pack.id} must list its sounds`);
    assert.ok(pack.sounds.length > 0, `${pack.id} must unlock at least one sound`);
    for (const id of pack.sounds) {
      assert.ok(!isFreeSound(id), `${id} is free and must not be in a pack`);
      covered.push(id);
    }
  }
  assert.deepEqual([...covered].sort(), [...premiumSounds].sort());
  assert.equal(new Set(covered).size, covered.length, 'no sound may be in two packs');
});

test('pack sounds unlock every premium recipe with exactly one pack each', () => {
  const freeIds = new Set(SOUNDS.filter((s) => isFreeSound(s.id)).map((s) => s.id));
  for (const recipe of RECIPES.filter((r) => r.premium)) {
    const unlocking = PACKS.filter((pack) => {
      const unlocked = new Set([...freeIds, ...soundsForPacks([pack.id])]);
      return isMixUnlocked(recipe.mix, unlocked);
    });
    assert.equal(
      unlocking.length, 1,
      `${recipe.name} must be unlocked by exactly one pack, got: ${unlocking.map((p) => p.id).join(',') || 'none'}`,
    );
  }
  // 不买任何包时，所有进阶配方都锁着。
  for (const recipe of RECIPES.filter((r) => r.premium)) {
    assert.equal(isMixUnlocked(recipe.mix, freeIds), false, `${recipe.name} must stay locked without a pack`);
  }
});

test('soundsForPacks unions packs, isMixUnlocked ignores near-silent channels', () => {
  const sounds = soundsForPacks(['focus-pack', 'rain-night-pack']);
  assert.ok(sounds.has('market') && sounds.has('thunder') && !sounds.has('insects'));
  assert.deepEqual([...soundsForPacks([])], []);
  assert.equal(isMixUnlocked({ rain: 0.5, market: 0.01 }, new Set(['rain'])), true);
  assert.equal(isMixUnlocked({ rain: 0.5, market: 0.5 }, new Set(['rain'])), false);
});
