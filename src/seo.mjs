/**
 * SEO 共享模块（P0）：站点级常量 + 每路由 head 元数据 + robots/sitemap 生成。
 *
 * 纯模块（不依赖 React / Cloudflare），路由 head() 与 node:test 都直接
 * import 它。P1 做 /en + /zh 时，这里的 ROUTE_SEO 会按语言拆成两套，
 * 并补 hreflang；P0 先只做英文 SSR head（爬虫从美国来、不带
 * Accept-Language，看到的就是海外/英文版）。
 *
 * 语言说明：SSR head 固定英文；客户端水合后由 SoundLabView 的 locale
 * effect 按界面语言同步 <title> 与 meta description（中文用户仍看到
 * 中文标题）。语言切换不影响支付地区与价格。
 */

export const SITE_URL = 'https://soundcocktail.app'
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`

/** 可收录的公开页面（sitemap 用；/checkout、/return、/waffo-return 与 /api/* 不进索引）。 */
export const PUBLIC_PATHS = ['/', '/focus']

export const ROUTE_SEO = {
  home: {
    path: '/',
    title: 'Sound Cocktail · Mix a cup of sound',
    description:
      'Sound Cocktail is a free ambient sound mixer — mix 22 white noise and ambient sounds like rain, fire, café voices and piano, and save your cup for sleep or focus.',
    ogTitle: 'Sound Cocktail · Mix a cup of sound',
    ogDescription:
      'Live recordings, instrument samples and live synthesis. Pick a few sounds and mix a soundscape of your own.',
  },
  focus: {
    path: '/focus',
    title: 'Focus Mode · Sound Cocktail — ambient sounds for deep focus',
    description:
      'Immersive focus mode: mix rain, brown noise and café ambience for deep work and studying. One timer, one cup of sound, nothing else on screen.',
    ogTitle: 'Focus Mode · Sound Cocktail',
    ogDescription:
      'Rain, café ambience and brown noise for deep focus — one timer, one cup of sound, nothing else on screen.',
  },
}

/** 每路由 head() 的返回值（TanStack Start head 格式）：title + 描述 + OG + Twitter 卡片 + 自指 canonical。 */
export function headForRoute(key) {
  const s = ROUTE_SEO[key]
  if (!s) throw new Error(`unknown seo route: ${key}`)
  const canonical = `${SITE_URL}${s.path}`
  return {
    meta: [
      { title: s.title },
      { name: 'description', content: s.description },
      { property: 'og:title', content: s.ogTitle },
      { property: 'og:description', content: s.ogDescription },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: OG_IMAGE_URL },
      { property: 'og:url', content: canonical },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: s.ogTitle },
      { name: 'twitter:description', content: s.ogDescription },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}

/**
 * 站长验证 meta（Google / Bing / 百度）。
 * 由根路由 loader 从 Cloudflare env 读三组可选变量（Worker secret 或
 * wrangler.jsonc vars），有值才输出对应 meta；没设置时不输出任何东西。
 * 变量名：GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION / BAIDU_SITE_VERIFICATION。
 */
export function verificationMeta(env) {
  const e = env && typeof env === 'object' ? env : {}
  const pick = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
  const out = []
  const google = pick(e.GOOGLE_SITE_VERIFICATION)
  if (google) out.push({ name: 'google-site-verification', content: google })
  const bing = pick(e.BING_SITE_VERIFICATION)
  if (bing) out.push({ name: 'msvalidate.01', content: bing })
  const baidu = pick(e.BAIDU_SITE_VERIFICATION)
  if (baidu) out.push({ name: 'baidu-site-verification', content: baidu })
  return out
}

/** 根路由 loader 从 TanStack Start 的 loader context 取 Cloudflare env（context.cloudflare.env）。 */
export function verificationFromContext(context) {
  const env = context && context.cloudflare && context.cloudflare.env ? context.cloudflare.env : {}
  return {
    google: typeof env.GOOGLE_SITE_VERIFICATION === 'string' ? env.GOOGLE_SITE_VERIFICATION : null,
    bing: typeof env.BING_SITE_VERIFICATION === 'string' ? env.BING_SITE_VERIFICATION : null,
    baidu: typeof env.BAIDU_SITE_VERIFICATION === 'string' ? env.BAIDU_SITE_VERIFICATION : null,
  }
}

/** robots.txt 内容：明确放行所有主流爬虫与 AI 爬虫，不屏蔽任何一方；指向 sitemap。 */
export function robotsTxt() {
  return [
    '# Sound Cocktail — robots.txt',
    '# All crawlers, including AI search crawlers, are welcome.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
}

/** sitemap.xml 内容：只列公开可收录页，绝对 URL + lastmod（默认今天 UTC 日期）。 */
export function sitemapXml(date = new Date()) {
  const lastmod = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
  const urls = PUBLIC_PATHS.map(
    (p) =>
      `  <url>\n    <loc>${SITE_URL}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
