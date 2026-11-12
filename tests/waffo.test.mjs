import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { WaffoPancake, verifyWebhook } from '@waffo/pancake-ts';
import {
  createWaffoClient,
  getWaffoProductId,
  normalizeWaffoEnv,
  resolveWaffoConfig,
} from '../src/server/waffo.ts';
import { createKvOrderStore } from '../src/server/store.ts';
import { getProduct, listProducts, normalizeCurrency, productAmount } from '../src/server/products.ts';
import { getPacks, grantPack } from '../src/server/auth.ts';
import { normalizeLocale, t } from '../src/locale.mjs';
import { PACKS, findPack, packDisplay } from '../src/packs.mjs';

/** 与 KVNamespace 同形的最小内存实现（只实现本模块用到的四个方法）。 */
class FakeKV {
  constructor() {
    this.store = new Map();
  }

  async get(key, type) {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (type === 'json') return JSON.parse(raw);
    return raw;
  }

  async put(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  async delete(key) {
    this.store.delete(key);
  }

  async list({ prefix }) {
    return {
      keys: [...this.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
    };
  }
}

const FULL_ENV = {
  WAFFO_MERCHANT_ID: 'MER_aaaaaaaaaaaaaaaaaaaaaa',
  WAFFO_PRIVATE_KEY: 'unused-here',
  WAFFO_PRODUCT_FOCUS_PACK: 'PROD_focus',
  WAFFO_PRODUCT_SLEEP_PACK: 'PROD_sleep',
  WAFFO_PRODUCT_RAIN_NIGHT_PACK: 'PROD_rain',
};

test('waffo config: missing vars are listed, full vars configure, env defaults to test', () => {
  const empty = resolveWaffoConfig({});
  assert.equal(empty.configured, false);
  assert.equal(empty.error, 'WAFFO_NOT_CONFIGURED');
  assert.deepEqual(empty.missing, [
    'WAFFO_MERCHANT_ID',
    'WAFFO_PRIVATE_KEY',
    'WAFFO_PRODUCT_FOCUS_PACK',
    'WAFFO_PRODUCT_SLEEP_PACK',
    'WAFFO_PRODUCT_RAIN_NIGHT_PACK',
  ]);

  const partial = resolveWaffoConfig({ WAFFO_MERCHANT_ID: 'MER_x', WAFFO_PRIVATE_KEY: 'k' });
  assert.equal(partial.configured, false);
  assert.deepEqual(partial.missing, [
    'WAFFO_PRODUCT_FOCUS_PACK',
    'WAFFO_PRODUCT_SLEEP_PACK',
    'WAFFO_PRODUCT_RAIN_NIGHT_PACK',
  ]);

  const full = resolveWaffoConfig(FULL_ENV);
  assert.equal(full.configured, true);
  assert.equal(full.env, 'test', 'WAFFO_ENV unset defaults to test');
  assert.equal(full.merchantId, 'MER_aaaaaaaaaaaaaaaaaaaaaa');

  assert.equal(resolveWaffoConfig({ ...FULL_ENV, WAFFO_ENV: 'prod' }).env, 'prod');
  assert.equal(resolveWaffoConfig({ ...FULL_ENV, WAFFO_ENV: 'PROD' }).env, 'prod');
  assert.equal(resolveWaffoConfig({ ...FULL_ENV, WAFFO_ENV: 'live' }).env, 'test', 'unknown env falls back to test');
  assert.equal(normalizeWaffoEnv('prod'), 'prod');
  assert.equal(normalizeWaffoEnv(undefined), 'test');
});

test('waffo product ids: pack id maps to the configured product, unknown pack is null', () => {
  const cfg = resolveWaffoConfig(FULL_ENV);
  assert.equal(cfg.configured, true);
  assert.equal(getWaffoProductId(cfg, 'focus-pack'), 'PROD_focus');
  assert.equal(getWaffoProductId(cfg, 'sleep-pack'), 'PROD_sleep');
  assert.equal(getWaffoProductId(cfg, 'rain-night-pack'), 'PROD_rain');
  assert.equal(getWaffoProductId(cfg, 'nope'), null);
});

test('usd pricing: server catalog has USD amounts, CNY unchanged', () => {
  assert.deepEqual(
    listProducts('USD').map((p) => [p.productId, p.totalAmount, p.currency]),
    [
      ['sleep-pack', '2.99', 'USD'],
      ['focus-pack', '1.99', 'USD'],
      ['rain-night-pack', '3.99', 'USD'],
    ],
  );
  assert.deepEqual(
    listProducts('CNY').map((p) => [p.productId, p.totalAmount]),
    [
      ['sleep-pack', '9.00'],
      ['focus-pack', '6.00'],
      ['rain-night-pack', '12.00'],
    ],
  );
  assert.deepEqual(listProducts().map((p) => p.totalAmount), ['9.00', '6.00', '12.00'], 'default is CNY');
  assert.equal(productAmount(getProduct('focus-pack'), 'USD'), '1.99');
  assert.equal(productAmount(getProduct('focus-pack'), 'CNY'), '6.00');
  assert.equal(normalizeCurrency('usd'), 'USD');
  assert.equal(normalizeCurrency('USD'), 'USD');
  assert.equal(normalizeCurrency('cny'), 'CNY');
  assert.equal(normalizeCurrency(''), 'CNY');
  assert.equal(normalizeCurrency(undefined), 'CNY');
});

test('packs: USD prices and English names/descs are present', () => {
  assert.deepEqual(PACKS.map((p) => p.priceUsd), ['1.99', '2.99', '3.99']);
  assert.deepEqual(PACKS.map((p) => p.priceLabelUsd), ['$1.99', '$2.99', '$3.99']);
  for (const pack of PACKS) {
    assert.ok(pack.nameEn && pack.nameEn.length > 0, `${pack.id} needs nameEn`);
    assert.ok(pack.descEn && pack.descEn.length > 0, `${pack.id} needs descEn`);
  }
  const en = packDisplay(findPack('sleep-pack'), 'en');
  assert.deepEqual(en, {
    name: 'Sleep Pack',
    desc: 'Unlocks night recipes like “Countryside Night” — drift off slowly.',
    price: '2.99',
    priceLabel: '$2.99',
    currency: 'USD',
  });
  const zh = packDisplay(findPack('sleep-pack'), 'zh');
  assert.equal(zh.name, '助眠包');
  assert.equal(zh.priceLabel, '¥9');
  assert.equal(zh.currency, 'CNY');
  assert.equal(packDisplay(null, 'en'), null);
  assert.equal(packDisplay(findPack('focus-pack'), 'fr').currency, 'CNY', 'unknown locale falls back to CNY');
});

test('locale: translate lookups, zh fallback, normalize', () => {
  assert.equal(t('en', 'nav.mixer'), 'Mixer');
  assert.equal(t('zh', 'nav.mixer'), '调音台');
  assert.equal(t('en', 'checkout.payWaffo'), 'Continue to payment');
  assert.equal(t('zh', 'checkout.payWaffo'), '去付款');
  assert.equal(t('en', 'auth.google'), 'Continue with Google');
  assert.equal(t('fr', 'nav.mixer'), '调音台', 'unknown locale falls back to zh');
  assert.equal(t('en', 'no.such.key'), 'no.such.key', 'missing key returns the key itself');
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('zh'), 'zh');
  assert.equal(normalizeLocale('de'), 'zh');
  assert.equal(normalizeLocale(undefined), 'zh');
});

test('sdk client: accepts raw-base64, PEM and escaped-newline keys; rejects garbage', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const rawBase64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const escaped = pem.replace(/\n/g, '\\n');
  const merchantId = 'MER_aaaaaaaaaaaaaaaaaaaaaa';

  // 三种格式都能建客户端（SDK 内部归一化）。
  assert.ok(new WaffoPancake({ merchantId, privateKey: rawBase64 }) instanceof WaffoPancake);
  assert.ok(new WaffoPancake({ merchantId, privateKey: pem }) instanceof WaffoPancake);
  assert.ok(new WaffoPancake({ merchantId, privateKey: escaped }) instanceof WaffoPancake);
  assert.ok(createWaffoClient({
    configured: true,
    merchantId,
    privateKey: rawBase64,
    env: 'test',
    productIds: {},
  }) instanceof WaffoPancake);

  assert.throws(() => new WaffoPancake({ merchantId, privateKey: 'not-a-key' }));
  assert.throws(() => new WaffoPancake({ merchantId: 'wrong-prefix', privateKey: pem }));
});

