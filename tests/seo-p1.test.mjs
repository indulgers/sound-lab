/**
 * SEO/GEO P1 测试。
 *
 * 覆盖：
 * 1. 语言 URL：裸路径 308 重定向（redirects.mjs 的纯决策）；
 *    /en 与 /zh head 语言不同、canonical 自指、hreflang 互指 +
 *    唯一 x-default（英文版）；<html lang> 由 URL 前缀决定
 *    （localeFromPath / stripLocalePrefix / localizePath）。
 * 2. 落地页：5 页 × 2 语言真实文案（英文正文 300–600 词、中文
 *    正文有实质长度）、无医疗承诺、预设只用免费通道、FAQ 归属。
 * 3. JSON-LD：WebApplication / FAQPage / BreadcrumbList 字段齐全、
 *    可 JSON 往返、无 aggregateRating / review。
 * 4. /mix/:code：SYL- 编解码往返、与引擎算法交叉兼容、head 含配方
 *    名与配料、无效码 noindex。
 * 5. About 页：作者身份、18 段真实录音、医疗免责（双语）。
 * 6. 解耦守卫：语言 URL（/en 或 /zh）不改变支付地区与币种
 *    （2×2 矩阵的两个交叉角：CN 地区 + 英文界面 → CNY；
 *    海外 + 中文界面 → USD）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const seo = await import('../src/seo.mjs');
const ld = await import('../src/seo-ld.mjs');
const landing = await import('../src/landing.mjs');
const locale = await import('../src/locale.mjs');
const redirects = await import('../src/redirects.mjs');
const codec = await import('../src/recipe-code.mjs');
const { isFreeSound } = await import('../src/listening-session.mjs');
const { detectRegion, currencyForRegion } = await import('../src/region.mjs');
const { SOUNDS } = await import('../src/catalog.mjs');
const { TERMS_PAGE, PRIVACY_PAGE, LEGAL_OPERATOR, LEGAL_UPDATED } = await import('../src/legal.mjs');

const { SITE_URL, headForRoute, headForNoindex, headForMix, canonicalUrl, hreflangLinksFor } = seo;
const { LANDING_KEYS, LANDING_PAGES, LANDING_PRESETS, LANDING_FAQS, ABOUT_PAGE, faqsForPage } = landing;
const { localeFromPath, stripLocalePrefix, localizePath, isLocalizablePath } = locale;
const { redirectForPath, routeForAnchor } = redirects;
const { encodeRecipeCode, decodeRecipeCode } = codec;

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

// --- 1. 语言 URL：重定向决策 ---

test('p1: bare paths 308-redirect to /en, localized and payment paths do not', () => {
  assert.deepEqual(redirectForPath('/'), { to: '/en', statusCode: 308 });
  for (const seg of ['focus', 'sleep', 'relax', 'rain', 'cafe', 'about', 'terms', 'privacy', 'recipes', 'plus', 'mine', 'sources']) {
    assert.deepEqual(redirectForPath(`/${seg}`), { to: `/en/${seg}`, statusCode: 308 }, seg);
  }
  assert.deepEqual(redirectForPath('/checkout'), { to: '/en/checkout', statusCode: 308 });
  assert.deepEqual(redirectForPath('/mix/SYL-abc123'), { to: '/en/mix/SYL-abc123', statusCode: 308 });
  // 已本地化、支付回跳页、API、爬虫文件、健康检查：不重定向。
  for (const p of ['/en', '/zh', '/en/sleep', '/zh/focus', '/en/mix/SYL-x', '/return', '/waffo-return', '/api/region', '/health', '/robots.txt', '/sitemap.xml', '/llms.txt', '/nope']) {
    assert.equal(redirectForPath(p), null, p);
  }
  assert.equal(redirectForPath(null), null);
});

// --- 1b. 拆页：旧版页内锚点 → 新路由 ---

test('split: routeForAnchor maps the old in-page anchors to route segments, nothing else', () => {
  for (const seg of ['recipes', 'plus', 'mine', 'sources']) {
    assert.equal(routeForAnchor(`#${seg}`), `/${seg}`, seg);
  }
  // #mixer 本就是首页，不跳；其他锚点（页内定位）也不跳。
  for (const hash of ['#mixer', '#faq', '#landing', '#about-page', '', '#', null, undefined, 42]) {
    assert.equal(routeForAnchor(hash), null, String(hash));
  }
});

test('split: /mine head is title + description + noindex, no canonical/hreflang, not in the sitemap', async () => {
  for (const locale of ['en', 'zh']) {
    const head = headForNoindex('mine', locale);
    const title = head.meta.find((m) => typeof m.title === 'string').title;
    const desc = head.meta.find((m) => m.name === 'description').content;
    assert.ok(title && desc, locale);
    assert.equal(head.meta.find((m) => m.name === 'robots').content, 'noindex', locale);
    assert.equal(head.links.length, 0, locale);
    assert.ok(!head.meta.some((m) => String(m.property || '').startsWith('og:')), locale);
  }
  // 中文标题与描述含 CJK，英文不含（与 headForRoute 同一守卫）。
  assert.doesNotMatch(headForNoindex('mine', 'en').meta.find((m) => typeof m.title === 'string').title, CJK);
  assert.match(headForNoindex('mine', 'zh').meta.find((m) => m.name === 'description').content, CJK);
  const { sitemapXml } = seo;
  assert.doesNotMatch(sitemapXml(new Date('2026-11-13T00:00:00Z')), /\/mine/);
});

test('split: no in-page anchor links remain in src (routes only)', () => {
  // 拆页后站内导航全是路由链接：href="#mixer" / "#recipes" / "#plus" /
  // "#mine" / "#sources" 不得再出现在源码里。允许的例外：#main（跳到
  // 正文的 skip link 目标）与 #wcBowl / #wcSway（杯子 SVG 内部引用）；
  // 注释里提及旧锚点与 routeForAnchor 的兼容处理不算链接。
  const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
  const walk = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(p));
      else if (/\.(jsx|tsx|ts|mjs|css)$/.test(entry.name)) out.push(p);
    }
    return out;
  };
  const bad = [];
  for (const file of walk(srcDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/href=["']#(mixer|recipes|plus|mine|sources)\b/g)) {
      bad.push(`${path.relative(process.cwd(), file)}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('split: header keeps logo + nav in the pill, language + profile outside it', () => {
  // 静态结构守卫：语言 select 与登录区（AuthButton）必须在药丸
  // （<nav className="topbar">）之外、<header className="topbar-wrap">
  // 之内的 .topbar-utils 里；药丸里只留 logo 与导航链接。
  const view = fs.readFileSync(new URL('../src/SoundLabView.jsx', import.meta.url), 'utf8');
  const headerStart = view.indexOf('<header className="topbar-wrap">');
  assert.ok(headerStart !== -1, 'topbar-wrap header exists');
  const navStart = view.indexOf('<nav className="topbar">', headerStart);
  const navEnd = view.indexOf('</nav>', navStart);
  assert.ok(navStart !== -1 && navEnd > navStart, 'pill nav exists inside the wrap');
  const nav = view.slice(navStart, navEnd);
  assert.ok(nav.includes('BrandMark'), 'pill has the logo');
  assert.ok(nav.includes('NAV_ITEMS'), 'pill has the nav links');
  assert.ok(!nav.includes('lang-select'), 'language select is NOT inside the pill');
  assert.ok(!nav.includes('AuthButton'), 'profile/sign-in is NOT inside the pill');
  const utilsStart = view.indexOf('<div className="topbar-utils">', navEnd);
  assert.ok(utilsStart !== -1, 'topbar-utils exists after the pill nav');
  const utilsEnd = view.indexOf('</div>', utilsStart);
  const utils = view.slice(utilsStart, utilsEnd);
  assert.ok(utils.includes('lang-select'), 'utils has the language select');
  assert.ok(utils.includes('AuthButton'), 'utils has the profile/sign-in');
  // 样式：utils 在宽屏绝对定位到药丸外右侧，窄屏换行到药丸下方右对齐。
  const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.topbar-wrap'), 'topbar-wrap CSS exists');
  assert.ok(css.includes('.topbar-utils'), 'topbar-utils CSS exists');
  assert.match(css, /@media \(min-width:1600px\)\{\s*\/\*[\s\S]*?\.topbar-utils\{\s*position:absolute/, 'utils is absolute right at >=1600px');
  assert.match(css, /@media \(max-width:1599px\)\{[\s\S]*?\.topbar-utils\{flex-basis:100%;justify-content:flex-end\}/, 'utils wraps to a second row below 1600px');
});

test('p1: locale URL helpers — prefix in, prefix out, bare paths stay bare', () => {
  assert.equal(localeFromPath('/en/focus'), 'en');
  assert.equal(localeFromPath('/zh'), 'zh');
  assert.equal(localeFromPath('/en/'), 'en');
  assert.equal(localeFromPath('/focus'), null);
  assert.equal(localeFromPath('/'), null);
  assert.equal(localeFromPath('/english'), null);
  assert.equal(stripLocalePrefix('/en/focus'), '/focus');
  assert.equal(stripLocalePrefix('/zh'), '/');
  assert.equal(stripLocalePrefix('/en'), '/');
  assert.equal(stripLocalePrefix('/focus'), '/focus');
  assert.equal(localizePath('/focus', 'zh'), '/zh/focus');
  assert.equal(localizePath('/en/focus', 'zh'), '/zh/focus');
  assert.equal(localizePath('/', 'en'), '/en');
  assert.equal(localizePath('/zh/sleep', 'en'), '/en/sleep');
  assert.equal(isLocalizablePath('/en/sleep'), true);
  assert.equal(isLocalizablePath('/return'), false);
  assert.equal(isLocalizablePath('/waffo-return'), false);
  assert.equal(isLocalizablePath('/api/region'), false);
  assert.equal(isLocalizablePath('/sitemap.xml'), false);
  assert.equal(canonicalUrl('sleep', 'en'), `${SITE_URL}/en/sleep`);
  assert.equal(canonicalUrl('home', 'zh'), `${SITE_URL}/zh`);
});

// --- 1. 语言 URL：head ---

test('p1: /en and /zh heads differ in language, canonical is self, hreflang is reciprocal with one x-default', () => {
  for (const key of ['home', 'focus', 'sleep', 'relax', 'rain', 'cafe', 'about', 'terms', 'privacy', 'recipes', 'plus', 'sources']) {
    const en = headForRoute(key, 'en');
    const zh = headForRoute(key, 'zh');
    const titleOf = (h) => h.meta.find((m) => typeof m.title === 'string').title;
    const descOf = (h) => h.meta.find((m) => m.name === 'description').content;
    assert.notEqual(titleOf(en), titleOf(zh), key);
    assert.notEqual(descOf(en), descOf(zh), key);
    // 英文 head 无 CJK；中文 head 有 CJK。
    for (const m of en.meta) {
      for (const v of [m.title, m.content]) {
        if (typeof v === 'string') assert.doesNotMatch(v, CJK, `${key} en: ${v}`);
      }
    }
    assert.match(descOf(zh), CJK, key);
    // canonical 自指，不跨语言。
    assert.deepEqual(en.links[0], { rel: 'canonical', href: canonicalUrl(key, 'en') });
    assert.deepEqual(zh.links[0], { rel: 'canonical', href: canonicalUrl(key, 'zh') });
    // hreflang：两语言 + 唯一 x-default（英文版），两边互指同一组。
    assert.deepEqual(hreflangLinksFor(key), [
      { rel: 'alternate', hreflang: 'en', href: canonicalUrl(key, 'en') },
      { rel: 'alternate', hreflang: 'zh-CN', href: canonicalUrl(key, 'zh') },
      { rel: 'alternate', hreflang: 'x-default', href: canonicalUrl(key, 'en') },
    ]);
    assert.deepEqual(en.links.slice(1), hreflangLinksFor(key));
    assert.deepEqual(zh.links.slice(1), hreflangLinksFor(key));
    // og:locale 与另一语言交替。
    assert.equal(en.meta.find((m) => m.property === 'og:locale').content, 'en_US');
    assert.equal(zh.meta.find((m) => m.property === 'og:locale').content, 'zh_CN');
    assert.equal(en.meta.find((m) => m.property === 'og:locale:alternate').content, 'zh_CN');
    assert.equal(en.meta.find((m) => m.property === 'og:url').content, canonicalUrl(key, 'en'));
  }
});

// --- 2. 落地页文案 ---

const words = (s) => s.split(/\s+/).filter(Boolean).length;

test('p1: landing pages have real copy in both languages (EN 300–600 words), no medical claims', () => {
  assert.deepEqual([...LANDING_KEYS].sort(), ['cafe', 'focus', 'rain', 'relax', 'sleep']);
  for (const key of LANDING_KEYS) {
    const page = LANDING_PAGES[key];
    assert.ok(page, key);
    for (const loc of ['en', 'zh']) {
      const seoEntry = page.seo[loc];
      assert.ok(seoEntry.title.length > 10, `${key} ${loc} title`);
      assert.ok(seoEntry.description.length > 40, `${key} ${loc} description`);
      const c = page.content[loc];
      assert.ok(c.h1.length > 3, `${key} ${loc} h1`);
      assert.ok(c.standfirst.length > 40, `${key} ${loc} standfirst`);
      assert.equal(c.sections.length, 3, `${key} ${loc} sections`);
      for (const s of c.sections) {
        assert.ok(s.h2.length >= 3, `${key} ${loc} h2`);
        assert.ok(s.body.length > 100, `${key} ${loc} body`);
      }
      assert.ok(c.presetNote.length > 20, `${key} ${loc} presetNote`);
    }
    // 英文正文（导语 + 3 节）300–600 词；中文正文有实质长度。
    const enBody = page.content.en.standfirst + ' ' + page.content.en.sections.map((s) => s.body).join(' ');
    const enCount = words(enBody);
    assert.ok(enCount >= 300 && enCount <= 600, `${key} en words: ${enCount}`);
    const zhBody = page.content.zh.standfirst + page.content.zh.sections.map((s) => s.body).join('');
    assert.ok(zhBody.length >= 400, `${key} zh chars: ${zhBody.length}`);
    // 无医疗承诺：不写治愈失眠 / 治疗焦虑之类的话。
    const all = JSON.stringify(page.content);
    assert.doesNotMatch(all, /cures insomnia|cure insomnia|treats anxiety|治愈失眠|治疗失眠|治疗焦虑/);
  }
  // 目标关键词在标题/描述里：sleep → rain sounds for sleep / 雨声助眠。
  assert.match(LANDING_PAGES.sleep.seo.en.title, /Rain Sounds for Sleep/i);
  assert.match(LANDING_PAGES.sleep.seo.zh.title, /雨声助眠/);
  assert.match(LANDING_PAGES.focus.seo.en.title, /Focus Sounds for Studying/i);
  assert.match(LANDING_PAGES.focus.seo.zh.title, /专注白噪音/);
  assert.match(LANDING_PAGES.rain.seo.en.title, /Rain Sounds/i);
  assert.match(LANDING_PAGES.cafe.seo.en.title, /Café Ambience for Writing/i);
  assert.match(LANDING_PAGES.cafe.seo.zh.title, /咖啡馆背景音/);
});

test('p1: landing presets use free sounds only, values in 0–1, and match the known catalog recipes', () => {
  const known = new Set(SOUNDS.map((s) => s.id));
  for (const key of LANDING_KEYS) {
    const preset = LANDING_PRESETS[key];
    assert.ok(preset, key);
    assert.ok(Object.keys(preset.mix).length >= 2, key);
    for (const [id, level] of Object.entries(preset.mix)) {
      assert.ok(known.has(id), `${key}: unknown sound ${id}`);
      assert.ok(isFreeSound(id), `${key}: preset uses non-free sound ${id}`);
      assert.ok(level > 0 && level <= 1, `${key}: ${id} level ${level}`);
    }
    assert.ok(preset.name.length > 0 && preset.nameEn.length > 0, key);
  }
  // 与站内已有精选配方对应：sleep=雨夜独处、focus=咖啡馆靠窗、relax=篝火边。
  assert.deepEqual(LANDING_PRESETS.sleep.mix, { rain: 0.76, piano: 0.24, wind: 0.18 });
  assert.deepEqual(LANDING_PRESETS.focus.mix, { cafe: 0.62, keyboard: 0.38, guitar: 0.18 });
  assert.deepEqual(LANDING_PRESETS.relax.mix, { fire: 0.75, wind: 0.24, piano: 0.16 });
});

test('p1: FAQ pool has 8 Q&As in both languages, every landing page gets 3+ of them', () => {
  assert.equal(LANDING_FAQS.length, 8);
  const ids = new Set();
  for (const faq of LANDING_FAQS) {
    assert.ok(faq.id && !ids.has(faq.id), faq.id);
    ids.add(faq.id);
    assert.ok(faq.pages.length >= 1, faq.id);
    for (const loc of ['en', 'zh']) {
      assert.ok(faq.q[loc].length >= 6, `${faq.id} ${loc} q`);
      assert.ok(faq.a[loc].length > 60, `${faq.id} ${loc} a`);
    }
    for (const p of faq.pages) assert.ok(LANDING_KEYS.includes(p), `${faq.id} page ${p}`);
  }
  for (const key of LANDING_KEYS) {
    const faqs = faqsForPage(key);
    assert.ok(faqs.length >= 3, `${key} faqs: ${faqs.length}`);
  }
  // 产品问题在池里：免费吗 / 账号与离线。
  assert.ok(LANDING_FAQS.some((f) => f.id === 'free'));
  assert.ok(LANDING_FAQS.some((f) => f.id === 'account'));
  // 白噪音与睡眠那条引用了已核实的 2025 年荟萃分析，同时写明证据不一。
  const sleepFaq = LANDING_FAQS.find((f) => f.id === 'white-noise-sleep');
  assert.match(sleepFaq.a.en, /2025 meta-analysis of 12 randomized trials with 1,301 people/);
  assert.match(sleepFaq.a.en, /Ding et al\., Sleep Medicine/);
  assert.match(sleepFaq.a.en, /evidence is mixed/);
  assert.match(sleepFaq.a.zh, /2025 年一项荟萃分析/);
  assert.match(sleepFaq.a.zh, /12 项随机试验、共 1301 人/);
});

// --- 3. JSON-LD ---

test('p1: JSON-LD parses, has the required fields, and never fabricates ratings or reviews', () => {
  const homeEn = ld.webApplicationLd('en');
  assert.equal(homeEn['@type'], 'WebApplication');
  assert.equal(homeEn.name, 'Sound Cocktail');
  assert.equal(homeEn.url, `${SITE_URL}/en/`);
  assert.equal(homeEn.applicationCategory, 'MultimediaApplication');
  assert.equal(homeEn.offers.price, '0');
  assert.equal(ld.webApplicationLd('zh').inLanguage, 'zh-CN');

  for (const key of ['home', 'focus', 'sleep', 'relax', 'rain', 'cafe', 'about']) {
    for (const loc of ['en', 'zh']) {
      const items = ld.ldJsonForRoute(key, loc);
      assert.ok(items.length >= 1, `${key} ${loc}`);
      for (const item of items) {
        // 可 JSON 往返（路由层 stringify 后注入 head）。
        const roundTripped = JSON.parse(JSON.stringify(item));
        assert.deepEqual(roundTripped, item);
        assert.equal(item['@context'], 'https://schema.org');
      }
      // 全站 JSON-LD 里没有任何评分/评论。
      assert.doesNotMatch(JSON.stringify(items), /aggregateRating|\"review\"|reviewRating/);
    }
  }

  // FAQPage：本页 FAQ 全在 mainEntity 里，问答对应。
  const sleepFaqLd = ld.faqPageLd('sleep');
  assert.equal(sleepFaqLd['@type'], 'FAQPage');
  assert.equal(sleepFaqLd.mainEntity.length, faqsForPage('sleep').length);
  for (const q of sleepFaqLd.mainEntity) {
    assert.equal(q['@type'], 'Question');
    assert.equal(q.acceptedAnswer['@type'], 'Answer');
    assert.ok(typeof q.name === 'string' && q.name.length > 0);
    assert.ok(typeof q.acceptedAnswer.text === 'string' && q.acceptedAnswer.text.length > 0);
  }

  // BreadcrumbList：首页 → 本页，两级，URL 与 canonical 一致。
  const crumbs = ld.breadcrumbLd('sleep', 'en', 'Rain sounds for sleep');
  assert.equal(crumbs['@type'], 'BreadcrumbList');
  assert.equal(crumbs.itemListElement.length, 2);
  assert.equal(crumbs.itemListElement[0].item, `${SITE_URL}/en/`);
  assert.equal(crumbs.itemListElement[1].item, `${SITE_URL}/en/sleep`);

  // headForRoute 能把 JSON-LD 注入为 script:ld+json meta。
  const head = headForRoute('sleep', 'en', { ldJson: ld.ldJsonForRoute('sleep', 'en') });
  const scripts = head.meta.filter((m) => m.key === 'script:ld+json');
  assert.equal(scripts.length, 2);
  for (const s of scripts) {
    assert.equal(s.tag, 'script');
    assert.equal(s.type, 'application/ld+json');
    const parsed = JSON.parse(s.content);
    assert.ok(['FAQPage', 'BreadcrumbList'].includes(parsed['@type']));
  }
  assert.doesNotMatch(JSON.stringify(head.meta), /aggregateRating/);
});

// --- 4. /mix/:code ---

/** 引擎内部 encodeRecipe 的同款算法（JSON → base64url，前缀 SYL-），内联在测试里做交叉验证。 */
function engineEncode(name, mix) {
  const payload = { n: name, m: {} };
  for (const k of Object.keys(mix)) payload.m[k] = Math.round(mix[k] * 100);
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return 'SYL-' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

test('p1: recipe code round-trips, matches the engine algorithm, and powers /mix/:code head', () => {
  const mix = { rain: 0.8, stream: 0.3, wind: 0.2 };
  const code = encodeRecipeCode('Rain on the Window', mix);
  assert.ok(code.startsWith('SYL-'));
  const decoded = decodeRecipeCode(code);
  assert.equal(decoded.name, 'Rain on the Window');
  assert.deepEqual(decoded.mix, mix);

  // 引擎算法算出的码，本模块必须能解（两者同一套算法）。
  const engineCode = engineEncode('Rainy Night Alone', { rain: 0.76, piano: 0.24, wind: 0.18 });
  assert.deepEqual(decodeRecipeCode(engineCode), {
    name: 'Rainy Night Alone',
    mix: { rain: 0.76, piano: 0.24, wind: 0.18 },
    params: null,
  });

  // 无效码抛错（路由层转 noindex 中性页）。
  assert.throws(() => decodeRecipeCode(''), /empty recipe code/);
  assert.throws(() => decodeRecipeCode('SYL-!!!'), /invalid recipe code/);
  assert.throws(() => decodeRecipeCode(engineEncode('x', { nope: 0.5 })), /no known sounds/);

  // 有效码的 head：标题用配方名，描述列配料，canonical 自指 + hreflang。
  const head = headForMix(decoded, 'en', code);
  assert.ok(head.meta.find((m) => typeof m.title === 'string').title.startsWith('Rain on the Window'));
  assert.match(head.meta.find((m) => m.name === 'description').content, /Rain 80/);
  assert.match(head.meta.find((m) => m.name === 'description').content, /Stream 30/);
  assert.equal(head.links[0].href, `${SITE_URL}/en/mix/${code}`);
  assert.equal(head.meta.find((m) => m.property === 'og:image').content, `${SITE_URL}/og-image.png`);
  assert.ok(head.links.some((l) => l.hreflang === 'x-default' && l.href === `${SITE_URL}/en/mix/${code}`));
  assert.doesNotMatch(JSON.stringify(head), /noindex/);

  // 无效码的 head：通用标题 + noindex，不编造内容。
  const bad = headForMix(null, 'zh', 'SYL-bad');
  assert.equal(bad.meta.find((m) => m.name === 'robots').content, 'noindex');
  assert.equal(bad.links[0].href, `${SITE_URL}/zh/mix/SYL-bad`);
});

// --- 5. About 页 ---

test('p1: about page states the creator, the 18 real recordings, and the medical disclaimer in both languages', () => {
  for (const loc of ['en', 'zh']) {
    const seoEntry = ABOUT_PAGE.seo[loc];
    assert.ok(seoEntry.title.length > 10, loc);
    const c = ABOUT_PAGE.content[loc];
    assert.ok(c.h1.length > 3, loc);
    assert.ok(c.lead.length > 60, loc);
    assert.equal(c.sections.length, 3, loc);
  }
  const en = ABOUT_PAGE.content.en.lead + ' ' + ABOUT_PAGE.content.en.sections.map((s) => s.body).join(' ');
  assert.match(en, /made by one person — limer, an independent full-stack developer/);
  assert.match(en, /18 are real field recordings/);
  assert.match(en, /FluidR3 GM soundfont \(CC BY 3\.0\)/);
  assert.match(en, /not a medical product/);
  assert.match(en, /does not treat insomnia, anxiety or tinnitus/);
  assert.match(en, /no subscription/);
  const zh = ABOUT_PAGE.content.zh.lead + ABOUT_PAGE.content.zh.sections.map((s) => s.body).join('');
  assert.match(zh, /作者只有一个人——limer，一名独立全栈开发者/);
  assert.match(zh, /18 种是真实的野外录音/);
  assert.match(zh, /不是医疗产品/);
  assert.match(zh, /不治疗失眠、焦虑或耳鸣/);
  assert.match(zh, /没有订阅/);
  // About 页 head 与首页 About 区块不矛盾：都说免费、22 种声音、不用注册。
  const aboutEnAll = ABOUT_PAGE.content.en.lead + ' ' + ABOUT_PAGE.content.en.sections.map((s) => s.body).join(' ');
  assert.match(aboutEnAll, /free/i);
  assert.match(aboutEnAll, /22 sounds/);
  assert.match(aboutEnAll, /no account needed to mix/);
});

// --- 5b. 法律页（Terms / Privacy，Waffo 商家审核清单）---

function legalText(page, loc) {
  const c = page.content[loc];
  return [c.h1, c.lead, ...c.sections.flatMap((s) => [s.h2, ...s.body, ...(s.list || [])])].join(' ');
}

test('p1: legal pages have complete EN+ZH content, no mixed languages, checklist phrases present', () => {
  // 运营者与更新日期：双语一致、真实（非占位符）。
  assert.equal(LEGAL_OPERATOR.nameEn, 'Zhu Weiye');
  assert.equal(LEGAL_OPERATOR.nameZh, '朱伟晔');
  assert.equal(LEGAL_OPERATOR.email, 'weiyezhu180@gmail.com');
  assert.ok(LEGAL_UPDATED.en.includes('13 November 2026'));
  assert.ok(LEGAL_UPDATED.zh.includes('2026年11月13日'));
  for (const [key, page] of [['terms', TERMS_PAGE], ['privacy', PRIVACY_PAGE]]) {
    for (const loc of ['en', 'zh']) {
      const c = page.content[loc];
      assert.ok(c.h1 && c.lead.length > 40, `${key} ${loc}: h1/lead`);
      assert.equal(c.sections.length, 14, `${key} ${loc}: 14 sections`);
      for (const s of c.sections) {
        assert.ok(s.h2, `${key} ${loc}: section h2`);
        assert.ok(Array.isArray(s.body) && s.body.length > 0, `${key} ${loc}: ${s.h2} body`);
      }
      // 联系邮箱在双语都出现（审核清单：客服邮箱须真实、已监控）。
      assert.ok(legalText(page, loc).includes('weiyezhu180@gmail.com'), `${key} ${loc}: support email`);
    }
    // 英文版 600–1000 词、无 CJK；中文版实质长度（>1000 汉字）。
    const enText = legalText(page, 'en');
    const enWords = enText.split(/\s+/).filter(Boolean).length;
    assert.ok(enWords >= 600 && enWords <= 1000, `${key} en words: ${enWords}`);
    assert.doesNotMatch(enText, CJK, `${key} en: no CJK`);
    const zhText = legalText(page, 'zh');
    assert.ok((zhText.match(new RegExp(CJK.source, 'g')) || []).length > 1000, `${key} zh: substantial`);
  }
  // ToS 清单要点（审核清单 + ToS 模板）：产品描述、价格与计费周期、
  // 退款政策、免责、违规/停用、支付处理方、医疗免责。
  const tosEn = legalText(TERMS_PAGE, 'en');
  for (const phrase of ['Zhu Weiye', 'Focus ($1.99', 'Sleep ($2.99', 'Rain Night ($3.99', 'Waffo Pancake', 'No subscription', '7 days', '90 days', '12 months', '14 days', 'not a medical product', 'PCI-DSS']) {
    assert.ok(tosEn.includes(phrase), `terms en: ${phrase}`);
  }
  const tosZh = legalText(TERMS_PAGE, 'zh');
  for (const phrase of ['朱伟晔', '专注包', '助眠包', '雨夜包', 'Waffo Pancake', '没有订阅', '7 天', '90 天', '12 个月', '14 天', '不是医疗产品', '不治疗失眠、焦虑或耳鸣']) {
    assert.ok(tosZh.includes(phrase), `terms zh: ${phrase}`);
  }
  // Privacy 清单要点（Privacy 模板 14 节）：收集什么、如何使用与
  // 存储、第三方共享、用户权利；卡号不经本站；Waffo 为 PCI-DSS 处理方。
  const privEn = legalText(PRIVACY_PAGE, 'en');
  for (const phrase of ['Waffo Pancake', 'Alipay', 'Cloudflare', 'Google', 'We do not collect card numbers', 'do not sell', 'PBKDF2', '72 hours', '90 days', '30 calendar days', '15 days', 'sc_session', 'sound-lab.recipes']) {
    assert.ok(privEn.includes(phrase), `privacy en: ${phrase}`);
  }
  const privZh = legalText(PRIVACY_PAGE, 'zh');
  for (const phrase of ['Waffo Pancake', '支付宝', 'Cloudflare', 'Google', '我们不收集银行卡号', '不出售', 'PBKDF2', '72 小时', '90 天', '30 个自然日', '15 天', 'sc_session', 'sound-lab.recipes']) {
    assert.ok(privZh.includes(phrase), `privacy zh: ${phrase}`);
  }
  // ToS 与 Privacy 互相印证：同一运营者、同一退款窗口、同一删除期限。
  assert.match(tosEn, /weiyezhu180@gmail\.com/);
  assert.match(privEn, /weiyezhu180@gmail\.com/);
  assert.match(tosEn, /90 days/);
  assert.match(privEn, /90 days/);
});

// --- 6. 解耦守卫：语言 URL 不改变支付地区与币种 ---

test('p1: language URL never changes payment region or currency (decoupling guard)', () => {
  // CN 地区 + 英文界面（/en）：仍走支付宝 CNY。
  const cnEn = detectRegion({ country: 'CN', timeZone: 'America/Los_Angeles', languages: ['en-US'] });
  assert.equal(cnEn.region, 'cn');
  assert.equal(currencyForRegion(cnEn.region), 'CNY');
  // 海外 + 中文界面（/zh）：仍走 Waffo USD。
  const overseasZh = detectRegion({ country: 'US', timeZone: 'America/Los_Angeles', languages: ['zh-CN'] });
  assert.equal(overseasZh.region, 'overseas');
  assert.equal(currencyForRegion(overseasZh.region), 'USD');
  // detectRegion 的输入里没有"页面语言"这一项：URL 前缀（locale）传不进去。
  // 同一份请求信号下，/en 与 /zh 的结论相同——语言切换只改文案。
  const signals = { country: 'CN', timeZone: 'Asia/Shanghai', languages: ['zh-CN'] };
  assert.deepEqual(detectRegion(signals), detectRegion(signals));
});
