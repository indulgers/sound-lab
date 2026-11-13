import { createFileRoute } from '@tanstack/react-router'
import LegalPage from '../../LegalPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /en/terms：服务条款（英文版）。
export const Route = createFileRoute('/en/terms')({
  head: () => headForRoute('terms', 'en'),
  component: () => <LegalPage page="terms" locale="en" />,
})
