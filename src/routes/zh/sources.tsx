import { createFileRoute } from '@tanstack/react-router'
import SourcesPage from '../../SourcesPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /zh/sources：音源清单页（中文版）——录音与采样的作者与授权、底噪开关。
export const Route = createFileRoute('/zh/sources')({
  head: () => headForRoute('sources', 'zh'),
  component: SourcesPage,
})
