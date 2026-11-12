/**
 * GET /api/waffo/order-status?order=<outTradeNo> — 单个 Waffo 订单的快查。
 *
 * 回跳页（/waffo-return）轮询用：webhook 慢到时，先直接向 Waffo 查
 * 这笔订单有没有成功的付款，查到就立刻标记已付并发权益，不用干等
 * webhook。webhook 仍是权威发放路径；这里复用同一份
 * confirmWaffoOrderPaid（src/server/waffo.ts），绝不另写发放逻辑。
 *
 * - 只认订单的属主：订单不存在 404，不是本人的订单 403。
 * - 订单已是 PAID 时直接返回，不再调 Waffo。
 * - Waffo 侧查不到成功的付款时返回 PENDING（仍在处理，不是失败）。
 * - Waffo 接口出错时返回 502（回跳页应继续轮询权益，不当成失败）。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { getSessionUserRecord } from '../../../server/auth.ts'
import {
  confirmWaffoOrderPaid,
  createWaffoClient,
  findSucceededWaffoPayment,
  resolveWaffoConfig,
  waffoConfigInvalidResponse,
  waffoNotConfiguredResponse,
} from '../../../server/waffo.ts'
import { getStore, isStore, jsonError } from '../../../server/pay-shared.ts'

export const Route = createFileRoute('/api/waffo/order-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const outTradeNo = url.searchParams.get('order') || ''

        const store = getStore(env)
        if (!isStore(store)) return store

        const sessionUser = await getSessionUserRecord(env.ORDERS_KV, request)
        if (!sessionUser) {
          return jsonError(401, 'UNAUTHORIZED', 'Please sign in to check the order.')
        }

        const order = outTradeNo ? await store.findOrder(outTradeNo) : null
        if (!order) {
          return jsonError(404, 'ORDER_NOT_FOUND', `No such order: ${outTradeNo}`)
        }
        if (order.userId !== sessionUser.userId) {
          return jsonError(403, 'FORBIDDEN', 'This order belongs to another account.')
        }
        if (order.provider !== 'waffo') {
          return jsonError(400, 'NOT_WAFFO_ORDER', 'This order was not paid through Waffo.')
        }
        if (order.status === 'PAID') {
          return Response.json({
            status: 'PAID',
            outTradeNo: order.outTradeNo,
            productId: order.productId,
          })
        }

        const cfg = resolveWaffoConfig(env)
        if (!cfg.configured) return waffoNotConfiguredResponse(cfg.missing)

        let client
        try {
          client = createWaffoClient(cfg)
        } catch {
          return waffoConfigInvalidResponse()
        }

        try {
          const succeeded = await findSucceededWaffoPayment(client, order.outTradeNo)
          if (!succeeded) {
            return Response.json({
              status: 'PENDING',
              outTradeNo: order.outTradeNo,
              productId: order.productId,
            })
          }
          const { newlyPaid } = await confirmWaffoOrderPaid(store, env.ORDERS_KV, order.outTradeNo, succeeded.orderId)
          return Response.json({
            status: 'PAID',
            outTradeNo: order.outTradeNo,
            productId: order.productId,
            granted: newlyPaid,
          })
        } catch (err) {
          const message =
            err instanceof WaffoPancakeError
              ? err.message
              : 'Could not reach the Waffo order service. Please keep waiting for the confirmation.'
          // eslint-disable-next-line no-console
          console.warn('[waffo order-status] lookup failed', { outTradeNo, message })
          return jsonError(502, 'WAFFO_API_ERROR', message)
        }
      },
    },
  },
})
