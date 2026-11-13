import { createFileRoute } from '@tanstack/react-router'
import LegalPage from '../../LegalPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /zh/terms：服务条款（中文版）。
export const Route = createFileRoute('/zh/terms')({
  head: () => headForRoute('terms', 'zh'),
  component: () => <LegalPage page="terms" locale="zh" />,
})
