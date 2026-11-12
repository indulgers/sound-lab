/**
 * GET /api/auth/google — Google 登录入口：跳到 Google 授权页。
 *
 * 固定 redirect_uri：https://soundcocktail.app/api/auth/google/callback
 * （需在 Google Cloud Console 的 OAuth 客户端里登记这个地址）。
 * 未配置 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 时返回 503。
 * 只申请 openid/email/profile，不申请 offline access，
 * 不保存 Google 的 access/refresh token。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { buildGoogleAuthUrl, createOAuthState, getGoogleEnv } from '../../../../server/auth'
import { jsonError } from '../../../../server/pay-shared'

export const Route = createFileRoute('/api/auth/google/')({
  server: {
    handlers: {
      GET: async () => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        const { clientId } = getGoogleEnv(env)
        if (!clientId) {
          return jsonError(
            503,
            'GOOGLE_NOT_CONFIGURED',
            'Google 登录尚未配置：请在 Worker 上设置 GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET。',
          )
        }
        const state = await createOAuthState(kv)
        return Response.redirect(buildGoogleAuthUrl(clientId, state), 302)
      },
    },
  },
})
