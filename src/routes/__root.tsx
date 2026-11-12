import { HeadContent, Outlet, Scripts, createRootRoute, useRouter, useRouterState } from '@tanstack/react-router'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import SoundLabView from '../SoundLabView.jsx'
import { RECIPES, SOUNDS } from '../catalog.mjs'
import { fetchEntitlements, fetchMe } from '../auth-api.js'
import { mountSoundLab } from '../sound-lab.mjs'
import { mountVisualEffects } from '../visual-effects.mjs'
import appCss from '../styles.css?url'

const View = memo(SoundLabView)

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23FFF3D6'/%3E%3Cpath d='M7 8h18c0 5.4-3.6 9.2-7.8 10.1V24h3.6v2.6H11.2V24h3.6v-5.9C10.6 17.2 7 13.4 7 8z' fill='none' stroke='%2343301E' stroke-width='1.7' stroke-linejoin='round'/%3E%3Cpath d='M11.5 11.5h9' stroke='%23C08A4E' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E"

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&family=Caveat:wght@500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'color-scheme', content: 'light' },
      {
        name: 'description',
        content: '混合 22 种声音，听雨落在车窗上，听咖啡馆里的轻声谈话。调成一杯保存，留给专注或放空的时间。',
      },
      { property: 'og:title', content: 'Sound Cocktail · 自己调一杯属于今晚的声音' },
      { property: 'og:description', content: '现场录音、乐器采样与实时合成。选几种声音，调一杯自己的声景。' },
      { property: 'og:type', content: 'website' },
      { title: 'Sound Cocktail · 调一杯声音' },
    ],
    links: [
      { rel: 'icon', href: FAVICON },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: FONTS_URL },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  component: SoundLab,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

interface LabController {
  chooseScene: (recipe: unknown) => void
  showPremium: (name: string) => void
  setOwnedPacks: (packIds: string[]) => void
  setFocus: (open: boolean) => void
  dispose: () => void
}

/**
 * 应用外壳（原 src/main.jsx 的 SoundLab 组件，未改行为）：
 * 音频引擎只在客户端挂载（useLayoutEffect，SSR 时不执行），
 * / 与 /focus 共用同一个 View，/checkout 以 <Outlet/> 叠加在上面，
 * 引擎在路由切换时保持挂载。
 */
function SoundLab() {
  const router = useRouter()
  const focusRoute = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, '') === '/focus',
  })
  const controller = useRef<LabController | null>(null)
  const chooseScene = useCallback((recipe: unknown) => controller.current?.chooseScene(recipe), [])
  const showPremium = useCallback((name: string) => controller.current?.showPremium(name), [])

  // 登录态：外壳拉取 /api/auth/me 和 /api/entitlements；
  // 登录/注册/退出后由 AuthButton 调 refreshAuth 重新拉取。
  const [authUser, setAuthUser] = useState<{ userId: string; email: string } | null>(null)
  const [ownedPacks, setOwnedPacks] = useState<string[]>([])
  const refreshAuth = useCallback(async () => {
    try {
      const me = await fetchMe()
      setAuthUser(me)
      const ent = await fetchEntitlements()
      setOwnedPacks(Array.isArray(ent.packs) ? ent.packs : [])
    } catch {
      setAuthUser(null)
      setOwnedPacks([])
    }
  }, [])

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
        const to = (open ? '/focus' : '/') as '/' | '/focus'
        if (path.replace(/\/$/, '') !== to.replace(/\/$/, '')) {
          void router.navigate({ to, resetScroll: false })
        }
      },
    })
    controller.current = lab
    return () => {
      lab.dispose()
      effects.dispose()
      controller.current = null
    }
  }, [router])

  useLayoutEffect(() => {
    controller.current?.setFocus(focusRoute)
  }, [focusRoute])

  return (
    <>
      <View
        recipes={RECIPES}
        sounds={SOUNDS}
        onChooseScene={chooseScene}
        onShowPremium={showPremium}
        user={authUser}
        ownedPacks={ownedPacks}
        onAuthChange={refreshAuth}
      />
      <Outlet />
    </>
  )
}
