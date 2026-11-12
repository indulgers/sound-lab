/**
 * 账号 + 会话 + 权益（服务端，Cloudflare KV）。
 *
 * 身份模型（为小程序预留）：
 * - 一个 userId 可以挂多个身份：identities: [{ type: 'email' | 'wechat', value }]
 *   本轮只实现 email + 密码；小程序接入时再加 { type: 'wechat', value: openid }。
 * - 密码只存 PBKDF2-SHA256 派生值 + 每用户随机 salt（100k 次迭代），
 *   任何接口都不返回 passwordHash / salt。
 *
 * KV 键（与订单共用 ORDERS_KV 命名空间，前缀区分）：
 *   user:<userId>              用户记录
 *   user:email:<小写邮箱>       邮箱 → userId 索引
 *   sess:<token>               会话 { userId, expiresAt }（30 天，KV 自动过期）
 *   ent:<userId>               权益 { packs: [packId...] }（集合语义，发放幂等）
 *   loginfail:<邮箱>:<小时桶>   登录失败计数（1 小时过期，满 10 次锁 1 小时）
 *
 * 会话凭证两种携带方式（都接受）：
 * - HttpOnly Cookie：sc_session（SameSite=Lax，Secure，Path=/，30 天）
 * - Authorization: Bearer <token>（小程序端用这个，读不到 Cookie）
 *
 * 注意：本文件只用可擦除的 TypeScript 语法（接口 + 类型标注），
 * 不用枚举/命名空间/参数属性，以便 node --test 能直接加载它做单元测试。
 */

export const SESSION_COOKIE_NAME = 'sc_session'
export const SESSION_TTL_SECONDS = 30 * 24 * 3600 // 30 天
export const MAX_LOGIN_FAILURES_PER_HOUR = 10
export const PBKDF2_ITERATIONS = 100000

/** Google OAuth（网页端第二身份源）。 */
export const GOOGLE_REDIRECT_URI = 'https://soundcocktail.app/api/auth/google/callback'
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
export const GOOGLE_SCOPES = 'openid email profile'
export const OAUTH_STATE_TTL_SECONDS = 600 // 10 分钟

export interface Identity {
  type: 'email' | 'wechat' | 'google'
  value: string
}

export interface UserRecord {
  userId: string
  email: string
  passwordHash: string
  salt: string
  identities: Identity[]
  createdAt: string
  /** Google 身份（本轮新增）：googleSub 是 Google 的用户唯一标识； */
  googleSub?: string | null
  googleEmail?: string | null
  googleName?: string | null
}

export interface PublicUser {
  userId: string
  email: string
}

export interface SessionRecord {
  userId: string
  expiresAt: number
}

export interface EntitlementRecord {
  packs: string[]
}

type Kv = Pick<KVNamespace, 'get' | 'put' | 'delete' | 'list'>

const USER_PREFIX = 'user:'
const USER_EMAIL_PREFIX = 'user:email:'
const USER_GOOGLE_PREFIX = 'user:google:'
const SESSION_PREFIX = 'sess:'
const ENT_PREFIX = 'ent:'
const LOGIN_FAIL_PREFIX = 'loginfail:'
const OAUTH_STATE_PREFIX = 'oauthstate:'

// 未知邮箱也跑一次同样的验算，避免用耗时区分“邮箱不存在”和“密码错”。
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA=='
const DUMMY_HASH = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

function b64encode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function b64decode(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, 'base64'))
}

function b64urlencode(bytes: Uint8Array): string {
  return b64encode(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

export function publicUser(record: UserRecord): PublicUser {
  return { userId: record.userId, email: record.email }
}

/** PBKDF2-SHA256 派生；不传 salt 时生成新的 16 字节随机 salt。 */
export async function hashPassword(
  password: string,
  saltB64?: string,
): Promise<{ salt: string; hash: string }> {
  const salt = saltB64 || b64encode(randomBytes(16))
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64decode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return { salt, hash: b64encode(new Uint8Array(bits)) }
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const derived = await hashPassword(password, salt)
  return constantTimeEqual(derived.hash, hash)
}

function newUserId(): string {
  return `u_${b64urlencode(randomBytes(12))}`
}

function newSessionToken(): string {
  return b64urlencode(randomBytes(32))
}

async function getUserById(kv: Kv, userId: string): Promise<UserRecord | null> {
  const record = await kv.get(`${USER_PREFIX}${userId}`, 'json')
  return (record as UserRecord | null) || null
}

async function getUserByEmail(kv: Kv, email: string): Promise<UserRecord | null> {
  const userId = await kv.get(`${USER_EMAIL_PREFIX}${normalizeEmail(email)}`, 'text')
  if (!userId) return null
  return getUserById(kv, userId)
}

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; code: 'INVALID_EMAIL' | 'WEAK_PASSWORD' | 'EMAIL_TAKEN'; message: string }

/** 注册：邮箱格式 + 密码至少 8 位；邮箱已注册时拒绝。 */
export async function registerUser(kv: Kv, email: string, password: string): Promise<RegisterResult> {
  const normalized = normalizeEmail(email)
  if (!isValidEmail(normalized)) {
    return { ok: false, code: 'INVALID_EMAIL', message: '邮箱格式不正确。' }
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, code: 'WEAK_PASSWORD', message: '密码至少 8 位。' }
  }
  const existing = await kv.get(`${USER_EMAIL_PREFIX}${normalized}`, 'text')
  if (existing) {
    return { ok: false, code: 'EMAIL_TAKEN', message: '这个邮箱已经注册过了，请直接登录。' }
  }
  const { salt, hash } = await hashPassword(password)
  const userId = newUserId()
  const record: UserRecord = {
    userId,
    email: normalized,
    passwordHash: hash,
    salt,
    identities: [{ type: 'email', value: normalized }],
    createdAt: new Date().toISOString(),
  }
  await kv.put(`${USER_PREFIX}${userId}`, JSON.stringify(record))
  await kv.put(`${USER_EMAIL_PREFIX}${normalized}`, userId)
  return { ok: true, user: publicUser(record) }
}

