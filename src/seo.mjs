/**
 * SEO 共享模块（P0 + P1）：站点级常量 + 每路由 head 元数据 + robots/sitemap 生成。
 *
 * 纯模块（不依赖 React / Cloudflare），路由 head() 与 node:test 都直接
 * import 它。
 *
 * P1：语言 URL /en + /zh。
 * - 规范 URL 全部带语言前缀（无尾斜杠）：/en、/zh、/en/focus、/zh/sleep …
 * - 每页 head 列出全部语言版本（互为 hreflang）+ 唯一 x-default（英文版）；
 *   canonical 永远指向本语言版本，不跨语言。
 * - JSON-LD 由路由层从 seo-ld.mjs 取，headForRoute(key, locale, { ldJson })
 *   注入（避免 seo.mjs ↔ seo-ld.mjs 循环依赖）。
 * - 落地页与 About 页的标题/描述取自 landing.mjs（单一事实来源）。
 * - sitemap 带 xhtml:link hreflang 标注；llms.txt 页面列表也更新为双语 URL。
 *
 * 语言切换不影响支付地区与价格（见 src/region.mjs，解耦规则）。
 */
import { LANDING_PAGES, ABOUT_PAGE } from './landing.mjs';
import { TERMS_PAGE, PRIVACY_PAGE } from './legal.mjs';
import { SOUNDS, soundDisplayName } from './catalog.mjs';

const SOUND_BY_ID = new Map(SOUNDS.map((s) => [s.id, s]));

