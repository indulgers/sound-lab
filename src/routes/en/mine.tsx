import { createFileRoute } from '@tanstack/react-router'
import MinePage from '../../MinePage.jsx'
import { headForNoindex } from '../../seo.mjs'

// /en/mine：我的配方页（英文版）。个人内容：noindex，不进 sitemap。
export const Route = createFileRoute('/en/mine')({
  head: () => headForNoindex('mine', 'en'),
  component: MinePage,
})
