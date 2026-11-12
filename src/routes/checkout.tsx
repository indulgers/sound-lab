import { createFileRoute } from '@tanstack/react-router'
import CheckoutView from '../CheckoutView.jsx'

// 结账页（/checkout?pack=<id>）：以 <Outlet/> 叠加在调音台之上，
// 音频引擎保持挂载，与原代码路由 checkoutRoute 一致。
export const Route = createFileRoute('/checkout')({
  validateSearch: (search: Record<string, unknown>) => ({
    pack: typeof search.pack === 'string' ? search.pack : '',
  }),
  component: CheckoutView,
})