export const SITE_URL = 'https://soundcocktail.app'
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`

/** 语言列表与默认语言（x-default 指向英文版）。 */
export const LOCALES = ['en', 'zh']
export const DEFAULT_LOCALE = 'en'

/** hreflang 值：英文 'en'，中文 'zh-CN'。 */
export const HREFLANG = { en: 'en', zh: 'zh-CN' }

/**
 * 可收录的公开页面（sitemap + llms.txt 用；/checkout、/return、
 * /waffo-return、/mix/:code 与 /api/* 不进索引）。
 * 法律页（/terms、/privacy）有 head（canonical + hreflang）但不进
 * sitemap：Waffo 审核清单只要求页脚链接与完整内容，不要求收录。
 * 格式为 [页面 key, URL 段]，URL 段不含语言前缀；home 的段为空。
 */
export const PUBLIC_PAGES = [
  ['home', ''],
  ['focus', '/focus'],
  ['sleep', '/sleep'],
  ['relax', '/relax'],
  ['rain', '/rain'],
  ['cafe', '/cafe'],
  ['about', '/about'],
  ['recipes', '/recipes'],
  ['plus', '/plus'],
  ['sources', '/sources'],
]

/** 不进 sitemap、但有 head 的页面（法律页）：key → URL 段。 */
export const NON_INDEXED_PAGES = [
  ['studio', '/studio'],
  ['terms', '/terms'],
  ['privacy', '/privacy'],
]

/** 可收录页面的全部语言版本 URL 路径（sitemap 用）。 */
export const PUBLIC_PATHS = PUBLIC_PAGES.flatMap(([, seg]) => LOCALES.map((l) => `/${l}${seg}`))

/** 某页某语言的规范路径（home 为 /en、/zh，无尾斜杠）。 */
export function canonicalPath(key, locale) {
  const page = PUBLIC_PAGES.find(([k]) => k === key) || NON_INDEXED_PAGES.find(([k]) => k === key)
  if (!page) throw new Error(`unknown seo page: ${key}`)
  if (!LOCALES.includes(locale)) throw new Error(`unknown locale: ${locale}`)
  return `/${locale}${page[1]}`
}

export function canonicalUrl(key, locale) {
  return `${SITE_URL}${canonicalPath(key, locale)}`
}

/** 首页与 focus 页的双语标题/描述（P0 的英文 + P1 补中文）。 */
export const ROUTE_SEO = {
  home: {
    path: '',
    en: {
      title: 'Sound Cocktail · Somewhere slower',
      description: 'Step into Bali rainforest and Chiang Mai inspired listening rooms. Original music, real looping video, adjustable sound layers and continuous listening for a slower moment.',
      ogTitle: 'Sound Cocktail · Somewhere slower',
      ogDescription: 'Two little corners of the world. Original music, immersive video and a sound balance of your own.',
    },
    zh: {
      title: 'Sound Cocktail · 在某个地方，慢下来',
      description: '进入以巴厘岛雨林和清迈咖啡馆为灵感的聆听空间。原创音乐、真实循环视频、独立分轨调音与持续播放，陪你慢慢放松，找回自己的节奏。',
      ogTitle: 'Sound Cocktail · 在某个地方，慢下来',
      ogDescription: '世界的两个小角落。沉浸画面、原创音乐，还有属于你的声音配比。',
    },
  },
  studio: {
    path: '',
    en: {
      title: 'Sound Cocktail · Mix a cup of sound',
      description:
        'Sound Cocktail is a free ambient sound mixer — mix 22 white noise and ambient sounds like rain, fire, café voices and piano, and save your cup for sleep or focus.',
      ogTitle: 'Sound Cocktail · Mix a cup of sound',
      ogDescription:
        'Live recordings, instrument samples and live synthesis. Pick a few sounds and mix a soundscape of your own.',
    },
    zh: {
      title: 'Sound Cocktail · 调一杯属于你的声音',
      description:
        'Sound Cocktail 是一款免费的环境音混音器——22 种白噪音与环境音，雨声、篝火、咖啡馆人声、钢琴，随意混搭、存成一杯，助眠或专注都用得上。',
      ogTitle: 'Sound Cocktail · 调一杯属于你的声音',
      ogDescription: '真实录音、乐器采样与实时合成。挑几种声音，调出属于你的声音风景。',
    },
  },
  focus: {
    path: '/focus',
    en: {
      title: 'Focus Mode · Sound Cocktail — ambient sounds for deep focus',
      description:
        'Immersive focus mode: mix rain, brown noise and café ambience for deep work and studying. One timer, one cup of sound, nothing else on screen.',
      ogTitle: 'Focus Mode · Sound Cocktail',
      ogDescription:
        'Rain, café ambience and brown noise for deep focus — one timer, one cup of sound, nothing else on screen.',
    },
    zh: {
      title: '专注模式 · Sound Cocktail — 深度工作的环境音',
      description:
        '沉浸专注模式：用雨声、棕色噪音和咖啡馆氛围调一杯深度工作与学习的声音。一个计时器，一杯声音，屏幕上什么都没有。',
      ogTitle: '专注模式 · Sound Cocktail',
      ogDescription: '雨声、咖啡馆氛围与棕色噪音，陪你深度专注——一个计时器，一杯声音，屏幕上什么都没有。',
    },
  },
  recipes: {
    path: '/recipes',
    en: {
      title: 'Recipes · Sound Cocktail — free ambient sound mixes for sleep, focus and rain',
      description:
        'Browse free ambient sound recipes — rain, fire, café voices, piano and more — mixed for sleep, focus and relaxation. Open any recipe in the mixer and make it yours.',
      ogTitle: 'Recipes · Sound Cocktail',
      ogDescription:
        'Free ambient sound recipes for sleep, focus and rain — open any one in the mixer and make it yours.',
    },
    zh: {
      title: '配方 · Sound Cocktail — 助眠、专注与雨声的免费声音配方',
      description:
        '浏览免费的环境音配方：雨声、篝火、咖啡馆人声、钢琴……为助眠、专注与放松而调。在调音台打开任意配方，调成你的。',
      ogTitle: '配方 · Sound Cocktail',
      ogDescription: '助眠、专注与雨声的免费声音配方——在调音台打开任意配方，调成你的。',
    },
  },
  plus: {
    path: '/plus',
    en: {
      title: 'Sound Cocktail Plus — one-time sound packs',
      description:
        'Unlock more sounds with a one-time purchase: Focus Pack, Sleep Pack and Rain Night Pack. No subscription — buy once, keep forever.',
      ogTitle: 'Sound Cocktail Plus — one-time sound packs',
      ogDescription:
        'Focus Pack, Sleep Pack and Rain Night Pack — one-time purchases, no subscription.',
    },
    zh: {
      title: 'Sound Cocktail 进阶 · 一次购买的声音包',
      description:
        '一次性购买解锁更多声音：专注包、助眠包与雨夜包。不订阅，买一次，永久用。',
      ogTitle: 'Sound Cocktail 进阶 · 一次购买的声音包',
      ogDescription: '专注包、助眠包与雨夜包——一次性购买，不订阅。',
    },
  },
  sources: {
    path: '/sources',
    en: {
      title: 'Sources & licences · Sound Cocktail — real recordings',
      description:
        'Where every sound comes from: real recordings, instrument samples and live synthesis, with authors and licences.',
      ogTitle: 'Sources & licences · Sound Cocktail',
      ogDescription:
        'Real recordings, instrument samples and live synthesis — every sound, with its author and licence.',
    },
    zh: {
      title: '音源与授权 · Sound Cocktail — 真实录音',
      description:
        '每个声音的出处：真实录音、乐器采样与实时合成，附作者与授权说明。',
      ogTitle: '音源与授权 · Sound Cocktail',
      ogDescription: '真实录音、乐器采样与实时合成——每个声音都有作者与授权说明。',
    },
  },
  mine: {
    path: '/mine',
    en: {
      title: 'My recipes · Sound Cocktail',
      description:
        'Your saved sound recipes — open any cup in the mixer, or import a shared recipe code.',
      ogTitle: 'My recipes · Sound Cocktail',
      ogDescription: 'Your saved sound recipes.',
    },
    zh: {
      title: '我的配方 · Sound Cocktail',
      description:
        '你存下的声音配方——在调音台打开任意一杯，或导入朋友分享的配方码。',
      ogTitle: '我的配方 · Sound Cocktail',
      ogDescription: '你存下的声音配方。',
    },
  },
}

/** 取某页某语言的标题/描述（落地页与 About、法律页取自 landing.mjs / legal.mjs）。 */
export function seoForRoute(key, locale) {
  if (LANDING_PAGES[key]) return LANDING_PAGES[key].seo[locale]
  if (key === 'about') return ABOUT_PAGE.seo[locale]
  if (key === 'terms') return TERMS_PAGE.seo[locale]
  if (key === 'privacy') return PRIVACY_PAGE.seo[locale]
  const r = ROUTE_SEO[key]
  if (!r) throw new Error(`unknown seo route: ${key}`)
  return r[locale]
}

/** 某页的 hreflang 链接条目（全部语言版本 + x-default，调用方放进 head links）。
 * 注意：TanStack Start 把 links 的键原样写成 HTML 属性，所以这里必须
 * 用小写 hreflang（爬虫只认 hreflang；写 React 形式 hrefLang 会在
 * SSR HTML 里原样输出 hrefLang，属无效属性）。代价是客户端 hydration
 * 时 React 会报一条 Invalid DOM property 警告（纯提示，属性仍会
 * 原样留在 DOM 里），以 SSR 正确为准。 */
export function hreflangLinksFor(key) {
  const links = LOCALES.map((l) => ({
    rel: 'alternate',
    hreflang: HREFLANG[l],
    href: canonicalUrl(key, l),
  }))
  links.push({ rel: 'alternate', hreflang: 'x-default', href: canonicalUrl(key, DEFAULT_LOCALE) })
  return links
}

/**
 * 每路由 head() 的返回值（TanStack Start head 格式）：title + 描述 +
 * OG + Twitter 卡片 + 自指 canonical + hreflang + 可选 JSON-LD。
 *
 * options：{ ldJson?: object[]（seo-ld.mjs 的 ldJsonForRoute 返回值）,
 *            ogImage?: string（混音页可传默认 og-image） }。
 */
export function headForRoute(key, locale = 'en', options = {}) {
  if (!LOCALES.includes(locale)) throw new Error(`unknown locale: ${locale}`)
  const s = seoForRoute(key, locale)
  const canonical = canonicalUrl(key, locale)
  const other = locale === 'en' ? 'zh' : 'en'
  const meta = [
    { title: s.title },
    { name: 'description', content: s.description },
    { property: 'og:title', content: s.ogTitle },
    { property: 'og:description', content: s.ogDescription },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: options.ogImage || OG_IMAGE_URL },
    { property: 'og:url', content: canonical },
    { property: 'og:locale', content: locale === 'en' ? 'en_US' : 'zh_CN' },
    { property: 'og:locale:alternate', content: other === 'en' ? 'en_US' : 'zh_CN' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: s.ogTitle },
    { name: 'twitter:description', content: s.ogDescription },
  ]
  const ld = Array.isArray(options.ldJson) ? options.ldJson : []
  for (const item of ld) {
    meta.push({
      key: 'script:ld+json',
      tag: 'script',
      type: 'application/ld+json',
      content: JSON.stringify(item),
    })
  }
  return {
    meta,
    links: [{ rel: 'canonical', href: canonical }, ...hreflangLinksFor(key)],
  }
}

/**
 * 个人内容页的 head（/mine）：标题 + 描述 + robots noindex，
 * 不出 canonical、不出 hreflang（同一登录用户的内容没有“另一语言
 * 版本”可指）、不进 sitemap。结账页是同一先例（见 checkout 路由，
 * 只出 noindex）；这里多给标题与描述，方便浏览器标签页识别。
 */
export function headForNoindex(key, locale = 'en') {
  if (!LOCALES.includes(locale)) throw new Error(`unknown locale: ${locale}`)
  const s = seoForRoute(key, locale)
  return {
    meta: [
      { title: s.title },
      { name: 'description', content: s.description },
      { name: 'robots', content: 'noindex' },
    ],
    links: [],
  }
}

/**
 * 分享混音页 /:locale/mix/:code 的 head。
 * recipe 为 null（码无效）时：通用标题 + noindex，不编造内容。
 * 有效时：标题用配方名（用户起的名字，原样展示），描述列出配料；
 * OG 图用默认 og-image.png。双语版本互为 hreflang（同一杯、两种界面语言）。
 */
export function headForMix(recipe, locale = 'en', code = '') {
  if (!LOCALES.includes(locale)) throw new Error(`unknown locale: ${locale}`);
  const canonical = `${SITE_URL}/${locale}/mix/${code}`;
  const hreflang = LOCALES.map((l) => ({
    rel: 'alternate',
    hreflang: HREFLANG[l],
    href: `${SITE_URL}/${l}/mix/${code}`,
  }));
  hreflang.push({ rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/${DEFAULT_LOCALE}/mix/${code}` });
  if (!recipe) {
    return {
      meta: [
        { title: 'Sound Cocktail · Mix a cup of sound' },
        { name: 'description', content: 'A shared Sound Cocktail mix.' },
        { name: 'robots', content: 'noindex' },
        { property: 'og:title', content: 'Sound Cocktail' },
        { property: 'og:description', content: 'A shared Sound Cocktail mix.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: OG_IMAGE_URL },
        { property: 'og:url', content: canonical },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [{ rel: 'canonical', href: canonical }, ...hreflang],
    };
  }
  const ingredients = Object.entries(recipe.mix || {})
    .map(([id, level]) => {
      const sound = SOUND_BY_ID.get(id);
      return sound ? `${soundDisplayName(sound, locale)} ${Math.round(level * 100)}` : null;
    })
    .filter(Boolean);
  const title = `${recipe.name || 'Sound Cocktail'} · Sound Cocktail`;
  const description =
    locale === 'en'
      ? `A shared Sound Cocktail mix: ${ingredients.join(' · ')}. Open it in the mixer and make it yours.`
      : `朋友分享的 Sound Cocktail 配方：${ingredients.join(' · ')}。在调音台打开这杯，调成你的。`;
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: OG_IMAGE_URL },
      { property: 'og:url', content: canonical },
      { property: 'og:locale', content: locale === 'en' ? 'en_US' : 'zh_CN' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: canonical }, ...hreflang],
  };
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

