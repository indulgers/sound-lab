/**
 * GET /api/auth/google/callback — Google 登录回调。
 *
 * 流程：校验 state（防 CSRF，一次性）→ 用 code 换 token →
 * 用 access_token 取 userinfo（只认 email_verified 的邮箱）→
 * 按 googleSub 或邮箱找账号/新建/关联 → 发本站会话 Cookie → 跳回首页。
 * Google 的 access/refresh token 只用一次，不保存；不申请 offline access。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import {
  GOOGLE_REDIRECT_URI,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  consumeOAuthState,
  createSession,
  findOrCreateGoogleUser,
  getGoogleEnv,
  sessionCookie,
} from '../../../../server/auth'
import { escapeHtml, jsonError } from '../../../../server/pay-shared'

function errorPage(message: string): Response {
  const safe = escapeHtml(message)
  return new Response(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>登录失败 · Sound Cocktail</title></head>` +
      `<body style="font-family:sans-serif;max-width:560px;margin:64px auto;padding:0 16px;">` +
      `<h1>Google 登录失败</h1><p>${safe}</p><p><a href="/">返回 Sound Cocktail</a></p>` +
      `</body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export const Route = createFileRoute('/api/auth/google/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        const { clientId, clientSecret } = getGoogleEnv(env)
        if (!clientId || !clientSecret) {
          return errorPage('Google 登录尚未配置：请在 Worker 上设置 GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET。')
        }

        const url = new URL(request.url)
        const denied = url.searchParams.get('error')
        if (denied) {
          return errorPage(`Google 授权未完成（${denied}）。请重试，或改用邮箱登录。`)
        }
        const code = url.searchParams.get('code') || ''
        const state = url.searchParams.get('state') || ''
        if (!code) return errorPage('缺少授权码，请重新从登录页开始。')
        if (!(await consumeOAuthState(kv, state))) {
          return errorPage('登录会话已过期或无效（state 校验失败），请重新登录。')
        }

        try {
          // code 换 token：只用这一次，不保存 access/refresh token。
          const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: GOOGLE_REDIRECT_URI,
              grant_type: 'authorization_code',
            }),
          })
          if (!tokenRes.ok) {
            // Google 的错误体里有 error / error_description（如 invalid_client），
            // 把它带回页面才能定位是密钥错、还是 redirect_uri 不一致。
            let detail = ''
            try {
              const errBody = (await tokenRes.json()) as {
                error?: unknown
                error_description?: unknown
              }
              const code = typeof errBody.error === 'string' ? errBody.error : ''
              const desc =
                typeof errBody.error_description === 'string' ? errBody.error_description : ''
              detail = [code, desc].filter(Boolean).join('：')
            } catch {
              detail = ''
            }
            return errorPage(
              `与 Google 换 token 失败（HTTP ${tokenRes.status}）${detail ? `：${detail}` : ''}，请检查 Worker 上的 GOOGLE_CLIENT_SECRET 是否与 Google Cloud Console 里的 OAuth 客户端一致。`,
            )
          }
          const tokens = (await tokenRes.json()) as { access_token?: unknown }
          if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
            return errorPage('Google 未返回访问凭证，请稍后重试。')
          }

          const userRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })
          if (!userRes.ok) {
            return errorPage('读取 Google 用户信息失败，请稍后重试。')
          }
          const profile = (await userRes.json()) as {
            sub?: unknown
            email?: unknown
            email_verified?: unknown
            name?: unknown
          }
          // 只认 Google 验证过的邮箱：关联已有账号的依据就是它。
          if (typeof profile.sub !== 'string' || !profile.sub) {
            return errorPage('Google 返回的用户信息不完整，请稍后重试。')
          }
          if (typeof profile.email !== 'string' || !profile.email || profile.email_verified !== true) {
            return errorPage('Google 账号的邮箱未经验证，无法用它登录。')
          }

          const { user } = await findOrCreateGoogleUser(kv, {
            sub: profile.sub,
            email: profile.email,
            name: typeof profile.name === 'string' ? profile.name : null,
          })
          const session = await createSession(kv, user.userId)
          const response = Response.redirect(new URL('/', request.url).toString(), 302)
          response.headers.set('Set-Cookie', sessionCookie(session.token))
          return response
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[google oauth] callback failed', err instanceof Error ? err.message : String(err))
          // 把具体报错带回页面（已转义，不含密钥），否则失败原因没法定位。
          const detail = err instanceof Error ? err.message : String(err)
          return errorPage(`登录过程中出错：${detail}。请稍后重试。`)
        }
      },
    },
  },
})
