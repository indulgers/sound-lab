/**
 * 解耦自动地区（decoupled auto-locale）测试。
 *
 * 规则（2026-11-12 用户明确）：
 * - UI 语言只看浏览器语言，手动切换只改文案，绝不改支付方式和价格；
 * - 支付地区只看服务端国家（Cloudflare），兜底时区 → 浏览器语言；
 * - 价格跟支付地区走，不跟语言走。
 *
 * 路由级测试沿用 tests/waffo-hooks.mjs 的模式：先 register() 钩子
 * 再动态 import 路由模块（'cloudflare:workers' 需替身）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./waffo-hooks.mjs', import.meta.url);

const region = await import('../src/region.mjs');
const { detectUiLocale } = await import('../src/locale.mjs');
const { findPack, packDisplay } = await import('../src/packs.mjs');
const regionRoute = (await import('../src/routes/api/region.ts')).Route;
const productsRoute = (await import('../src/routes/api/products.ts')).Route;

const {
  CN_TIMEZONES,
  regionFromCountry,
  regionFromTimeZone,
  regionFromLanguage,
  detectRegion,
  countryFromRequest,
  currencyForRegion,
  providerForRegion,
  checkoutConfig,
} = region;

// --- 国家 → 地区 ---

test('region: country CN maps to cn, anything else to overseas', () => {
  assert.equal(regionFromCountry('CN'), 'cn');
  assert.equal(regionFromCountry('cn'), 'cn');
  assert.equal(regionFromCountry(' Cn '), 'cn');
  assert.equal(regionFromCountry('US'), 'overseas');
  assert.equal(regionFromCountry('JP'), 'overseas');
  assert.equal(regionFromCountry(''), 'overseas');
  assert.equal(regionFromCountry(null), 'overseas');
  assert.equal(regionFromCountry(undefined), 'overseas');
});

// --- 时区 → 地区 ---

test('region: CN timezones map to cn, others to overseas', () => {
  for (const tz of [...CN_TIMEZONES]) {
    assert.equal(regionFromTimeZone(tz), 'cn', tz);
  }
  assert.equal(regionFromTimeZone('Asia/Shanghai'), 'cn');
  assert.equal(regionFromTimeZone('Asia/Chongqing'), 'cn');
  assert.equal(regionFromTimeZone('Asia/Taipei'), 'cn');
  assert.equal(regionFromTimeZone('Asia/Hong_Kong'), 'cn');
  assert.equal(regionFromTimeZone('Asia/Macau'), 'cn');
  assert.equal(regionFromTimeZone('America/Los_Angeles'), 'overseas');
  assert.equal(regionFromTimeZone('Europe/London'), 'overseas');
  assert.equal(regionFromTimeZone(''), 'overseas');
  assert.equal(regionFromTimeZone(null), 'overseas');
});

// --- 浏览器语言 → 地区（最后兜底） ---

test('region: zh language maps to cn, others to overseas', () => {
  assert.equal(regionFromLanguage('zh-CN'), 'cn');
  assert.equal(regionFromLanguage('zh-TW'), 'cn');
  assert.equal(regionFromLanguage('zh-HK'), 'cn');
  assert.equal(regionFromLanguage('zh'), 'cn');
  assert.equal(regionFromLanguage('en-US'), 'overseas');
  assert.equal(regionFromLanguage('en'), 'overseas');
  assert.equal(regionFromLanguage('ja'), 'overseas');
  assert.equal(regionFromLanguage(''), 'overseas');
});

// --- 优先级：国家 > 时区 > 语言 > 默认 ---

test('region: detectRegion priority is country, then timezone, then language', () => {
  assert.deepEqual(detectRegion({ country: 'CN', timeZone: 'America/Los_Angeles', languages: ['en-US'] }), {
    region: 'cn',
    source: 'country',
  });
  assert.deepEqual(detectRegion({ country: 'US', timeZone: 'Asia/Shanghai', languages: ['zh-CN'] }), {
    region: 'overseas',
    source: 'country',
  });
  assert.deepEqual(detectRegion({ timeZone: 'Asia/Shanghai', languages: ['en-US'] }), {
    region: 'cn',
    source: 'timezone',
  });
  // 时区信号优先于语言：在洛杉矶的中文用户按时区判 overseas（Waffo USD 正确）。
  assert.deepEqual(detectRegion({ timeZone: 'America/Los_Angeles', languages: ['zh-CN'] }), {
    region: 'overseas',
    source: 'timezone',
  });
  assert.deepEqual(detectRegion({ languages: ['zh-CN'] }), { region: 'cn', source: 'language' });
  assert.deepEqual(detectRegion({ languages: ['en-US'] }), { region: 'overseas', source: 'language' });
  assert.deepEqual(detectRegion({}), { region: 'overseas', source: 'default' });
  assert.deepEqual(detectRegion(), { region: 'overseas', source: 'default' });
});

// --- 从请求取国家 ---

test('region: countryFromRequest reads request.cf.country first, then cf-ipcountry header', () => {
  const withCf = new Request('http://localhost/api/region');
  Object.defineProperty(withCf, 'cf', { value: { country: 'CN' }, configurable: true });
  assert.equal(countryFromRequest(withCf), 'CN');

  const withHeader = new Request('http://localhost/api/region', {
    headers: { 'cf-ipcountry': 'US' },
  });
  assert.equal(countryFromRequest(withHeader), 'US');

  const withBoth = new Request('http://localhost/api/region', {
    headers: { 'cf-ipcountry': 'US' },
  });
  Object.defineProperty(withBoth, 'cf', { value: { country: 'CN' }, configurable: true });
  assert.equal(countryFromRequest(withBoth), 'CN');

  assert.equal(countryFromRequest(new Request('http://localhost/api/region')), null);
  assert.equal(countryFromRequest(null), null);
  assert.equal(countryFromRequest(undefined), null);
});

// --- 地区 → 币种 / 渠道 / 结账选择（只看地区，不看语言） ---

test('region: currency and provider follow the region, never the locale', () => {
  assert.equal(currencyForRegion('cn'), 'CNY');
  assert.equal(currencyForRegion('overseas'), 'USD');
  assert.equal(providerForRegion('cn'), 'alipay');
  assert.equal(providerForRegion('overseas'), 'waffo');

  assert.deepEqual(checkoutConfig('cn'), {
    region: 'cn',
    currency: 'CNY',
    provider: 'alipay',
    symbol: '¥',
    isWaffo: false,
  });
  assert.deepEqual(checkoutConfig('overseas'), {
    region: 'overseas',
    currency: 'USD',
    provider: 'waffo',
    symbol: '$',
    isWaffo: true,
  });
  // 误把语言当地区传也不会走到支付宝：只有 'cn' 才选支付宝。
  assert.equal(checkoutConfig('en').provider, 'waffo');
  assert.equal(checkoutConfig('zh').provider, 'waffo');
});

// --- UI 语言自动判断（只看浏览器语言） ---

test('locale: detectUiLocale follows the browser language, zh* maps to zh', () => {
  assert.equal(detectUiLocale(['zh-CN', 'en-US']), 'zh');
  assert.equal(detectUiLocale(['zh-TW']), 'zh');
  assert.equal(detectUiLocale(['zh-HK']), 'zh');
  assert.equal(detectUiLocale(['zh']), 'zh');
  assert.equal(detectUiLocale(['en-US', 'zh-CN']), 'en');
  assert.equal(detectUiLocale(['en']), 'en');
  assert.equal(detectUiLocale(['ja', 'en']), 'en');
  assert.equal(detectUiLocale([]), 'en');
  assert.equal(detectUiLocale(undefined), 'en');
});

// --- 包展示：文案看语言，价格看币种（解耦的核心） ---

test('packs: packDisplay takes name/desc from locale and price from currency independently', () => {
  const focus = findPack('focus-pack');
  // 中文界面 + 美元地区：在国外的中文用户看到中文名、$ 价。
  assert.deepEqual(packDisplay(focus, 'zh', 'USD'), {
    name: '专注包',
    desc: '解锁「市井专注」等进阶配方，专注时间更长。',
    price: '1.99',
    priceLabel: '$1.99',
    currency: 'USD',
  });
  // 英文界面 + 人民币地区：在中国的英文用户看到英文名、¥ 价。
  assert.deepEqual(packDisplay(focus, 'en', 'CNY'), {
    name: 'Focus Pack',
    desc: 'Unlocks Plus recipes like “Street Focus” — stay focused for longer.',
    price: '6.00',
    priceLabel: '¥6',
    currency: 'CNY',
  });
  // 兼容旧行为：不传币种时从语言推导（en → USD，zh → CNY）。
  assert.equal(packDisplay(focus, 'en').currency, 'USD');
  assert.equal(packDisplay(focus, 'en').price, '1.99');
  assert.equal(packDisplay(focus, 'zh').currency, 'CNY');
  assert.equal(packDisplay(focus, 'zh').price, '6.00');
  assert.equal(packDisplay(null, 'en', 'USD'), null);
});

// --- GET /api/region 路由 ---

test('route: GET /api/region returns the country and region from the request', async () => {
  const cnReq = new Request('http://localhost/api/region');
  Object.defineProperty(cnReq, 'cf', { value: { country: 'CN' }, configurable: true });
  const cnRes = await regionRoute.options.server.handlers.GET({ request: cnReq });
  assert.deepEqual(await cnRes.json(), { country: 'CN', region: 'cn', source: 'country' });

  const usReq = new Request('http://localhost/api/region', {
    headers: { 'cf-ipcountry': 'US' },
  });
  const usRes = await regionRoute.options.server.handlers.GET({ request: usReq });
  assert.deepEqual(await usRes.json(), { country: 'US', region: 'overseas', source: 'country' });

  // 无国家信号：country 为 null，客户端再按时区/语言兜底。
  const bareRes = await regionRoute.options.server.handlers.GET({
    request: new Request('http://localhost/api/region'),
  });
  assert.deepEqual(await bareRes.json(), { country: null, region: 'overseas', source: 'unknown' });
});

// --- GET /api/products：文案与币种拆分 ---

async function getProducts(query) {
  const res = await productsRoute.options.server.handlers.GET({
    request: new Request(`http://localhost/api/products${query}`),
  });
  assert.equal(res.status, 200);
  return res.json();
}

test('route: GET /api/products splits copy (locale) from amounts (currency/region)', async () => {
  // 旧行为兼容：只传 locale=en 仍返回美元价、英文名。
  const enOnly = await getProducts('?locale=en');
  assert.equal(enOnly.currency, 'USD');
  assert.equal(enOnly.products.find((p) => p.productId === 'focus-pack').totalAmount, '1.99');
  assert.equal(enOnly.products.find((p) => p.productId === 'focus-pack').name, 'Focus Pack');

  // 中文界面 + 美元地区：中文名、$ 价。
  const zhUsd = await getProducts('?locale=zh&currency=USD');
  assert.equal(zhUsd.currency, 'USD');
  const zhFocus = zhUsd.products.find((p) => p.productId === 'focus-pack');
  assert.equal(zhFocus.name, '专注包');
  assert.equal(zhFocus.totalAmount, '1.99');

  // 英文界面 + 人民币地区：英文名、¥ 价。
  const enCny = await getProducts('?locale=en&currency=CNY');
  assert.equal(enCny.currency, 'CNY');
  const enFocus = enCny.products.find((p) => p.productId === 'focus-pack');
  assert.equal(enFocus.name, 'Focus Pack');
  assert.equal(enFocus.totalAmount, '6.00');

  // region 参数同样决定币种。
  assert.equal((await getProducts('?region=cn')).currency, 'CNY');
  assert.equal((await getProducts('?region=overseas')).currency, 'USD');
  // currency 优先于 region。
  assert.equal((await getProducts('?region=cn&currency=USD')).currency, 'USD');

  // 默认：人民币价、中文名。
  const def = await getProducts('');
  assert.equal(def.currency, 'CNY');
  assert.equal(def.products.find((p) => p.productId === 'sleep-pack').totalAmount, '9.00');
  assert.equal(def.products.find((p) => p.productId === 'sleep-pack').name, '助眠包');
});
