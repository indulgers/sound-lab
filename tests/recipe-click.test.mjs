/**
 * 配方点击回归测试（2026-11-13 实报 bug）：
 *
 * 点配方页 / Hero 的任意一张配方卡，都变成第一张“咖啡馆靠窗”并
 * 进入沉浸模式。根因是两处旧耦合撞在一起：
 *   1. 引擎 chooseScene 在 playMix 成功后调 enterImmersive()——
 *      点配方就强制进沉浸模式；
 *   2. 进沉浸会触发外壳 onFocusChange(true)，路由跳到 /en/focus，
 *      落地页挂载时发 apply-preset，把 focus 预设（咖啡馆靠窗）
 *      摆到推子上，盖掉刚点的配方。
 * 两处耦合在拆页前就已存在（对照 6aeb56a 的 main.jsx / LandingCopy），
 * 不是拆页引入的；拆页只是让配方有了自己的页面，点一下就跳页，
 * 才变得无法忽视。
 *
 * 修复后的约定：配方点击只走 playRecipe（播该配方的配比、跳回调音台、
 * 提示已应用），绝不进沉浸模式；沉浸模式只由两个专用按钮进
 * （调音台 #immersiveBtn、Hero #ctaImmersive），或直接打开 /focus。
 * 本文件用源码扫描断言这些约定（引擎在 node 下跑不起来，沿用
 * tests/engine-guards.test.mjs 的静态扫描做法）。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = readFileSync(join(root, 'src/sound-lab.mjs'), 'utf8');
const recipesPage = readFileSync(join(root, 'src/RecipesPage.jsx'), 'utf8');
const mixerSection = readFileSync(join(root, 'src/MixerSection.jsx'), 'utf8');
const shell = readFileSync(join(root, 'src/routes/__root.tsx'), 'utf8');

function fnBody(name) {
  const start = engine.indexOf(`  function ${name}(`);
  assert.ok(start !== -1, `${name} found`);
  const end = engine.indexOf('\n  }\n', start);
  assert.ok(end > start, `${name} closes`);
  return engine.slice(start, end);
}

test('recipe click: chooseScene never enters immersive mode (no enterImmersive / onFocusChange)', () => {
  const body = fnBody('chooseScene');
  assert.doesNotMatch(body, /enterImmersive/, 'chooseScene must not force immersive mode');
  assert.doesNotMatch(body, /onFocusChange/, 'chooseScene must not trigger the /focus navigation');
  // 仍保留“播放失败先记下来”的逻辑（会话结束对话框“再来一次”用）。
  assert.ok(body.includes('pendingScene=scene'), 'chooseScene still stashes the scene when playMix fails');
});

test('recipe click: enterImmersive is only reachable from the two deliberate buttons', () => {
  const lines = engine.split('\n').filter((line) => line.includes('enterImmersive'));
  const calls = lines.filter((line) => !line.includes('function enterImmersive()'));
  assert.deepEqual(
    calls.map((line) => line.trim()),
    [
      'track(mixerRemovers, $("immersiveBtn"), "click", enterImmersive);',
      'track(mixerRemovers, $("ctaImmersive"), "click", enterImmersive);',
    ],
    'immersive mode must only be entered from #immersiveBtn / #ctaImmersive',
  );
});

test('recipe click: recipe cards play the clicked recipe via playRecipe', () => {
  assert.ok(recipesPage.includes('playRecipe(recipe)'), 'card button must call playRecipe with its own recipe');
  assert.doesNotMatch(recipesPage, /chooseScene/, 'RecipesPage must not use chooseScene');
  // 仍保留进阶门禁：未解锁的配方走 showPremium，不直接播。
  assert.ok(recipesPage.includes('showPremium(recipe.name)'), 'locked recipes still go to showPremium');
});

test('recipe click: hero scene chips play the clicked recipe via playRecipe', () => {
  assert.ok(mixerSection.includes('onPlayRecipe={playRecipe}'), 'Hero must receive playRecipe');
  assert.ok(mixerSection.includes('onPlayRecipe(recipe)'), 'scene chip must call playRecipe with its own recipe');
  assert.doesNotMatch(mixerSection, /chooseScene/, 'MixerSection must not use chooseScene');
});

test('recipe click: LabContext provides playRecipe, not chooseScene', () => {
  assert.ok(shell.includes('controller.current?.playRecipe(recipe)'), 'shell forwards playRecipe to the engine');
  assert.ok(shell.includes('playRecipe,'), 'LabContext provides playRecipe');
  assert.doesNotMatch(shell, /chooseScene/, 'shell must not expose chooseScene any more');
});

test('recipe click: playSavedMix plays the passed recipe mix and never enters immersive', () => {
  const body = fnBody('playSavedMix');
  // 播的就是调用方传进来的那个配方的配比（可播通道过滤后）。
  assert.ok(body.includes('sessionTools.freeMix(recipe.mix)'), 'playSavedMix filters the passed recipe mix');
  assert.ok(body.includes('playMix(mix)'), 'playSavedMix plays the filtered mix');
  assert.doesNotMatch(body, /enterImmersive/, 'playSavedMix must not enter immersive mode');
  // 播完只回放调音台（就地滚动或发 show-mixer 事件），不跳 /focus。
  assert.ok(body.includes('soundcocktail:show-mixer'), 'playSavedMix navigates back to the mixer when needed');
  assert.doesNotMatch(body, /\/focus/, 'playSavedMix must not navigate to /focus');
});
