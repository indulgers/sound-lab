/**
 * 机器人防护测试（B6 蜜罐 + UA 封禁 + IP 限速 + KV 封禁名单）。
 *
 * 覆盖：
 * - UA 分类：想留的爬虫（Googlebot / Bingbot / OAI-SearchBot /
 *   PerplexityBot / ClaudeBot）放行；空 UA 与坏 UA 封禁；正常浏览器、
 *   curl、社交平台预览 UA 放行。
 * - 路径分类：支付/认证/API/SEO 文件豁免；蜜罐直通；静态资源只查 IP；
 *   页面全套检查。
 * - guardRequest：坏 UA → 403（极小正文）；已封 IP → 403（页面与
 *   静态资源都拦）；同一 IP 60 秒内 121 次页面请求 → 429；KV 故障
 *   时失败放行；无 KV 时 UA 与限速仍生效。
 * - 蜜罐路由：GET /honeypot → 200 极小正文，KV 里落下封禁记录，
 *   同一 IP 一小时内重复踩只记一次写；此后该 IP 的页面请求 → 403。
 * - /health 带 botGuard 计数。
 *
 * 路由模块用 tests/waffo-hooks.mjs 的替身加载（cloudflare:workers →
 * 可变的 stub env），与 waffo-routes.test.mjs 同一模式。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./waffo-hooks.mjs', import.meta.url);

const { env } = await import('./stubs/cloudflare-workers-stub.mjs');
const guard = await import('../src/bot-guard.mjs');
const honeypotRoute = (await import('../src/routes/honeypot.ts')).Route;
const healthRoute = (await import('../src/routes/health.ts')).Route;
const botGuardMiddleware = (await import('../src/server/bot-guard-middleware.ts')).botGuardMiddleware;

const {
  classifyPath,
  clientIpFromHeaders,
  isAllowedBot,
  isBlockedUa,
  createRateLimiter,
  botBlockKey,
  isIpBlocked,
  recordHoneypotHit,
  guardRequest,
  blockedResponse,
  rateLimitedResponse,
  getBotGuardStats,
  resetBotGuardStats,
  RATE_LIMIT_MAX,
} = guard;

/** 与 KVNamespace 同形的最小内存实现（只实现本模块用到的 get/put）。 */
class FakeKV {
  constructor() {
    this.store = new Map();
    this.putCalls = [];
  }

  async get(key, type) {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (type === 'json') return JSON.parse(raw);
    return raw;
  }

  async put(key, value, options) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    this.putCalls.push({ key, options });
  }

  async delete(key) {
    this.store.delete(key);
  }
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

function req(path, { ua = BROWSER_UA, ip = '203.0.113.10', method = 'GET' } = {}) {
  const headers = {};
  if (ua !== null) headers['user-agent'] = ua;
  if (ip !== null) headers['cf-connecting-ip'] = ip;
  return new Request(`http://localhost${path}`, { method, headers });
}

// --- UA 分类 ---

test('bot-guard: the five wanted crawlers are allowed, everything else is checked', () => {
  for (const ua of [
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
    'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; ClaudeBot/1.0; +https://claude.com/claudebot)',
  ]) {
    assert.equal(isAllowedBot(ua), true, ua);
    assert.equal(isBlockedUa(ua), false, ua);
  }
  // GPTBot（训练爬虫）不在放行名单里——本站不需要它。
  assert.equal(isAllowedBot('Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0)'), false);
});

test('bot-guard: empty UA and bad-bot UAs are blocked; browsers, curl and link previews pass', () => {
  assert.equal(isBlockedUa(''), true);
  assert.equal(isBlockedUa('   '), true);
  for (const ua of [
    'Bytespider/1.0',
    'masscan/1.0',
    'zgrab/0.1',
    'Nikto/2.5',
    'sqlmap/1.7',
    'python-requests/2.32.3',
    'python-urllib/3.11',
    'Go-http-client/2.0',
    'libwww-perl/6.0',
    'Apache-HttpClient/4.5.13 (Java/17)',
  ]) {
    assert.equal(isBlockedUa(ua), true, ua);
  }
  for (const ua of [
    BROWSER_UA,
    MOBILE_UA,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'curl/8.5.0',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
  ]) {
    assert.equal(isBlockedUa(ua), false, ua);
  }
});

