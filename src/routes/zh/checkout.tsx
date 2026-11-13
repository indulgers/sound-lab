import { createFileRoute } from '@tanstack/react-router'
import CheckoutView from '../../CheckoutView.jsx'

// 结账页（/zh/checkout?pack=<id>）：以 <Outlet/> 叠加在调音台之上，
// 音频引擎保持挂载。交易页不进索引：robots noindex（也不进 sitemap）。
export const Route = createFileRoute('/zh/checkout')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex' }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    pack: typeof search.pack === 'string' ? search.pack : '',
  }),
  component: CheckoutView,
})
