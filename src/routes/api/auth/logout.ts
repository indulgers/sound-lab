/**
 * POST /api/auth/logout — 退出：删除当前会话并清除 Cookie。
 * 未登录时也返回成功（幂等）。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { clearSessionCookie, deleteSession, getSessionTokenFromRequest } from '../../../server/auth'
import { jsonError } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        const token = getSessionTokenFromRequest(request)
        if (token) await deleteSession(kv, token)
        const response = Response.json({ ok: true })
        response.headers.set('Set-Cookie', clearSessionCookie())
        return response
      },
    },
  },
})
