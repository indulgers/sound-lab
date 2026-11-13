import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenePlayer } from '../src/scenes/player.mjs';

// Web Audio is a browser dependency. These boundary doubles retain the actual
// scheduled times, graph connections and decoded samples used by the player.
class Param {
  constructor(value = 1) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['ramp', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  cancelAndHoldAtTime(time) { this.events.push(['hold', time]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}
class AudioNode {
  constructor() { this.connections = []; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.connections = []; }
}
class Buffer {
  constructor(length = 180, sampleRate = 1, channels = 2) {
    this.length = length; this.sampleRate = sampleRate;
    this.duration = length / sampleRate; this.numberOfChannels = channels;
    this.data = Array.from({ length: channels }, () => Float32Array.from({ length }, (_, i) => i / length));
  }
  getChannelData(channel) { return this.data[channel]; }
}
class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 10; this.state = 'suspended'; this.destination = new AudioNode(); this.sources = []; this.gains = []; this.filters = []; this.convolvers = []; this.decode = () => new Buffer(); }
  createGain() { const n = new AudioNode(); n.gain = new Param(); this.gains.push(n); return n; }
  createBiquadFilter() { const n = new AudioNode(); n.frequency = new Param(); this.filters.push(n); return n; }
  createConvolver() { const n = new AudioNode(); this.convolvers.push(n); return n; }
  createBuffer(channels, frames, rate) { return new Buffer(frames, rate, channels); }
  createBufferSource() {
    const n = new AudioNode(); n.start = (when, offset) => { n.started = { when, offset }; };
    n.stop = when => { n.stopped = when; }; this.sources.push(n); return n;
  }
  async decodeAudioData(bytes) { return this.decode(bytes); }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}
const scene = (id = 'bali') => ({ id, warmth: .46, space: .37, layers: [
  { id: 'music', file: `/${id}-music.mp3`, defaultLevel: .85 },
  { id: 'texture', file: `/${id}-texture.mp3`, defaultLevel: .8 },
  { id: 'air', file: `/${id}-air.mp3`, defaultLevel: .55 },
] });
const response = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function setup(fetcher = async () => response()) {
  const context = new Context(), states = [], requests = []; let contexts = 0, claims = 0, wallNow = 1000000;
  const player = createScenePlayer({ onState: s => states.push(s), claimAudio: () => { claims++; },
    createContext: () => { contexts++; return context; },
    now: () => wallNow,
    fetchAudio: (url, options) => { requests.push({ url, options }); return fetcher(url, options); },
  });
  return { player, context, states, requests, get contexts() { return contexts; }, get claims() { return claims; },
    get wallNow() { return wallNow; }, set wallNow(value) { wallNow = value; } };
}

test('staging a scene remains silent and never loads assets or claims audio', async () => {
  const h = setup(); await h.player.setScene(scene(), { music: .4 });
  assert.equal(h.contexts, 0); assert.equal(h.requests.length, 0); assert.equal(h.claims, 0);
  assert.equal(h.states.at(-1).sceneId, 'bali'); assert.equal(h.states.at(-1).status, 'idle');
  h.player.dispose();
});

test('explicit playback starts real layers together and gains control only their named layer', async () => {
  const h = setup(); await h.player.setScene(scene(), { music: .4 }); await h.player.play();
  assert.equal(h.claims, 1); assert.equal(h.requests.length, 3);
  assert.equal(h.states.at(-1).status, 'playing');
  const sources = h.context.sources;
  assert.equal(sources.length, 3); assert.ok(sources.every(s => s.started.when === sources[0].started.when));
  assert.ok(sources.every(s => s.loop && s.loopStart === 12 && s.loopEnd === 180));
  assert.deepEqual(sources.map(s => s.connections[0].gain.value), [.4, .8, .55]);
  h.player.setLevel('texture', .23);
  assert.deepEqual(sources.map(s => s.connections[0].gain.value), [.4, .23, .55]);
  h.player.setLevel('texture', 8); assert.equal(sources[1].connections[0].gain.value, 1);
  h.player.setMaster(4); assert.equal(h.context.gains[0].gain.value, 1);
  assert.ok(h.context.filters[0].frequency.value > 2200 && h.context.filters[0].frequency.value < 11500);
  assert.ok(h.context.convolvers[0].buffer.duration >= 2);
  h.context.currentTime = 3601;
  assert.ok(sources.every(s => s.stopped === undefined), 'continuous listening must have no ten-minute or three-minute stop');
  h.player.dispose();
});

test('tail overlap keeps the original opening and joins the native loop at consecutive samples', async () => {
  const h = setup(); h.context.decode = () => new Buffer(60, 1);
  await h.player.setScene({ ...scene(), layers: [scene().layers[0]] }, {}, { play: true });
  const source = h.context.sources[0], data = source.buffer.getChannelData(0);
  assert.equal(source.loopStart, 12); assert.equal(source.loopEnd, 60);
  assert.equal(data[0], 0); assert.equal(data[5], Math.fround(5 / 60));
  assert.equal(data[48], Math.fround(48 / 60));
  assert.equal(data[59], Math.fround(11 / 60));
  assert.equal(data[12], Math.fround(12 / 60));
  h.player.dispose();
});

test('pause and resume use audio time and preserve phase after multiple native loops', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  const first = h.context.sources[0]; h.context.currentTime = first.started.when + 536;
  h.player.pause(); assert.equal(h.states.at(-1).status, 'paused');
  const pauseAt = h.context.currentTime; h.context.currentTime += 30;
  await h.player.play(); const resumed = h.context.sources.slice(-3);
  assert.ok(first.stopped >= pauseAt && first.stopped < pauseAt + 1);
  // First 180 seconds, then two 168-second loops and twenty seconds: offset 32.
  assert.ok(resumed.every(s => Math.abs(s.started.offset - 32) < .00001));
  assert.ok(resumed.every(s => s.started.when === resumed[0].started.when));
  assert.equal(h.requests.length, 3, 'resuming the current scene reuses its decoded buffers');
  h.player.dispose();
});

