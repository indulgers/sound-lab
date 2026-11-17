/**
 * Sleep-timer UI wiring guards. The journey panel and the mixer bar are
 * React/DOM surfaces with no component test harness, so — like
 * engine-guards.test.mjs — these tests scan the source for the wiring
 * that must exist: the shared options, the end-of-journey choice, the
 * persisted choice, the mixer select + countdown, and the copy keys in
 * both languages.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scene = readFileSync(join(root, 'src/scenes/SceneExperience.jsx'), 'utf8');
const mixer = readFileSync(join(root, 'src/MixerSection.jsx'), 'utf8');
const locale = readFileSync(join(root, 'src/locale.mjs'), 'utf8');
const engine = readFileSync(join(root, 'src/sound-lab.mjs'), 'utf8');

test('sleep timer UI: journey panel offers minutes plus end of journey', () => {
  assert.ok(scene.includes('SLEEP_TIMER_OPTIONS_MINUTES'), 'journey panel uses the shared options');
  assert.ok(scene.includes("'journey'"), 'journey panel offers end of journey');
  assert.ok(scene.includes('C.timerJourney'), 'journey option has its own copy key');
  assert.ok(scene.includes('sleepChoiceToMs'), 'choice is converted through the shared helper');
  assert.ok(scene.includes('sleepMinutes'), 'choice is persisted');
  assert.ok(scene.includes('last 2 minutes') && scene.includes('最后两分钟'), 'fade length is stated in the panel copy, both languages');
});

test('sleep timer UI: mixer bar has a select and countdown in both languages', () => {
  assert.ok(mixer.includes('sleepTimerSelect'), 'mixer bar has the timer select');
  assert.ok(mixer.includes('sleepTimerRead'), 'mixer bar has the timer countdown');
  for (const key of ['sleepTimer:', 'sleepOff:', 'sleepMinutes:', 'sleepDone:']) {
    assert.ok(locale.includes(key), `mixer.${key.slice(0, -1)} exists in locale.mjs`);
  }
  assert.ok((locale.match(/sleepTimer:/g) || []).length >= 2, 'sleepTimer copy exists in both languages');
});

test('sleep timer engine: dedicated gain, long fade, session subsumption', () => {
  assert.ok(engine.includes('sleepGain=AC.createGain()'), 'dedicated sleepGain node exists');
  assert.ok(engine.includes('sessionGain.connect(sleepGain); sleepGain.connect(master)'), 'sleepGain sits between sessionGain and master');
  assert.ok(engine.includes('function setSleepTimer('), 'setSleepTimer exists');
  assert.ok(engine.includes('function armSleepGain('), 'armSleepGain exists');
  assert.ok(engine.includes("t(L(),'mixer.sleepDone')"), 'sleep expiry toasts in the current language');
  // The sleep branch must run before the session branch in tickSession,
  // so the 10-minute window never cuts a sleep timer short.
  const tick = engine.slice(engine.indexOf('  function tickSession('), engine.indexOf('  function openListeningWindow('));
  assert.ok(tick.indexOf('sleepDeadline!==null') !== -1 && tick.indexOf('sleepDeadline!==null') < tick.indexOf('session.remaining()!==0'),
    'sleep timer is checked before the session window');
  // No paywall dialog on sleep expiry: showSessionDone belongs to the
  // session branch only.
  const sleepBranch = tick.slice(tick.indexOf('sleepDeadline!==null'), tick.indexOf('session.remaining()!==0'));
  assert.ok(!sleepBranch.includes('showSessionDone'), 'sleep expiry stops quietly, without the session dialog');
  // Entering a journey clears the mixer timer (it has its own).
  const pauseStart = engine.indexOf('pauseForScene() {');
  const pause = engine.slice(pauseStart, engine.indexOf('setMix,', pauseStart));
  assert.ok(pause.includes('sleepDeadline=null; sleepChoice=0;'), 'pauseForScene clears the mixer timer');
});
