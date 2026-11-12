/**
 * GET /api/products — 商品目录（服务端定价）。
 * 与 Express 版 GET /api/products 响应一致。
 */
import { createFileRoute } from '@tanstack/react-router'
import { listProducts } from '../../server/products'

export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ products: listProducts() })
      },
    },
  },
})
