import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.PREVIEW_URL || 'https://sound-cocktail-pr5-review.weiyezhu180.workers.dev';
await mkdir('preview-qa', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const events = [];
async function verifyPage(page, locale = 'zh') {
  const response = await page.goto(`${origin}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.ok(response?.ok(), `page HTTP ${response?.status()}`);
  await page.locator('.scene-experience').waitFor({ state: 'visible', timeout: 30000 });
  assert.equal(await page.locator('.scene-experience').getAttribute('data-intent'), 'choose');
  assert.equal(await page.locator('.scene-experience').getAttribute('data-audio-state'), 'idle');
  const headingColor = await page.locator('.sc-intent-entry h1').evaluate(el => getComputedStyle(el).color);
  assert.equal(headingColor, 'rgb(255, 249, 237)', 'intention heading must be high contrast');
  const videoOpacity = await page.locator('.sc-video').evaluate(el => getComputedStyle(el).opacity);
  assert.equal(videoOpacity, '0', 'reduced-motion must reveal scene poster instead of blank video');
  const poster = await page.locator('.sc-landscape').evaluate(el => getComputedStyle(el).backgroundImage);
  assert.ok(poster.includes('/assets/scenes/'), 'paused scene must show a real poster');
  const imageDimensions = await page.locator('.sc-poster').evaluate(async img => { await img.decode(); return { width: img.naturalWidth, height: img.naturalHeight }; });
  assert.ok(imageDimensions.width > 100 && imageDimensions.height > 100, 'responsive poster must decode successfully');
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => events.push(error.message));
  await verifyPage(page, 'zh');
  await page.locator('.sc-intent-entry').screenshot({ path: 'preview-qa/intent-zh.png' });
  await page.getByRole('button', { name: /专注/ }).first().click();
  await page.locator('[data-intent="focus"]').waitFor();
  assert.match(await page.locator('.sc-copy h1').innerText(), /清迈/);
  assert.match(await page.locator('.sc-film-caption').innerText(), /清迈皇家花园/);
  assert.match(await page.locator('.sc-video').getAttribute('src'), /chiang-mai-travel/);
  await page.locator('.sc-poster').evaluate(img=>img.decode());
  assert.match(await page.locator('.sc-poster').getAttribute('src'),/chiang-mai/,'focus title and visible poster must agree');
  assert.equal(await page.locator('.sc-place-chips button').count(),3,'focus shortcuts must only show focus Journeys');
  assert.ok((await page.locator('.sc-place-chips').innerText()).includes('里斯本'));
  assert.ok(!(await page.locator('.sc-place-chips').innerText()).includes('巴厘岛'));
  console.log('PASS: Focus recommendations stay within selected intention');
  await page.screenshot({ path: 'preview-qa/desktop-focus-ready.png', fullPage: true });
  await page.locator('.sc-copy .sc-enter').click();
  await page.waitForFunction(() => document.querySelector('.scene-experience')?.dataset.audioState === 'playing', null, { timeout: 60000 });
  console.log('PASS: Focus selected, music playing');
  await page.locator('.sc-player-actions button[aria-label="调音"]').click();
  const dialog = page.locator('.sc-dialog[open]');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.locator('.sc-emotion-control').count(), 4, 'simple emotional mixer must have real sliders');
  const warm = dialog.locator('#sc-mix-warmth');
  const warmBefore = await warm.inputValue();
  await warm.focus(); await warm.press('ArrowLeft');
  assert.notEqual(await warm.inputValue(), warmBefore, 'warmth must change in simple mode');
  assert.equal(await dialog.locator('.sc-voices-control').count(),1,'Chiang Mai exposes clear conversation choice');
  assert.equal(await dialog.locator('.sc-voices-options button[aria-pressed="true"]').count(),1);
  assert.match(await dialog.locator('.sc-voices-options button[aria-pressed="true"]').innerText(),/无交谈声/);
  await dialog.locator('.sc-voices-options button').nth(1).click();
  await dialog.locator('.sc-advanced-toggle').click();
  const crowdSlider=dialog.locator('.sc-layer').filter({hasText:/咖啡馆人声/}).locator('input[type=range]');
  assert.ok(Number(await crowdSlider.inputValue())>0,'opt-in really raises cafe voices');
  await dialog.locator('.sc-voices-options button').first().click();
  assert.equal(Number(await crowdSlider.inputValue()),0,'quiet option fully mutes voices');
  await dialog.screenshot({path:'preview-qa/desktop-chiang-mai-quiet-mixer.png'});
  console.log('PASS: conversation muted by default, opt-in possible, reset works');
  assert.equal(await dialog.locator('.sc-eq-controls .sc-emotion-control').count(), 5, 'advanced EQ, reverb and stereo width must be present');
  const widthSlider=dialog.locator('#sc-advanced-width');
  const beforeWidth=await widthSlider.inputValue();
  await widthSlider.focus(); await widthSlider.press('ArrowRight');
  assert.notEqual(await widthSlider.inputValue(),beforeWidth,'stereo width must be adjustable');
  assert.equal(await dialog.locator('.sc-layer').count(), 4, 'advanced mixer must expose real synced stems');
  const slider = dialog.locator('.sc-layers input[type=range]').first();
  const before = await slider.inputValue();
  await slider.focus();
  await slider.press('ArrowLeft');
  assert.notEqual(await slider.inputValue(), before, 'sound slider must actually change');
  await dialog.getByRole('button', { name: /保存这段旅程/ }).click();
  await dialog.getByRole('button', { name: /关闭/ }).click();
  console.log('PASS: sound controls and saved mix');
  await page.getByRole('button', { name: /定时停止/ }).first().click();
  await page.locator('.sc-dialog[open] .sc-focus-options').waitFor();
  await page.locator('.sc-focus-options').getByRole('button', { name: /25/ }).click();
  assert.match(await page.locator('.sc-bottom-line').innerText(), /专注时段/);
  console.log('PASS: focus timer starts independently of music cutoff');
  await page.locator('.sc-leave').click();
  await page.locator('.sc-change-goal').click();
  await page.locator('[data-intent="choose"]').waitFor();
  await page.getByRole('button', { name: /冥想/ }).first().click();
  await page.locator('[data-intent="meditate"]').waitFor();
  assert.match(await page.locator('.sc-copy h1').innerText(), /巴厘岛/);
  assert.match(await page.locator('.sc-film-caption').innerText(), /巴厘岛梯田/);
  assert.match(await page.locator('.sc-video').getAttribute('src'), /bali-travel/);
  await page.locator('.sc-poster').evaluate(img=>img.decode());
  assert.match(await page.locator('.sc-poster').getAttribute('src'),/bali/);
  await page.locator('.sc-copy .sc-enter').click();
  await page.waitForFunction(() => document.querySelector('.scene-experience')?.dataset.audioState === 'playing', null, { timeout: 60000 });
  await page.screenshot({ path: 'preview-qa/desktop-meditate-playing.png', fullPage: true });
  console.log('PASS: Bali meditation playback after state switch');
  await page.getByRole('button', { name: /呼吸引导/ }).first().click();
  await page.locator('.sc-breath-guide').waitFor({state:'visible'});
  await page.locator('.sc-breath-guide button').click();
  await page.locator('.sc-breath-guide').waitFor({state:'hidden'});
  await page.locator('.sc-player-actions button').first().click();
  const places=page.locator('.sc-dialog[open]');
  await places.locator('.sc-gallery-card').first().waitFor();
  assert.equal(await places.locator('.sc-gallery-card').count(),2,'Meditation gallery should default to Bali and Kyoto only');
  await places.getByRole('button',{name:/探索所有状态/}).click();
  assert.equal(await places.locator('.sc-gallery-card').count(),8,'all eight journeys must remain discoverable');
  await places.getByRole('button',{name:/适合当前状态/}).click();
  assert.equal(await places.locator('.sc-gallery-card').count(),2);
  await places.screenshot({path:'preview-qa/desktop-meditation-journeys.png'});
  await places.getByRole('button', {name:/山林静心/}).click();
  await page.locator('[data-scene="kyoto"]').waitFor();
  await page.locator('.sc-poster').evaluate(img=>img.decode());
  assert.match(await page.locator('.sc-poster').getAttribute('src'),/kyoto-travel/);
  assert.match(await page.locator('.sc-film-caption').innerText(), /京都/);
  assert.match(await page.locator('.sc-video').getAttribute('src'), /kyoto-travel/);
  assert.match(await page.locator('.sc-film-caption').innerText(), /爱宕山/);
  const kyotoTitle=await page.locator('.sc-copy h1').innerText();
  assert.equal(kyotoTitle.split('\n').length,2,'Kyoto headline must not break into 3 distracting rows');
  const filmFrame=await page.locator('.sc-copy h1').boundingBox();
  assert.ok(filmFrame && filmFrame.width<=430,'Kyoto headline must preserve at least 60% of landscape for the subject');
  await page.waitForFunction(() => document.querySelector('.scene-experience')?.dataset.audioState==='playing',null,{timeout:60000});
  await page.screenshot({ path: 'preview-qa/desktop-kyoto-playing.png', fullPage: true });
  console.log('PASS: immersive journey switch and Kyoto long-form playback');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  mobile.on('pageerror', error => events.push(error.message));
  await verifyPage(mobile, 'zh');
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Mobile horizontal overflow: ${overflow}px`);
  await mobile.screenshot({ path: 'preview-qa/mobile-intent-zh.png', fullPage: true });
  await mobile.getByRole('button', { name: /放松/ }).first().click();
  await mobile.locator('[data-intent="relax"]').waitFor();
  assert.match(await mobile.locator('.sc-copy h1').innerText(), /大叻/);
  await mobile.locator('.sc-poster').evaluate(img=>img.decode());
  await mobile.screenshot({ path: 'preview-qa/mobile-relax-ready.png', fullPage: true });
  console.log('PASS: mobile layout and relaxing journey');
  await mobile.locator('.sc-change-goal').click();
  await mobile.getByRole('button',{name:/专注/}).first().click();
  await mobile.locator('[data-intent="focus"]').waitFor();
  await mobile.locator('.sc-player-actions button[aria-label="调音"]').click();
  await mobile.locator('.sc-dialog[open] .sc-voices-control').waitFor();
  const quickSave=mobile.locator('.sc-dialog[open] .sc-quick-save');
  assert.equal(await quickSave.isVisible(),true,'Save should be reachable on phones without scrolling to the footer');
  await quickSave.click();
  const mobileMix=await mobile.evaluate(()=>JSON.parse(window.localStorage.getItem('sound-cocktail.places.v1')||'{}').mixes?.['focus-chiang-mai']);
  assert.ok(mobileMix,'top Save must actually persist the current Journey');
  assert.equal(mobileMix.ambience,0,'quiet default must remain muted when saved');
  await mobile.screenshot({path:'preview-qa/mobile-quiet-cafe-mixer.png',fullPage:true});
  const narrowOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(narrowOverflow<=1,'mobile mixer and quiet control must not overflow');
  console.log('PASS: mobile quiet-first mixer is reachable');

  const english = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await verifyPage(english, 'en');
  await english.getByRole('button', { name: /Focus/ }).first().click();
  assert.match(await english.locator('.sc-copy h1').innerText(), /Chiang Mai/i);
  console.log('PASS: English intention flow');

  // Verify real camera motion, rather than mistaking a static poster pan for travel footage.
  const moving=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  moving.on('pageerror', error=>events.push(error.message));
  const movingResponse=await moving.goto(origin+'/zh',{waitUntil:'domcontentloaded',timeout:45000});
  assert.ok(movingResponse?.ok());
  await moving.getByRole('button',{name:/专注/}).first().click();
  await moving.locator('[data-scene="chiang-mai"]').waitFor();
  await moving.waitForFunction(() => {
    const v=document.querySelector('.sc-video');
    return v && !v.paused && v.readyState>=2 && v.currentTime>0.6;
  },null,{timeout:30000});
  const movieTimes=await moving.locator('.sc-video').evaluate(async v=>{
    const initial=v.currentTime;
    await new Promise(resolve=>setTimeout(resolve,1300));
    return {before:initial,after:v.currentTime,readyState:v.readyState};
  });
  assert.ok(movieTimes.after>movieTimes.before+.35,'Actual Chiang Mai moving film must advance');
  await moving.screenshot({path:'preview-qa/desktop-real-motion-chiang-mai.png',fullPage:true});
  console.log('PASS: real Chiang Mai video advancing, not a static illustration');

  // Travel catalogue screenshot series: six source-matched visual identities.
  const review=await browser.newPage({viewport:{width:1400,height:900},reducedMotion:'reduce'});
  await review.goto(origin+'/zh',{waitUntil:'domcontentloaded'});
  await review.getByRole('button',{name:/专注/}).first().click();
  await review.locator('[data-scene="chiang-mai"]').waitFor();
  for(const [slug,label] of [
    ['da-lat','晨雾书页'],
    ['lisbon','午后灵感'],
    ['bali','乌布颂钵声浴'],
    ['kyoto','山林静心'],
    ['hoi-an','灯笼河畔'],
  ]) {
    await review.locator('.sc-nav-active').click();
    await review.locator('.sc-dialog[open]').waitFor();
    const all=review.locator('.sc-explore-filters button').filter({hasText:/探索所有状态/});
    if(await all.count()) await all.click();
    await review.locator('.sc-gallery-card').filter({hasText:label}).click();
    await review.locator(`[data-scene="${slug}"]`).waitFor();
    await review.locator('.sc-poster').evaluate(img=>img.decode());
    assert.equal(await review.locator('.sc-video').getAttribute('src'),`/assets/scenes/${slug}-travel.mp4`);
    assert.match(await review.locator('.sc-film-caption').innerText(), /实景移动镜头/);
    await review.screenshot({path:`preview-qa/real-place-${slug}.png`,fullPage:true});
  }
  console.log('PASS: all six actual destination films and identity captions');

  assert.deepEqual(events, [], 'No uncaught JavaScript errors');
  console.log('PASS: all browser checks');
} finally {
  await browser.close();
}
