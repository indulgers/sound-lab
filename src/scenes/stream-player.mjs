/**
 * Sound Cocktail streamed Journey transport.
 * Only small media-element buffers are held by the browser: no 15-minute
 * decodeAudioData arrays. Three stems run through one Web Audio clock with
 * periodic drift correction and crossfaded 15-minute programme repeats.
 * Silent until a real user starts playback. Video never controls this clock.
 */
import { SLEEP_TIMER_FADE_SECONDS, fadeSchedule, applyFadeSchedule } from '../sleep-timer.mjs';

const clamp = (v, fallback = 0) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : fallback;
const CROSSFADE_SECONDS = 9;
const FADE_SECONDS = 1.1;

export function densityGate(positionSeconds, energy = .5, seed = 11) {
  const density = clamp(energy, .5);
  if (density >= .97) return 1;
  // Low musical activity removes *whole passages* of the details stem,
  // rather than turning the entire track down. Changes fade over 2s.
  const slot = Math.max(0, Math.floor(positionSeconds / 23));
  // Avalanche hash: adjacent 23s passages should not all get the same gate.
  let x = (slot + 1) ^ Math.imul(seed, 374761393);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  const hash = ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  const threshold = .26 + .74 * density;
  return hash < threshold ? 1 : 0;
}

export function suggestedChapter(position, duration = 900) {
  return Math.min(4, Math.max(0, Math.floor(Math.max(0, position) / Math.max(1, duration / 5))));
}

function createContext() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error('AudioContext unavailable');
  return new AudioContextClass({ latencyHint: 'playback' });
}