/** 用自签密钥对给 webhook payload 签名（与 SDK 的验签算法一致：t.<rawBody>）。 */
function signTestPayload(payload, privateKeyPem, timestampMs) {
  const signer = createSign('RSA-SHA256');
  signer.update(`${timestampMs}.${payload}`);
  const v1 = signer.sign(privateKeyPem, 'base64');
  return `t=${timestampMs},v1=${v1}`;
}

test('webhook verify: good signature passes, tampered/bad/stale/missing fail', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const payload = JSON.stringify({
    id: 'evt-test-1',
    timestamp: new Date().toISOString(),
    eventType: 'order.completed',
    eventId: 'pay_123',
    storeId: 'STO_test',
    mode: 'test',
    data: { orderId: 'ORD_1', buyerEmail: 'buyer@example.com', currency: 'USD', amount: '1.99', taxAmount: '0.00', productName: 'Focus Pack' },
  });
  const now = Date.now();
  const goodSig = signTestPayload(payload, privatePem, now);

  const event = verifyWebhook(payload, goodSig, { publicKey: publicPem });
  assert.equal(event.id, 'evt-test-1');
  assert.equal(event.eventType, 'order.completed');
  assert.equal(event.mode, 'test');
  assert.equal(event.data.orderId, 'ORD_1');

  // 篡改 body 后签名失效。
  const tampered = payload.replace('ORD_1', 'ORD_2');
  assert.throws(() => verifyWebhook(tampered, goodSig, { publicKey: publicPem }));

  // 错的签名、缺失签名头、过期时间戳都拒绝。
  assert.throws(() => verifyWebhook(payload, 't=1,v1=AAAA', { publicKey: publicPem }));
  assert.throws(() => verifyWebhook(payload, '', { publicKey: publicPem }));
  assert.throws(() => verifyWebhook(payload, null, { publicKey: publicPem }));
  const staleSig = signTestPayload(payload, privatePem, now - 60 * 60 * 1000);
  assert.throws(() => verifyWebhook(payload, staleSig, { publicKey: publicPem }));
});