function loginFailKey(email: string): string {
  const hourBucket = Math.floor(Date.now() / 3600000)
  return `${LOGIN_FAIL_PREFIX}${normalizeEmail(email)}:${hourBucket}`
}

async function loginFailCount(kv: Kv, email: string): Promise<number> {
  const raw = await kv.get(loginFailKey(email), 'text')
  const count = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(count) ? count : 0
}

async function recordLoginFailure(kv: Kv, email: string): Promise<void> {
  const count = await loginFailCount(kv, email)
  await kv.put(loginFailKey(email), String(count + 1), { expirationTtl: 3600 })
}

async function clearLoginFailures(kv: Kv, email: string): Promise<void> {
  await kv.delete(loginFailKey(email))
}

export type AuthenticateResult =
  | { ok: true; user: PublicUser }
  | { ok: false; code: 'INVALID_CREDENTIALS' | 'TOO_MANY_ATTEMPTS'; message: string }

/**
 * 登录：同一邮箱 1 小时内失败满 10 次后拒绝（429 语义）。
 * 邮箱不存在与密码错误返回同一种错误，不泄露账号是否存在。
 */
export async function authenticateUser(kv: Kv, email: string, password: string): Promise<AuthenticateResult> {
  const normalized = normalizeEmail(email)
  if ((await loginFailCount(kv, normalized)) >= MAX_LOGIN_FAILURES_PER_HOUR) {
    return { ok: false, code: 'TOO_MANY_ATTEMPTS', message: '尝试次数太多，请 1 小时后再试。' }
  }
  const user = await getUserByEmail(kv, normalized)
  // 纯 Google 账号没有密码（passwordHash 为空）：直接按失败处理，不跑空 salt 验算。
  const valid = user && user.passwordHash
    ? await verifyPassword(password, user.salt, user.passwordHash)
    : await verifyPassword(password, DUMMY_SALT, DUMMY_HASH)
  if (!user || !valid) {
    await recordLoginFailure(kv, normalized)
    return { ok: false, code: 'INVALID_CREDENTIALS', message: '邮箱或密码不对，请再试一次。' }
  }
  await clearLoginFailures(kv, normalized)
  return { ok: true, user: publicUser(user) }
}

/** 创建会话：返回 token（同时写 Cookie 和响应体，供 Bearer 客户端使用）。 */
export async function createSession(
  kv: Kv,
  userId: string,
): Promise<{ token: string; expiresAt: number }> {
  const token = newSessionToken()
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  const record: SessionRecord = { userId, expiresAt }
  await kv.put(`${SESSION_PREFIX}${token}`, JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  })
  return { token, expiresAt }
}

