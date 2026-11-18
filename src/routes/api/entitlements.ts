/**
 * GET /api/entitlements — 当前登录用户的权益。
 * 返回 { packs: [packId...], subscription: { active, plan, provider,
 * status, currentPeriodEnd } | null }。
 * packs 是 2026-11-16 前下架的一次性包（legacy，已发放的保留）；
 * subscription 是时效性订阅授权，active 由服务端按状态 + 周期
 * 结束时间算出（past_due / canceling 在周期内仍算有效）。
 * 未登录返回 401。权益只认服务端记录，不信任前端传入的任何内容。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getPacks, getSubscription, getSessionUserRecord, isSubscriptionActive } from '../../server/auth'
import { qaPlusGrant } from '../../server/qa-plus.mjs'
import { jsonError } from '../../server/pay-shared'

export const Route = createFileRoute('/api/entitlements')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const kv = env.ORDERS_KV
        if (!kv) return jsonError(500, 'STORE_NOT_CONFIGURED', '用户存储未配置：缺少 ORDERS_KV 绑定。')
        // Confirm the session resolves to an existing user record; never trust
        // a caller-supplied email, URL flag, or userId query parameter.
        const user = await getSessionUserRecord(kv, request)
        if (!user) return jsonError(401, 'UNAUTHORIZED', '请先登录。')
        const packs = await getPacks(kv, user.userId)
        const subscription = await getSubscription(kv, user.userId)
        const paid = subscription
          ? {
              active: isSubscriptionActive(subscription),
              plan: subscription.plan,
              provider: subscription.provider,
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd,
            }
          : null
        // Real paid subscriptions take precedence. A QA grant is a response
        // overlay only: it never writes to KV, creates a payment, or renews.
        const qa = !paid?.active ? qaPlusGrant(env, user.userId, request.url) : null
        return Response.json({
          packs,
          subscription: paid?.active ? paid : (qa ?? paid),
        }, { headers: { 'Cache-Control': 'private, no-store' } })
      },
    },
  },
})
