/**
 * 订阅模型测试（2026-11-16）：计划目录、免费目的地、时效性权益、
 * Waffo 订阅事件处理、按订单发权益。
 *
 * 定价（limer 确认）：USD $7.99/月、$79.90/年；CNY ¥18/月（30 天）、
 * ¥180/年。免费入口：清迈 + 巴厘岛；其余 4 个目的地属于订阅。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_IDS,
  FREE_SCENES,
  TRIAL_DAYS,
  findPlan,
  isFreeScene,
  isFreeJourney,
  isSubscriptionProduct,
  planDurationDays,
  periodEndFrom,
  planDisplay,
  isSubscriptionActive,
} from '../src/subscription.mjs';
import { JOURNEYS } from '../src/scenes/journeys.mjs';
import { getProduct, listProducts, isLegacyPackProduct } from '../src/server/products.ts';
import {
  getPacks,
  grantPack,
  getSubscription,
  grantSubscription,
  updateSubscriptionStatus,
  revokeSubscription,
  grantOrderEntitlement,
} from '../src/server/auth.ts';
import { applyWaffoSubscriptionEvent } from '../src/server/waffo.ts';
import { createKvOrderStore } from '../src/server/store.ts';

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

// --- 计划目录 ---

test('subscription plans: two plans, confirmed prices, yearly is monthly x10', () => {
  assert.deepEqual(SUBSCRIPTION_PLAN_IDS, ['subscription-monthly', 'subscription-yearly']);
  assert.deepEqual(
    SUBSCRIPTION_PLANS.map((p) => [p.id, p.priceUsd, p.price]),
    [
      ['subscription-monthly', '7.99', '18.00'],
      ['subscription-yearly', '79.90', '180.00'],
    ],
  );
  assert.equal(findPlan('subscription-monthly').durationDays, 30);
  assert.equal(findPlan('subscription-yearly').durationDays, 365);
  assert.equal(findPlan('nope'), null);
  assert.equal(isSubscriptionProduct('subscription-monthly'), true);
  assert.equal(isSubscriptionProduct('subscription-yearly'), true);
  assert.equal(isSubscriptionProduct('focus-pack'), false);
  assert.equal(planDurationDays('subscription-monthly'), 30);
  assert.equal(planDurationDays('subscription-yearly'), 365);
  assert.equal(planDurationDays('focus-pack'), 0);
});

test('subscription plans: client display matches the server catalog (single source of truth)', () => {
  for (const plan of SUBSCRIPTION_PLANS) {
    const server = getProduct(plan.id);
    assert.ok(server, `${plan.id} must exist in the server catalog`);
    assert.equal(server.totalAmount, plan.price, `${plan.id} CNY must match`);
    assert.equal(server.totalAmountUsd, plan.priceUsd, `${plan.id} USD must match`);
    assert.equal(server.durationDays, plan.durationDays, `${plan.id} duration must match`);
  }
  assert.deepEqual(
    listProducts('CNY').map((p) => p.productId),
    ['subscription-monthly', 'subscription-yearly'],
  );
  assert.equal(getProduct('focus-pack'), null, 'old packs are not sold anymore');
  assert.equal(isLegacyPackProduct('focus-pack'), true);
});

test('subscription plans: planDisplay takes name/desc from locale, price from currency', () => {
  const monthly = findPlan('subscription-monthly');
  assert.deepEqual(planDisplay(monthly, 'zh', 'USD'), {
    name: '订阅（月付）',
    desc: '按月订阅，随时取消。到期前 3 天会收到续费提醒。',
    price: '7.99',
    priceLabel: '$7.99',
    periodLabel: '每月',
    currency: 'USD',
    durationDays: 30,
    trialDays: 7,
  });
  assert.deepEqual(planDisplay(monthly, 'en', 'CNY'), {
    name: 'Subscription · Monthly',
    desc: 'Billed monthly. Cancel anytime; access runs to the end of the paid period.',
    price: '18.00',
    priceLabel: '¥18',
    periodLabel: 'per month',
    currency: 'CNY',
    durationDays: 30,
    trialDays: 0,
  });
  assert.equal(planDisplay(findPlan('subscription-yearly'), 'en', 'USD').priceLabel, '$79.90');
  assert.equal(planDisplay(findPlan('subscription-yearly'), 'zh', 'CNY').priceLabel, '¥180');
  assert.equal(planDisplay(null, 'en', 'USD'), null);
  assert.equal(periodEndFrom(Date.parse('2026-11-16T00:00:00.000Z'), 'subscription-monthly'), Date.parse('2026-12-16T00:00:00.000Z'));
  assert.equal(periodEndFrom(Date.parse('2026-11-16T00:00:00.000Z'), 'subscription-yearly'), Date.parse('2027-11-16T00:00:00.000Z'));
  assert.equal(periodEndFrom(Date.now(), 'focus-pack'), null);
});

// --- 免费试用（limer 2026-11-16 确认）：只给海外开 ---

test('trial: 7-day free trial on overseas (USD) subscriptions only, no trial on CNY cards', () => {
  assert.equal(TRIAL_DAYS, 7);
  for (const plan of SUBSCRIPTION_PLANS) {
    assert.equal(planDisplay(plan, 'zh', 'USD').trialDays, 7, `${plan.id} USD has a 7-day trial`);
    assert.equal(planDisplay(plan, 'en', 'USD').trialDays, 7);
    assert.equal(planDisplay(plan, 'zh', 'CNY').trialDays, 0, `${plan.id} CNY has no trial`);
    assert.equal(planDisplay(plan, 'en', 'CNY').trialDays, 0);
  }
  // 试用期也算有效订阅（trialing 状态已在 isSubscriptionActive 里）。
  const now = Date.now();
  assert.equal(
    isSubscriptionActive({ status: 'trialing', currentPeriodEnd: now + 7 * 24 * 60 * 60 * 1000 }, now),
    true,
    'a trialing subscription is active during its trial',
  );
});

test('trial UI: Plus page shows the trial on overseas plan cards, checkout notes it for Waffo only', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const plus = readFileSync(join(root, 'src/PlusPage.jsx'), 'utf8');
  const checkout = readFileSync(join(root, 'src/CheckoutView.jsx'), 'utf8');
  const locale = readFileSync(join(root, 'src/locale.mjs'), 'utf8');
  // 试用行只在 trialDays > 0 时出现（USD 有，CNY 没有）。
  assert.ok(plus.includes('display.trialDays'), 'Plus page gates the trial line on trialDays');
  assert.ok(plus.includes("'plus.trialNote'"), 'Plus page uses the trial copy key');
  assert.ok(checkout.includes('display.trialDays'), 'checkout gates the trial note on trialDays');
  assert.ok(checkout.includes("'checkout.trialNoteWaffo'"), 'checkout uses the trial copy key');
  // 两种语言各有一份文案，且不混语言。
  const trialNotes = [...locale.matchAll(/trialNote: '([^']*)'/g)].map((m) => m[1]);
  assert.equal(trialNotes.length, 2, 'plus.trialNote exists in both languages');
  assert.ok(trialNotes.some((s) => /[\u4e00-\u9fff]/.test(s)), 'zh trial note is Chinese');
  assert.ok(trialNotes.some((s) => !/[\u4e00-\u9fff]/.test(s)), 'en trial note has no Chinese');
  const trialWaffo = [...locale.matchAll(/trialNoteWaffo: '([^']*)'/g)].map((m) => m[1]);
  assert.equal(trialWaffo.length, 2, 'checkout.trialNoteWaffo exists in both languages');
  assert.ok(trialWaffo.some((s) => /[\u4e00-\u9fff]/.test(s)), 'zh checkout trial note is Chinese');
  assert.ok(trialWaffo.some((s) => !/[\u4e00-\u9fff]/.test(s)), 'en checkout trial note has no Chinese');
});

// --- 免费目的地 ---

test('journey gating: Chiang Mai and Bali are free, the other four destinations need a subscription', () => {
  assert.deepEqual(FREE_SCENES, ['chiang-mai', 'bali']);
  assert.equal(isFreeScene('chiang-mai'), true);
  assert.equal(isFreeScene('bali'), true);
  assert.equal(isFreeScene('da-lat'), false);
  assert.equal(isFreeScene('da-nang'), false, 'Da Nang (the Da Lat replacement) is also paid');
  assert.equal(isFreeScene('kyoto'), false);
  assert.equal(isFreeScene('lisbon'), false);
  assert.equal(isFreeScene('hoi-an'), false);
  assert.equal(isFreeScene(''), false);
  assert.equal(isFreeScene(undefined), false);

  // 按旅程 id：免费 3 条（清迈 + 巴厘岛），其余 5 条要订阅。
  // 大叻仍在目录里（岘港替换在试点 verdict 之后），按 sceneId 门控，
  // 替换时门控不坏。
  const free = JOURNEYS.filter(isFreeJourney).map((j) => j.id).sort();
  assert.deepEqual(free, ['focus-chiang-mai', 'meditate-bali', 'relax-bali']);
  assert.equal(JOURNEYS.length, 8);
  for (const journey of JOURNEYS) {
    assert.equal(isFreeJourney(journey), FREE_SCENES.includes(journey.sceneId));
  }
  assert.equal(isFreeJourney(null), false);
});

// --- 时效性权益 ---

test('subscription entitlements: grant, renew (later end wins), stale renewal ignored', async () => {
  const kv = new FakeKV();
  const now = Date.now();
  const end30 = now + 30 * 24 * 60 * 60 * 1000;

  assert.equal(await getSubscription(kv, 'u1'), null);
  assert.equal(isSubscriptionActive(null), false);

  const granted = await grantSubscription(kv, 'u1', {
    provider: 'waffo',
    plan: 'subscription-monthly',
    status: 'active',
    currentPeriodEnd: end30,
    subscriptionId: 'ORD_1',
  });
  assert.equal(granted.plan, 'subscription-monthly');
  assert.equal(granted.currentPeriodEnd, end30);
  assert.equal(isSubscriptionActive(granted, now), true);
  assert.equal(isSubscriptionActive(granted, end30), false, 'at period end it is inactive');
  assert.equal(isSubscriptionActive(granted, end30 + 1000), false);

  // 同计划续费：更晚的到期时间才更新。
  const renewed = await grantSubscription(kv, 'u1', {
    provider: 'waffo',
    plan: 'subscription-monthly',
    status: 'active',
    currentPeriodEnd: end30 + 30 * 24 * 60 * 60 * 1000,
    subscriptionId: 'ORD_2',
  });
  assert.equal(renewed.currentPeriodEnd, end30 + 30 * 24 * 60 * 60 * 1000);

  // 旧事件晚到：更早的到期时间不回拨。
  const stale = await grantSubscription(kv, 'u1', {
    provider: 'waffo',
    plan: 'subscription-monthly',
    status: 'active',
    currentPeriodEnd: end30,
    subscriptionId: 'ORD_1',
  });
  assert.equal(stale.currentPeriodEnd, end30 + 30 * 24 * 60 * 60 * 1000, 'stale event must not roll the period back');

  // 换计划（月付 → 年付）：按新计划直接写。
  const upgraded = await grantSubscription(kv, 'u1', {
    provider: 'waffo',
    plan: 'subscription-yearly',
    status: 'active',
    currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000,
    subscriptionId: 'ORD_3',
  });
  assert.equal(upgraded.plan, 'subscription-yearly');
});

test('subscription entitlements: status transitions keep access until period end, revoke ends it', async () => {
  const kv = new FakeKV();
  const now = Date.now();
  const end = now + 30 * 24 * 60 * 60 * 1000;
  await grantSubscription(kv, 'u1', {
    provider: 'waffo',
    plan: 'subscription-monthly',
    status: 'active',
    currentPeriodEnd: end,
  });

  // past_due（续费失败）：保留访问。
  const pastDue = await updateSubscriptionStatus(kv, 'u1', 'past_due', end);
  assert.equal(pastDue.status, 'past_due');
  assert.equal(isSubscriptionActive(pastDue, now), true);

  // canceling（已申请取消）：保留访问到周期结束。
  const canceling = await updateSubscriptionStatus(kv, 'u1', 'canceling', end);
  assert.equal(canceling.status, 'canceling');
  assert.equal(isSubscriptionActive(canceling, now), true);
  assert.equal(isSubscriptionActive(canceling, end), false);

  // uncanceled（撤回取消）：恢复 active。
  const active = await updateSubscriptionStatus(kv, 'u1', 'active', end);
  assert.equal(active.status, 'active');
  assert.equal(isSubscriptionActive(active, now), true);

  // canceled 状态本身不算有效。
  assert.equal(isSubscriptionActive({ status: 'canceled', currentPeriodEnd: end }, now), false);
  assert.equal(isSubscriptionActive({ status: 'trialing', currentPeriodEnd: end }, now), true);
  assert.equal(isSubscriptionActive({ status: 'active', currentPeriodEnd: now - 1000 }, now), false, 'expired period is inactive');

  // 撤销：记录清掉，packs 不受影响。
  await grantPack(kv, 'u1', 'focus-pack');
  await revokeSubscription(kv, 'u1');
  assert.equal(await getSubscription(kv, 'u1'), null);
  assert.deepEqual(await getPacks(kv, 'u1'), ['focus-pack'], 'legacy packs survive a subscription revoke');

  // 没有订阅时更新状态返回 null。
  assert.equal(await updateSubscriptionStatus(kv, 'u2', 'past_due'), null);
});

test('grantOrderEntitlement: subscription product grants a subscription, legacy pack grants a pack', async () => {
  const kv = new FakeKV();
  const before = Date.now();

  const monthly = await grantOrderEntitlement(kv, 'u1', 'subscription-monthly', { provider: 'alipay' });
  assert.equal(monthly, 'subscription');
  const sub = await getSubscription(kv, 'u1');
  assert.equal(sub.provider, 'alipay');
  assert.equal(sub.plan, 'subscription-monthly');
  assert.ok(sub.currentPeriodEnd > before + 29 * 24 * 60 * 60 * 1000, 'monthly card is valid ~30 days');
  assert.ok(sub.currentPeriodEnd <= before + 31 * 24 * 60 * 60 * 1000);

  const yearly = await grantOrderEntitlement(kv, 'u1', 'subscription-yearly', { provider: 'waffo', subscriptionId: 'ORD_9' });
  assert.equal(yearly, 'subscription');
  const sub2 = await getSubscription(kv, 'u1');
  assert.equal(sub2.plan, 'subscription-yearly');
  assert.equal(sub2.subscriptionId, 'ORD_9');

  const pack = await grantOrderEntitlement(kv, 'u2', 'focus-pack', { provider: 'alipay' });
  assert.equal(pack, 'pack');
  assert.deepEqual(await getPacks(kv, 'u2'), ['focus-pack']);
  assert.equal(await getSubscription(kv, 'u2'), null);

  assert.equal(await grantOrderEntitlement(kv, 'u3', 'no-such-product', { provider: 'alipay' }), null);
});

// --- Waffo 订阅事件 ---

test('waffo subscription events: activated grants, renewed extends, past_due/canceling keep access', async () => {
  const kv = new FakeKV();
  const store = createKvOrderStore(kv);
  await store.createOrder({
    outTradeNo: 'SC1001',
    productId: 'subscription-monthly',
    subject: 'Sound Cocktail · 订阅（月付）',
    totalAmount: '7.99',
    userId: 'u1',
    provider: 'waffo',
  });

  // activated：按事件的 currentPeriodEnd 授予。
  const activated = await applyWaffoSubscriptionEvent(store, kv, 'subscription.activated', {
    orderId: 'ORD_1',
    orderMerchantExternalId: 'SC1001',
    merchantProvidedBuyerIdentity: 'u1',
    billingPeriod: 'monthly',
    currentPeriodEnd: '2026-12-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(activated.handled, true);
  assert.equal(activated.userId, 'u1');
  assert.equal(activated.subscription.plan, 'subscription-monthly');
  assert.equal(activated.subscription.status, 'active');
  assert.equal(activated.subscription.currentPeriodEnd, Date.parse('2026-12-16'));

  // renewed：周期延长（用更晚的 currentPeriodEnd）。
  const renewed = await applyWaffoSubscriptionEvent(store, kv, 'subscription.renewed', {
    orderId: 'ORD_1',
    orderMerchantExternalId: 'SC1001',
    merchantProvidedBuyerIdentity: 'u1',
    currentPeriodEnd: '2027-01-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(renewed.handled, true);
  assert.equal(renewed.subscription.currentPeriodEnd, Date.parse('2027-01-16'));

  // past_due：续费失败，状态记 past_due（保留访问）。
  const pastDue = await applyWaffoSubscriptionEvent(store, kv, 'subscription.past_due', {
    orderId: 'ORD_1',
    orderMerchantExternalId: 'SC1001',
    merchantProvidedBuyerIdentity: 'u1',
    currentPeriodEnd: '2027-01-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(pastDue.subscription.status, 'past_due');
  assert.equal(isSubscriptionActive(pastDue.subscription, Date.parse('2026-12-01')), true);

  // recovered：重试扣费成功，恢复 active。
  const recovered = await applyWaffoSubscriptionEvent(store, kv, 'subscription.recovered', {
    orderId: 'ORD_1',
    orderMerchantExternalId: 'SC1001',
    merchantProvidedBuyerIdentity: 'u1',
    currentPeriodEnd: '2027-01-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(recovered.subscription.status, 'active');

  // canceling：用户申请取消，记 canceling（保留访问到周期结束）。
  const canceling = await applyWaffoSubscriptionEvent(store, kv, 'subscription.canceling', {
    orderId: 'ORD_1',
    orderMerchantExternalId: 'SC1001',
    merchantProvidedBuyerIdentity: 'u1',
    currentPeriodEnd: '2027-01-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(canceling.subscription.status, 'canceling');

  // uncanceled：撤回取消，恢复 active。
  const uncanceled = await applyWaffoSubscriptionEvent(store, kv, 'subscription.uncanceled', {
    orderId: 'ORD_1',
    orderMerchantExternalId: 'SC1001',
    merchantProvidedBuyerIdentity: 'u1',
    currentPeriodEnd: '2027-01-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(uncanceled.subscription.status, 'active');
});

test('waffo subscription events: canceled revokes at period end, plan_changed follows planPrice', async () => {
  const kv = new FakeKV();
  const store = createKvOrderStore(kv);
  await store.createOrder({
    outTradeNo: 'SC2001',
    productId: 'subscription-yearly',
    subject: 'Sound Cocktail · 订阅（年付）',
    totalAmount: '79.90',
    userId: 'u2',
    provider: 'waffo',
  });
  await applyWaffoSubscriptionEvent(store, kv, 'subscription.activated', {
    orderId: 'ORD_2',
    orderMerchantExternalId: 'SC2001',
    merchantProvidedBuyerIdentity: 'u2',
    currentPeriodEnd: '2027-11-16',
    planPrice: { total: '79.90', taxAmount: '0.00' },
  });

  // plan_changed：新计划以 planPrice 为准（订单记的是旧计划）。
  const changed = await applyWaffoSubscriptionEvent(store, kv, 'subscription.plan_changed', {
    orderId: 'ORD_2',
    orderMerchantExternalId: 'SC2001',
    merchantProvidedBuyerIdentity: 'u2',
    currentPeriodEnd: '2026-12-16',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(changed.subscription.plan, 'subscription-monthly');

  // canceled 且周期已过：撤销。
  const canceled = await applyWaffoSubscriptionEvent(store, kv, 'subscription.canceled', {
    orderId: 'ORD_2',
    orderMerchantExternalId: 'SC2001',
    merchantProvidedBuyerIdentity: 'u2',
    currentPeriodEnd: '2020-01-01',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(canceled.handled, true);
  assert.equal(canceled.subscription, null);
  assert.equal(await getSubscription(kv, 'u2'), null);

  // payment_succeeded 是纯扣费事件（无周期/状态）：不处理。
  const payment = await applyWaffoSubscriptionEvent(store, kv, 'subscription.payment_succeeded', {
    orderId: 'ORD_2',
    orderMerchantExternalId: 'SC2001',
    merchantProvidedBuyerIdentity: 'u2',
  });
  assert.equal(payment.handled, false);

  // 找不到用户（无 buyer identity、无订单、无 metadata）：不处理。
  const noUser = await applyWaffoSubscriptionEvent(store, kv, 'subscription.activated', {
    orderId: 'ORD_3',
    currentPeriodEnd: '2027-01-01',
    planPrice: { total: '7.99', taxAmount: '0.00' },
  });
  assert.equal(noUser.handled, false);

  // 找不到计划（无订单、无 planPrice、无 billingPeriod）：不处理。
  const noPlan = await applyWaffoSubscriptionEvent(store, kv, 'subscription.activated', {
    orderId: 'ORD_4',
    merchantProvidedBuyerIdentity: 'u9',
    currentPeriodEnd: '2027-01-01',
  });
  assert.equal(noPlan.handled, false);

  // billingPeriod 兜底：monthly → 月付。
  const byPeriod = await applyWaffoSubscriptionEvent(store, kv, 'subscription.activated', {
    orderId: 'ORD_5',
    merchantProvidedBuyerIdentity: 'u9',
    billingPeriod: 'yearly',
    currentPeriodEnd: '2027-11-16',
  });
  assert.equal(byPeriod.handled, true);
  assert.equal(byPeriod.subscription.plan, 'subscription-yearly');
});
