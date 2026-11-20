import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('./waffo-hooks.mjs', import.meta.url)

const { qaPlusGrant } = await import('../src/server/qa-plus.mjs')
const { env } = await import('./stubs/cloudflare-workers-stub.mjs')
const { registerUser, createSession, getSubscription, grantSubscription } = await import('../src/server/auth.ts')
const entitlementRoute = (await import('../src/routes/api/entitlements.ts')).Route

class MemoryKv {
  constructor() { this.data = new Map(); this.writes = 0; }
  async get(key, kind) {
    const v = this.data.get(key);
    return v === undefined ? null : kind === 'json' ? JSON.parse(v) : v;
  }
  async put(key, value) {
    this.writes += 1;
    this.data.set(key, String(value));
  }
  async delete(key) { this.data.delete(key); }
  async list({ prefix }) {
    return { keys: [...this.data.keys()].filter(k=>k.startsWith(prefix)).map(name=>({ name })) };
  }
}

function qaSettings(userId, host = '') {
  return {
    SOUNDLAB_QA_PLUS_USER_IDS: userId,
    SOUNDLAB_QA_PLUS_EXPIRES_AT: new Date(Date.now() + 7 * 86400_000).toISOString(),
    SOUNDLAB_QA_PLUS_ALLOWED_HOSTS: host,
  };
}

function request(token = '', path = 'http://localhost/api/entitlements') {
  return new Request(path, { headers: token ? { Cookie: 'sc_session=' + token } : {} });
}

test('QA Plus requires exact userId, explicit UTC expiry and exact host', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const settings = {
    SOUNDLAB_QA_PLUS_USER_IDS: 'u-abc_123,u-xyz',
    SOUNDLAB_QA_PLUS_EXPIRES_AT: '2026-11-25T12:00:00Z',
    SOUNDLAB_QA_PLUS_ALLOWED_HOSTS: 'soundlab-preview.example.net',
  };
  const permitted = qaPlusGrant(settings, 'u-abc_123', 'http://localhost:3000/api/entitlements', now);
  assert.equal(permitted?.provider, 'qa');
  assert.equal(permitted?.active, true);
  assert.equal(permitted?.isTest, true);
  assert.equal(permitted?.plan, 'subscription-yearly');
  assert.equal(permitted?.currentPeriodEnd, Date.parse(settings.SOUNDLAB_QA_PLUS_EXPIRES_AT));
  assert.ok(qaPlusGrant(settings, 'u-abc_123', 'https://soundlab-preview.example.net/api/entitlements', now));
  assert.equal(qaPlusGrant(settings, 'u-abc_123', 'https://soundlab-preview.example.net.evil.net/api/entitlements', now), null);
  assert.equal(qaPlusGrant(settings, 'u-abc_123', 'https://another.workers.dev/api/entitlements', now), null);
  assert.equal(qaPlusGrant(settings, 'u-Abc_123', 'http://localhost/api/entitlements', now), null);
  assert.equal(qaPlusGrant(settings, 'someone@example.com', 'http://localhost/api/entitlements', now), null);
  assert.equal(qaPlusGrant(settings, 'u-abc_123', 'http://localhost/api/entitlements?plus=true', now)?.isTest, true,
    'query string has no effect on authorization; only allowlisted ID does');
  assert.equal(qaPlusGrant({}, 'u-abc_123', 'http://localhost/api/entitlements', now), null);
});

test('QA Plus refuses expired, invalid or overly long-lived configuration', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  for (const expiry of [
    '2026-11-17T10:00:00Z', '2026-11-18T12:00:00Z', '2030-12-31T23:59:59Z',
    '2026-11-25', 'no-date', '',
  ]) {
    assert.equal(qaPlusGrant({
      SOUNDLAB_QA_PLUS_USER_IDS: 'u_test',
      SOUNDLAB_QA_PLUS_EXPIRES_AT: expiry,
    }, 'u_test', 'http://127.0.0.1:3000/api/entitlements', now), null, expiry);
  }
  assert.equal(qaPlusGrant({
    SOUNDLAB_QA_PLUS_USER_IDS: 'u_test',
    SOUNDLAB_QA_PLUS_EXPIRES_AT: '2026-11-25T12:00:00Z',
    SOUNDLAB_QA_PLUS_ALLOWED_HOSTS: '*.workers.dev',
  }, 'u_test', 'https://some.workers.dev/api/entitlements', now), null,
  'wildcard host must not grant Plus');
});

