import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { headForRoute } from '../src/seo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Sound Lab 2.0: Studio is now a dedicated client editing route.
// Its tools should be accessible directly without creating thin indexable SEO pages.
test('studio routes render the live mixing experience with noindex and no redirect', () => {
  for (const locale of ['en', 'zh']) {
    const file = `src/routes/${locale}/studio.tsx`;
    const src = readFileSync(join(root, file), 'utf8');
    assert.match(src, /SceneExperience/, file);
    assert.match(src, /startInStudio/, file);
    assert.match(src, /robots.*noindex,follow/s, file);
    assert.doesNotMatch(src, /throw redirect|statusCode:\s*308/, file);
    assert.throws(() => headForRoute('studio', locale), /unknown seo route: studio/);
  }
});

test('place home search description reflects the sound-therapy positioning', () => {
  const head = headForRoute('home', 'en');
  assert.match(head.meta.find((meta) => meta.name === 'description').content, /Sound therapy/);
  assert.match(head.meta.find((meta) => meta.name === 'description').content, /real places/);
});
