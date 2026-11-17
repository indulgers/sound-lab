import { createFileRoute } from '@tanstack/react-router'
import PlusPage from '../../PlusPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /en/plus：进阶页（英文版）——免费版 + 订阅（月付 / 年付）。
export const Route = createFileRoute('/en/plus')({
  head: () => headForRoute('plus', 'en'),
  component: PlusPage,
})
