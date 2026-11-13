import { createFileRoute } from '@tanstack/react-router'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// 首页（中文）：内容由根路由的 SoundLab 外壳渲染（View + 音频引擎），
// 本路由不额外渲染任何东西。head 为中文版 + WebApplication JSON-LD。
export const Route = createFileRoute('/zh/')({
  head: () => headForRoute('home', 'zh', { ldJson: ldJsonForRoute('home', 'zh') }),
  component: () => null,
})
