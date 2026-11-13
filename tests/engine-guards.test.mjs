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
