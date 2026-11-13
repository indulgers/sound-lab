import { createFileRoute } from '@tanstack/react-router'
import SourcesPage from '../../SourcesPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /en/sources：音源清单页（英文版）——录音与采样的作者与授权、底噪开关。
export const Route = createFileRoute('/en/sources')({
  head: () => headForRoute('sources', 'en'),
  component: SourcesPage,
})
