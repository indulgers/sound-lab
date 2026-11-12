/**
 * POST /api/waffo/webhook — Waffo Pancake 异步通知。
 *
 * 关键规则（见 https://docs.waffo.ai/zh/integrate/skill 与 SDK webhook 指南）：
 * - 必须用 request.text() 读原始 body：签名是对原始字节算的，
 *   request.json() 再序列化会改变空白符，导致验签失败。
 * - 签名头 X-Waffo-Signature（t=<时间戳>,v1=<base64 签名>），
 *   用 SDK 内嵌的 test/prod 公钥做 RSA-SHA256 验签。
 * - 幂等：event.id（delivery ID）只处理一次；重复投递直接回 200。
 * - event.mode 必须与配置的 WAFFO_ENV 一致（test 事件不触发生产逻辑）。
 * - 只处理 order.completed：按 data.orderMerchantExternalId
 *   （下单时传的 outTradeNo）找到我们的订单，金额核对后标记已支付、
 *   给订单所属用户发放权益（grantPack 集合语义，重复发放无副作用）。
 * - 验签失败回 401；其他事件回 200（已确认收到，不重试）。
 *
 * 金额核对：chargedAmount（实收）优先，其次 listPrice.total（应收），
 * 再其次 amount（旧字段）；三个字段都不在时只记警告、不拦截——
 * 订单查找 + 签名 + 环境已是主要防线，商品价本身由 Waffo 商品配置决定。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { verifyWebhook } from '@waffo/pancake-ts'
import { grantPack } from '../../../server/auth'
import { normalizeWaffoEnv } from '../../../server/waffo'
import { getStore, isStore, textResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/waffo/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const waffoEnv = normalizeWaffoEnv(env.WAFFO_ENV)
        const rawBody = await request.text()
        const signature = request.headers.get('x-waffo-signature')

        let event
        try {
          event = verifyWebhook(rawBody, signature, { environment: waffoEnv })
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[waffo webhook] signature verification failed', err instanceof Error ? err.message : String(err))
          return new Response('Invalid signature', { status: 401 })
        }

        // 环境不匹配：不触发任何业务逻辑，直接确认收到（避免无意义重试）。
        if (event.mode && event.mode !== waffoEnv) {
          // eslint-disable-next-line no-console
          console.warn('[waffo webhook] mode mismatch', { eventMode: event.mode, configuredEnv: waffoEnv, eventId: event.id })
          return textResponse('OK')
        }

        const store = getStore(env)
        if (!isStore(store)) {
          // eslint-disable-next-line no-console
          console.warn('[waffo webhook] order store unavailable')
          return new Response('Store unavailable', { status: 500 })
        }

        // 幂等：同一 delivery id 只处理一次。
        const firstSeen = await store.insertWaffoEventOnce(event.id)
        if (!firstSeen) return textResponse('OK')

        if (event.eventType !== 'order.completed') {
          return textResponse('OK')
        }

        const data = event.data || {}
        const outTradeNo =
          (typeof data.orderMerchantExternalId === 'string' && data.orderMerchantExternalId) ||
          (data.orderMetadata && typeof data.orderMetadata.outTradeNo === 'string' && data.orderMetadata.outTradeNo) ||
          ''
        if (!outTradeNo) {
          // eslint-disable-next-line no-console
          console.warn('[waffo webhook] order.completed without our order id', { eventId: event.id, waffoOrderId: data.orderId })
          return textResponse('OK')
        }

        const order = await store.findOrder(outTradeNo)
        if (!order) {
          // eslint-disable-next-line no-console
          console.warn('[waffo webhook] order not found', { outTradeNo, eventId: event.id })
          return textResponse('OK')
        }

        if (!amountMatches(order.totalAmount, data)) {
          // eslint-disable-next-line no-console
          console.warn('[waffo webhook] amount mismatch', {
            outTradeNo,
            expected: order.totalAmount,
            chargedAmount: data.chargedAmount,
            listTotal: data.listPrice?.total,
            amount: data.amount,
          })
          return textResponse('OK')
        }

        const newlyPaid = await store.markPaidIdempotently(order.outTradeNo, data.orderId || '')
        if (newlyPaid && order.userId) {
          await grantPack(env.ORDERS_KV, order.userId, order.productId)
        }
        // 记下 Waffo 订单号，便于对账（已支付时也补记）。
        if (data.orderId && order.waffoOrderId !== data.orderId) {
          const latest = await store.findOrder(outTradeNo)
          if (latest) await store.saveOrder({ ...latest, waffoOrderId: data.orderId })
        }
        return textResponse('OK')
      },
    },
  },
})

function amountMatches(
  expected: string,
  data: {
    chargedAmount?: string
    listPrice?: { total?: string }
    amount?: string
  },
): boolean {
  const charged = typeof data.chargedAmount === 'string' ? data.chargedAmount.trim() : ''
  if (charged) return charged === expected
  const listTotal = typeof data.listPrice?.total === 'string' ? data.listPrice.total.trim() : ''
  if (listTotal) return listTotal === expected
  const amount = typeof data.amount === 'string' ? data.amount.trim() : ''
  if (amount) return amount === expected
  // 三个金额字段都不在：签名和订单查找已通过，记警告后放行（见文件头注释）。
  // eslint-disable-next-line no-console
  console.warn('[waffo webhook] no amount field on order.completed event; skipping amount check')
  return true
}
