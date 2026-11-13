import test from 'node:test';
import assert from 'node:assert/strict';
import { createStreamingJourneyPlayer, densityGate, suggestedChapter } from '../src/scenes/stream-player.mjs';

class Param {
  constructor(value = 1) { this.value=value; this.events=[]; }
  setValueAtTime(value,time) { this.value=value; this.events.push(['set',value,time]); }
  setTargetAtTime(value,time,constant) { this.value=value; this.events.push(['target',value,time,constant]); }
  linearRampToValueAtTime(value,time) { this.value=value; this.events.push(['linear',value,time]); }
  cancelScheduledValues(time) { this.events.push(['cancel',time]); }
}
class Node {
  constructor() { this.gain=new Param(); this.frequency=new Param(); this.Q=new Param(); this.delayTime=new Param(); this.threshold=new Param(); this.knee=new Param();this.ratio=new Param();this.attack=new Param();this.release=new Param();this.connections=[]; }
  connect(node) { this.connections.push(node);return node; }
  disconnect() { this.connections.length=0; }
}
class TestMedia {
  constructor() { this.currentTime=0;this.duration=900;this.readyState=3;this.loop=false;this.paused=true;this.events=[]; }
  play() { this.paused=false;this.events.push('play');return Promise.resolve(); }
  pause() { this.paused=true;this.events.push('pause'); }
  load() {}
  removeAttribute() {}
}
class TestContext {
  constructor() { this.sampleRate=1000;this.currentTime=10;this.destination=new Node();this.gains=[];this.sources=[];this.compressor=null;this.state='suspended'; }
  createGain() { const n=new Node();this.gains.push(n);return n; }
  createBiquadFilter() { return new Node(); }
  createDelay() { return new Node(); }
  createConvolver() { return new Node(); }
  createChannelSplitter() { return new Node(); }
  createChannelMerger() { return new Node(); }
  createBuffer(channels, length, sampleRate) {
    const data=Array.from({length:channels},()=>new Float32Array(length));
    return {numberOfChannels:channels,length,sampleRate,getChannelData:c=>data[c]};
  }
  createDynamicsCompressor() { this.compressor=new Node();return this.compressor; }
  createMediaElementSource(media) { const source=new Node();this.sources.push({media,source});return source; }
  resume() { this.state='running';return Promise.resolve(); }
  close() { this.state='closed';return Promise.resolve(); }
}
const scene={id:'chiang-mai',journeyId:'focus-chiang-mai',durationSeconds:900,layers:[
  {id:'harmony',file:'/assets/audio/journeys/chiang-mai-harmony.mp3',defaultLevel:.7},
  {id:'details',file:'/assets/audio/journeys/chiang-mai-details.mp3',defaultLevel:.4},
  {id:'atmosphere',file:'/assets/audio/journeys/chiang-mai-atmosphere.mp3',defaultLevel:.3},
]};
function setup() {
  const context=new TestContext(),media=[],states=[], timers=[];
  let wall=1_000_000,claims=0;
  const player=createStreamingJourneyPlayer({newContext:()=>context,newMedia:()=>{const m=new TestMedia();media.push(m);return m;},
    now:()=>wall,onState:s=>states.push(s),claimAudio:()=>{claims++;},
    interval:cb=>{timers.push(cb);return timers.length;},clearIntervalFn:()=>{}});
  return {player,context,media,states,timers,get claims(){return claims;},time:v=>wall=v};
}

test('streaming transport stages silently and starts aligned media elements, never full decode', async () => {
  const h=setup();await h.player.setScene(scene, {harmony:.6,details:.35,atmosphere:.25});
  assert.equal(h.media.length,0);
  assert.equal(h.context.sources.length,0);
  assert.equal(await h.player.play(),true);
  assert.equal(h.context.sources.length,3);
  assert.equal(h.claims,1);
  assert.ok(h.media.every(m=>m.loop && m.events.includes('play')));
  assert.equal(h.context.compressor.ratio.value,10);
  assert.equal(h.states.at(-1).status,'playing');
  h.player.setMixControls({warmth:.8,space:.7,energy:0,nature:.9,bass:.1,mid:.8,treble:.2,width:1,reverb:.9});
  h.player.setLevel('harmony',.3);
  assert.equal(h.player.getPlaying(),true);
  h.player.dispose();assert.equal(h.context.state,'closed');
});