export async function deleteSession(kv: Kv, token: string): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${token}`)
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

/** 从 Cookie 或 Authorization: Bearer 头取出会话 token。 */
export function getSessionTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization') || ''
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)
  if (bearer) return bearer[1].trim()
  const cookie = request.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE_NAME) return rest.join('=').trim()
  }
  return null
}

/** 解析会话 token → userId；过期或不存在返回 null。 */
export async function getSessionUser(
  kv: Kv,
  request: Request,
): Promise<{ userId: string } | null> {
  const token = getSessionTokenFromRequest(request)
  if (!token) return null
  const record = await kv.get(`${SESSION_PREFIX}${token}`, 'json')
  const session = record as SessionRecord | null
  if (!session || typeof session.userId !== 'string') return null
  if (typeof session.expiresAt === 'number' && session.expiresAt <= Date.now()) {
    await kv.delete(`${SESSION_PREFIX}${token}`)
    return null
  }
  return { userId: session.userId }
}

export async function getSessionUserRecord(
  kv: Kv,
  request: Request,
): Promise<PublicUser | null> {
  const session = await getSessionUser(kv, request)
  if (!session) return null
  const user = await getUserById(kv, session.userId)
  return user ? publicUser(user) : null
}

/** 发放权益：集合语义，重复发放无副作用，返回发放后的包列表。 */
export async function grantPack(kv: Kv, userId: string, packId: string): Promise<string[]> {
  const record = await kv.get(`${ENT_PREFIX}${userId}`, 'json')
  const packs = new Set<string>(Array.isArray((record as EntitlementRecord | null)?.packs) ? (record as EntitlementRecord).packs : [])
  packs.add(packId)
  const next: EntitlementRecord = { packs: [...packs] }
  await kv.put(`${ENT_PREFIX}${userId}`, JSON.stringify(next))
  return next.packs
}

export async function getPacks(kv: Kv, userId: string): Promise<string[]> {
  const record = await kv.get(`${ENT_PREFIX}${userId}`, 'json')
  const packs = (record as EntitlementRecord | null)?.packs
  return Array.isArray(packs) ? [...packs] : []
}

/* ============================== Google OAuth ============================== */

/** 从 Worker 环境变量读 Google OAuth 客户端配置（从不写死在代码里）。 */
export function getGoogleEnv(env: unknown): { clientId: string; clientSecret: string } {
  const record = (env || {}) as Record<string, unknown>
  return {
    clientId: typeof record.GOOGLE_CLIENT_ID === 'string' ? record.GOOGLE_CLIENT_ID.trim() : '',
    clientSecret:
      typeof record.GOOGLE_CLIENT_SECRET === 'string' ? record.GOOGLE_CLIENT_SECRET.trim() : '',
  }
}

/** 拼 Google 授权地址（纯函数，可单元测试）。只申请 openid/email/profile。 */
export function buildGoogleAuthUrl(clientId: string, state: string): string {
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

/** 生成防 CSRF 的 state（10 分钟过期，存在 KV 里）。 */
export async function createOAuthState(kv: Kv): Promise<string> {
  const state = b64urlencode(randomBytes(32))
  await kv.put(`${OAUTH_STATE_PREFIX}${state}`, JSON.stringify({ createdAt: Date.now() }), {
    expirationTtl: OAUTH_STATE_TTL_SECONDS,
  })
  return state
}

/** 校验并消费 state：只可用一次；不存在或已用过返回 false。 */
export async function consumeOAuthState(kv: Kv, state: string): Promise<boolean> {
  if (!state || typeof state !== 'string') return false
  const key = `${OAUTH_STATE_PREFIX}${state}`
  const existing = await kv.get(key, 'text')
  if (!existing) return false
  await kv.delete(key)
  return true
}

export interface GoogleProfile {
  sub: string
  email: string
  name?: string | null
}

export interface GoogleAccountResult {
  user: PublicUser
  /** true = 新建账号；false = 已有账号（按 sub 或邮箱找到并关联）。 */
  created: boolean
  /** true = 这次把 googleSub 关联到了一个已有的邮箱账号上。 */
  linked: boolean
}

/**
 * Google 登录找账号：先按 googleSub 找（已关联过的直接回来）；
 * 再按验证过的邮箱找（有邮箱+密码账号就把 googleSub 挂上去，不建重复账号）；
 * 都没有才新建账号（无密码，只能用 Google 登录）。
 */
export async function findOrCreateGoogleUser(
  kv: Kv,
  profile: GoogleProfile,
): Promise<GoogleAccountResult> {
  const email = normalizeEmail(profile.email)
  const sub = String(profile.sub || '')
  if (!sub || !isValidEmail(email)) {
    throw new Error('Google 返回的用户信息不完整（缺少 sub 或已验证邮箱）。')
  }

  const bySub = await kv.get(`${USER_GOOGLE_PREFIX}${sub}`, 'text')
  if (bySub) {
    const user = await getUserById(kv, bySub)
    if (user) return { user: publicUser(user), created: false, linked: false }
  }

  const byEmail = await getUserByEmail(kv, email)
  if (byEmail) {
    const updated: UserRecord = {
      ...byEmail,
      googleSub: sub,
      googleEmail: email,
      googleName: profile.name || byEmail.googleName || null,
      identities: byEmail.identities.some((i) => i.type === 'google' && i.value === sub)
        ? byEmail.identities
        : [...byEmail.identities, { type: 'google', value: sub }],
    }
    await kv.put(`${USER_PREFIX}${updated.userId}`, JSON.stringify(updated))
    await kv.put(`${USER_GOOGLE_PREFIX}${sub}`, updated.userId)
    return { user: publicUser(updated), created: false, linked: true }
  }

  const userId = newUserId()
  const record: UserRecord = {
    userId,
    email,
    passwordHash: '',
    salt: '',
    identities: [{ type: 'google', value: sub }],
    createdAt: new Date().toISOString(),
    googleSub: sub,
    googleEmail: email,
    googleName: profile.name || null,
  }
  await kv.put(`${USER_PREFIX}${userId}`, JSON.stringify(record))
  await kv.put(`${USER_EMAIL_PREFIX}${email}`, userId)
  await kv.put(`${USER_GOOGLE_PREFIX}${sub}`, userId)
  return { user: publicUser(record), created: true, linked: false }
}
