/**
 * 配方码纯编解码（SYL-…）。
 *
 * 与音频引擎 src/sound-lab.mjs 里的 encodeRecipe / decodeRecipe 用
 * 同一套算法（JSON → base64url，前缀 SYL-），只是这里是纯函数、
 * 不依赖引擎闭包，供服务端（/mix/:code 路由 loader）与 node:test
 * 直接用。引擎本身不改，仍用内部实现；两者一致性由 tests/seo-p1
 * 的交叉测试保证（用引擎算法算出的码，本模块必须能解）。
 *
 * 编码：{ n: 名字, m: { 通道 id: 0–100 }, p?: { 通道 id: { 参数: 0–100 } } }
 * 解码：只保留 catalog 里真实存在的通道、数值有限且 > 0 的条目；
 * 一个有效通道都没有，或 JSON/base64 损坏时抛错（路由层转 404）。
 */
import { SOUNDS } from './catalog.mjs';

const SOUND_IDS = new Set(SOUNDS.map((s) => s.id));

function toBase64Url(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  let out = s.replace(/-/g, '+').replace(/_/g, '/');
  while (out.length % 4) out += '=';
  return out;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

export function encodeRecipeCode(name, mix, params) {
  const payload = { n: name, m: {} };
  for (const k of Object.keys(mix || {})) payload.m[k] = Math.round(mix[k] * 100);
  if (params) {
    payload.p = {};
    for (const id of Object.keys(params)) {
      const o = {};
      for (const k of Object.keys(params[id] || {})) o[k] = Math.round(params[id][k] * 100);
      payload.p[id] = o;
    }
  }
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `SYL-${toBase64Url(b64)}`;
}

/**
 * 解码配方码。返回 { name, mix, params }：name 为空字符串表示码里
 * 没写名字（调用方按语言补默认名）；mix 的值是 0–1 的音量；
 * params 为 null 表示码里没有调音参数。
 */
export function decodeRecipeCode(code) {
  if (typeof code !== 'string' || !code.trim()) throw new Error('empty recipe code');
  const raw = code.trim().replace(/^SYL-/, '');
  if (!raw) throw new Error('empty recipe code');
  let json;
  try {
    json = decodeURIComponent(escape(atob(fromBase64Url(raw))));
  } catch {
    throw new Error('invalid recipe code');
  }
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new Error('invalid recipe code');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid recipe code');
  }
  const mix = {};
  for (const [id, v] of Object.entries(payload.m || {})) {
    if (SOUND_IDS.has(id) && Number.isFinite(v) && v > 0) mix[id] = clamp01(v / 100);
  }
  if (!Object.keys(mix).length) throw new Error('recipe code has no known sounds');
  let params = null;
  if (payload.p && typeof payload.p === 'object') {
    params = {};
    for (const [id, o] of Object.entries(payload.p)) {
      if (!SOUND_IDS.has(id) || !o || typeof o !== 'object') continue;
      const entry = {};
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'number' && Number.isFinite(v)) entry[k] = clamp01(v / 100);
      }
      if (Object.keys(entry).length) params[id] = entry;
    }
    if (!Object.keys(params).length) params = null;
  }
  const name = typeof payload.n === 'string' ? payload.n.trim().slice(0, 32) : '';
  return { name, mix, params };
}
