/**
 * 机器人防护（B6 蜜罐 + UA 封禁 + IP 限速），Worker 内实现，不依赖面板。
 *
 * 方法来源：Terence Eden《Blunt Banhammer Blocks Basic Bots
 * Ballistically》（https://shkspr.mobi/blog/2026/11/blunt-banhammer-blocks-basic-bots-ballistically/，
 * 2026-11，AGPL v3）——核心是“蜜罐陷阱”：robots.txt 明确 Disallow
 * 一个目录，每页放一个正常用户看不到、点不到的隐藏链接指向它；只有
 * 无视 robots.txt 又到处跟链接的机器人会踩进去，踩中即封 IP。
 * Eden 一周封了 400+ 个 IP，日传输量从峰值 216GB 降到约 25GB。
 *
 * 本站的改编（没有 .htaccess / PHP，用 Cloudflare KV + TanStack Start
 * requestMiddleware 实现，逻辑相同）：
 * 1. 蜜罐 GET /honeypot（路由 src/routes/honeypot.ts）：踩中即把 IP
 *    写进 KV（botblock:ip:<ip>，30 天 TTL 自动过期，旧封禁自动解除），
 *    同时记数。
 * 2. 每个请求先过根路由的 server.middleware（src/server/
 *    bot-guard-middleware.ts，在路由之前；根路由对所有请求都匹配）：
 *    已封 IP → 403（9 字节正文，省流量）；坏 UA → 403；同一 IP 在
 *    60 秒内请求页面超过 120 次 → 429。
 * 3. 想留的爬虫（Googlebot / Bingbot / OAI-SearchBot / PerplexityBot /
 *    ClaudeBot）永远不进 UA 封禁；支付、认证、/api/* 与 robots.txt /
 *    sitemap.xml / llms.txt / og-image.png / 健康检查一律豁免。
 * 4. KV 不可用时失败放行（fail open）：UA 与限速仍生效，IP 封禁暂不
 *    生效；KV 读写失败只记数，不抛错、不影响正常请求。
 *
 * 限速是按 isolate 的内存滑动窗口（近似值）：同一 IP 的请求通常落到
 * 同一个 PoP，但分布式机器人仍可能在每个 PoP 各拿到一份额度；要严格
 * 的全局限速请用 Cloudflare 面板的 Rate Limiting（免费版含 1 条规则）。
 * KV 读只在有 IP 时发生；KV 写只在蜜罐命中时发生（同一 IP 一小时内
 * 最多写一次），不会触到免费版 KV 写额度。
 *
 * 本模块是纯模块（不依赖 React / Cloudflare），node:test 直接 import。
 */

/** 蜜罐路径（robots.txt 同时 Disallow 它；每页隐藏链接指向它）。 */
export const HONEYPOT_PATH = '/honeypot'

/** 封禁在 KV 里保留 30 天，到期自动解除（Eden 建议定期解封旧 IP，
 *  因为机器人常盗用会被转手的 IP）。 */
export const BLOCK_TTL_SECONDS = 30 * 24 * 3600

/** 同一 IP 踩蜜罐后，一小时内不再重复写 KV（防刷写）。 */
export const HONEY_WRITE_MIN_INTERVAL_MS = 60 * 60 * 1000

/** 页面限速：同一 IP 60 秒内超过 120 次页面请求 → 429。 */
export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX = 120
export const RATE_LIMIT_MAX_IPS = 1000

/**
 * 想留的爬虫（P0 决定）：UA 里出现这些子串即放行 UA 检查。
 * 注意：它们不豁免 IP 封禁与限速——本站只有十几页，正常爬虫远达
 * 不到限速量；伪装成 Googlebot 的刷子照样会被限速拦住。
 */
export const ALLOWED_BOTS = ['googlebot', 'bingbot', 'oai-searchbot', 'perplexitybot', 'claudebot']

/**
 * 坏 UA 子串（小而明确的列表，带理由；不要抄大列表，会烂掉）：
 * - bytespider：字节跳动 AI 抓取器，以无视 robots.txt、暴力抓取著称，
 *   本站不需要它。
 * - masscan / zgrab / nikto / sqlmap / nmap / nessus / acunetix：
 *   扫描器与渗透工具，从来不是正常访问。
 * - python-requests / python-urllib / go-http-client / libwww-perl /
 *   apache-httpclient：裸 HTTP 库 UA——页面请求里出现基本就是脚本，
 *   不是浏览器（支付宝回调用的 Apache-HttpClient 走 /api/*，已豁免）。
 */
