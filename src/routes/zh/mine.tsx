import { createFileRoute } from '@tanstack/react-router'
import MinePage from '../../MinePage.jsx'
import { headForNoindex } from '../../seo.mjs'

// /zh/mine：我的配方页（中文版）。个人内容：noindex，不进 sitemap。
export const Route = createFileRoute('/zh/mine')({
  head: () => headForNoindex('mine', 'zh'),
  component: MinePage,
})
