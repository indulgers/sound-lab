import { createFileRoute } from '@tanstack/react-router'
import LegalPage from '../../LegalPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /en/privacy：隐私政策（英文版）。
export const Route = createFileRoute('/en/privacy')({
  head: () => headForRoute('privacy', 'en'),
  component: () => <LegalPage page="privacy" locale="en" />,
})
