import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SLEEP_TIMER_FADE_SECONDS, SLEEP_TIMER_OPTIONS_MINUTES,
  fadeSchedule, applyFadeSchedule, sleepRemainingMs,
  formatSleepRemaining, sleepChoiceToMs,
} from '../src/sleep-timer.mjs';

class Param {
  constructor(value = 1) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}

test('sleep timer: fade covers the last two minutes of a long timer', () => {
  assert.equal(SLEEP_TIMER_FADE_SECONDS, 120);
  const s = fadeSchedule({ deadlineMs: 1_000_000 + 30 * 60_000, nowMs: 1_000_000, audioNow: 10 });
  assert.equal(s.secondsLeft, 1800);
  assert.equal(s.fadeSeconds, 120);
  assert.equal(s.fadeStart, 10 + 1800 - 120);
  assert.equal(s.fadeEnd, 10 + 1800);
});

test('sleep timer: fade never exceeds the remaining time', () => {
  const s = fadeSchedule({ deadlineMs: 1_000_000 + 60_000, nowMs: 1_000_000, audioNow: 5 });
  assert.equal(s.fadeSeconds, 60);
  assert.equal(s.fadeStart, 5);
  assert.equal(s.fadeEnd, 65);
});

test('sleep timer: past or missing deadline has no schedule', () => {
  assert.equal(fadeSchedule({ deadlineMs: 999_000, nowMs: 1_000_000, audioNow: 5 }), null);
  assert.equal(fadeSchedule({ deadlineMs: null, nowMs: 1_000_000, audioNow: 5 }), null);
  assert.equal(fadeSchedule({ deadlineMs: 1_000_000, nowMs: 1_000_000, audioNow: 5 }), null);
});

test('sleep timer: applying the schedule ramps to zero exactly at the deadline', () => {
  const param = new Param(0.7);
  const s = fadeSchedule({ deadlineMs: 1_000_000 + 30 * 60_000, nowMs: 1_000_000, audioNow: 10 });
  assert.equal(applyFadeSchedule(param, s, 0.7, 10), true);
  const linears = param.events.filter(([type]) => type === 'linear');
  assert.equal(linears.length, 1);
  assert.deepEqual(linears[0], ['linear', 0, 10 + 1800]);
  const sets = param.events.filter(([type]) => type === 'set');
  assert.ok(sets.some(([, value, time]) => value === 0.7 && time === 10 + 1800 - 120), 'holds full level until the fade starts');
  assert.equal(applyFadeSchedule(param, null, 0.7, 10), false);
});

test('sleep timer: remaining and countdown formatting', () => {
  assert.equal(sleepRemainingMs(1_090_000, 1_000_000), 90_000);
  assert.equal(sleepRemainingMs(999_000, 1_000_000), 0);
  assert.equal(sleepRemainingMs(null, 1_000_000), null);
  assert.equal(formatSleepRemaining(90_000), '01:30');
  assert.equal(formatSleepRemaining(1_800_000), '30:00');
  assert.equal(formatSleepRemaining(0), '00:00');
  assert.equal(formatSleepRemaining(-500), '00:00');
  assert.equal(formatSleepRemaining(null), '00:00');
});

test('sleep timer: choice parsing (minutes, off, end of journey)', () => {
  assert.deepEqual(SLEEP_TIMER_OPTIONS_MINUTES, [15, 30, 45, 60, 90]);
  assert.equal(sleepChoiceToMs(30), 1_800_000);
  assert.equal(sleepChoiceToMs(0), null);
  assert.equal(sleepChoiceToMs(null), null);
  assert.equal(sleepChoiceToMs('journey', 540_000), 540_000);
  assert.equal(sleepChoiceToMs('journey', 0), null);
  assert.equal(sleepChoiceToMs('journey', null), null);
});