/**
 * 从一个纯 env 对象读三组站长验证代码（Google / Bing / 百度）。
 * 纯函数，可单元测试；调用方（verification 中间件）直接传
 * cloudflare:workers 的 env。
 */
export function verificationTokensFromEnv(env) {
  const e = env && typeof env === 'object' ? env : {}
  const pick = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)
  return {
    google: pick(e.GOOGLE_SITE_VERIFICATION),
    bing: pick(e.BING_SITE_VERIFICATION),
    baidu: pick(e.BAIDU_SITE_VERIFICATION),
  }
}

/**
 * 根路由 loader 从 TanStack Start 的 loader context 取 Cloudflare env
 *（context.cloudflare.env）。注意：实测本项目的默认 server-entry 从不
 * 往 context 里注入 cloudflare env（框架源码：middleware context 只
 * 来自 requestOpts.context，默认入口不传；2026-11-13 探针验证
 * hasEnv:false），所以它恒返回 null；真正生效的路径是 verification
 * 中间件（src/server/verification-middleware.ts）经 next({ context })
 * 注入的 context.verification。本函数只保留作兜底与测试。
 */
export function verificationFromContext(context) {
  const env = context && context.cloudflare && context.cloudflare.env ? context.cloudflare.env : {}
  return verificationTokensFromEnv(env)
}

