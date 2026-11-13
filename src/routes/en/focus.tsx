import { createFileRoute } from '@tanstack/react-router'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /en/focus：与首页同一个 View，专注模式由根路由的 SoundLab 外壳
// 根据 pathname 切换；下方 Outlet 渲染 LandingCopy（专注落地页正文）。
import LandingCopy from '../../LandingCopy.jsx'

export const Route = createFileRoute('/en/focus')({
  head: () => headForRoute('focus', 'en', { ldJson: ldJsonForRoute('focus', 'en') }),
  component: () => <LandingCopy page="focus" locale="en" />,
})
