const assert = require('node:assert/strict');
const test = require('node:test');
const { createSession, freeMix, isFreeSound } = require('../src/listening-session.mjs');

function fixture() {
  let time = 1000;
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  return { open: () => createSession(storage, () => time), advance: ms => { time += ms; } };
}

test('only the first playback starts the 10-minute window', () => {
  const clock = fixture();
  const session = clock.open();
  assert.equal(session.remaining(), null);
  assert.equal(session.begin(), true);
  assert.equal(session.remaining(), 600000);
  clock.advance(90000);
  assert.equal(session.begin(), true);
  assert.equal(session.remaining(), 510000);
});

test('refresh and pause preserve the deadline; expiry requires a deliberate restart', () => {
  const clock = fixture();
  clock.open().begin();
  clock.advance(300000);
  const reopened = clock.open();
  assert.equal(reopened.remaining(), 300000);
  assert.equal(reopened.restart(), false);
  clock.advance(300000);
  assert.equal(reopened.remaining(), 0);
  assert.equal(reopened.begin(), false);
  assert.equal(reopened.restart(), true);
  assert.equal(clock.open().remaining(), 600000);
});

test('without storage the current page still enforces the same window', () => {
  let time = 0;
  const session = createSession({ getItem() { throw Error(); }, setItem() { throw Error(); } }, () => time);
  assert.equal(session.begin(), true);
  time = 600001;
  assert.equal(session.begin(), false);
});

test('free playback rejects premium, unknown and invalid mix levels', () => {
  assert.equal(isFreeSound('rain'), true);
  assert.equal(isFreeSound('harp'), false);
  assert.deepEqual(freeMix({rain: .8, guitar: .3, harp: .8, unknown: 1, wind: -1, piano: NaN}), {rain: .8, guitar: .3});
});
