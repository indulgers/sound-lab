/**
 * POST /api/auth/login — 登录（邮箱 + 密码）。
 * 邮箱不存在与密码错误返回同一种 401，不泄露账号是否存在；
 * 同一邮箱 1 小时内失败满 10 次返回 429。
 * 成功时创建会话：Set-Cookie 写 HttpOnly 会话 Cookie，
 * 响应体同时返回 token（小程序等 Bearer 客户端用）。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { authenticateUser, createSession, sessionCookie } from '../../../server/auth'
import { jsonError } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        let body: { email?: unknown; password?: unknown } = {}
        try {
          body = (await request.json()) as { email?: unknown; password?: unknown }
        } catch {
          body = {}
        }
        const result = await authenticateUser(
          kv,
          typeof body.email === 'string' ? body.email : '',
          typeof body.password === 'string' ? body.password : '',
        )
        if (!result.ok) {
          const status = result.code === 'TOO_MANY_ATTEMPTS' ? 429 : 401
          return jsonError(status, result.code, result.message)
        }
        const session = await createSession(kv, result.user.userId)
        const response = Response.json({ ...result.user, token: session.token })
        response.headers.set('Set-Cookie', sessionCookie(session.token))
        return response
      },
    },
  },
})
