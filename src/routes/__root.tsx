import { HeadContent, Outlet, Scripts, createRootRoute, useRouter, useRouterState } from '@tanstack/react-router'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import SoundLabView from '../SoundLabView.jsx'
import { RECIPES, SOUNDS } from '../catalog.mjs'
import { fetchEntitlements, fetchMe } from '../auth-api.js'
import { fetchWaffoPending } from '../pay-api.js'
import { countryFromRequest, useRegion } from '../region.mjs'
import { LocaleContext, getLocale, localeFromPath, localizePath, stripLocalePrefix, useLocale } from '../locale.mjs'
import { OG_IMAGE_URL, seoForRoute, verificationFromContext, verificationMeta } from '../seo.mjs'
import { botGuardMiddleware } from '../server/bot-guard-middleware'
import { verificationMiddleware } from '../server/verification-middleware'
import { mountSoundLab } from '../sound-lab.mjs'
import { mountVisualEffects } from '../visual-effects.mjs'
import appCss from '../styles.css?url'

// 字体自托管（P0）：不再请求 Google Fonts。Fontsource 包随构建
// 打包进 dist，浏览器只下载 unicode-range 命中的子集。
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/geist-mono/600.css'
import '@fontsource/geist-mono/700.css'
import '@fontsource/ma-shan-zheng/400.css'
import '@fontsource/zcool-kuaile/400.css'
import '@fontsource/caveat/500.css'
import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'

const View = memo(SoundLabView)

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23FFF3D6'/%3E%3Cpath d='M7 8h18c0 5.4-3.6 9.2-7.8 10.1V24h3.6v2.6H11.2V24h3.6v-5.9C10.6 17.2 7 13.4 7 8z' fill='none' stroke='%2343301E' stroke-width='1.7' stroke-linejoin='round'/%3E%3Cpath d='M11.5 11.5h9' stroke='%23C08A4E' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E"

export const Route = createRootRoute({
  /**
   * 机器人防护（B6 蜜罐 + UA 封禁 + IP 限速，见 src/bot-guard.mjs）：
   * 根路由的 server.middleware 对所有请求都跑（根路由永远匹配），
   * 在路由处理之前拦截。env 直接取 cloudflare:workers 绑定。
   */
  server: {
    // verification 在前：它经 next({ context }) 把站长验证代码注入
    // loader context（botGuard 短路 403 时不需要 verification）。
    middleware: [verificationMiddleware, botGuardMiddleware],
  },
  /**
   * 根路由 loader（SSR 时在服务端跑）：只读请求的国家，用于
   * shell 的 <html lang> 回落（URL 没带语言前缀时）；站长验证代码
   * 由 verification 中间件注入 serverContext（见下），loader
   * 优先读它，兜底读 context.cloudflare.env（本项目恒为空，见
   * src/seo.mjs 里 verificationFromContext 的注释）。客户端导航时
   * loader 也会跑，但那时没有入站请求，country 为 null，shell 改按
   * URL 前缀回落；verification 也为空，meta 只在 SSR 首屏出现——
   * 验证爬虫只读首屏，够了。loader 本身不读任何密钥或个人信息。
   *
   * P1：SSR head 已按语言 URL 本地化（/en/* 英文、/zh/* 中文，
   * 各子路由 head 输出本语言版本 + hreflang），不再有 P0 时代
   * "SSR 标题无法本地化"的限制；根路由 head 只提供默认英文首页
   * head，子路由会覆盖。
   */
  loader: async ({ request, context, serverContext }: { request?: Request; context?: unknown; serverContext?: unknown }) => {
    // serverContext 是服务端中间件合并后的上下文（框架把
    // additionalContext = { serverContext } 铺进 loader 参数，与
    // context 并列——不是 context 的子属性；见 node_modules 里
    // load-server.js 的 getLoaderContext）。verification 中间件把
    // 站长验证代码写在这里。
    const sc = (serverContext && typeof serverContext === 'object' ? serverContext : {}) as {
      verification?: { google: string | null; bing: string | null; baidu: string | null }
    }
    return {
      country: countryFromRequest(request),
      verification: sc.verification ?? verificationFromContext(context),
    }
  },
  head: ({ loaderData }: { loaderData?: { verification?: { google: string | null; bing: string | null; baidu: string | null } } }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'color-scheme', content: 'light' },
      // 默认英文首页 head（子路由 head 会覆盖；/zh 由子路由输出中文 head）。
      { title: seoForRoute('home', 'en').title },
      { name: 'description', content: seoForRoute('home', 'en').description },
      { property: 'og:title', content: seoForRoute('home', 'en').ogTitle },
      { property: 'og:description', content: seoForRoute('home', 'en').ogDescription },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: OG_IMAGE_URL },
      { name: 'twitter:card', content: 'summary_large_image' },
      // 站长验证 meta：三个变量都没设置时不输出任何东西。
      ...verificationMeta({
        GOOGLE_SITE_VERIFICATION: loaderData?.verification?.google ?? null,
        BING_SITE_VERIFICATION: loaderData?.verification?.bing ?? null,
        BAIDU_SITE_VERIFICATION: loaderData?.verification?.baidu ?? null,
      }),
    ],
    links: [
      { rel: 'icon', href: FAVICON },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  component: SoundLab,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // <html lang>：URL 语言前缀优先（/zh/* → zh-CN，/en/* → en），
  // 其次服务端 loader 的国家，最后客户端界面语言。
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const pathLocale = localeFromPath(pathname)
  let serverLang: string | null = null
  try {
    const data = Route.useLoaderData() as { country?: string | null } | undefined
    if (data && data.country) {
      serverLang = String(data.country).trim().toUpperCase() === 'CN' ? 'zh-CN' : 'en'
    }
  } catch {
    serverLang = null
  }
  const [locale] = useLocale()
  const lang = pathLocale ? (pathLocale === 'en' ? 'en' : 'zh-CN') : (serverLang ?? (locale === 'en' ? 'en' : 'zh-CN'))
  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        {/* B6 蜜罐链接（见 src/bot-guard.mjs）：全站每页一个隐藏链接指向
            /honeypot/。正常用户看不到、点不到（aria-hidden + display:none）；
            只有无视 robots.txt 又到处跟链接的机器人会踩进去，踩中即封 IP。
            链接文本是零宽连接符（U+200D），人眼不可见。 */}
        <a id="honey" aria-hidden="true" tabIndex={-1} href="/honeypot">
          {'\u200d'}
        </a>
      </body>
    </html>
  )
}

