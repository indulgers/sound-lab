import { createFileRoute } from '@tanstack/react-router'
import LandingCopy from '../../LandingCopy.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /en/cafe：咖啡馆背景音落地页——上方是预载午后咖啡馆配方的调音台，
// 下方是本页正文 + FAQ + 内链（SSR HTML 含关键词与 FAQ）。
export const Route = createFileRoute('/en/cafe')({
  head: () => headForRoute('cafe', 'en', { ldJson: ldJsonForRoute('cafe', 'en') }),
  component: () => <LandingCopy page="cafe" locale="en" />,
})
