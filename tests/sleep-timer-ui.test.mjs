/**
 * Sleep-timer UI wiring guards. The journey panel is a React/DOM surface
 * with no component test harness, so — like engine-guards.test.mjs —
 * these tests scan the source for the wiring that must exist: the shared
 * options, the end-of-journey choice, the persisted choice, the journey
 * panel timer, and the engine's expiry toast.
 *
 * 改版（2026-11-16）：调音台已下线，调音台播放条的 select + 倒计时
 * 不再存在；睡眠定时只剩旅程面板的定时器与引擎的 recipe 定时器
 * （无界面可设，locale 里只留 sleepDone 到期提示）。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scene = readFileSync(join(root, 'src/scenes/SceneExperience.jsx'), 'utf8');
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

test('sleep timer UI: the recipe engine keeps only the expiry toast (mixer UI is gone)', () => {
  // 调音台已下线：locale 里只剩引擎睡眠定时到期的提示（双语各一处）。
  assert.ok((locale.match(/sleepDone:/g) || []).length >= 2, 'engine.sleepDone exists in both languages');
  assert.doesNotMatch(locale, /sleepTimer:|sleepOff:|sleepMinutes:/, 'mixer sleep-timer UI keys are gone');
  // 旅程面板自己的定时器：选时长 + 剩几分钟 + 持续播放。
  assert.ok(scene.includes('setSleepTimer'), 'journey panel arms its own timer');
  assert.ok(scene.includes('timerLabel'), 'journey panel shows the remaining minutes');
  assert.ok(scene.includes('C.continuous'), 'journey panel offers continuous listening');
});

test('sleep timer engine: dedicated gain, long fade, session subsumption', () => {
  assert.ok(engine.includes('sleepGain=AC.createGain()'), 'dedicated sleepGain node exists');
  assert.ok(engine.includes('sessionGain.connect(sleepGain); sleepGain.connect(master)'), 'sleepGain sits between sessionGain and master');
  assert.ok(engine.includes('function setSleepTimer('), 'setSleepTimer exists');
  assert.ok(engine.includes('function armSleepGain('), 'armSleepGain exists');
  assert.ok(engine.includes("t(L(),'engine.sleepDone')"), 'sleep expiry toasts in the current language');
  // The sleep branch must run before the session branch in tickSession,
  // so the 10-minute window never cuts a sleep timer short.
  const tick = engine.slice(engine.indexOf('  function tickSession('), engine.indexOf('  function openListeningWindow('));
  assert.ok(tick.indexOf('sleepDeadline!==null') !== -1 && tick.indexOf('sleepDeadline!==null') < tick.indexOf('session.remaining()!==0'),
    'sleep timer is checked before the session window');
  // No paywall dialog on sleep expiry: showSessionDone belongs to the
  // session branch only.
  const sleepBranch = tick.slice(tick.indexOf('sleepDeadline!==null'), tick.indexOf('session.remaining()!==0'));
  assert.ok(!sleepBranch.includes('showSessionDone'), 'sleep expiry stops quietly, without the session dialog');
  // Entering a journey clears the recipe timer (it has its own).
  const pauseStart = engine.indexOf('pauseForScene() {');
  const pause = engine.slice(pauseStart, engine.indexOf('setMix,', pauseStart));
  assert.ok(pause.includes('sleepDeadline=null; sleepChoice=0;'), 'pauseForScene clears the recipe timer');
});
