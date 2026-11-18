import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../src/scenes/catalog.mjs';
import { FEATURED_SCENE_PAGES, getFeaturedScenePage, scenePagePath } from '../src/scenes/scene-pages.mjs';
import { JOURNEYS, journeyById, levelsForJourney } from '../src/scenes/journeys.mjs';
import { encodeJourneyShare, decodeJourneyShare } from '../src/scenes/scene-share.mjs';
import { headForSoundScene, sitemapXml, PUBLIC_PATHS, SITE_URL } from '../src/seo.mjs';

test('featured Discover scenes map to genuine existing film and audio assets', () => {
  assert.equal(FEATURED_SCENE_PAGES.length, 3);
  const slugs = new Set();
  for (const page of FEATURED_SCENE_PAGES) {
    assert.ok(!slugs.has(page.slug));
    slugs.add(page.slug);
    const scene = SCENES.find(item => item.id === page.sceneId);
    assert.ok(scene, page.slug);
    assert.equal(journeyById(page.journeyId)?.sceneId, page.sceneId);
    assert.ok(scene.video.startsWith('/assets/scenes/'));
    assert.ok(scene.poster.startsWith('/assets/scenes/'));
    assert.ok(scene.filmCreator && scene.filmSourcePage.startsWith('https://'));
    for (const locale of ['en','zh']) {
      assert.ok(page.title[locale].length > 10);
      assert.ok(page.summary[locale].length > 40);
      assert.equal(page.sections.length, 3);
      assert.ok(page.sections.every(part => part.heading[locale] && part.body[locale].length > 75));
      assert.equal(scenePagePath(page,locale), '/' + locale + '/scenes/' + page.slug);
    }
  }
  assert.equal(getFeaturedScenePage('unknown'), null);
  assert.ok(JOURNEYS.length >= 3);
});

test('scene pages have unique localized metadata with self canonical and reciprocal hreflang', () => {
  for (const page of FEATURED_SCENE_PAGES) {
    const en = headForSoundScene(page.slug, 'en');
    const zh = headForSoundScene(page.slug, 'zh');
    const enUrl = SITE_URL + scenePagePath(page,'en');
    const zhUrl = SITE_URL + scenePagePath(page,'zh');
    assert.equal(en.links[0].href,enUrl);
    assert.equal(zh.links[0].href,zhUrl);
    assert.notEqual(en.meta.find(x => x.title)?.title, zh.meta.find(x => x.title)?.title);
    assert.ok(en.links.some(x => x.hreflang === 'zh-CN' && x.href === zhUrl));
    assert.ok(zh.links.some(x => x.hreflang === 'en' && x.href === enUrl));
    assert.ok(en.meta.some(x => x.type === 'application/ld+json'));
    assert.ok(PUBLIC_PATHS.includes(scenePagePath(page,'en')));
    assert.ok(PUBLIC_PATHS.includes(scenePagePath(page,'zh')));
  }
  assert.ok(headForSoundScene('unknown','en').meta.some(x => x.name === 'robots' && x.content === 'noindex'));
});

test('sitemap includes featured scenes but never user mix query strings', () => {
  const xml = sitemapXml(new Date('2026-11-18T00:00:00Z'));
  for (const page of FEATURED_SCENE_PAGES) {
    assert.ok(xml.includes(SITE_URL + scenePagePath(page,'en')));
    assert.ok(xml.includes(SITE_URL + scenePagePath(page,'zh')));
  }
  assert.doesNotMatch(xml, /\?mix=|SC2-|\/studio|\/mine/);
});

test('scene mix shares round-trip only validated layers and controls', () => {
  const code = encodeJourneyShare('focus-chiang-mai',
    { harmony:.73, details:.22, atmosphere:.44, ambience:0, unexpected:42 },
    { warmth:.81, space:.37, boom:3 });
  assert.match(code, /^SC2-/);
  const decoded=decodeJourneyShare(code);
  assert.equal(decoded.journeyId,'focus-chiang-mai');
  assert.deepEqual(decoded.levels,{harmony:.73,details:.22,atmosphere:.44,ambience:0});
  assert.deepEqual(decoded.controls,{warmth:.81,space:.37});
  assert.equal(encodeJourneyShare('not-a-journey',{}),'');
  assert.equal(decodeJourneyShare('SC2-wrong'),null);
  assert.equal(decodeJourneyShare('SC2-'+'x'.repeat(3000)),null);
});

test('share values are clamped, known, and do not opt into conversations silently', () => {
  const code = encodeJourneyShare('focus-chiang-mai',{harmony:42,ambience:.9,details:-2},{warmth:-50});
  const data = decodeJourneyShare(code);
  assert.equal(data.levels.harmony,1);
  assert.equal(data.levels.details,0);
  assert.equal(data.controls.warmth,0);
  const journey=journeyById(data.journeyId);
  const loaded=levelsForJourney(journey,data.levels);
  assert.equal(loaded.ambience,0, 'share links should not silently enable human speech');
});
