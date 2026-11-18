/**
 * Local-only visual regression for Sound Lab 2.0.
 * Run with a built TanStack Start preview on http://127.0.0.1:4173.
 * Images are review artifacts, not a claim that the video/audio was mastered.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
await mkdir('preview-qa/soundlab-v2', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

async function newPage(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.on('pageerror', error => { errors.push(error.message); console.log('BROWSER PAGEERROR:', error.message); });
  page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text()); });
  page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText));
  return page;
}

async function navigate(page, path) {
  const res = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(res?.ok(), path + ': HTTP ' + res?.status());
  try {
    await page.locator('.scene-experience[data-hydrated="true"]').waitFor({ timeout: 12000 });
  } catch (error) {
    console.log('HYDRATION DEBUG:', path, 'url:', page.url(), 'title:', await page.title());
    console.log('HYDRATION DEBUG: scene count', await page.locator('.scene-experience').count());
    console.log('HYDRATION DEBUG: body', (await page.locator('body').innerText()).slice(0, 1200));
    console.log('HYDRATION DEBUG: page errors', errors);
    await page.screenshot({ path: 'preview-qa/soundlab-v2/debug-hydration.jpg', type: 'jpeg', quality: 55, fullPage: false }).catch(() => {});
    throw error;
  }
}

try {
  const desktop = await newPage({ width: 1440, height: 900 });
  await navigate(desktop, '/en');
  assert.equal(await desktop.locator('.sc-discover-card').count(), 3);
  assert.equal(await desktop.locator('.sc-discover-footer nav a').count(), 5);
  assert.ok((await desktop.locator('h1').first().innerText()).length > 5);
  await desktop.screenshot({ path: 'preview-qa/soundlab-v2/desktop-home.jpg', type: 'jpeg', quality: 68, fullPage: true });
  console.log('PASS: desktop Discover with footer and three scene cards');

  await navigate(desktop, '/en/scenes/chiang-mai-focus');
  assert.equal(await desktop.locator('.scene-experience').getAttribute('data-scene'), 'chiang-mai');
  assert.equal(await desktop.locator('.scene-experience').getAttribute('data-intent'), 'focus');
  assert.match(await desktop.locator('.sc-article h2').innerText(), /Chiang Mai Focus/);
  assert.equal(await desktop.locator('.sc-article-sections section').count(), 3);
  // Force lazy posters to decode before capturing a full-page comparison.
  await desktop.locator('.sc-discover-card img').last().scrollIntoViewIfNeeded();
  await desktop.locator('.sc-discover-card img').last().evaluate(async img => { await img.decode(); });
  await desktop.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await desktop.screenshot({ path: 'preview-qa/soundlab-v2/desktop-scene.jpg', type: 'jpeg', quality: 68, fullPage: true });
  // Verify the actual streamed MP3 tracks can start under a real click.
  const lead = desktop.locator('.scene-experience .sc-enter');
  await lead.click();
  await desktop.waitForFunction(
    () => document.querySelector('.scene-experience')?.dataset.audioState === 'playing',
    null,
    { timeout: 60000 },
  );
  assert.equal(await desktop.locator('.scene-experience').getAttribute('data-audio-state'),'playing');
  const cta = desktop.locator('.sc-article-cta');
  await cta.click();
  await desktop.locator('.sc-dialog[open]').waitFor({ timeout: 15000 });
  assert.equal(await desktop.locator('.sc-layer-action').count(), 8);
  assert.equal(await desktop.locator('.scene-experience').getAttribute('data-audio-state'), 'playing', 'Studio must not interrupt the same listening session');
  const studio = desktop.locator('.sc-dialog[open]');
  const firstLayer = studio.locator('.sc-layer').first();
  const original = Number(await firstLayer.locator('input[type=range]').inputValue());
  await firstLayer.locator('input[type=range]').focus();
  await firstLayer.locator('input[type=range]').press('ArrowLeft');
  assert.ok(Number(await firstLayer.locator('input[type=range]').inputValue()) < original, 'layer volume responds to user input');
  const solo = firstLayer.getByRole('button', { name: /Solo/ });
  const mute = firstLayer.getByRole('button', { name: /Mute/ });
  await solo.click();
  assert.equal(await solo.getAttribute('aria-pressed'), 'true');
  await mute.click();
  assert.equal(await mute.getAttribute('aria-pressed'), 'true');
  await solo.click();
  await mute.click();
  assert.equal(await solo.getAttribute('aria-pressed'), 'false');
  assert.equal(await mute.getAttribute('aria-pressed'), 'false');
  await studio.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(Number(await firstLayer.locator('input[type=range]').inputValue()), original);
  const advanced = studio.locator('.sc-advanced-toggle');
  await advanced.click();
  assert.equal(await studio.locator('.sc-eq-controls input[type=range]').count(), 5);
  await advanced.click();
  await studio.evaluate(element => { element.scrollTop = 0; });
  await desktop.screenshot({ path: 'preview-qa/soundlab-v2/desktop-studio.jpg', type: 'jpeg', quality: 70 });
  console.log('PASS: scene editorial route and in-place Studio panel');

  await navigate(desktop, '/en/studio');
  await desktop.locator('.sc-dialog[open]').waitFor({ timeout: 15000 });
  assert.equal(await desktop.locator('.scene-experience').getAttribute('data-scene'), 'chiang-mai');
  assert.equal(await desktop.locator('.sc-layer-action').count(), 8);
  await desktop.screenshot({ path: 'preview-qa/soundlab-v2/desktop-studio-direct.jpg', type: 'jpeg', quality: 70 });
  console.log('PASS: direct Studio loads focus mix without autoplay');

  const mobile = await newPage({ width: 390, height: 844 });
  await navigate(mobile, '/zh');
  assert.equal(await mobile.locator('.sc-discover-card').count(), 3);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 2, 'mobile page has horizontal overflow: ' + overflow + 'px');
  await mobile.screenshot({ path: 'preview-qa/soundlab-v2/mobile-home.jpg', type: 'jpeg', quality: 68, fullPage: true });

  await navigate(mobile, '/zh/scenes/bali-sound-bath');
  assert.equal(await mobile.locator('.scene-experience').getAttribute('data-scene'), 'bali');
  await mobile.screenshot({ path: 'preview-qa/soundlab-v2/mobile-bali.jpg', type: 'jpeg', quality: 68, fullPage: true });
  await mobile.locator('.sc-article-cta').click();
  await mobile.locator('.sc-dialog[open]').waitFor();
  assert.equal(await mobile.locator('.sc-dialog[open] .sc-layer').count(), 4);
  await mobile.locator('.sc-dialog[open]').evaluate(element => { element.scrollTop = 0; });
  await mobile.screenshot({ path: 'preview-qa/soundlab-v2/mobile-studio.jpg', type: 'jpeg', quality: 72 });
  console.log('PASS: mobile Discover, Bali scene and Studio interaction');

  assert.deepEqual(errors, [], 'browser runtime errors');
  console.log('PASS: browser runtime has no uncaught page errors');
  // A small visual sample can be inspected without downloading private CI artifacts.
  const homePreview = await readFile('preview-qa/soundlab-v2/desktop-home.jpg');
  console.log('SOUNDLAB_V2_HOME_JPEG_BASE64=' + homePreview.toString('base64'));
  const studioPreview = await desktop.locator('.sc-dialog[open]').screenshot({ type: 'jpeg', quality: 45 });
  console.log('SOUNDLAB_V2_STUDIO_JPEG_BASE64=' + studioPreview.toString('base64'));
} finally {
  await browser.close();
}
