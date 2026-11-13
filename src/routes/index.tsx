import { createFileRoute } from '@tanstack/react-router'
import { headForRoute } from '../seo.mjs'

// 首页：内容由根路由的 SoundLab 外壳渲染（View + 音频引擎），
// 本路由不额外渲染任何东西，与原代码路由（indexRoute 无 component）一致。
// head 在此显式声明首页 SEO（与根路由默认 head 一致），/focus 由子路由覆盖。
export const Route = createFileRoute('/')({
  head: () => headForRoute('home'),
  component: () => null,
})