export const BLOCKED_UA_SUBSTRINGS = [
  'bytespider',
  'masscan',
  'zgrab',
  'nikto',
  'sqlmap',
  'nmap',
  'nessus',
  'acunetix',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'libwww-perl',
  'apache-httpclient',
]

/** 完全豁免检查的路径（精确匹配）。 */
const EXEMPT_EXACT = new Set([
  '/api',
  '/return', // 支付宝同步回跳（return_url）
  '/waffo-return', // Waffo successUrl 回跳
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/llms-full.txt',
  '/health',
])

/** 完全豁免检查的路径前缀（/api/* 含支付通知与 Google OAuth 回调）。 */
const EXEMPT_PREFIXES = ['/api/', '/__', '/_serverFn']

/** 静态资源：只查 IP 封禁（不断数据传输才是目的），不查 UA、不限速
 *（真实用户一次加载要取 20 多个音频文件，不能按页面限速算）。 */
const ASSET_PREFIXES = ['/assets/']
const ASSET_EXACT = new Set(['/og-image.png'])

/**
 * 路径分类：'exempt'（不检查）、'honeypot'（陷阱，直通处理函数）、
 * 'asset'（只查 IP 封禁）、'page'（全套检查）。
 */
export function classifyPath(pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (path === HONEYPOT_PATH) return 'honeypot'
  if (EXEMPT_EXACT.has(path)) return 'exempt'
  for (const p of EXEMPT_PREFIXES) if (path.startsWith(p)) return 'exempt'
  if (ASSET_EXACT.has(path)) return 'asset'
  for (const p of ASSET_PREFIXES) if (path.startsWith(p)) return 'asset'
  return 'page'
}

/** 取客户端 IP：Cloudflare 的 cf-connecting-ip 优先，x-forwarded-for
 *  第一跳兜底（生产环境 Cloudflare 会覆盖 cf-connecting-ip，伪造无效）。 */
export function clientIpFromHeaders(headers) {
  if (!headers || typeof headers.get !== 'function') return null
  const direct = headers.get('cf-connecting-ip')
  if (direct && direct.trim() !== '') return direct.trim()
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first !== '') return first
  }
  return null
}

/** UA 是否属于想留的爬虫（子串匹配，不区分大小写）。 */
export function isAllowedBot(ua) {
  const lower = String(ua || '').toLowerCase()
  return ALLOWED_BOTS.some((b) => lower.includes(b))
}

/** UA 是否明显是坏机器人：空 UA，或命中坏 UA 子串。只对页面请求调用。 */
export function isBlockedUa(ua) {
  const raw = String(ua || '')
  if (raw.trim() === '') return true
  const lower = raw.toLowerCase()
  return BLOCKED_UA_SUBSTRINGS.some((s) => lower.includes(s))
}

/**
 * 按 isolate 的内存滑动窗口限速器（见文件头权衡说明）。
 * check(ip, now) → { limited, retryAfterSec, remaining }。
 */
export function createRateLimiter({
  windowMs = RATE_LIMIT_WINDOW_MS,
  max = RATE_LIMIT_MAX,
  maxIps = RATE_LIMIT_MAX_IPS,
} = {}) {
  const buckets = new Map() // ip -> { count, windowStart }
  function prune(now) {
    if (buckets.size <= maxIps) return
    for (const [ip, b] of buckets) {
      if (now - b.windowStart >= windowMs) buckets.delete(ip)
      if (buckets.size <= maxIps) return
    }
    for (const ip of buckets.keys()) {
      buckets.delete(ip)
      if (buckets.size <= maxIps) return
    }
  }
  return {
    check(ip, now = Date.now()) {
      const nowMs = Number(now)
      let b = buckets.get(ip)
      if (!b || nowMs - b.windowStart >= windowMs) {
        b = { count: 0, windowStart: nowMs }
        buckets.set(ip, b)
      }
      b.count += 1
      prune(nowMs)
      if (b.count > max) {
        return {
          limited: true,
          retryAfterSec: Math.max(1, Math.ceil((b.windowStart + windowMs - nowMs) / 1000)),
          remaining: 0,
        }
      }
      return { limited: false, retryAfterSec: 0, remaining: max - b.count }
    },
    get size() {
      return buckets.size
    },
  }
}

/** KV 里的封禁记录 key。复用现有的 ORDERS_KV，不新增命名空间。 */
export function botBlockKey(ip) {
  return `botblock:ip:${ip}`
}

