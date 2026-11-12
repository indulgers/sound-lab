/**
 * Waffo 路由级测试：用模块替身（见 tests/waffo-hooks.mjs）加载
 * 真实的路由处理函数，验证“创建两次 → 第二次续付同一订单”
 * 的完整链路——不只查 store，而是走 POST /api/waffo/create、
 * GET /api/waffo/pending、GET /api/waffo/order-status 本身。
 *
 * 注意：本文件必须先 register() 钩子、再动态 import 路由模块。
 * 静态 import 会在 register() 之前就把路由模块加载进来，
 * 那时 'cloudflare:workers' 在 Node 里还解析不到。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./waffo-hooks.mjs', import.meta.url);

const { env } = await import('./stubs/cloudflare-workers-stub.mjs');
const sdkStub = await import('./stubs/waffo-sdk-stub.mjs');
const { registerUser, createSession, getPacks } = await import('../src/server/auth.ts');
const { createKvOrderStore } = await import('../src/server/store.ts');
const createRoute = (await import('../src/routes/api/waffo/create.ts')).Route;
const pendingRoute = (await import('../src/routes/api/waffo/pending.ts')).Route;
const orderStatusRoute = (await import('../src/routes/api/waffo/order-status.ts')).Route;

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

/** 注册一个用户并返回带登录 Cookie 的 POST 请求构造器。 */
async function makeAuthedCaller(kv, email) {
  const reg = await registerUser(kv, email, 'TestPass123');
  assert.equal(reg.ok, true, JSON.stringify(reg));
  const session = await createSession(kv, reg.user.userId);
  return {
    userId: reg.user.userId,
    post: (path, body) =>
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `sc_session=${session.token}` },
        body: JSON.stringify(body),
      }),
    get: (path) =>
      new Request(`http://localhost${path}`, {
        headers: { Cookie: `sc_session=${session.token}` },
      }),
  };
}

test('waffo create route: second create for the same user+pack resumes the same order', async () => {
  const kv = new FakeKV();
  env.ORDERS_KV = kv;
  sdkStub.resetStubCheckoutCalls();
  const caller = await makeAuthedCaller(kv, 'resume-test@example.com');
  const store = createKvOrderStore(kv);

  const res1 = await createRoute.options.server.handlers.POST({ request: caller.post('/api/waffo/create', { productId: 'focus-pack' }) });
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.resumed, false);
  assert.equal(data1.checkoutUrl, 'https://checkout.example/cs_stub_1');
  assert.equal(data1.productId, 'focus-pack');

  // 第二次下单同一个包：不建新订单、不建新会话，返回原来的收银台。
  const res2 = await createRoute.options.server.handlers.POST({ request: caller.post('/api/waffo/create', { productId: 'focus-pack' }) });
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.resumed, true);
  assert.equal(data2.outTradeNo, data1.outTradeNo);
  assert.equal(data2.checkoutUrl, data1.checkoutUrl);

  const orders = await store.listOrders();
  assert.equal(orders.length, 1, 'only one order in the store after two creates');
  assert.equal(orders[0].waffoCheckoutUrl, data1.checkoutUrl);
  assert.ok(orders[0].waffoSessionExpiresAt, 'session expiry is stored');

  // 换一个包不受影响：新订单。
  const res3 = await createRoute.options.server.handlers.POST({ request: caller.post('/api/waffo/create', { productId: 'sleep-pack' }) });
  assert.equal(res3.status, 200);
  const data3 = await res3.json();
  assert.equal(data3.resumed, false);
  assert.notEqual(data3.outTradeNo, data1.outTradeNo);
  assert.equal((await store.listOrders()).length, 2);
});

