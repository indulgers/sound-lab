/**
 * GET /api/auth/me — 当前登录用户；未登录返回 401。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getSessionUserRecord } from '../../../server/auth'
import { jsonError } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        const user = await getSessionUserRecord(kv, request)
        if (!user) return jsonError(401, 'UNAUTHORIZED', '请先登录。')
        return Response.json(user)
      },
    },
  },
})