// --- 路径分类 ---

test('bot-guard: payment/auth/api/SEO/health paths are exempt; honeypot and assets classified', () => {
  for (const p of [
    '/api/waffo/webhook',
    '/api/waffo/create',
    '/api/pay/notify',
    '/api/auth/google/callback',
    '/api/region',
    '/api/entitlements',
    '/return',
    '/waffo-return',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
    '/health',
  ]) {
    assert.equal(classifyPath(p), 'exempt', p);
  }
  assert.equal(classifyPath('/honeypot'), 'honeypot');
  assert.equal(classifyPath('/honeypot/'), 'honeypot');
  assert.equal(classifyPath('/assets/audio/rain.mp3'), 'asset');
  assert.equal(classifyPath('/assets/index-abc123.js'), 'asset');
  assert.equal(classifyPath('/og-image.png'), 'asset');
  for (const p of ['/', '/en', '/zh', '/en/sleep', '/zh/focus', '/en/checkout', '/en/mix/SYL-ABC']) {
    assert.equal(classifyPath(p), 'page', p);
  }
});

test('bot-guard: client IP comes from cf-connecting-ip first, x-forwarded-for second', () => {
  const h = new Headers({ 'cf-connecting-ip': '203.0.113.1', 'x-forwarded-for': '198.51.100.2' });
  assert.equal(clientIpFromHeaders(h), '203.0.113.1');
  const h2 = new Headers({ 'x-forwarded-for': '198.51.100.2, 203.0.113.3' });
  assert.equal(clientIpFromHeaders(h2), '198.51.100.2');
  assert.equal(clientIpFromHeaders(new Headers()), null);
});

// --- guardRequest：UA 与豁免 ---

test('bot-guard: bad UA on a page gets a tiny 403; wanted crawlers and browsers pass', async () => {
  resetBotGuardStats();
  const kv = new FakeKV();
  const limiter = createRateLimiter();
  const envObj = { ORDERS_KV: kv };

  const blocked = await guardRequest({ request: req('/en', { ua: 'Bytespider/1.0' }), env: envObj, rateLimiter: limiter });
  assert.ok(blocked instanceof Response);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get('x-blocked-by'), 'sound-cocktail-bot-guard');
  assert.equal(blocked.headers.get('x-block-reason'), 'bad-ua');
  const body = await blocked.text();
  assert.ok(body.length < 50, `blocked body must be tiny, got ${body.length} bytes`);

  const emptyUa = await guardRequest({ request: req('/en/sleep', { ua: '' }), env: envObj, rateLimiter: limiter });
  assert.equal(emptyUa.status, 403);

  // 完全没有 User-Agent 头（不是空值，是压根没发）也一样封。
  const noUa = await guardRequest({ request: req('/en/sleep', { ua: null }), env: envObj, rateLimiter: limiter });
  assert.equal(noUa.status, 403);
  assert.equal(noUa.headers.get('x-block-reason'), 'bad-ua');

  for (const ua of [
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
    BROWSER_UA,
    MOBILE_UA,
    'curl/8.5.0',
  ]) {
    assert.equal(await guardRequest({ request: req('/en', { ua }), env: envObj, rateLimiter: limiter }), null, ua);
  }
  assert.equal(getBotGuardStats().uaBlocked, 3);
});

test('bot-guard: payment/auth/api/SEO routes are untouched by the guard even with a bad UA', async () => {
  const kv = new FakeKV();
  const limiter = createRateLimiter();
  const envObj = { ORDERS_KV: kv };
  for (const p of [
    '/api/waffo/webhook',
    '/api/auth/google/callback',
    '/api/pay/notify',
    '/api/region',
    '/return',
    '/waffo-return',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/health',
  ]) {
    assert.equal(
      await guardRequest({ request: req(p, { ua: 'Bytespider/1.0', method: 'POST' }), env: envObj, rateLimiter: limiter }),
      null,
      p,
    );
  }
});

// --- guardRequest：IP 封禁名单 ---