test('waffo create route: expired session allows a fresh order', async () => {
  const kv = new FakeKV();
  env.ORDERS_KV = kv;
  sdkStub.resetStubCheckoutCalls();
  const caller = await makeAuthedCaller(kv, 'expired-route-test@example.com');
  const store = createKvOrderStore(kv);

  const seeded = await store.createOrder({
    outTradeNo: 'SC9001',
    productId: 'sleep-pack',
    subject: 's',
    totalAmount: '2.99',
    userId: caller.userId,
    provider: 'waffo',
    waffoSessionId: 'cs_old',
    waffoCheckoutUrl: 'https://checkout.example/cs_old',
    waffoSessionExpiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  assert.equal(seeded.status, 'CREATED');

  const res = await createRoute.options.server.handlers.POST({ request: caller.post('/api/waffo/create', { productId: 'sleep-pack' }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.resumed, false, 'expired session is not resumed');
  assert.notEqual(data.outTradeNo, 'SC9001');
  assert.match(data.checkoutUrl, /checkout\.example\/cs_stub_/);
});

test('waffo pending route: lists only the caller’s live orders, 401 when logged out', async () => {
  const kv = new FakeKV();
  env.ORDERS_KV = kv;
  sdkStub.resetStubCheckoutCalls();
  const caller = await makeAuthedCaller(kv, 'pending-route-test@example.com');
  const other = await makeAuthedCaller(kv, 'pending-other@example.com');

  const created = await createRoute.options.server.handlers.POST({ request: caller.post('/api/waffo/create', { productId: 'rain-night-pack' }) });
  assert.equal(created.status, 200);
  const createdData = await created.json();

  const mine = await pendingRoute.options.server.handlers.GET({ request: caller.get('/api/waffo/pending') });
  assert.equal(mine.status, 200);
  const mineData = await mine.json();
  assert.equal(mineData.orders.length, 1);
  assert.equal(mineData.orders[0].outTradeNo, createdData.outTradeNo);
  assert.equal(mineData.orders[0].productId, 'rain-night-pack');
  assert.equal(mineData.orders[0].checkoutUrl, createdData.checkoutUrl);

  // 别人的进行中订单看不到。
  const theirs = await pendingRoute.options.server.handlers.GET({ request: other.get('/api/waffo/pending') });
  assert.deepEqual((await theirs.json()).orders, []);

  // 未登录 401。
  const anon = await pendingRoute.options.server.handlers.GET({ request: new Request('http://localhost/api/waffo/pending') });
  assert.equal(anon.status, 401);
});

test('waffo order-status route: fast path grants on a succeeded payment, stays pending otherwise', async () => {
  const kv = new FakeKV();
  env.ORDERS_KV = kv;
  sdkStub.resetStubCheckoutCalls();
  const caller = await makeAuthedCaller(kv, 'status-route-test@example.com');
  const other = await makeAuthedCaller(kv, 'status-other@example.com');
  const store = createKvOrderStore(kv);

  const created = await createRoute.options.server.handlers.POST({ request: caller.post('/api/waffo/create', { productId: 'focus-pack' }) });
  const { outTradeNo } = await created.json();

  // Waffo 侧还没有成功的付款：PENDING，不发权益。
  sdkStub.setStubGraphqlPayments([]);
  const pendingRes = await orderStatusRoute.options.server.handlers.GET({ request: caller.get(`/api/waffo/order-status?order=${outTradeNo}`) });
  assert.equal(pendingRes.status, 200);
  assert.deepEqual(await pendingRes.json(), { status: 'PENDING', outTradeNo, productId: 'focus-pack' });
  assert.deepEqual(await getPacks(kv, caller.userId), []);

  // Waffo 侧出现 succeeded 付款：立刻标记已付并发权益（与 webhook 同一份逻辑）。
  sdkStub.setStubGraphqlPayments([
    { id: 'PAY_1', orderId: 'ORD_route_1', status: 'succeeded', orderMerchantExternalId: outTradeNo },
  ]);
  const paidRes = await orderStatusRoute.options.server.handlers.GET({ request: caller.get(`/api/waffo/order-status?order=${outTradeNo}`) });
  assert.equal(paidRes.status, 200);
  const paidData = await paidRes.json();
  assert.equal(paidData.status, 'PAID');
  assert.equal(paidData.granted, true);
  assert.deepEqual(await getPacks(kv, caller.userId), ['focus-pack']);
  assert.equal((await store.findOrder(outTradeNo)).status, 'PAID');

  // 再查一次：已是 PAID，直接返回，不再调 Waffo（granted 不再出现）。
  sdkStub.setStubGraphqlPayments([]);
  const again = await orderStatusRoute.options.server.handlers.GET({ request: caller.get(`/api/waffo/order-status?order=${outTradeNo}`) });
  assert.deepEqual(await again.json(), { status: 'PAID', outTradeNo, productId: 'focus-pack' });

  // 不是本人的订单：403；不存在的订单：404。
  const forbidden = await orderStatusRoute.options.server.handlers.GET({ request: other.get(`/api/waffo/order-status?order=${outTradeNo}`) });
  assert.equal(forbidden.status, 403);
  const missing = await orderStatusRoute.options.server.handlers.GET({ request: caller.get('/api/waffo/order-status?order=SC_NOPE') });
  assert.equal(missing.status, 404);
});
