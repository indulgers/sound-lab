// Scene music owns an independent transport. Video and UI animation never
// advance this clock; native Web Audio loops also survive background tabs.
const FADE_OUT = .35;
const FADE_IN = 1.15;
const clamp = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

function createBrowserContext() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) throw new Error('Audio playback is not supported in this browser.');
  return new Context({ sampleRate: 32000, latencyHint: 'playback' });
}

// Alter only the decoded tail. The first play preserves the complete opening;
// later iterations begin after the overlapped opening. All original files stay
// untouched. The final sample then leads into the next original head sample.
function prepareLoop(buffer, seconds) {
  if (!Number.isFinite(buffer.duration) || buffer.duration < .25) throw new Error('This audio file is too short to play.');
  const frames = Math.max(2, Math.min(Math.round(seconds * buffer.sampleRate), Math.floor(buffer.length / 3)));
  const start = buffer.length - frames;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < frames; i++) {
      const weight = (1 - Math.cos(Math.PI * i / (frames - 1))) / 2;
      data[start + i] = data[start + i] * (1 - weight) + data[i] * weight;
    }
  }
  return { buffer, loopStart: frames / buffer.sampleRate, loopEnd: buffer.length / buffer.sampleRate };
}

function loopOffset(elapsed, start, end) {
  return elapsed < end ? elapsed : start + (elapsed - end) % (end - start);
}

// Matches the restrained, synthetic diffuser used by the V3.1 listening tool.
// This is a generated room response, not a recording of the destination.
function createRoom(context) {
  const length = Math.floor(context.sampleRate * 2.2);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let smoothed = 0;
    for (let i = 0; i < length; i++) {
      smoothed = smoothed * .88 + (Math.random() - .5) * .12;
      data[i] = i / context.sampleRate < .04 ? 0 : smoothed * Math.exp(-i / (context.sampleRate * .52)) * .55;
    }
  }
  return buffer;
}

/**
 * Explicit-play controller for genuine scene stems and optional ambience.
 * `setScene(..., {play:false})` only stages a selection. Pass play:true to
 * continue listening when choosing another place. Browser dependencies can be
 * supplied by integration tests without adding test-only transport methods.
 */
