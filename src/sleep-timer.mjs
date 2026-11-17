/**
 * Shared sleep-timer helpers for the journey player and the recipe engine.
 *
 * Pure functions only: the fade schedule, the remaining-time format, and
 * the option parsing. Both engines apply the schedule to their own gain
 * node; the tests assert the schedule, not the Web Audio calls.
 *
 * The fade is the point of the feature: the last two minutes of a sleep
 * timer are a smooth linear fade from full level to silence, then
 * playback stops. (The journey player previously faded only the last
 * 4 seconds — a cliff, not a drift-off.)
 */

export const SLEEP_TIMER_FADE_SECONDS = 120;
export const SLEEP_TIMER_OPTIONS_MINUTES = [15, 30, 45, 60, 90];

/**
 * Compute the automation for a fade that ends at `deadlineMs` (wall-clock
 * ms). `nowMs` is the wall clock, `audioNow` is context.currentTime.
 * Returns null when there is no usable deadline (none, or already past).
 * The fade never exceeds the remaining time: a 60-second timer fades
 * over its whole 60 seconds.
 */
export function fadeSchedule({ deadlineMs, nowMs, audioNow, fadeSeconds = SLEEP_TIMER_FADE_SECONDS }) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs) || !Number.isFinite(audioNow)) return null;
  const secondsLeft = (deadlineMs - nowMs) / 1000;
  if (secondsLeft <= 0) return null;
  const fade = Math.max(0, Math.min(Number.isFinite(fadeSeconds) ? fadeSeconds : SLEEP_TIMER_FADE_SECONDS, secondsLeft));
  return {
    secondsLeft,
    fadeSeconds: fade,
    // Hold full level until the fade starts. When the fade covers the
    // whole remaining time, fadeStart === audioNow (fade immediately).
    fadeStart: audioNow + Math.max(0, secondsLeft - fade),
    fadeEnd: audioNow + secondsLeft,
  };
}

/**
 * Apply a schedule from fadeSchedule() to an AudioParam. `level` is the
 * full level the param should hold until the fade starts. Returns true
 * when a schedule was applied; false when there is none (the caller
 * should restore the level itself instead).
 */
export function applyFadeSchedule(param, schedule, level, audioNow) {
  if (!schedule || !param) return false;
  param.cancelScheduledValues(audioNow);
  param.setValueAtTime(param.value, audioNow);
  param.setTargetAtTime(level, audioNow, 0.12);
  if (schedule.fadeStart > audioNow) param.setValueAtTime(level, schedule.fadeStart);
  param.linearRampToValueAtTime(0, schedule.fadeEnd);
  return true;
}

/** Remaining wall-clock ms until a deadline, clamped at 0 (null = no timer). */
export function sleepRemainingMs(deadlineMs, nowMs) {
  if (!Number.isFinite(deadlineMs)) return null;
  return Math.max(0, deadlineMs - nowMs);
}

/** "MM:SS" countdown text for a remaining-ms value (null/negative → "00:00"). */
export function formatSleepRemaining(ms) {
  const total = Math.max(0, Math.ceil((Number.isFinite(ms) ? ms : 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Convert a timer choice to a duration in ms. `choice` is 0 (off), a
 * number of minutes, or 'journey' (stop at the end of the current
 * programme — needs `journeyRemainingMs`, the ms left in this play-through).
 * Returns null for off / unusable choices.
 */
export function sleepChoiceToMs(choice, journeyRemainingMs = null) {
  if (choice === 'journey') {
    return Number.isFinite(journeyRemainingMs) && journeyRemainingMs > 0 ? journeyRemainingMs : null;
  }
  const minutes = Number(choice);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60000 : null;
}