export function createStreamingJourneyPlayer({ onState = () => {}, claimAudio = () => {},
  newContext = createContext, newMedia = () => new Audio(), now = () => Date.now(),
  interval = (cb, delay) => setInterval(cb, delay), clearIntervalFn = id => clearInterval(id),
} = {}) {
  let context = null, selected = null, levels = {}, current = null, next = null;
  let master = null, limiter = null, softFilter = null, shelf = null, dry = null, wet = null, delay = null;
  let eqLow = null, eqMid = null, eqHigh = null, widthMatrix = null, room = null;
  const advanced = {bass:.5,mid:.5,treble:.5,width:.5,reverb:.5};
  let targetMaster = .7, warmth = .55, space = .35, energy = .4, nature = .35;
  let playing = false, disposed = false, generation = 0, ticker = null;
  let timerDeadline = null, timerFadeSeconds = SLEEP_TIMER_FADE_SECONDS, startedAt = 0, totalElapsed = 0, error = null, cycle = 0;
  const retired = new Set();
  const emit = (status, problem = null) => onState({
    status, sceneId: selected?.id ?? null, error: problem,
    positionSeconds: current?.parts[0]?.media?.currentTime ?? 0,
    elapsedSeconds: totalElapsed + (playing ? Math.max(0, (now() - startedAt) / 1000) : 0),
    chapter: suggestedChapter(current?.parts[0]?.media?.currentTime || 0, selected?.durationSeconds || 900),
  });

  function ensureGraph() {
    if (context) return context;
    context = newContext();
    master = context.createGain(); master.gain.value = targetMaster;
    softFilter = context.createBiquadFilter(); softFilter.type = 'lowpass';
    shelf = context.createBiquadFilter(); shelf.type = 'lowshelf'; shelf.frequency.value = 260;
    dry = context.createGain(); wet = context.createGain(); delay = context.createDelay(0.5); delay.delayTime.value = .085;
    room = context.createConvolver();
    const irLength = Math.floor(context.sampleRate * 1.5);
    const ir = context.createBuffer(2, irLength, context.sampleRate);
    for (let ch=0;ch<2;ch++) {
      const samples = ir.getChannelData(ch);
      let state = 101 + ch * 7919;
      for (let i=0;i<irLength;i++) {
        state = Math.imul(state ^ (state>>>13), 1664525) + 1013904223 | 0;
        const noise = (state / 2147483648) * .22;
        samples[i] = (i < .025*context.sampleRate ? 0 : noise) * Math.pow(1-i/irLength,3.5);
      }
    }
    room.buffer = ir;
    dry.connect(shelf); delay.connect(room).connect(wet); wet.connect(shelf);
    eqLow = context.createBiquadFilter(); eqLow.type='lowshelf'; eqLow.frequency.value=200;
    eqMid = context.createBiquadFilter(); eqMid.type='peaking'; eqMid.frequency.value=1100; eqMid.Q.value=.82;
    eqHigh = context.createBiquadFilter(); eqHigh.type='highshelf'; eqHigh.frequency.value=5700;
    const split = context.createChannelSplitter(2), merge = context.createChannelMerger(2);
    const lToL=context.createGain(),lToR=context.createGain(),rToL=context.createGain(),rToR=context.createGain();
    split.connect(lToL,0);split.connect(lToR,0);split.connect(rToL,1);split.connect(rToR,1);
    lToL.connect(merge,0,0);rToL.connect(merge,0,0);
    lToR.connect(merge,0,1);rToR.connect(merge,0,1);
    widthMatrix={lToL,lToR,rToL,rToR};
    limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 10; limiter.ratio.value = 10;
    limiter.attack.value = .003; limiter.release.value = .22;
    shelf.connect(eqLow).connect(eqMid).connect(eqHigh).connect(split);
    merge.connect(softFilter).connect(limiter).connect(master).connect(context.destination);
    applyTone();
    return context;
  }

  function ramp(param, value, time = .08) {
    if (!context) { param.value = value; return; }
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, Math.max(.01, time));
  }
  function applyTone() {
    if (!context) return;
    ramp(softFilter.frequency, 6000 + (1 - warmth) * 11000, .15);
    ramp(shelf.gain, (warmth - .5) * 7, .15);
    ramp(dry.gain, 1, .09);
    ramp(wet.gain, space * (.10 + advanced.reverb*.64), .25);
    ramp(eqLow.gain, (advanced.bass-.5)*10, .15);
    ramp(eqMid.gain, (advanced.mid-.5)*8, .15);
    ramp(eqHigh.gain, (advanced.treble-.5)*10, .15);
    if (widthMatrix) {
      const side = .6 + .8*advanced.width;
      const direct = (1+side)/2, cross = (1-side)/2;
      ramp(widthMatrix.lToL.gain,direct,.15);ramp(widthMatrix.rToR.gain,direct,.15);
      ramp(widthMatrix.lToR.gain,cross,.15);ramp(widthMatrix.rToL.gain,cross,.15);
    }
  }
  function makeDeck(scene) {
    const c = ensureGraph(), output = c.createGain(); output.gain.value = 0;
    output.connect(dry); output.connect(delay);
    const parts = scene.layers.map(layer => {
      const media = newMedia();
      media.preload = 'auto'; media.crossOrigin = 'anonymous'; media.loop = true;
      media.src = layer.file;
      const mediaSource = c.createMediaElementSource(media);
      const gain = c.createGain(); gain.gain.value = 0;
      mediaSource.connect(gain).connect(output);
      return { id: layer.id, media, mediaSource, gain, layer };
    });
    return { sceneId: scene.id, output, parts, mixLevels: { ...levels }, target: 1, started: false, retired: false };
  }
  function applyDeck(deck) {
    if (!deck || !context) return;
    const p = deck.parts[0]?.media.currentTime || 0;
    for (const part of deck.parts) {
      const isSpeech = Boolean(part.layer.containsSpeech);
      const isNature = !isSpeech && (part.id === 'atmosphere' || part.id === 'ambience' || part.id === 'air');
      const isDetails = part.id === 'details' || part.id === 'texture';
      // Each deck retains its own mix while scene transitions overlap.
      // Otherwise changing the selected scene would abruptly rebalance
      // the outgoing music before its 9-second fade has finished.
      const base = clamp(deck.mixLevels[part.id], clamp(part.layer.defaultLevel, .55));
      const passage = isDetails ? densityGate(p, energy, sceneSeed()) : 1;
      // Natural-air controls must never turn conversation recordings up.
      // Passage changes should emerge gradually, not interrupt focused work.
      if (isDetails && part.lastPassage !== undefined && part.lastPassage !== passage) {
        part.gateTransitionUntil = context.currentTime + 2.7;
      }
      part.lastPassage = passage;
      const level = base * (isNature ? .55 + nature * .9 : 1) * passage;
      const inTransition = isDetails && context.currentTime < (part.gateTransitionUntil || 0);
      ramp(part.gain.gain, level, inTransition ? 1.2 : .09);
    }
  }
  function sceneSeed() {
    return [...(selected?.id || '')].reduce((v, c) => v + c.charCodeAt(0), 7);
  }
  function retire(deck) {
    if (!deck || deck.retired) return;
    deck.retired = true;
    for (const part of deck.parts) {
      part.media.pause(); part.media.removeAttribute('src');
      try { part.media.load(); } catch { /* element detached */ }
      part.mediaSource.disconnect(); part.gain.disconnect();
    }
    deck.output.disconnect(); retired.delete(deck);
  }
  function fadeDeck(deck, endValue, seconds) {
    if (!deck || !context) return;
    const g = deck.output.gain, t = context.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(endValue, t + seconds);
  }
  async function startDeck(deck, isReplacement = false) {
    if (!deck || disposed) return false;
    // Setting currentTime before metadata can throw. Music starts immediately,
    // and all lanes are synced once metadata is decoded.
    const results = await Promise.allSettled(deck.parts.map(part => part.media.play()));
    if (results.some(r => r.status === 'rejected')) {
      const first = results.find(r => r.status === 'rejected');
      throw first.reason || new Error('Music could not play');
    }
    deck.started = true; applyDeck(deck);
    fadeDeck(deck, 1, isReplacement ? CROSSFADE_SECONDS : FADE_SECONDS);
    return true;
  }
  // The sleep timer fades the master out over the last `timerFadeSeconds`
  // (default 2 minutes) and the ticker pauses at the deadline. A 4-second
  // fade was a cliff, not a drift-off — see src/sleep-timer.mjs.
  function setTimerAutomation() {
    if (!context || !master) return;
    const g = master.gain, t = context.currentTime;
    if (timerDeadline) {
      const schedule = fadeSchedule({ deadlineMs: timerDeadline, nowMs: now(), audioNow: t, fadeSeconds: timerFadeSeconds });
      if (!schedule) { g.cancelScheduledValues(t); g.setValueAtTime(0, t); return; }
      applyFadeSchedule(g, schedule, targetMaster, t);
    } else {
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.setTargetAtTime(targetMaster, t, .08);
    }
  }
  async function play() {
    if (disposed || !selected) return false;
    if (timerDeadline && now() >= timerDeadline) { pause(); return false; }
    if (playing && current) return true;
    const token = ++generation;
    try {
      ensureGraph();
      claimAudio();
      const resume = context.resume();
      if (!current || current.sceneId !== selected.id) {
        if (current) retire(current);
        current = makeDeck(selected);
      }
      emit('loading');
      // Begin media play in the click handler before awaiting context resume.
      const begin = startDeck(current);
      await Promise.all([resume, begin]);
      if (token !== generation || disposed) return false;
      playing = true; startedAt = now(); setTimerAutomation();
      if (!ticker) ticker = interval(tick, 650);
      emit('playing'); return true;
    } catch (e) {
      error = String(e?.message || e); playing = false;
      if (current) { retire(current); current = null; }
      emit('error', error); return false;
    }
  }
  function pause() {
    if (playing) totalElapsed += Math.max(0, (now() - startedAt) / 1000);
    generation++; playing = false;
    for (const deck of [current, next]) {
      if (!deck) continue;
      for (const part of deck.parts) part.media.pause();
    }
    if (next) { retire(next); next = null; }
    if (ticker) { clearIntervalFn(ticker); ticker = null; }
    emit(selected ? 'paused' : 'idle');
  }
  function tick() {
    if (!playing || !current) return;
    if (timerDeadline && now() >= timerDeadline) {
      pause(); timerDeadline = null; setTimerAutomation(); emit('paused'); return;
    }
    const lead = current.parts[0]?.media;
    const t = Number.isFinite(lead?.currentTime) ? lead.currentTime : 0;
    for (const part of current.parts.slice(1)) {
      if (Math.abs(part.media.currentTime - t) > .16 && part.media.readyState > 0) {
        try { part.media.currentTime = t; } catch { /* wait for metadata */ }
      }
    }
    applyDeck(current);
    if (next) { // keep synchronized crossfade decks
      applyDeck(next);
      const complete = next.parts[0].media.currentTime >= CROSSFADE_SECONDS;
      if (complete) { const old = current; current = next; next = null; cycle++; retire(old); }
    } else {
      const duration = selected.durationSeconds || lead.duration;
      if (Number.isFinite(duration) && duration > CROSSFADE_SECONDS + 15 && t >= duration - CROSSFADE_SECONDS - 1) {
        next = makeDeck(selected);
        void startDeck(next, true).then(() => fadeDeck(current, 0, CROSSFADE_SECONDS)).catch(err => {
          if (next) { retire(next); next = null; }
          error = String(err?.message || err); // fallback: current media loops independently
        });
      }
    }
    emit('playing');
  }
  async function setScene(scene, savedLevels = {}, { play: autoPlay = false } = {}) {
    if (disposed) return false;
    if (!scene?.id || !Array.isArray(scene.layers) || scene.layers.length < 1 ||
        scene.layers.some(layer => !layer.file || !layer.id)) {
      error = 'This journey has no playable stems'; emit('error', error); return false;
    }
    const nextLevels = Object.fromEntries(scene.layers.map(layer => [
      layer.id, clamp(savedLevels[layer.id], clamp(layer.defaultLevel, .55)),
    ]));
    const same = selected?.id === scene.id && selected?.journeyId === scene.journeyId
      && selected?.audioVersion === scene.audioVersion
      && selected.layers.length === scene.layers.length
      && selected.layers.every((layer, i) => layer.id === scene.layers[i].id && layer.file === scene.layers[i].file);

    // Changing just the mix should never trigger a new audio play() or restart.
    if (same) {
      selected = scene; levels = nextLevels;
      if (current) current.mixLevels = { ...nextLevels };
      if (next) next.mixLevels = { ...nextLevels };
      applyDeck(current); applyDeck(next);
      if (autoPlay && !playing) return play();
      emit(playing ? 'playing' : 'idle');
      return true;
    }

    // Keep the active programme audible while the next programme actually
    // starts. Both decks share the existing Web Audio graph and master timer.
    // This is a real crossfade, not pause/replace/play with a short silence.
    if (autoPlay && playing && current && context) {
      const previousSelected = selected, previousLevels = levels;
      const token = ++generation;
      // Rapid changes during a programme-loop or scene transition: settle
      // the already audible incoming deck before starting another one.
      if (next) {
        const retiring = current;
        current = next; next = null;
        retire(retiring);
        fadeDeck(current, 1, .15);
      }
      const outgoing = current;
      selected = scene; levels = nextLevels;
      const incoming = makeDeck(scene);
      next = incoming;
      try {
        await startDeck(incoming, true);
        if (disposed || generation !== token || next !== incoming) {
          retire(incoming);
          return false;
        }
        fadeDeck(outgoing, 0, CROSSFADE_SECONDS);
        emit('playing');
        return true;
      } catch (err) {
        if (next === incoming) next = null;
        retire(incoming);
        // A failed new track must never silence the working old track.
        if (!disposed && token === generation) {
          selected = previousSelected;
          levels = previousLevels;
          fadeDeck(outgoing, 1, FADE_SECONDS);
          emit('playing');
        }
        return false;
      }
    }

    selected = scene; levels = nextLevels;
    pause();
    if (current) retire(current);
    current = null;
    if (autoPlay) return play();
    emit('idle');
    return true;
  }
  function setLevel(id, value) {
    levels[id] = clamp(value, levels[id] || .5);
    // During a scene transition, do not mutate the outgoing deck's balance;
    // only the incoming deck should follow the editor.
    if (current && (!next || selected?.id === current.sceneId)) current.mixLevels[id] = levels[id];
    if (next) next.mixLevels[id] = levels[id];
    applyDeck(current); applyDeck(next);
  }
  function setMaster(value) { targetMaster = clamp(value, .7); setTimerAutomation(); }
  function setMixControls(values = {}) {
    if ('warmth' in values) warmth = clamp(values.warmth, warmth);
    if ('space' in values) space = clamp(values.space, space);
    if ('energy' in values) energy = clamp(values.energy, energy);
    if ('nature' in values) nature = clamp(values.nature, nature);
    for(const key of Object.keys(advanced)) if (key in values) advanced[key]=clamp(values[key],advanced[key]);
    applyTone(); applyDeck(current); applyDeck(next);
  }
  function setSleepTimer(ms, fadeSeconds = SLEEP_TIMER_FADE_SECONDS) {
    timerFadeSeconds = Number.isFinite(fadeSeconds) && fadeSeconds > 0 ? fadeSeconds : SLEEP_TIMER_FADE_SECONDS;
    timerDeadline = Number.isFinite(ms) && ms > 0 ? now() + ms : null;
    setTimerAutomation(); return timerDeadline;
  }
  function dispose() {
    if (disposed) return; pause(); retired.forEach(retire); retire(current); retire(next);
    if (context) void context.close(); disposed = true; current = next = null; selected = null;
  }
  return { setScene, play, pause, setLevel, setMaster, setMixControls, setSleepTimer, dispose,
    getPosition: () => current?.parts[0]?.media?.currentTime || 0,
    getPlaying: () => playing,
    getElapsedSeconds: () => totalElapsed + (playing ? Math.max(0, (now() - startedAt) / 1000) : 0),
  };
}