test('rapid pause and resume never overlap two scheduled copies of the same music', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  const old = h.context.sources[0]; h.context.currentTime = old.started.when + 20;
  h.player.pause(); await h.player.play();
  assert.ok(h.context.sources.at(-1).started.when >= old.stopped);
  h.player.dispose();
});

test('a superseded slow scene cannot start after the selected scene is already playing', async () => {
  const pending = deferred(); const h = setup(url => url.startsWith('/slow') ? pending.promise : response());
  const old = h.player.setScene(scene('slow'), {}, { play: true });
  await h.player.setScene(scene('new'), {}, { play: true });
  pending.resolve(response()); await old;
  assert.equal(h.states.at(-1).sceneId, 'new'); assert.equal(h.states.at(-1).status, 'playing');
  assert.equal(h.context.sources.length, 3); assert.equal(h.requests[0].options.signal.aborted, true);
  h.player.dispose();
});

test('new scene loads before stopping the current scene, then starts after its fade-out', async () => {
  const pending = deferred(); const h = setup(url => url.startsWith('/next') ? pending.promise : response());
  await h.player.setScene(scene(), {}, { play: true }); const old = h.context.sources[0];
  h.context.currentTime = 10; const transition = h.player.setScene(scene('next'), {}, { play: true });
  assert.equal(old.stopped, undefined); pending.resolve(response()); await transition;
  assert.ok(old.stopped >= 10 && old.stopped < 11);
  assert.ok(h.context.sources.at(-1).started.when >= old.stopped);
  assert.equal(h.states.at(-1).sceneId, 'next');
  h.player.dispose();
});

test('a failed asset is visible and a subsequent explicit play retries it', async () => {
  let failing = true; const h = setup(() => failing ? { ok: false, status: 503 } : response());
  await h.player.setScene(scene(), {}, { play: true });
  assert.equal(h.states.at(-1).status, 'error'); assert.ok(h.states.at(-1).error);
  assert.equal(h.context.sources.length, 0);
  failing = false; await h.player.play();
  assert.equal(h.states.at(-1).status, 'playing'); assert.equal(h.context.sources.length, 3);
  h.player.dispose();
});

test('gain changes made while decoding are applied to the eventual active layer', async () => {
  const pending = deferred(); const h = setup(); h.context.decode = () => pending.promise;
  const loading = h.player.setScene(scene(), {}, { play: true });
  h.player.setLevel('music', .19); pending.resolve(new Buffer()); await loading;
  assert.equal(h.context.sources[0].connections[0].gain.value, .19);
  h.player.dispose();
});

test('pause cancels pending playback and late decoded audio stays silent', async () => {
  const pending = deferred(); const h = setup(); h.context.decode = () => pending.promise;
  const loading = h.player.setScene(scene(), {}, { play: true });
  h.player.pause(); pending.resolve(new Buffer()); await loading;
  assert.equal(h.context.sources.length, 0); assert.equal(h.states.at(-1).status, 'paused');
  h.player.dispose();
});

test('dispose during loading closes audio and cannot be revived by late work or play calls', async () => {
  const pending = deferred(); const h = setup(() => pending.promise);
  const loading = h.player.setScene(scene(), {}, { play: true }); h.player.dispose();
  const stateCount = h.states.length; pending.resolve(response()); await loading; await h.player.play();
  assert.equal(h.context.state, 'closed'); assert.equal(h.context.sources.length, 0);
  assert.equal(h.states.length, stateCount);
});

