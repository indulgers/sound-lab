import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { headForRoute } from '../src/seo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 改版（2026-11-16）：/studio 已随鸡尾酒版下线，两个语言路由都是
// 308 跳转回首页，不再是页面；SEO 层也没有 studio 的 head。
test('studio routes are 308 redirects to the home page, not pages', () => {
  for (const [file, target] of [['src/routes/en/studio.tsx', '/en'], ['src/routes/zh/studio.tsx', '/zh']]) {
    const src = readFileSync(join(root, file), 'utf8');
    assert.ok(src.includes('redirect'), `${file} redirects`);
    assert.ok(src.includes('statusCode: 308'), `${file} is a 308`);
    assert.ok(src.includes(`to: '${target}'`), `${file} redirects to ${target}`);
  }
  for (const locale of ['en', 'zh']) {
    assert.throws(() => headForRoute('studio', locale), /unknown seo route: studio/);
  }
});

test('place home search description reflects the sound-therapy positioning', () => {
  const head = headForRoute('home', 'en');
  assert.match(head.meta.find((meta) => meta.name === 'description').content, /Sound therapy/);
  assert.match(head.meta.find((meta) => meta.name === 'description').content, /real places/);
});