/** 查 IP 是否在封禁名单里（KV 不可用时调用方捕获并放行）。 */
export async function isIpBlocked(kv, ip) {
  if (!kv || !ip) return null
  const rec = await kv.get(botBlockKey(ip), 'json')
  return rec && typeof rec === 'object' ? rec : null
}

/**
 * 蜜罐命中：把 IP 写进封禁名单（同一 IP 一小时内只写一次）。
 * 返回 { wrote, record }；kv 不可用时调用方捕获并放行。
 */
export async function recordHoneypotHit(kv, ip, ua, now = Date.now()) {
  if (!kv || !ip) return { wrote: false, record: null }
  const key = botBlockKey(ip)
  let prev = null
  try {
    prev = await kv.get(key, 'json')
  } catch {
    prev = null
  }
  if (
    prev &&
    typeof prev === 'object' &&
    typeof prev.lastSeen === 'number' &&
    now - prev.lastSeen < HONEY_WRITE_MIN_INTERVAL_MS
  ) {
    return { wrote: false, record: prev }
  }
  const record = {
    v: 1,
    ip,
    ua: String(ua || '').slice(0, 200),
    firstSeen: prev && typeof prev.firstSeen === 'number' ? prev.firstSeen : now,
    lastSeen: now,
    hits: (prev && typeof prev.hits === 'number' ? prev.hits : 0) + 1,
  }
  await kv.put(key, JSON.stringify(record), { expirationTtl: BLOCK_TTL_SECONDS })
  return { wrote: true, record }
}

/** 内存计数器（按 isolate；/health 可见，供用户确认防护在工作）。 */
const stats = { honeypotHits: 0, ipBlocked: 0, uaBlocked: 0, rateLimited: 0, kvErrors: 0 }
export function recordStat(kind) {
  if (Object.hasOwn(stats, kind)) stats[kind] += 1
}
export function getBotGuardStats() {
  return { ...stats }
}
export function resetBotGuardStats() {
  for (const k of Object.keys(stats)) stats[k] = 0
}

/** 被封请求的响应：403 + 9 字节正文（省流量是目的，别回大页面）。 */
export function blockedResponse(reason) {
  return new Response('Blocked.\n', {
    status: 403,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-blocked-by': 'sound-cocktail-bot-guard',
      'x-block-reason': reason,
    },
  })
}

/** 被限速的响应：429 + 11 字节正文 + Retry-After。 */
export function rateLimitedResponse(retryAfterSec) {
  return new Response('Slow down.\n', {
    status: 429,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': String(Math.max(1, Math.ceil(retryAfterSec || 1))),
      'x-blocked-by': 'sound-cocktail-bot-guard',
      'x-block-reason': 'rate-limited',
    },
  })
}

/**
 * 请求守卫（src/start.ts 的 requestMiddleware 调它；在路由之前跑）。
 * 返回 null = 放行；返回 Response = 直接用这个响应短路（403/429）。
 * env 为空（本地测试 / KV 未绑定）时按无封禁名单处理：UA 与限速仍生效。
 */
export async function guardRequest({ request, env, rateLimiter, now = Date.now() } = {}) {
  const url = new URL(request.url)
  const kind = classifyPath(url.pathname)
  if (kind === 'exempt' || kind === 'honeypot') return null
  const ua = request.headers.get('user-agent') || ''
  const ip = clientIpFromHeaders(request.headers)
  const kv = env && env.ORDERS_KV ? env.ORDERS_KV : null
  // 1. 已封 IP：页面与静态资源一律 403（断掉数据传输才是目的）。
  if (kv && ip) {
    try {
      const rec = await isIpBlocked(kv, ip)
      if (rec) {
        recordStat('ipBlocked')
        return blockedResponse('ip-blocked')
      }
    } catch {
      recordStat('kvErrors')
    }
  }
  if (kind === 'asset') return null
  // 2. UA：想留的爬虫放行；空 UA 与坏 UA 封禁（只针对页面）。
  if (!isAllowedBot(ua) && isBlockedUa(ua)) {
    recordStat('uaBlocked')
    return blockedResponse('bad-ua')
  }
  // 3. 限速：同一 IP 60 秒内页面请求过多 → 429。
  if (ip && rateLimiter) {
    const r = rateLimiter.check(ip, now)
    if (r.limited) {
      recordStat('rateLimited')
      return rateLimitedResponse(r.retryAfterSec)
    }
  }
  return null
}
