/**
 * SEO/GEO P0 测试（P1 后更新：head 按语言签名、规范 URL 带 /en 前缀、
 * sitemap 为 10 页 × 2 语言 + hreflang、llms.txt 列双语 URL）。
 *
 * 覆盖：robots.txt（放行各爬虫 + Sitemap 指向）、sitemap.xml
 * （只列可收录页）、每路由 head（首页 ≠ /focus、均为英文、自指
 * canonical、og:image 绝对地址）、站长验证 meta、字体自托管
 * （源码与构建产物里不再出现 Google Fonts）、llms.txt 与 og 图。
 *
 * 路由级测试沿用 tests/waffo-hooks.mjs 的模式：先 register() 钩子
 * 再动态 import 路由模块。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

register('./waffo-hooks.mjs', import.meta.url);

const seo = await import('../src/seo.mjs');
const robotsRoute = (await import('../src/routes/robots[.]txt.ts')).Route;
const sitemapRoute = (await import('../src/routes/sitemap[.]xml.ts')).Route;

const { SITE_URL, OG_IMAGE_URL, ROUTE_SEO, headForRoute, verificationMeta, verificationTokensFromEnv, verificationFromContext, robotsTxt, sitemapXml } = seo;

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- robots.txt ---

test('seo: robots.txt allows the named crawlers and points at the sitemap', () => {
  const txt = robotsTxt();
  for (const bot of ['Googlebot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Bingbot']) {
    assert.match(txt, new RegExp(`User-agent: ${bot}\\nAllow: /\\nDisallow: /honeypot`), bot);
  }
  assert.match(txt, new RegExp(`^Sitemap: ${SITE_URL.replace(/\//g, '\\/')}/sitemap\\.xml$`, 'm'));
  // A specific Googlebot group must explicitly exclude the retired trap.
  assert.match(txt, /User-agent: \\*\\nAllow: \/\\nDisallow: \/honeypot/);
  assert.doesNotMatch(txt, /Disallow: \/honeypot\\//);
  assert.equal((txt.match(/Disallow:/g) || []).length, 6);
});

test('seo: GET /robots.txt returns the robots file as text/plain', async () => {
  const res = await robotsRoute.options.server.handlers.GET({ request: new Request('http://localhost/robots.txt') });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/plain/);
  const body = await res.text();
  assert.ok(body.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
  assert.ok(body.includes('OAI-SearchBot'));
});

// --- sitemap.xml ---

test('seo: sitemap.xml lists only the public pages with absolute URLs and lastmod', () => {
  const xml = sitemapXml(new Date('2026-11-13T00:00:00Z'));
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'));
  assert.ok(xml.endsWith('</urlset>\n'));
  // 10 页 × 2 语言，全部带语言前缀；裸 / 与 /focus 不再是规范 URL。
  for (const p of ['/en', '/zh', '/en/focus', '/zh/focus', '/en/sleep', '/zh/sleep', '/en/relax', '/zh/relax', '/en/rain', '/zh/rain', '/en/cafe', '/zh/cafe', '/en/about', '/zh/about', '/en/recipes', '/zh/recipes', '/en/plus', '/zh/plus', '/en/sources', '/zh/sources']) {
    assert.ok(xml.includes(`<loc>${SITE_URL}${p}</loc>`), p);
  }
  assert.doesNotMatch(xml, /<loc>https:\/\/soundcocktail\.app\/<\/loc>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/soundcocktail\.app\/focus<\/loc>/);
  assert.ok(xml.includes('<lastmod>2026-11-13</lastmod>'));
  assert.doesNotMatch(sitemapXml(), /<lastmod>/, 'do not fake lastmod for unchanged pages');
  for (const excluded of ['/checkout', '/return', '/waffo-return', '/api/', '/mix/', '/terms', '/privacy', '/mine']) {
    assert.doesNotMatch(xml, new RegExp(`<loc>[^<]*${excluded.replace(/\//g, '\\/')}`), excluded);
  }
  // 每个 <url> 带 hreflang 标注（en、zh-CN、x-default）。
  assert.ok(xml.includes(`<xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/sleep"/>`));
  assert.ok(xml.includes(`<xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_URL}/zh/sleep"/>`));
  assert.ok(xml.includes(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/sleep"/>`));
  // 结构完整：每个 <url> 都有开闭标签，数量与 PUBLIC_PATHS 一致（20）。
  assert.equal((xml.match(/<url>/g) || []).length, 20);
  assert.equal((xml.match(/<\/url>/g) || []).length, 20);
});

test('seo: GET /sitemap.xml returns well-formed XML', async () => {
  const res = await sitemapRoute.options.server.handlers.GET({ request: new Request('http://localhost/sitemap.xml') });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/xml/);
  const body = await res.text();
  assert.ok(body.includes(`<loc>${SITE_URL}/en</loc>`));
  assert.ok(body.includes(`<loc>${SITE_URL}/zh/sleep</loc>`));
  assert.doesNotMatch(body, /checkout|waffo-return|api\//);
});

// --- 每路由 head ---

test('seo: home and /focus have different English titles and descriptions', () => {
  const home = headForRoute('home', 'en');
  const focus = headForRoute('focus', 'en');
  const metaOf = (head, key) => head.meta.find((m) => m.name === key || m.property === key);
  const titleOf = (head) => head.meta.find((m) => typeof m.title === 'string').title;
  assert.notEqual(titleOf(home), titleOf(focus));
  assert.notEqual(metaOf(home, 'description').content, metaOf(focus, 'description').content);
  // 均为英文：标题与描述里没有 CJK 字符。
  const cjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  for (const head of [home, focus]) {
    for (const m of head.meta) {
      for (const v of [m.title, m.content]) {
        if (typeof v === 'string') assert.doesNotMatch(v, cjk, v);
      }
    }
  }
  // Place home describes the new sound-therapy experience. The classic
  // sound mixer is gone, and /studio is a 308 redirect, not a page.
  assert.match(metaOf(home, 'description').content, /Sound therapy/i);
  assert.match(metaOf(home, 'description').content, /real places/i);
  assert.throws(() => headForRoute('studio', 'en'), /unknown seo route: studio/);
  // /focus 标题与描述不同于首页。
  assert.match(metaOf(focus, 'description').content, /focus/i);
  assert.doesNotMatch(metaOf(focus, 'description').content, /white noise/);
});

test('seo: head carries absolute og:image, twitter card and self-referencing canonical', () => {
  assert.equal(OG_IMAGE_URL, `${SITE_URL}/og-image.jpg`);
  for (const [key, canonical] of [['home', `${SITE_URL}/en`], ['focus', `${SITE_URL}/en/focus`]]) {
    const head = headForRoute(key, 'en');
    const ogImage = head.meta.find((m) => m.property === 'og:image');
    assert.equal(ogImage.content, OG_IMAGE_URL);
    assert.equal(head.meta.find((m) => m.name === 'twitter:card').content, 'summary_large_image');
    assert.equal(head.meta.find((m) => m.property === 'og:url').content, canonical);
    // links[0] 为自指 canonical；其后是 hreflang（en、zh-CN、x-default）。
    assert.deepEqual(head.links[0], { rel: 'canonical', href: canonical });
    assert.deepEqual(
      head.links.slice(1).map((l) => [l.hreflang, l.href]),
      [
        ['en', `${SITE_URL}/en${key === 'home' ? '' : '/focus'}`],
        ['zh-CN', `${SITE_URL}/zh${key === 'home' ? '' : '/focus'}`],
        ['x-default', `${SITE_URL}/en${key === 'home' ? '' : '/focus'}`],
      ],
    );
  }
  assert.throws(() => headForRoute('nope', 'en'), /unknown seo route/);
  assert.throws(() => headForRoute('home', 'fr'), /unknown locale/);
});

// --- 站长验证 meta ---

test('seo: verificationMeta emits Google/Bing/Baidu tags only when set', () => {
  assert.deepEqual(verificationMeta({}), []);
  assert.deepEqual(verificationMeta(null), []);
  assert.deepEqual(verificationMeta({ GOOGLE_SITE_VERIFICATION: '  ' }), []);
  assert.deepEqual(
    verificationMeta({
      GOOGLE_SITE_VERIFICATION: ' google123 ',
      BING_SITE_VERIFICATION: 'bing456',
      BAIDU_SITE_VERIFICATION: 'baidu789',
    }),
    [
      { name: 'google-site-verification', content: 'google123' },
      { name: 'msvalidate.01', content: 'bing456' },
      { name: 'baidu-site-verification', content: 'baidu789' },
    ],
  );
  // 只设一个时只出一个。
  assert.deepEqual(verificationMeta({ BAIDU_SITE_VERIFICATION: 'x' }), [
    { name: 'baidu-site-verification', content: 'x' },
  ]);
});

test('seo: verificationTokensFromEnv reads a plain env object', () => {
  assert.deepEqual(
    verificationTokensFromEnv({ GOOGLE_SITE_VERIFICATION: ' g ', BING_SITE_VERIFICATION: 'b', BAIDU_SITE_VERIFICATION: '' }),
    { google: 'g', bing: 'b', baidu: null },
  )
  assert.deepEqual(verificationTokensFromEnv({}), { google: null, bing: null, baidu: null })
  assert.deepEqual(verificationTokensFromEnv(null), { google: null, bing: null, baidu: null })
  assert.deepEqual(verificationTokensFromEnv(undefined), { google: null, bing: null, baidu: null })
})

test('seo: verificationFromContext reads context.cloudflare.env defensively', () => {
  assert.deepEqual(
    verificationFromContext({ cloudflare: { env: { GOOGLE_SITE_VERIFICATION: 'g', BING_SITE_VERIFICATION: 'b' } } }),
    { google: 'g', bing: 'b', baidu: null },
  );
  assert.deepEqual(verificationFromContext({}), { google: null, bing: null, baidu: null });
  assert.deepEqual(verificationFromContext(undefined), { google: null, bing: null, baidu: null });
  assert.deepEqual(verificationFromContext({ cloudflare: {} }), { google: null, bing: null, baidu: null });
});

// --- 字体自托管：源码里不再出现 Google Fonts ---

function walkSrc(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSrc(p));
    else if (/\.(mjs|jsx|tsx|ts|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

test('seo: no Google Fonts references remain in src (self-hosted via fontsource)', () => {
  const files = walkSrc(path.join(projectRoot, 'src'));
  assert.ok(files.length > 10);
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(content, /fonts\.googleapis\.com/, f);
    assert.doesNotMatch(content, /fonts\.gstatic\.com/, f);
  }
  const root = fs.readFileSync(path.join(projectRoot, 'src/routes/__root.tsx'), 'utf8');
  for (const family of ['manrope', 'geist-mono', 'ma-shan-zheng', 'zcool-kuaile', 'caveat', 'cormorant-garamond']) {
    assert.ok(root.includes(`@fontsource/${family}/`), `missing @fontsource/${family} import`);
  }
});

// --- llms.txt 与 og 图 ---

test('seo: llms.txt and llms-full.txt exist in public/ and map the key pages', () => {
  for (const f of ['llms.txt', 'llms-full.txt']) {
    const content = fs.readFileSync(path.join(projectRoot, 'public', f), 'utf8');
    assert.ok(content.length > 100, f);
    // P1：页面列表为双语 URL（/en + /zh），不再有裸 / 与 /focus。
    assert.ok(content.includes('https://soundcocktail.app/en'), f);
    assert.ok(content.includes('https://soundcocktail.app/zh/sleep'), f);
    assert.ok(content.includes('https://soundcocktail.app/en/sleep'), f);
    assert.doesNotMatch(content, /soundcocktail\.app\/focus[^/]/, f);
  }
  const full = fs.readFileSync(path.join(projectRoot, 'public/llms-full.txt'), 'utf8');
  assert.ok(full.includes('22'));
});

test('seo: og-image.jpg exists in public/ at exactly 1200x630', () => {
  const buf = fs.readFileSync(path.join(projectRoot, 'public/og-image.jpg'));
  // JPEG magic: FF D8 FF.
  assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  // Walk segments to the first SOF marker (baseline/progressive frame);
  // its payload is: precision (1B), height (2B), width (2B).
  let offset = 2;
  let dims = null;
  while (offset + 9 < buf.length) {
    assert.equal(buf[offset], 0xff, 'segment marker');
    const marker = buf[offset + 1];
    const len = buf.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      dims = { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      break;
    }
    offset += 2 + len;
  }
  assert.ok(dims, 'JPEG SOF marker found');
  assert.equal(dims.width, 1200);
  assert.equal(dims.height, 630);
});

// --- 首页介绍区文案 ---

test('seo: about page copy carries the sound-therapy positioning in both languages', async () => {
  // 改版：About 文案已从 locale.mjs 的 about 段搬到 landing.mjs 的
  // ABOUT_PAGE（事实来源唯一），locale.mjs 里不再有 about 段。
  const { ABOUT_PAGE } = await import('../src/landing.mjs');
  const en = ABOUT_PAGE.content.en;
  const zh = ABOUT_PAGE.content.zh;
  assert.ok(en.lead.includes('place-inspired sound journeys'));
  assert.ok(en.lead.includes('real film'));
  assert.ok(en.lead.includes('recipes you can save'));
  assert.ok(en.sections[0].body.includes('Kyoto'));
  assert.ok(en.sections[1].body.includes('18 are real field recordings'));
  assert.ok(en.sections[2].body.includes('Listening is free'));
  assert.doesNotMatch(en.lead, /mix a cup|Mix a cup|调一杯/);
  assert.ok(zh.lead.includes('声音旅程小站'));
  assert.ok(zh.lead.includes('真实影像'));
  assert.ok(zh.sections[2].body.includes('收听免费'));
});
