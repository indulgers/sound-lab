/**
 * POST /api/auth/register — 注册（邮箱 + 密码）。
 * 成功时创建会话：Set-Cookie 写 HttpOnly 会话 Cookie，
 * 响应体同时返回 token（小程序等 Bearer 客户端用）。
 * 密码哈希与 salt 永远不返回。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { createSession, registerUser, sessionCookie } from '../../../server/auth'
import { jsonError } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/auth/register')({
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
        const result = await registerUser(
          kv,
          typeof body.email === 'string' ? body.email : '',
          typeof body.password === 'string' ? body.password : '',
        )
        if (!result.ok) {
          const status = result.code === 'EMAIL_TAKEN' ? 409 : 400
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