/** robots.txt 内容：明确放行所有主流爬虫与 AI 爬虫，不屏蔽任何一方；指向 sitemap。
 * 唯一 Disallow 是 B6 蜜罐 /honeypot/（见 src/bot-guard.mjs）：正常爬虫不会去，
 * 踩进去的机器人会被封 IP。 */
export function robotsTxt() {
  return [
    '# Sound Cocktail — robots.txt',
    '# All crawlers, including AI search crawlers, are welcome.',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /honeypot/',
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

/**
 * sitemap.xml 内容：全部可收录页 × 全部语言，绝对 URL + lastmod，
 * 每个 <url> 带 xhtml:link hreflang 标注（全部语言版本 + x-default）。
 * /mix/:code 不进 sitemap（只有真实分享的混音才有 URL）。
 */
export function sitemapXml(date = new Date()) {
  const lastmod = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
  const urls = PUBLIC_PAGES.flatMap(([, seg]) =>
    LOCALES.map((l) => {
      const loc = `${SITE_URL}/${l}${seg}`
      const alternates = [
        ...LOCALES.map(
          (al) =>
            `    <xhtml:link rel="alternate" hreflang="${HREFLANG[al]}" href="${SITE_URL}/${al}${seg}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${DEFAULT_LOCALE}${seg}"/>`,
      ].join('\n')
      return `  <url>\n    <loc>${loc}</loc>\n${alternates}\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    }),
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`
}

/** llms.txt 用页面列表：全部可收录页的双语 URL（绝对地址）。 */
export function llmsPages() {
  return PUBLIC_PATHS.map((p) => `${SITE_URL}${p}`)
}
