/**
 * Sound Cocktail streamed Journey transport.
 * Only small media-element buffers are held by the browser: no 15-minute
 * decodeAudioData arrays. Three stems run through one Web Audio clock with
 * periodic drift correction and crossfaded 15-minute programme repeats.
 * Silent until a real user starts playback. Video never controls this clock.
 */
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
  let targetMaster = .7, warmth = .55, space = .35, energy = .4, nature = .35;
  let playing = false, disposed = false, generation = 0, ticker = null;
  let timerDeadline = null, startedAt = 0, totalElapsed = 0, error = null, cycle = 0;
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
    dry.connect(shelf); delay.connect(wet); wet.connect(shelf);
    limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 10; limiter.ratio.value = 10;
    limiter.attack.value = .003; limiter.release.value = .22;
    shelf.connect(softFilter).connect(limiter).connect(master).connect(context.destination);
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
    ramp(wet.gain, space * .34, .25);
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
    return { sceneId: scene.id, output, parts, target: 1, started: false, retired: false };
  }
  function applyDeck(deck) {
    if (!deck || !context) return;
    const p = deck.parts[0]?.media.currentTime || 0;
    for (const part of deck.parts) {
      const isNature = part.id === 'atmosphere' || part.id === 'ambience' || part.id === 'air';
      const isDetails = part.id === 'details' || part.id === 'texture';
      const base = clamp(levels[part.id], clamp(part.layer.defaultLevel, .55));
      const level = base * (isNature ? .55 + nature * .9 : 1)
        * (isDetails ? densityGate(p, energy, sceneSeed()) : 1);
      ramp(part.gain.gain, level, isDetails ? .45 : .09);
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
  function setTimerAutomation() {
    if (!context || !master) return;
    const g = master.gain, t = context.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    if (timerDeadline) {
      const seconds = Math.max(0, (timerDeadline - now()) / 1000);
      if (seconds <= 0) { g.setValueAtTime(0, t); return; }
      g.setTargetAtTime(targetMaster, t, .12);
      if (seconds > 4.5) g.setValueAtTime(targetMaster, t + seconds - 4);
      g.linearRampToValueAtTime(0, t + seconds);
    } else g.setTargetAtTime(targetMaster, t, .08);
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
    const same = selected?.id === scene.id && selected?.journeyId === scene.journeyId;
    selected = scene;
    levels = Object.fromEntries(scene.layers.map(layer => [layer.id, clamp(savedLevels[layer.id], clamp(layer.defaultLevel, .55))]));
    if (!same) {
      const wasPlaying = playing;
      pause(); if (current) retire(current); current = null;
      if (wasPlaying && autoPlay) return play();
    } else applyDeck(current);
    if (autoPlay) return play();
    emit('idle'); return true;
  }
  function setLevel(id, value) { levels[id] = clamp(value, levels[id] || .5); applyDeck(current); applyDeck(next); }
  function setMaster(value) { targetMaster = clamp(value, .7); setTimerAutomation(); }
  function setMixControls(values = {}) {
    if ('warmth' in values) warmth = clamp(values.warmth, warmth);
    if ('space' in values) space = clamp(values.space, space);
    if ('energy' in values) energy = clamp(values.energy, energy);
    if ('nature' in values) nature = clamp(values.nature, nature);
    applyTone(); applyDeck(current); applyDeck(next);
  }
  function setSleepTimer(ms) {
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