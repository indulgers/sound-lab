const assert = require('node:assert/strict');
const test = require('node:test');
const { PACKS, findPack } = require('../src/packs.mjs');

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
