import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticateUser,
  buildGoogleAuthUrl,
  consumeOAuthState,
  createOAuthState,
  createSession,
  deleteSession,
  findOrCreateGoogleUser,
  getPacks,
  getSessionTokenFromRequest,
  getSessionUser,
  grantPack,
  hashPassword,
  registerUser,
  verifyPassword,
} from '../src/server/auth.ts';

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

function requestWithCookie(token) {
  return new Request('https://example.com/', { headers: { cookie: `sc_session=${token}` } });
}

function requestWithBearer(token) {
  return new Request('https://example.com/', { headers: { authorization: `Bearer ${token}` } });
}

test('hash/verify: correct password verifies, wrong one does not, salts differ', async () => {
  const a = await hashPassword('correct horse battery');
  const b = await hashPassword('correct horse battery');
  assert.notEqual(a.hash, b.hash, 'same password with different salts must differ');
  assert.equal(await verifyPassword('correct horse battery', a.salt, a.hash), true);
  assert.equal(await verifyPassword('wrong password', a.salt, a.hash), false);
  assert.equal(await verifyPassword('correct horse battery', b.salt, a.hash), false);
});

test('register: success, duplicate email, invalid email, weak password', async () => {
  const kv = new FakeKV();
  const ok = await registerUser(kv, '  Test@Example.com ', 's3cret-password');
  assert.equal(ok.ok, true);
  assert.equal(ok.user.email, 'test@example.com', 'email is normalized to lowercase');
  assert.equal('passwordHash' in ok.user, false);
  assert.equal('salt' in ok.user, false);

  const dup = await registerUser(kv, 'test@example.com', 'another-password');
  assert.equal(dup.ok, false);
  assert.equal(dup.code, 'EMAIL_TAKEN');

  const badEmail = await registerUser(kv, 'not-an-email', 's3cret-password');
  assert.equal(badEmail.ok, false);
  assert.equal(badEmail.code, 'INVALID_EMAIL');

  const weak = await registerUser(kv, 'new@example.com', 'short');
  assert.equal(weak.ok, false);
  assert.equal(weak.code, 'WEAK_PASSWORD');
});

test('login: success, wrong password, unknown email, rate limit after 10 failures', async () => {
  const kv = new FakeKV();
  await registerUser(kv, 'user@example.com', 's3cret-password');

  const ok = await authenticateUser(kv, 'user@example.com', 's3cret-password');
  assert.equal(ok.ok, true);
  assert.equal(ok.user.email, 'user@example.com');

  const wrong = await authenticateUser(kv, 'user@example.com', 'nope-nope-nope');
  assert.equal(wrong.ok, false);
  assert.equal(wrong.code, 'INVALID_CREDENTIALS');

  const unknown = await authenticateUser(kv, 'ghost@example.com', 'whatever-password');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, 'INVALID_CREDENTIALS', 'unknown email must not leak existence');

  // 10 次失败后，第 11 次直接被限流（即使密码正确）。
  const kv2 = new FakeKV();
  await registerUser(kv2, 'victim@example.com', 's3cret-password');
  for (let i = 0; i < 10; i++) {
    const r = await authenticateUser(kv2, 'victim@example.com', 'wrong-password');
    assert.equal(r.code, 'INVALID_CREDENTIALS');
  }
  const limited = await authenticateUser(kv2, 'victim@example.com', 's3cret-password');
  assert.equal(limited.ok, false);
  assert.equal(limited.code, 'TOO_MANY_ATTEMPTS');
});

test('sessions: cookie and Bearer both resolve, expired and deleted do not', async () => {
  const kv = new FakeKV();
  const reg = await registerUser(kv, 'sess@example.com', 's3cret-password');
  const { token } = await createSession(kv, reg.user.userId);

  const viaCookie = await getSessionUser(kv, requestWithCookie(token));
  assert.deepEqual(viaCookie, { userId: reg.user.userId });
  const viaBearer = await getSessionUser(kv, requestWithBearer(token));
  assert.deepEqual(viaBearer, { userId: reg.user.userId });
  assert.equal(await getSessionUser(kv, new Request('https://example.com/')), null);
  assert.equal(await getSessionUser(kv, requestWithCookie('bogus-token')), null);

  // 过期会话：改写存储里的 expiresAt 到过去，解析返回 null。
  await kv.put(`sess:${token}`, JSON.stringify({ userId: reg.user.userId, expiresAt: Date.now() - 1000 }));
  assert.equal(await getSessionUser(kv, requestWithCookie(token)), null);

  // 删除会话后失效。
  const again = await createSession(kv, reg.user.userId);
  assert.notEqual(again.token, token);
  await deleteSession(kv, again.token);
  assert.equal(await getSessionUser(kv, requestWithBearer(again.token)), null);
});

test('session token parsing: Bearer wins over cookie, malformed headers ignored', () => {
  const req = new Request('https://example.com/', {
    headers: { cookie: 'sc_session=from-cookie; other=x', authorization: 'Bearer from-bearer' },
  });
  assert.equal(getSessionTokenFromRequest(req), 'from-bearer');

  const cookieOnly = new Request('https://example.com/', {
    headers: { cookie: 'other=x; sc_session=from-cookie' },
  });
  assert.equal(getSessionTokenFromRequest(cookieOnly), 'from-cookie');

  const none = new Request('https://example.com/');
  assert.equal(getSessionTokenFromRequest(none), null);
});

