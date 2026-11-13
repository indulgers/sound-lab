import { createFileRoute } from '@tanstack/react-router'
import AboutPage from '../../AboutPage.jsx'
import { headForRoute } from '../../seo.mjs'
import { ldJsonForRoute } from '../../seo-ld.mjs'

// /en/about：作者与声音来源、价格与医疗免责（英文版）。
// 与首页 About 区块同一事实来源，不矛盾。
export const Route = createFileRoute('/en/about')({
  head: () => headForRoute('about', 'en', { ldJson: ldJsonForRoute('about', 'en') }),
  component: () => <AboutPage locale="en" />,
})
