import test from 'node:test';
import assert from 'node:assert/strict';
import { headForRoute } from '../src/seo.mjs';

test('studio and place home retain distinct canonical URLs in each language', () => {
  for (const locale of ['en','zh']) {
    const studio=headForRoute('studio',locale);
    assert.equal(studio.links.find(link=>link.rel==='canonical').href,`https://soundcocktail.app/${locale}/studio`);
    assert.equal(studio.links.find(link=>link.hreflang==='zh-CN').href,'https://soundcocktail.app/zh/studio');
    assert.notEqual(studio.links[0].href,headForRoute('home',locale).links[0].href);
  }
});

test('place home search description reflects the music and video experience', () => {
  const head=headForRoute('home','en');
  assert.match(head.meta.find(meta=>meta.name==='description').content,/Bali/);
  assert.match(head.meta.find(meta=>meta.name==='description').content,/Chiang Mai/);
});
