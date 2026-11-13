import { createFileRoute } from '@tanstack/react-router'
import LandingCopy from '../../LandingCopy.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /zh/rain：雨声落地页——上方是预载雨落窗边配方的调音台，
// 下方是本页正文 + FAQ + 内链（SSR HTML 含关键词与 FAQ）。
export const Route = createFileRoute('/zh/rain')({
  head: () => headForRoute('rain', 'zh', { ldJson: ldJsonForRoute('rain', 'zh') }),
  component: () => <LandingCopy page="rain" locale="zh" />,
})
