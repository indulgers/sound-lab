import { createFileRoute } from '@tanstack/react-router'
import HomePage from '../../HomePage.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// 首页（中文）：Hero + 调音台（HomePage）。head 为中文版 + WebApplication JSON-LD。
export const Route = createFileRoute('/zh/')({
  head: () => headForRoute('home', 'zh', { ldJson: ldJsonForRoute('home', 'zh') }),
  component: HomePage,
})
