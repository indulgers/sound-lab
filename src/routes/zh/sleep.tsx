import { createFileRoute } from '@tanstack/react-router'
import LandingCopy from '../../LandingCopy.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /zh/sleep：雨声助眠落地页——上方是预载雨夜配方的调音台，
// 下方是本页正文 + FAQ + 内链（SSR HTML 含关键词与 FAQ）。
export const Route = createFileRoute('/zh/sleep')({
  head: () => headForRoute('sleep', 'zh', { ldJson: ldJsonForRoute('sleep', 'zh') }),
  component: () => <LandingCopy page="sleep" locale="zh" />,
})
