/**
 * GET /api/products — 商品目录（服务端定价）。
 * 与 Express 版 GET /api/products 响应一致。
 * ?locale=en 或 ?currency=USD 返回美元价（海外版）；默认人民币价。
 */
import { createFileRoute } from '@tanstack/react-router'
import { listProducts, normalizeCurrency } from '../../server/products'

export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const locale = (url.searchParams.get('locale') || '').trim().toLowerCase()
        const currency = normalizeCurrency(
          locale === 'en' ? 'USD' : url.searchParams.get('currency'),
        )
        return Response.json({ currency, products: listProducts(currency) })
      },
    },
  },
})
