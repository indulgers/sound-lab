/**
 * POST /api/waffo/portal — Waffo 客户中心（Customer Portal）链接。
 *
 * 订阅用户自助管理订阅的入口：取消、换计划、更新支付方式都在
 * Waffo 的客户中心完成（SDK createCustomerPortalLink）。
 * - 必须登录；链接按 buyerIdentity（= userId）生成，只显示该用户
 *   自己的订单/订阅。
 * - 需要 WAFFO_STORE_ID（商店短 ID STO_...，Waffo 后台可见）：
 *   未配置时返回 503 WAFFO_NOT_CONFIGURED（Plus 页会提示发邮件
 *   联系客服取消，不伪装成功）。
 * - 链接有时效（expiresAt），前端拿到后立即在新标签页打开。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { getSessionUserRecord } from '../../../server/auth.ts'
import {
  createWaffoClient,
  getWaffoStoreId,
  resolveWaffoConfig,
  waffoConfigInvalidResponse,
  waffoNotConfiguredResponse,
} from '../../../server/waffo.ts'
import { jsonError } from '../../../server/pay-shared.ts'

export const Route = createFileRoute('/api/waffo/portal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessionUser = await getSessionUserRecord(env.ORDERS_KV, request)
        if (!sessionUser) {
          return jsonError(401, 'UNAUTHORIZED', 'Please sign in to manage your subscription.')
        }

        const cfg = resolveWaffoConfig(env)
        if (!cfg.configured) return waffoNotConfiguredResponse(cfg.missing)

        const storeId = getWaffoStoreId(env)
        if (!storeId) {
          return jsonError(
            503,
            'WAFFO_NOT_CONFIGURED',
            'Waffo payment is not configured: missing WAFFO_STORE_ID. Set it with wrangler secret put (see README).',
            { missing: ['WAFFO_STORE_ID'] },
          )
        }

        let client
        try {
          client = createWaffoClient(cfg)
        } catch {
          return waffoConfigInvalidResponse()
        }

        try {
          const link = await client.auth.createCustomerPortalLink({
            storeId,
            buyerIdentity: sessionUser.userId,
          })
          return Response.json({ portalUrl: link.portalUrl, expiresAt: link.expiresAt ?? null })
        } catch (err) {
          const message =
            err instanceof WaffoPancakeError
              ? err.message
              : 'Could not reach the Waffo customer portal. Please try again.'
          // eslint-disable-next-line no-console
          console.warn('[waffo portal] create link failed', { message })
          return jsonError(502, 'WAFFO_API_ERROR', message)
        }
      },
    },
  },
})
