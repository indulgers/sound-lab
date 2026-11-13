import { createFileRoute } from '@tanstack/react-router'
import LegalPage from '../../LegalPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /zh/privacy：隐私政策（中文版）。
export const Route = createFileRoute('/zh/privacy')({
  head: () => headForRoute('privacy', 'zh'),
  component: () => <LegalPage page="privacy" locale="zh" />,
})