test('bot-guard: a honeypot-trapped IP gets 403 on pages and on assets', async () => {
  resetBotGuardStats();
  const kv = new FakeKV();
  const ip = '203.0.113.77';
  const { wrote } = await recordHoneypotHit(kv, ip, 'EvilBot/1.0', 1_000_000);
  assert.equal(wrote, true);
  assert.ok(await isIpBlocked(kv, ip));

  const limiter = createRateLimiter();
  const envObj = { ORDERS_KV: kv };
  const page = await guardRequest({ request: req('/en', { ip }), env: envObj, rateLimiter: limiter });
  assert.equal(page.status, 403);
  assert.equal(page.headers.get('x-block-reason'), 'ip-blocked');
  const asset = await guardRequest({ request: req('/assets/audio/rain.mp3', { ip }), env: envObj, rateLimiter: limiter });
  assert.equal(asset.status, 403);
  // 同一 IP 换 Googlebot 的 UA 也照样封（伪装 UA 绕不过 IP 封禁）。
  const spoofed = await guardRequest({
    request: req('/en', { ip, ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }),
    env: envObj,
    rateLimiter: limiter,
  });
  assert.equal(spoofed.status, 403);
  assert.equal(getBotGuardStats().ipBlocked, 3);
});

test('bot-guard: a blocked IP is not re-blocked by the UA check on assets (assets skip UA)', async () => {
  const kv = new FakeKV();
  const limiter = createRateLimiter();
  const envObj = { ORDERS_KV: kv };
  // 未封 IP + 坏 UA 取音频：资产只查 IP，不查 UA，放行（由蜜罐/IP 封禁对付它）。
  assert.equal(
    await guardRequest({ request: req('/assets/audio/rain.mp3', { ua: 'Bytespider/1.0' }), env: envObj, rateLimiter: limiter }),
    null,
  );
});

// --- guardRequest：限速 ---

test('bot-guard: 121 page requests from one IP in 60s get 429; wanted crawlers are not exempt', async () => {
  resetBotGuardStats();
  const kv = new FakeKV();
  const limiter = createRateLimiter();
  const envObj = { ORDERS_KV: kv };
  const base = 2_000_000;
  let last = null;
  for (let i = 0; i < RATE_LIMIT_MAX; i++) {
    last = await guardRequest({ request: req('/en', { ip: '203.0.113.55' }), env: envObj, rateLimiter: limiter, now: base + i * 100 });
    assert.equal(last, null, `request ${i + 1} should pass`);
  }
  const over = await guardRequest({ request: req('/en', { ip: '203.0.113.55' }), env: envObj, rateLimiter: limiter, now: base + 12_000 });
  assert.ok(over instanceof Response);
  assert.equal(over.status, 429);
  assert.ok(over.headers.get('retry-after'));
  assert.equal(over.headers.get('x-block-reason'), 'rate-limited');
  assert.ok((await over.text()).length < 50);
  // 窗口过后恢复。
  const after = await guardRequest({ request: req('/en', { ip: '203.0.113.55' }), env: envObj, rateLimiter: limiter, now: base + 61_000 });
  assert.equal(after, null);
  // 伪装成 Googlebot 也一样限速。
  const botLimiter = createRateLimiter();
  for (let i = 0; i < RATE_LIMIT_MAX; i++) {
    await guardRequest({
      request: req('/en', { ip: '203.0.113.56', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }),
      env: envObj,
      rateLimiter: botLimiter,
      now: base + i * 100,
    });
  }
  const botOver = await guardRequest({
    request: req('/en', { ip: '203.0.113.56', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }),
    env: envObj,
    rateLimiter: botLimiter,
    now: base + 12_000,
  });
  assert.equal(botOver.status, 429);
  assert.equal(getBotGuardStats().rateLimited, 2);
});

// --- guardRequest：KV 故障与无 KV ---

test('bot-guard: KV failure fails open (request passes, error counted)', async () => {
  resetBotGuardStats();
  const brokenKv = {
    get: async () => {
      throw new Error('kv down');
    },
    put: async () => {
      throw new Error('kv down');
    },
  };
  const limiter = createRateLimiter();
  const res = await guardRequest({ request: req('/en'), env: { ORDERS_KV: brokenKv }, rateLimiter: limiter });
  assert.equal(res, null);
  assert.equal(getBotGuardStats().kvErrors, 1);
});

