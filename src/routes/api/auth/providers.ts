/**
 * GET /api/auth/providers — 哪些登录方式已配置。
 * 邮箱登录始终可用；Google 登录取决于 Worker 上是否设置了
 * GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET。登录框据此显示/隐藏
 *「使用 Google 登录」按钮。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getGoogleEnv } from '../../../server/auth'

export const Route = createFileRoute('/api/auth/providers')({
  server: {
    handlers: {
      GET: async () => {
        const { clientId, clientSecret } = getGoogleEnv(env)
        return Response.json({ email: true, google: Boolean(clientId && clientSecret) })
      },
    },
  },
})
