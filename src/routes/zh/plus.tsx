import { createFileRoute } from '@tanstack/react-router'
import PlusPage from '../../PlusPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /zh/plus：进阶页（中文版）——免费版 + 订阅（月付 / 年付）。
export const Route = createFileRoute('/zh/plus')({
  head: () => headForRoute('plus', 'zh'),
  component: PlusPage,
})