test('GET /api/entitlements creates ephemeral QA Plus only for a real logged-in allowlisted user', async () => {
  const kv = new MemoryKv();
  env.ORDERS_KV = kv;
  const testAccount = await registerUser(kv, 'tester@example.net', 'StrongPassword123');
  const regular = await registerUser(kv, 'regular@example.net', 'StrongPassword123');
  assert.equal(testAccount.ok, true);
  assert.equal(regular.ok, true);
  const testSession = await createSession(kv, testAccount.user.userId);
  const regularSession = await createSession(kv, regular.user.userId);
  Object.assign(env, qaSettings(testAccount.user.userId, 'preview.soundlab.example.net'));

  const anon = await entitlementRoute.options.server.handlers.GET({ request: request() });
  assert.equal(anon.status, 401);
  const normal = await entitlementRoute.options.server.handlers.GET({ request: request(regularSession.token) });
  assert.equal(normal.status, 200);
  assert.equal((await normal.json()).subscription, null);

  const before = kv.writes;
  const testRes = await entitlementRoute.options.server.handlers.GET({ request: request(testSession.token) });
  assert.equal(testRes.status, 200);
  const result = await testRes.json();
  assert.equal(result.subscription.isTest, true);
  assert.equal(result.subscription.active, true);
  assert.equal(result.subscription.provider, 'qa');
  assert.equal(testRes.headers.get('cache-control'), 'private, no-store');
  assert.equal(kv.writes, before, 'QA test access must not mutate KV or orders');
  assert.equal(await getSubscription(kv, testAccount.user.userId), null);

  const forbiddenHost = await entitlementRoute.options.server.handlers.GET({
    request: request(testSession.token, 'https://soundcocktail.app/api/entitlements'),
  });
  assert.equal((await forbiddenHost.json()).subscription, null,
    'production hostname is not enabled unless the operator explicitly allows it');

  const online = await entitlementRoute.options.server.handlers.GET({
    request: request(testSession.token, 'https://preview.soundlab.example.net/api/entitlements'),
  });
  assert.equal((await online.json()).subscription.isTest, true);

  // A public ?plus=true URL never grants privileges, even on the right hostname.
  delete env.SOUNDLAB_QA_PLUS_USER_IDS;
  const queryRes = await entitlementRoute.options.server.handlers.GET({
    request: request(testSession.token, 'http://localhost/api/entitlements?plus=true'),
  });
  assert.equal((await queryRes.json()).subscription, null);

  // Real subscriptions are never overwritten by the temporary overlay.
  Object.assign(env, qaSettings(testAccount.user.userId));
  await grantSubscription(kv, testAccount.user.userId, {
    plan: 'subscription-monthly',
    provider: 'alipay',
    status: 'active',
    currentPeriodEnd: Date.now() + 12 * 86400_000,
  });
  const paid = await entitlementRoute.options.server.handlers.GET({ request: request(testSession.token) });
  const paidData = await paid.json();
  assert.equal(paidData.subscription.active, true);
  assert.equal(paidData.subscription.provider, 'alipay');
  assert.equal(paidData.subscription.isTest, undefined);

  // Cleanup stubs is defensive for this file's independent test worker.
  delete env.ORDERS_KV;
  delete env.SOUNDLAB_QA_PLUS_USER_IDS;
  delete env.SOUNDLAB_QA_PLUS_EXPIRES_AT;
  delete env.SOUNDLAB_QA_PLUS_ALLOWED_HOSTS;
});