test('store: waffo event dedup and waffo order fields round-trip', async () => {
  const kv = new FakeKV();
  const store = createKvOrderStore(kv);

  assert.equal(await store.insertWaffoEventOnce('evt-1'), true);
  assert.equal(await store.insertWaffoEventOnce('evt-1'), false, 'same delivery id is a repeat');
  assert.equal(await store.insertWaffoEventOnce('evt-2'), true);
  assert.equal(await store.insertWaffoEventOnce(''), false, 'empty event id is not recorded');

  const order = await store.createOrder({
    outTradeNo: 'SC20261112000000ABCDEF',
    productId: 'focus-pack',
    subject: 'Sound Cocktail · 专注包',
    totalAmount: '1.99',
    userId: 'u_test',
    provider: 'waffo',
    waffoSessionId: 'cs_test-session',
  });
  assert.equal(order.provider, 'waffo');
  assert.equal(order.waffoSessionId, 'cs_test-session');
  assert.equal(order.status, 'CREATED');

  // 模拟 webhook 授予流程：标记已支付（幂等）→ 发权益 → 补记 Waffo 订单号。
  assert.equal(await store.markPaidIdempotently(order.outTradeNo, 'ORD_waffo_1'), true);
  assert.equal(await store.markPaidIdempotently(order.outTradeNo, 'ORD_waffo_1'), false, 'second mark is a no-op');
  assert.deepEqual(await grantPack(kv, 'u_test', 'focus-pack'), ['focus-pack']);
  assert.deepEqual(await grantPack(kv, 'u_test', 'focus-pack'), ['focus-pack'], 'grant is idempotent');
  const latest = await store.findOrder(order.outTradeNo);
  await store.saveOrder({ ...latest, waffoOrderId: 'ORD_waffo_1' });
  assert.equal((await store.findOrder(order.outTradeNo)).waffoOrderId, 'ORD_waffo_1');
  assert.deepEqual(await getPacks(kv, 'u_test'), ['focus-pack']);

  // 默认 provider 仍是 alipay（老订单/支付宝下单不受影响）。
  const alipayOrder = await store.createOrder({
    outTradeNo: 'SC20261112000000ABCDE0',
    productId: 'sleep-pack',
    subject: 'Sound Cocktail · 助眠包',
    totalAmount: '9.00',
    userId: 'u_test',
  });
  assert.equal(alipayOrder.provider, 'alipay');
});
