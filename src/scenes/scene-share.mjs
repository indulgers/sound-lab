/**
 * Share an editable scene mix without a server account or thin-content URLs.
 * A public URL points to the canonical scene screen, with an opaque query
 * that is never included in sitemap/canonical. No user text is serialized.
 */
import { journeyById, sceneForJourney } from './journeys.mjs';

const CONTROL_KEYS = ['warmth','space','energy','nature','bass','mid','treble','width','reverb'];
const clamp = n => Math.max(0, Math.min(1, n));

const clean = (obj, ids) => {
  const result = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return result;
  for (const key of ids) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.round(clamp(value) * 100) / 100;
  }
  return result;
};

export function encodeJourneyShare(journeyId, levels = {}, controls = {}) {
  const journey = journeyById(journeyId);
  if (!journey) return '';
  const ids = sceneForJourney(journey).layers.map(layer => layer.id);
  const payload = { v: 1, j: journeyId, l: clean(levels, ids), c: clean(controls, CONTROL_KEYS) };
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return 'SC2-' + encoded;
}

export function decodeJourneyShare(code) {
  if (typeof code !== 'string' || code.length > 2048 || !/^SC2-[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    let encoded = code.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    while (encoded.length % 4) encoded += '=';
    const payload = JSON.parse(atob(encoded));
    if (!payload || payload.v !== 1 || typeof payload.j !== 'string') return null;
    const journey = journeyById(payload.j);
    if (!journey) return null;
    const ids = sceneForJourney(journey).layers.map(layer => layer.id);
    return { journeyId: journey.id, levels: clean(payload.l, ids), controls: clean(payload.c, CONTROL_KEYS) };
  } catch {
    return null;
  }
}