test('entitlements: grant is idempotent (set semantics)', async () => {
  const kv = new FakeKV();
  assert.deepEqual(await getPacks(kv, 'u_abc'), []);
  assert.deepEqual(await grantPack(kv, 'u_abc', 'focus-pack'), ['focus-pack']);
  assert.deepEqual(await grantPack(kv, 'u_abc', 'focus-pack'), ['focus-pack']);
  assert.deepEqual((await grantPack(kv, 'u_abc', 'sleep-pack')).sort(), ['focus-pack', 'sleep-pack']);
  assert.deepEqual((await getPacks(kv, 'u_abc')).sort(), ['focus-pack', 'sleep-pack']);
  // 不同用户互不干扰。
  assert.deepEqual(await getPacks(kv, 'u_xyz'), []);
});

test('google auth url: fixed redirect uri, scopes, state, no offline access', () => {
  const url = new URL(buildGoogleAuthUrl('test-client-id.apps.googleusercontent.com', 'state-abc-123'));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('client_id'), 'test-client-id.apps.googleusercontent.com');
  assert.equal(
    url.searchParams.get('redirect_uri'),
    'https://soundcocktail.app/api/auth/google/callback',
  );
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('state'), 'state-abc-123');
  assert.equal(url.searchParams.get('access_type'), null, 'must not request offline access');
});

test('oauth state: single-use, unknown and empty states rejected', async () => {
  const kv = new FakeKV();
  const state = await createOAuthState(kv);
  assert.equal(typeof state, 'string');
  assert.ok(state.length > 20);
  assert.equal(await consumeOAuthState(kv, state), true);
  assert.equal(await consumeOAuthState(kv, state), false, 'state must be single-use');
  assert.equal(await consumeOAuthState(kv, 'no-such-state'), false);
  assert.equal(await consumeOAuthState(kv, ''), false);
});

test('google login: new account, link-by-email, repeat login, google-only has no password', async () => {
  const kv = new FakeKV();

  // 1) 全新 Google 用户：建账号，邮箱就是 Google 邮箱。
  const first = await findOrCreateGoogleUser(kv, {
    sub: 'google-sub-1',
    email: 'New@Example.com',
    name: 'New User',
  });
  assert.equal(first.created, true);
  assert.equal(first.linked, false);
  assert.equal(first.user.email, 'new@example.com');
  const stored = await kv.get(`user:${first.user.userId}`, 'json');
  assert.equal(stored.googleSub, 'google-sub-1');
  assert.equal(stored.googleName, 'New User');
  assert.equal(stored.passwordHash, '', 'google-only account must have no password');

  // 纯 Google 账号用密码登录不了。
  const pwLogin = await authenticateUser(kv, 'new@example.com', 'any-password');
  assert.equal(pwLogin.ok, false);
  assert.equal(pwLogin.code, 'INVALID_CREDENTIALS');

  // 2) 同一个 sub 再来：还是同一个账号，不建重复。
  const again = await findOrCreateGoogleUser(kv, {
    sub: 'google-sub-1',
    email: 'new@example.com',
    name: 'New User',
  });
  assert.equal(again.created, false);
  assert.equal(again.linked, false);
  assert.equal(again.user.userId, first.user.userId);

  // 3) 已有邮箱+密码账号：Google 登录用同一个验证邮箱 → 挂到已有账号上。
  const reg = await registerUser(kv, 'owner@example.com', 's3cret-password');
  assert.equal(reg.ok, true);
  const linked = await findOrCreateGoogleUser(kv, {
    sub: 'google-sub-2',
    email: 'owner@example.com',
    name: 'Owner',
  });
  assert.equal(linked.created, false);
  assert.equal(linked.linked, true);
  assert.equal(linked.user.userId, reg.user.userId);
  const storedOwner = await kv.get(`user:${reg.user.userId}`, 'json');
  assert.equal(storedOwner.googleSub, 'google-sub-2');
  assert.ok(storedOwner.identities.some((i) => i.type === 'google' && i.value === 'google-sub-2'));
  // 关联后邮箱密码登录仍然可用。
  const stillWorks = await authenticateUser(kv, 'owner@example.com', 's3cret-password');
  assert.equal(stillWorks.ok, true);
  // 关联后用同一个 sub 登录，回到同一个账号。
  const viaGoogle = await findOrCreateGoogleUser(kv, {
    sub: 'google-sub-2',
    email: 'owner@example.com',
    name: 'Owner',
  });
  assert.equal(viaGoogle.user.userId, reg.user.userId);

  // 4) 邮箱/ sub 无效时拒绝。
  await assert.rejects(findOrCreateGoogleUser(kv, { sub: '', email: 'x@example.com' }));
  await assert.rejects(findOrCreateGoogleUser(kv, { sub: 's', email: 'not-an-email' }));
});