test('bot-guard: without KV, UA blocking and rate limiting still work', async () => {
  const limiter = createRateLimiter();
  const bad = await guardRequest({ request: req('/en', { ua: 'masscan/1.0' }), env: null, rateLimiter: limiter });
  assert.equal(bad.status, 403);
  const ok = await guardRequest({ request: req('/en'), env: null, rateLimiter: limiter });
  assert.equal(ok, null);
});

// --- 蜜罐路由 ---

test('bot-guard: GET /honeypot returns a tiny 200 and traps the IP in KV', async () => {
  resetBotGuardStats();
  const kv = new FakeKV();
  env.ORDERS_KV = kv;
  const ip = '203.0.113.99';
  const res = await honeypotRoute.options.server.handlers.GET({
    request: req('/honeypot', { ip, ua: 'SomeBot/9.9' }),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/plain/);
  const body = await res.text();
  assert.ok(body.length < 50, `honeypot body must be tiny, got ${body.length} bytes`);
  const rec = await kv.get(botBlockKey(ip), 'json');
  assert.ok(rec);
  assert.equal(rec.ip, ip);
  assert.equal(rec.hits, 1);
  assert.ok(rec.firstSeen > 0);
  // 一小时内再踩一次：不重复写 KV（hits 仍为 1）。
  const putCalls = kv.putCalls.length;
  await honeypotRoute.options.server.handlers.GET({ request: req('/honeypot', { ip, ua: 'SomeBot/9.9' }) });
  assert.equal(kv.putCalls.length, putCalls);
  assert.equal((await kv.get(botBlockKey(ip), 'json')).hits, 1);
  // 此后该 IP 的页面请求被 403。
  const limiter = createRateLimiter();
  const blocked = await guardRequest({ request: req('/en', { ip }), env: { ORDERS_KV: kv }, rateLimiter: limiter });
  assert.equal(blocked.status, 403);
  assert.equal(getBotGuardStats().honeypotHits, 2);
});

test('bot-guard: honeypot record carries a 30-day TTL', async () => {
  const kv = new FakeKV();
  await recordHoneypotHit(kv, '203.0.113.100', 'Bot/1.0', 3_000_000);
  assert.equal(kv.putCalls.length, 1);
  assert.equal(kv.putCalls[0].options.expirationTtl, 30 * 24 * 3600);
});

// --- 响应体极小 ---

test('bot-guard: blocked and rate-limited bodies are tiny', async () => {
  assert.ok((await blockedResponse('ip-blocked').text()).length < 50);
  assert.ok((await rateLimitedResponse(60).text()).length < 50);
});

// --- /health 计数 ---

test('bot-guard: GET /health reports the guard counters', async () => {
  resetBotGuardStats();
  const res = await healthRoute.options.server.handlers.GET({});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.deepEqual(data.botGuard, { honeypotHits: 0, ipBlocked: 0, uaBlocked: 0, rateLimited: 0, kvErrors: 0 });
});

// --- 根路由中间件（server.middleware）---

test('bot-guard: root server middleware blocks bad UA, blocks trapped IPs, passes clean requests', async () => {
  resetBotGuardStats();
  const kv = new FakeKV();
  env.ORDERS_KV = kv;
  const run = (request) =>
    botGuardMiddleware.options.server({ request, context: {}, next: async () => new Response('ok') });

  // 坏 UA → 403（不走到 next）。
  const bad = await run(req('/en', { ua: 'Bytespider/1.0', ip: '203.0.113.201' }));
  assert.equal(bad.status, 403);

  // 干净请求 → next() 的响应原样返回。
  const ok = await run(req('/en', { ip: '203.0.113.202' }));
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), 'ok');

  // 豁免路径 → next()（支付回调即使 UA 很怪也不拦）。
  const webhook = await run(req('/api/waffo/webhook', { ua: 'Bytespider/1.0', ip: '203.0.113.203', method: 'POST' }));
  assert.equal(webhook.status, 200);

  // 蜜罐封掉的 IP → 403（走真实 KV，不是纯函数推演）。
  await recordHoneypotHit(kv, '203.0.113.204', 'EvilBot/1.0', 4_000_000);
  const trapped = await run(req('/en/sleep', { ip: '203.0.113.204' }));
  assert.equal(trapped.status, 403);
  assert.equal(trapped.headers.get('x-block-reason'), 'ip-blocked');
});
