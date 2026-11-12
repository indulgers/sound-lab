/**
 * GET /api/entitlements — 当前登录用户已拥有的包列表 { packs: [packId...] }。
 * 未登录返回 401。权益只认服务端记录，不信任前端传入的任何内容。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getPacks, getSessionUser } from '../../server/auth'
import { jsonError } from '../../server/pay-shared'

export const Route = createFileRoute('/api/entitlements')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        const session = await getSessionUser(kv, request)
        if (!session) return jsonError(401, 'UNAUTHORIZED', '请先登录。')
        const packs = await getPacks(kv, session.userId)
        return Response.json({ packs })
      },
    },
  },
})
