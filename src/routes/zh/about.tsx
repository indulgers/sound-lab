import { createFileRoute } from '@tanstack/react-router'
import AboutPage from '../../AboutPage.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /zh/about：作者与声音来源、价格与医疗免责（中文版）。
// 与首页 About 区块同一事实来源，不矛盾。
export const Route = createFileRoute('/zh/about')({
  head: () => headForRoute('about', 'zh', { ldJson: ldJsonForRoute('about', 'zh') }),
  component: () => <AboutPage locale="zh" />,
})
