import { createFileRoute } from '@tanstack/react-router'
import { headForRoute } from '../seo.mjs'

// /focus：与首页同一个 View，专注模式由根路由的 SoundLab 外壳
// 根据 pathname 切换（原代码路由 focusRoute 同样无 component）。
// head 在此覆盖为专注页专用的 title/meta（与首页不同）。
export const Route = createFileRoute('/focus')({
  head: () => headForRoute('focus'),
  component: () => null,
})