interface LabController {
  chooseScene: (recipe: unknown) => void
  showPremium: (name: string) => void
  setMix: (mix: Record<string, number>) => boolean
  playRecipe: (recipe: { name: string; mix: Record<string, number>; params?: unknown }) => boolean
  setOwnedPacks: (packIds: string[]) => void
  setFocus: (open: boolean) => void
  dispose: () => void
}

/**
 * 应用外壳（原 src/main.jsx 的 SoundLab 组件，未改行为）：
 * 音频引擎只在客户端挂载（useLayoutEffect，SSR 时不执行），
 * /en 与 /zh 首页、/focus 与各落地页共用同一个 View，/checkout 与
 * /mix/:code 以 <Outlet/> 叠加在上面，引擎在路由切换时保持挂载。
 * 语言由 URL 前缀决定：外壳按当前路径给子树提供 LocaleContext，
 * 所以 SSR 渲染的就是正确语言的文案（/zh 页不再水合后才变中文）。
 */
function SoundLab() {
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const pathLocale = localeFromPath(pathname)
  const focusRoute = stripLocalePrefix(pathname).replace(/\/$/, '') === '/focus'
  const controller = useRef<LabController | null>(null)
  const chooseScene = useCallback((recipe: unknown) => controller.current?.chooseScene(recipe), [])
  const showPremium = useCallback((name: string) => controller.current?.showPremium(name), [])

  // 登录态：外壳拉取 /api/auth/me 和 /api/entitlements；
  // 登录/注册/退出后由 AuthButton 调 refreshAuth 重新拉取。
  // 进行中的 Waffo 订单只在海外地区拉取（中国地区走支付宝，没有
  // Waffo 进行中订单；PLUS 卡片的“继续付款”也只在海外地区出现）。
  const [authUser, setAuthUser] = useState<{ userId: string; email: string } | null>(null)
  const [ownedPacks, setOwnedPacks] = useState<string[]>([])
  const [pendingWaffoOrders, setPendingWaffoOrders] = useState<
    Array<{ outTradeNo: string; productId: string; checkoutUrl: string; expiresAt: string | null }>
  >([])
  const { region } = useRegion()
  const refreshAuth = useCallback(async () => {
    try {
      const me = await fetchMe()
      setAuthUser(me)
      const ent = await fetchEntitlements()
      setOwnedPacks(Array.isArray(ent.packs) ? ent.packs : [])
      if (region === 'overseas') {
        try {
          const pending = await fetchWaffoPending()
          setPendingWaffoOrders(Array.isArray(pending) ? pending : [])
        } catch {
          setPendingWaffoOrders([])
        }
      } else {
        setPendingWaffoOrders([])
      }
    } catch {
      setAuthUser(null)
      setOwnedPacks([])
      setPendingWaffoOrders([])
    }
  }, [region])

  // 界面语言变化时同步 <html lang>（SSR 时由 RootDocument 按 URL 前缀
  // 决定，水合后及手动切换语言时由这里接管；支付地区不受语言切换影响）。
  const [uiLocale] = useLocale()
  useEffect(() => {
    try {
      document.documentElement.lang = uiLocale === 'en' ? 'en' : 'zh-CN'
    } catch {
      // 非浏览器环境忽略。
    }
  }, [uiLocale])

  // 子树语言：URL 前缀优先；裸路径回落到 getLocale()
  // （localStorage → 浏览器语言）。支付地区不受影响。
  const shellLocale = pathLocale ?? uiLocale

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  // 权益变化时告诉音频引擎：已拥有的包对应的通道变为可玩；退出时重新上锁。
  useEffect(() => {
    controller.current?.setOwnedPacks(ownedPacks)
  }, [ownedPacks])

  useLayoutEffect(() => {
    const effects = mountVisualEffects()
    const lab = mountSoundLab({
      onMixChange: effects.onMixChange,
      onFocusChange(open: boolean) {
        const path = router.state.location.pathname
        const locale = localeFromPath(path) ?? getLocale()
        const to = localizePath(open ? '/focus' : '/', locale) as '/en' | '/zh' | '/en/focus' | '/zh/focus'
        if (stripLocalePrefix(path).replace(/\/$/, '') !== (open ? '/focus' : '/')) {
          void router.navigate({ to, resetScroll: false })
        }
      },
    })
    controller.current = lab
    // 落地页 / 混音页预设事件（P1）：LandingCopy 与 MixPage 发事件，
    // 外壳转交音频引擎。监听器注册在 mount useLayoutEffect 里，
    // 先于子组件的 useEffect 执行，所以落地页挂载时发出的预设不会丢。
    // apply-preset：只摆推子，不播放、不进沉浸模式。
    // play-mix：播放整杯（用户手势触发，音频可初始化）。
    // save-mix：把名字填进保存框并点保存（走引擎已有保存流程）。
    function onApplyPreset(event: Event) {
      const mix = (event as CustomEvent)?.detail?.mix
      if (mix) controller.current?.setMix(mix)
    }
    function onPlayMix(event: Event) {
      const detail = (event as CustomEvent)?.detail
      if (detail?.mix) {
        controller.current?.playRecipe({ name: detail.name, mix: detail.mix, params: detail.params })
      }
    }
    function onSaveMix(event: Event) {
      const name = (event as CustomEvent)?.detail?.name
      const input = document.getElementById('recipeName') as HTMLInputElement | null
      const btn = document.getElementById('saveBtn')
      if (input && typeof name === 'string' && name) input.value = name
      btn?.click()
    }
    window.addEventListener('soundcocktail:apply-preset', onApplyPreset)
    window.addEventListener('soundcocktail:play-mix', onPlayMix)
    window.addEventListener('soundcocktail:save-mix', onSaveMix)
    return () => {
      window.removeEventListener('soundcocktail:apply-preset', onApplyPreset)
      window.removeEventListener('soundcocktail:play-mix', onPlayMix)
      window.removeEventListener('soundcocktail:save-mix', onSaveMix)
      lab.dispose()
      effects.dispose()
      controller.current = null
    }
  }, [router])

  useLayoutEffect(() => {
    controller.current?.setFocus(focusRoute)
  }, [focusRoute])

  return (
    <LocaleContext.Provider value={shellLocale}>
      <View
        recipes={RECIPES}
        sounds={SOUNDS}
        onChooseScene={chooseScene}
        onShowPremium={showPremium}
        user={authUser}
        ownedPacks={ownedPacks}
        pendingWaffoOrders={pendingWaffoOrders}
        onAuthChange={refreshAuth}
      />
      <Outlet />
    </LocaleContext.Provider>
  )
}
