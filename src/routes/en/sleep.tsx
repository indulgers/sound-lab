import { createFileRoute } from '@tanstack/react-router'
import LandingCopy from '../../LandingCopy.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /en/sleep：雨声助眠落地页——上方是预载雨夜配方的调音台，
// 下方是本页正文 + FAQ + 内链（SSR HTML 含关键词与 FAQ）。
export const Route = createFileRoute('/en/sleep')({
  head: () => headForRoute('sleep', 'en', { ldJson: ldJsonForRoute('sleep', 'en') }),
  component: () => <LandingCopy page="sleep" locale="en" />,
})
