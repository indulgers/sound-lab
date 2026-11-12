/**
 * GET /api/waffo/pending — 当前登录用户进行中的 Waffo 订单。
 *
 * 防重复付款的另一半：前端在结账页和 PLUS 卡片上先查这里，
 * 有进行中订单时展示“继续付款”而不是再下一个新单。
 * 只返回登录用户自己的订单（按 userId 过滤）；未登录 401。
 * 进行中 = provider='waffo' 且 CREATED 且收银台会话未过期
 * （见 src/server/store.ts 的判定；过期订单不返回）。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getSessionUserRecord } from '../../../server/auth.ts'
import { getStore, isStore, jsonError } from '../../../server/pay-shared.ts'

export const Route = createFileRoute('/api/waffo/pending')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const store = getStore(env)
        if (!isStore(store)) return store

        const sessionUser = await getSessionUserRecord(env.ORDERS_KV, request)
        if (!sessionUser) {
          return jsonError(401, 'UNAUTHORIZED', 'Please sign in to view pending orders.')
        }

        const pending = await store.listPendingWaffoOrders(sessionUser.userId)
        return Response.json({
          orders: pending.map((order) => ({
            outTradeNo: order.outTradeNo,
            productId: order.productId,
            totalAmount: order.totalAmount,
            currency: 'USD',
            checkoutUrl: order.waffoCheckoutUrl,
            sessionId: order.waffoSessionId,
            expiresAt: order.waffoSessionExpiresAt,
          })),
        })
      },
    },
  },
})
