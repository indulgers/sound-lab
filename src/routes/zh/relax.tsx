import { createFileRoute } from '@tanstack/react-router'
import LandingCopy from '../../LandingCopy.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /zh/relax：放松落地页——上方是预载篝火配方的调音台，
// 下方是本页正文 + FAQ + 内链（SSR HTML 含关键词与 FAQ）。
export const Route = createFileRoute('/zh/relax')({
  head: () => headForRoute('relax', 'zh', { ldJson: ldJsonForRoute('relax', 'zh') }),
  component: () => <LandingCopy page="relax" locale="zh" />,
})