test('transport can crossfade near 15-minute boundary without decoding entire tracks', async () => {
  const h=setup();await h.player.setScene(scene);await h.player.play();
  h.media.slice(0,3).forEach(m=>m.currentTime=890);
  h.timers[0]();await Promise.resolve();await Promise.resolve();
  assert.equal(h.media.length,6,'next programme must be scheduled');
  assert.ok(h.media.slice(3).every(m=>m.events.includes('play')));
  h.media.slice(3).forEach(m=>m.currentTime=10);
  h.timers[0]();
  assert.ok(h.media.slice(0,3).every(m=>m.paused),'old programme should be retired');
  h.player.dispose();
});

test('elapsed focus time pauses with listening while sleep timer does not extend', async () => {
  const h=setup();await h.player.setScene(scene);await h.player.play();
  h.time(1_025_000);
  assert.ok(Math.abs(h.player.getElapsedSeconds()-25)<.1);
  h.player.pause();
  h.time(1_090_000);
  assert.ok(Math.abs(h.player.getElapsedSeconds()-25)<.1);
  await h.player.play();
  h.time(1_095_000);
  assert.ok(Math.abs(h.player.getElapsedSeconds()-30)<.1);
  const deadline=h.player.setSleepTimer(2000);
  assert.equal(deadline,1_097_000);
  h.time(1_100_000);h.timers.at(-1)();
  assert.equal(h.player.getPlaying(),false);
  h.player.dispose();
});
test('passage activity gate and chapter boundaries are deterministic',()=>{
  assert.equal(densityGate(90,1,2),1);
  assert.equal(densityGate(90,.25,2),densityGate(90,.25,2));
  assert.equal(suggestedChapter(890),4);
});

test('A/B original switch reloads the actual audio files within the same Journey', async () => {
  const h=setup();
  const v32={...scene,audioVersion:'3.2'};
  await h.player.setScene(v32);
  await h.player.play();
  const firstFiles=h.media.map(x=>x.src);
  assert.equal(h.media.length,3);
  const v31={...scene,audioVersion:'3.1',durationSeconds:180,layers:scene.layers.map(layer=>({
    ...layer,file:layer.file.replace('/journeys/','/scenes/').replace('chiang-mai-','chiang-mai-original-')
  }))};
  assert.notDeepEqual(v31.layers.map(x=>x.file),firstFiles);
  await h.player.setScene(v31,{}, {play:true});
  assert.equal(h.media.length,6,'must start a new set of media elements');
  assert.deepEqual(h.media.slice(3).map(x=>x.src),v31.layers.map(x=>x.file));
  assert.ok(h.media.slice(0,3).every(x=>x.paused));
  assert.equal(h.player.getPlaying(),true);
  h.player.dispose();
});

test('Nature control never amplifies the opt-in cafe conversation lane', async () => {
  const h=setup();
  const withSpeech={...scene,layers:[...scene.layers,{
    id:'ambience',file:'/assets/audio/cafe.mp3',containsSpeech:true,defaultLevel:0
  }]};
  await h.player.setScene(withSpeech,{ambience:.045});
  await h.player.play();
  const speechSource=h.context.sources.find(x=>x.media.src==='/assets/audio/cafe.mp3');
  assert.ok(speechSource);
  const gain=speechSource.source.connections[0].gain;
  assert.ok(Math.abs(gain.value-.045)<1e-6);
  h.player.setMixControls({nature:0});
  assert.ok(Math.abs(gain.value-.045)<1e-6);
  h.player.setMixControls({nature:1});
  assert.ok(Math.abs(gain.value-.045)<1e-6,'Nature cannot amplify human speech');
  h.player.setLevel('ambience',0);
  assert.equal(gain.value,0,'quiet button must fully mute crowd');
  h.player.dispose();
});
