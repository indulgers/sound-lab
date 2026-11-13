import { createFileRoute } from '@tanstack/react-router'
import HomePage from '../../HomePage.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// 首页（英文）：Hero + 调音台（HomePage）。head 为英文版 + WebApplication JSON-LD。
export const Route = createFileRoute('/en/')({
  head: () => headForRoute('home', 'en', { ldJson: ldJsonForRoute('home', 'en') }),
  component: HomePage,
})