test('sleep timer schedules native fade and source stops before JavaScript can be throttled', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  h.player.setSleepTimer(120000);
  assert.ok(h.context.sources.every(source => source.stopped === 120));
  const timer = h.context.gains[1].gain;
  assert.ok(timer.events.some(event => event[0] === 'ramp' && event[1] === 0 && event[2] === 120));
  h.context.currentTime = 140; h.wallNow += 140000;
  for (const source of [...h.context.sources]) source.onended?.();
  assert.equal(h.states.at(-1).status, 'paused');
  assert.equal(await h.player.play(), false, 'an expired timer must not restart audio when UI polling was delayed');
  assert.equal(h.context.sources.length, 3); h.player.dispose();
});

test('master volume changes keep the same deadline and do not overwrite the sleep fade', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  h.player.setSleepTimer(120000); h.context.currentTime = 30; h.wallNow += 30000;
  h.player.setMaster(.31);
  assert.equal(h.context.gains[0].gain.value, .31);
  assert.ok(h.context.sources.every(source => source.stopped === 120));
  assert.deepEqual(h.context.gains[1].gain.events.at(-1), ['ramp', 0, 120]);
  h.player.dispose();
});

test('cancelling a sleep timer keeps phase and mix while removing pending native stops', async () => {
  const h = setup(); await h.player.setScene(scene(), { music: .42 }, { play: true });
  h.player.setSleepTimer(120000); const old = [...h.context.sources];
  h.context.currentTime = 40; h.wallNow += 40000; h.player.setSleepTimer(null);
  const next = h.context.sources.slice(3);
  assert.equal(next.length, 3); assert.ok(next.every(source => source.stopped === undefined));
  assert.ok(next.every(source => Math.abs(source.started.offset - 40) < .00001));
  assert.equal(next[0].connections[0], old[0].connections[0], 'keep the original layer gain and effects graph');
  assert.equal(next[0].connections[0].gain.value, .42);
  assert.ok(old.every(source => source.stopped === next[0].started.when));
  assert.equal(h.requests.length, 3, 'cancelling does not reload music');
  assert.equal(h.states.at(-1).status, 'playing'); h.player.dispose();
});

test('sleep deadline survives scene changes and paused wall-clock time', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  h.player.setSleepTimer(120000); h.context.currentTime = 20; h.wallNow += 20000;
  h.player.pause(); h.context.currentTime = 50; h.wallNow += 30000;
  await h.player.play(); assert.ok(h.context.sources.slice(-3).every(source => source.stopped === 120));
  h.context.currentTime = 70; h.wallNow += 20000;
  await h.player.setScene(scene('chiang-mai'), {}, { play: true });
  assert.ok(h.context.sources.slice(-3).every(source => source.stopped === 120));
  h.player.dispose();
});

test('an idle or paused timer can expire without allocating or resuming audio', async () => {
  const h = setup(); await h.player.setScene(scene()); h.player.setSleepTimer(1000);
  h.wallNow += 1100; assert.equal(await h.player.play(), false);
  assert.equal(h.contexts, 0); assert.equal(h.requests.length, 0); assert.equal(h.claims, 0);
  h.player.setSleepTimer(null); assert.equal(await h.player.play(), true);
  h.player.setSleepTimer(1000); h.player.pause(); h.wallNow += 1100;
  assert.equal(await h.player.play(), false); assert.equal(h.context.sources.length, 3);
  h.player.dispose();
});

test('a timer that expires while decoding cannot start the delayed audio', async () => {
  const pending = deferred(); const h = setup(); h.context.decode = () => pending.promise;
  await h.player.setScene(scene()); h.player.setSleepTimer(1000);
  const loading = h.player.play(); h.wallNow += 1100;
  pending.resolve(new Buffer()); assert.equal(await loading, false);
  assert.equal(h.context.sources.length, 0); assert.equal(h.states.at(-1).status, 'paused');
  h.player.dispose();
});

test('pausing near a sleep deadline cannot push native stop beyond that deadline', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  h.player.setSleepTimer(1000); h.context.currentTime = .9; h.wallNow += 900;
  h.player.pause(); assert.ok(h.context.sources.every(source => source.stopped === 1));
  h.player.dispose();
});

test('cancelling after expiration stays paused even if native ended callbacks are delayed', async () => {
  const h = setup(); await h.player.setScene(scene(), {}, { play: true });
  h.player.setSleepTimer(1000); h.context.currentTime = 2; h.wallNow += 2000;
  h.player.setSleepTimer(null);
  assert.equal(h.context.sources.length, 3); assert.equal(h.states.at(-1).status, 'paused');
  assert.equal(await h.player.play(), true); assert.equal(h.context.sources.length, 6);
  h.player.dispose();
});

test('a timer expiring during graph construction cannot report playback after stopping it', async () => {
  const h = setup(); await h.player.setScene(scene()); h.player.setSleepTimer(1000);
  const createBuffer = h.context.createBuffer.bind(h.context);
  h.context.createBuffer = (...args) => { h.wallNow += 1100; return createBuffer(...args); };
  assert.equal(await h.player.play(), false);
  assert.equal(h.states.at(-1).status, 'paused');
  h.player.dispose();
});