export function createScenePlayer({
  onState = () => {}, claimAudio = () => {},
  createContext = createBrowserContext,
  fetchAudio = (...args) => globalThis.fetch(...args),
  now = Date.now,
} = {}) {
  let context = null, master = null, timerGain = null, selected = null;
  let levels = {}, masterLevel = .7, cached = null, active = null;
  let position = 0, generation = 0, disposed = false, wantsPlay = false;
  let pending = null, controller = null, status = 'idle';
  let sleepDeadline = null;
  const retiring = new Set();

  function emit(next, error = null) {
    if (disposed) return;
    status = next;
    onState({ status: next, sceneId: selected?.id ?? null, error });
  }

  function ensureContext() {
    if (!context) {
      context = createContext();
      master = context.createGain();
      master.gain.value = masterLevel;
      timerGain = context.createGain();
      timerGain.gain.value = 1;
      master.connect(timerGain).connect(context.destination);
    }
    return context;
  }

  function cancelLoading() {
    generation++;
    controller?.abort();
    controller = null;
    pending = null;
  }

  function hold(param, now) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {
      const value = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(value, now);
    }
  }

  function release(voice) {
    if (voice.released) return;
    voice.released = true;
    for (const source of voice.sources) {
      source.onended = null;
      source.disconnect();
    }
    for (const node of voice.nodes) node.disconnect();
    voice.sources.length = 0;
    voice.layers.length = 0;
    voice.nodes.length = 0;
    voice.gains.clear();
    retiring.delete(voice);
  }

  function stop(voice, fade = FADE_OUT) {
    if (!voice || voice.released) return;
    const now = context.currentTime;
    const end = Math.max(now, Math.min(now + fade, voice.timerStopAt ?? Infinity));
    hold(voice.envelope.gain, now);
    voice.envelope.gain.linearRampToValueAtTime(0, end);
    voice.stopAt = end;
    retiring.add(voice);
    let remaining = voice.sources.length;
    for (const source of voice.sources) {
      source.onended = () => { if (--remaining === 0) release(voice); };
      try { source.stop(voice.stopAt); } catch { /* An already ended source is safe to release. */ }
    }
    if (fade === 0 || !remaining) release(voice);
  }

  function elapsed(voice) {
    return voice.position + Math.max(0, Math.min(context.currentTime, voice.timerStopAt ?? Infinity) - voice.startedAt);
  }

  function timerExpired() {
    return sleepDeadline !== null && now() >= sleepDeadline;
  }

  function expireTimer() {
    wantsPlay = false;
    cancelLoading();
    if (active?.sceneId === selected?.id) position = elapsed(active);
    stop(active, 0); active = null;
    if (timerGain) {
      hold(timerGain.gain, context.currentTime);
      timerGain.gain.setValueAtTime(0, context.currentTime);
    }
    emit(selected ? 'paused' : 'idle');
  }

  function bindEnd(voice) {
    let remaining = voice.sources.length;
    for (const source of voice.sources) source.onended = () => {
      if (--remaining !== 0) return;
      if (active === voice && voice.timerStopAt !== null && sleepDeadline !== null) expireTimer();
      else release(voice);
    };
  }

  function makeSource(layer, gain, when, offset) {
    const source = context.createBufferSource();
    source.buffer = layer.buffer; source.loop = true;
    source.loopStart = layer.loopStart; source.loopEnd = layer.loopEnd;
    source.connect(gain);
    source.start(when, loopOffset(offset, layer.loopStart, layer.loopEnd));
    return source;
  }

  // AudioBufferSource.stop() cannot be cancelled. Replace only the native
  // sources at the same sample phase; gains and the room tail keep running.
  function removeNativeStop(voice) {
    const when = context.currentTime + .035;
    const offset = voice.position + Math.max(0, when - voice.startedAt);
    const previous = voice.sources;
    voice.sources = voice.layers.map(layer => makeSource(layer, voice.gains.get(layer.id), when, offset));
    voice.timerStopAt = null;
    bindEnd(voice);
    for (const source of previous) {
      source.onended = () => { source.onended = null; source.disconnect(); };
      source.stop(when);
    }
  }

  function armTimer(resetEnvelope = false) {
    if (timerExpired()) { expireTimer(); return; }
    if (!timerGain) return;
    const audioNow = context.currentTime;
    hold(timerGain.gain, audioNow);
    if (sleepDeadline === null) {
      timerGain.gain.linearRampToValueAtTime(1, audioNow + .06);
      return;
    }
    const remaining = Math.max(0, (sleepDeadline - now()) / 1000);
    const end = audioNow + remaining;
    if (remaining > 5) {
      timerGain.gain.linearRampToValueAtTime(1, audioNow + .06);
      timerGain.gain.setValueAtTime(1, end - 5);
    } else if (resetEnvelope) {
      timerGain.gain.linearRampToValueAtTime(1, audioNow + Math.min(.06, remaining / 2));
    }
    timerGain.gain.linearRampToValueAtTime(0, end);
    if (active) {
      active.timerStopAt = end;
      for (const source of active.sources) source.stop(end);
    }
  }

  function start(data) {
    if (active) { stop(active); active = null; }
    // A rapid pause/resume must also wait for the preceding fade, so two copies
    // of a music score never play on top of each other.
    const silenceAt = Math.max(context.currentTime, ...Array.from(retiring, voice => voice.stopAt));
    const when = silenceAt + .035;
    const envelope = context.createGain(); envelope.gain.value = 0;
    envelope.connect(master);
    const filter = context.createBiquadFilter(); filter.type = 'lowpass';
    filter.frequency.value = 11500 * Math.pow(2200 / 11500, clamp(selected.warmth, .5));
    const dry = context.createGain(); dry.gain.value = 1 - .15 * clamp(selected.space, .3);
    const convolver = context.createConvolver(); convolver.buffer = createRoom(context);
    const wet = context.createGain(); wet.gain.value = .32 * clamp(selected.space, .3);
    filter.connect(dry).connect(envelope);
    filter.connect(convolver).connect(wet).connect(envelope);
    const voice = { sceneId: selected.id, sources: [], gains: new Map(), nodes: [filter, dry, convolver, wet, envelope],
      envelope, layers: [...data.layers], startedAt: when, position, released: false, stopAt: null, timerStopAt: null };
    try {
      for (const layer of data.layers) {
        const gain = context.createGain(); gain.gain.value = levels[layer.id];
        gain.connect(filter);
        const source = makeSource(layer, gain, when, position);
        voice.sources.push(source); voice.nodes.push(gain); voice.gains.set(layer.id, gain);
      }
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(1, when + FADE_IN);
      active = voice;
      bindEnd(voice);
      armTimer();
    } catch (error) { stop(voice, 0); throw error; }
  }

  async function load(scene, token, signal) {
    const layers = [];
    // Decode sequentially to avoid keeping all compressed and decoded copies
    // in memory at once. The only lasting cache belongs to the selected scene.
    for (const layer of scene.layers) {
      if (disposed || token !== generation || signal.aborted) return null;
      const response = await fetchAudio(layer.file, { signal });
      if (!response.ok) throw new Error('The sound could not load. Please try again.');
      const bytes = await response.arrayBuffer();
      if (disposed || token !== generation || signal.aborted) return null;
      const buffer = await context.decodeAudioData(bytes);
      if (disposed || token !== generation || signal.aborted) return null;
      const overlap = Number.isFinite(layer.loopOverlapSeconds) && layer.loopOverlapSeconds > 0 ? layer.loopOverlapSeconds : 12;
      layers.push({ id: layer.id, ...prepareLoop(buffer, overlap) });
    }
    return { sceneId: scene.id, layers };
  }

  function play() {
    if (disposed || !selected) return Promise.resolve(false);
    if (timerExpired()) { expireTimer(); return Promise.resolve(false); }
    if (status === 'playing' && active?.sceneId === selected.id) return Promise.resolve(true);
    if (pending) return pending;
    wantsPlay = true;
    const token = ++generation;
    const scene = selected;
    const abort = new AbortController(); controller = abort;
    let resuming;
    try {
      ensureContext();
      claimAudio();
      // Resume in the original click event, before any fetch/decode await.
      resuming = context.resume();
    } catch (error) {
      wantsPlay = false; emit('error', error?.message || 'Audio could not start.');
      return Promise.resolve(false);
    }
    emit('loading');
    const task = (async () => {
      try {
        const [data] = await Promise.all([cached?.sceneId === scene.id ? cached : load(scene, token, abort.signal), resuming]);
        if (disposed || token !== generation || !wantsPlay || !data) return false;
        if (timerExpired()) { expireTimer(); return false; }
        cached = data;
        start(data);
        if (disposed || token !== generation || !wantsPlay || !active) return false;
        emit('playing');
        return true;
      } catch (error) {
        if (disposed || token !== generation) return false;
        abort.abort(); cached = null; wantsPlay = false;
        stop(active); active = null;
        emit('error', error?.message || 'Audio could not start. Please try again.');
        return false;
      } finally {
        if (token === generation) { pending = null; controller = null; }
      }
    })();
    pending = task;
    return task;
  }

  function pause() {
    if (disposed) return;
    wantsPlay = false;
    cancelLoading();
    if (active?.sceneId === selected?.id) position = elapsed(active);
    stop(active); active = null;
    emit(selected ? 'paused' : 'idle');
  }

  function setLevel(id, value) {
    if (disposed || !selected?.layers.some(layer => layer.id === id)) return;
    levels[id] = clamp(value);
    if (active?.sceneId === selected.id) active.gains.get(id)?.gain.setTargetAtTime(levels[id], context.currentTime, .045);
  }

  function setScene(scene, savedLevels = {}, { play: autoPlay = false } = {}) {
    if (disposed) return Promise.resolve(false);
    if (!scene?.id || !Array.isArray(scene.layers) || !scene.layers.length || scene.layers.some(layer => !layer.id || !layer.file)) {
      pause(); emit('error', 'This sound scene is unavailable.');
      return Promise.resolve(false);
    }
    const same = selected?.id === scene.id && selected.layers.length === scene.layers.length && selected.layers.every((layer, i) => layer.id === scene.layers[i].id && layer.file === scene.layers[i].file);
    if (!same) {
      cancelLoading();
      selected = scene; position = 0; cached = null; wantsPlay = false;
    }
    levels = Object.fromEntries(scene.layers.map(layer => [layer.id, clamp(savedLevels[layer.id], clamp(layer.defaultLevel))]));
    if (same && active?.sceneId === scene.id) for (const [id, value] of Object.entries(levels)) setLevel(id, value);
    if (autoPlay) return play();
    if (active || status === 'loading') pause();
    else emit('idle');
    return Promise.resolve(true);
  }

  function setMaster(value) {
    if (disposed) return;
    masterLevel = clamp(value, .7);
    master?.gain.setTargetAtTime(masterLevel, context.currentTime, .045);
    armTimer();
  }

  // Relative duration is converted once to a wall-clock deadline. Pausing,
  // changing scenes and video activity never extend it. Native automation and
  // source stops enforce it even when the UI thread cannot poll its timer.
  function setSleepTimer(millisecondsOrNull) {
    if (disposed) return null;
    const previous = sleepDeadline;
    if (timerExpired()) expireTimer();
    sleepDeadline = Number.isFinite(millisecondsOrNull) && millisecondsOrNull > 0 ? now() + millisecondsOrNull : null;
    if (sleepDeadline === null && previous !== null && active) removeNativeStop(active);
    armTimer(true);
    return sleepDeadline;
  }

  function dispose() {
    if (disposed) return;
    disposed = true; wantsPlay = false; cancelLoading();
    stop(active, 0); active = null;
    for (const voice of Array.from(retiring)) stop(voice, 0);
    cached = null; selected = null; levels = {};
    master?.disconnect();
    timerGain?.disconnect();
    context?.close().catch(() => {});
  }

  return { setScene, play, pause, setLevel, setMaster, setSleepTimer, dispose };
}
