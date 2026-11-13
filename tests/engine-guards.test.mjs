/**
 * 引擎守卫测试：sound-lab.mjs 里翻译函数 t 由 ./locale.mjs 导入。
 * 2026-11-13 发现：setPlaying 内 `var t=AC.currentTime` 遮蔽了导入的 t，
 * 导致 t(L(),'mixer.pauseAria') 等调用抛 TypeError: t is not a function，
 * 播放被置 true 后立即中断，playMix 的重置/补间永远走不到（混音页
 * “在调音台打开这杯”与落地页“播放这杯”按钮因此失效，主播放键同病）。
 * 本测试扫描全部顶层函数：凡在函数体内调用 t(L(),…) 的，不得在
 * 同一函数体内声明名为 t 的局部变量。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/sound-lab.mjs'), 'utf8');

test('engine: no function that calls t(L(),…) declares a local t (shadowing guard)', () => {
  // 顶层函数（两个空格缩进）分段。
  const starts = [...src.matchAll(/^  function (\w+)\(/gm)].map((m) => ({ name: m[1], index: m.index }));
  assert.ok(starts.length > 10, 'expected many top-level functions in sound-lab.mjs');
  const bad = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
    const body = src.slice(starts[i].index, end);
    const usesT = /[^a-zA-Z_$]t\(L\(\),/.test(body);
    const declaresT = /(^|\n)\s*(var|let|const)\s+t\s*[=;,]/.test(body) || /function\s+t\s*\(/.test(body);
    if (usesT && declaresT) bad.push(starts[i].name);
  }
  assert.deepEqual(bad, [], `functions shadowing imported t while calling t(L(),…): ${bad.join(', ')}`);
});

test('engine: setPlaying uses the imported t for labels (regression for the play-button throw)', () => {
  const start = src.indexOf('  function setPlaying(');
  const end = src.indexOf('  function playMix(', start);
  assert.ok(start !== -1 && end > start, 'setPlaying/playMix spans found');
  const body = src.slice(start, end);
  assert.ok(body.includes("t(L(),'mixer.pauseAria')"), 'setPlaying sets playBtn aria-label via t()');
  assert.ok(!/(^|\n)\s*(var|let|const)\s+t\s*=/.test(body), 'setPlaying must not declare a local t');
});

// --- 拆页（2026-11-13）：引擎常驻外壳，各页面组件接 DOM ---

test('split: engine exposes a module-level controller for the shell-mounted instance', () => {
  assert.ok(/export function getLabController\(\)/.test(src), 'getLabController is exported');
  assert.ok(/let labController\s*=\s*null;/.test(src), 'module-level labController slot exists');
  assert.ok(/labController = api;/.test(src), 'mountSoundLab publishes its controller');
  assert.ok(/if\(labController===api\) labController=null;/.test(src), 'dispose clears the controller');
});

test('split: controller exposes the per-page bind/unbind pairs plus saveMixAs and restoreCupStage', () => {
  const start = src.indexOf('  const api = {');
  const end = src.indexOf('  labController = api;', start);
  assert.ok(start !== -1 && end > start, 'controller object found');
  const body = src.slice(start, end);
  for (const key of [
    'bindHero', 'unbindHero', 'bindMixer', 'unbindMixer',
    'bindMine', 'unbindMine', 'bindSources', 'unbindSources',
    'saveMixAs', 'restoreCupStage',
  ]) {
    assert.ok(new RegExp(`(^|[^a-zA-Z_$])${key}(?=[(,\\s])`).test(body), `controller exposes ${key}`);
  }
  // saveMixAs 直接存当前配比（落地页“存下这杯”不依赖保存框 DOM）。
  assert.ok(body.includes('saveMixAs(name)'), 'saveMixAs takes a name');
  assert.ok(/saveMixAs\(name\) \{\s*\n?\s*return saveCurrentMix\(name\);/.test(body), 'saveMixAs delegates to saveCurrentMix');
});

test('split: page-section bindings live inside their bind functions, not at module level', () => {
  const fnBody = (name) => {
    const start = src.indexOf(`  function ${name}(`);
    assert.ok(start !== -1, `${name} found`);
    const end = src.indexOf('\n  }\n', start);
    assert.ok(end > start, `${name} closes`);
    return src.slice(start, end);
  };
  const mixer = fnBody('bindMixer');
  for (const id of ['soundFilters', 'playBtn', 'ctaPlay', 'masterVol', 'clearBtn', 'randomBtn', 'immersiveBtn', 'ctaImmersive']) {
    assert.ok(mixer.includes(`$("${id}")`), `bindMixer binds #${id}`);
  }
  const mine = fnBody('bindMine');
  for (const id of ['saveBtn', 'importBtn']) {
    assert.ok(mine.includes(`$("${id}")`), `bindMine binds #${id}`);
  }
  const sources = fnBody('bindSources');
  assert.ok(sources.includes('data-bed'), 'bindSources binds the [data-bed] chips');
  const hero = fnBody('bindHero');
  assert.ok(hero.includes('wcSvg') || hero.includes('pointermove'), 'bindHero binds the cup sway');
  // 卸载时撤监听（每组 bind 都有对应的 unbind，调同一批 remover）。
  for (const pair of [['bindHero', 'unbindHero', 'heroRemovers'], ['bindMixer', 'unbindMixer', 'mixerRemovers'], ['bindMine', 'unbindMine', 'mineRemovers'], ['bindSources', 'unbindSources', 'sourcesRemovers']]) {
    const unbind = fnBody(pair[1]);
    assert.ok(unbind.includes(pair[2]), `${pair[1]} clears ${pair[2]}`);
  }
});
