/**
 * POST /api/pay/notify — 支付宝异步通知（表单解析 + 验签 + 幂等）。
 * 与 Express 版 POST /api/pay/notify 完全一致：
 * 支付成功只认验签通过的异步通知或交易查询；同步回跳参数不是成功依据。
 * 响应必须是纯文本 success / fail。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { resolvePayConfig } from '../../../server/config'
import { createSdk } from '../../../server/alipay'
import { amountEquals } from '../../../server/amounts'
import { grantPack } from '../../../server/auth'
import { getStore, isStore, textResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/pay/notify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData()
        const params: Record<string, string> = {}
        form.forEach((value, key) => {
          params[key] = String(value)
        })

        const fail = (message: string) => {
          // eslint-disable-next-line no-console
          console.warn(`[alipay notify] ${message}`, { ...params, sign: undefined })
          return textResponse('fail')
        }

        try {
          const cfg = resolvePayConfig(env)
          if (!cfg.configured) return fail('payment not configured')
          if (!params.app_id || params.app_id !== cfg.appId) return fail('notify app_id mismatch')

          const sdk = createSdk(cfg)
          if (typeof sdk.checkNotifySignV2 !== 'function') {
            return fail('current alipay-sdk does not expose checkNotifySignV2')
          }
          const verified = await Promise.resolve(sdk.checkNotifySignV2(params))
          if (!verified) return fail('notify signature check failed')

          const store = getStore(env)
          if (!isStore(store)) return fail('order store unavailable')
          const order = await store.findOrder(params.out_trade_no)
          if (!order) return fail('notify order not found')
          if (!amountEquals(order.totalAmount, params.total_amount)) {
            return fail('notify amount mismatch')
          }
          if (!sellerMatches(cfg, params.seller_id, params.seller_email)) {
            return fail('notify seller mismatch')
          }

          // 幂等：同一 notify_id 只处理一次；重复通知直接回 success。
          const inserted = await store.insertNotifyEventOnce({
            notifyId: params.notify_id,
            tradeNo: params.trade_no,
            outTradeNo: params.out_trade_no,
            tradeStatus: params.trade_status,
            rawParams: params,
          })
          if (!inserted) return textResponse('success')

          if (isPaidTradeNotification(params)) {
            await store.markPaidIdempotently(order.outTradeNo, params.trade_no)
            // 支付成功 → 给订单所属用户发放权益（集合语义，重复通知无副作用；
            // 归属为空的老订单不发放）。
            if (order.userId) {
              await grantPack(env.ORDERS_KV, order.userId, order.productId)
            }
          } else {
            await store.recordNonPaidTradeEvent(order.outTradeNo, params.trade_status)
          }
          return textResponse('success')
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[alipay notify] unexpected exception', err instanceof Error ? err.message : String(err))
          return textResponse('fail')
        }
      },
    },
  },
})

function sellerMatches(
  cfg: { sellerId: string; sellerEmail: string },
  sellerId: string | undefined,
  sellerEmail: string | undefined,
): boolean {
  // 配置未提供 sellerId/sellerEmail 时无法校验卖家，跳过该项；
  // 提供任一时必须匹配其中之一。
  if (!cfg.sellerId && !cfg.sellerEmail) return true
  return Boolean(
    (cfg.sellerId && sellerId === cfg.sellerId) || (cfg.sellerEmail && sellerEmail === cfg.sellerEmail),
  )
}

function isPaidTradeNotification(params: Record<string, string>): boolean {
  const paidStatus = params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED'
  return paidStatus && !params.out_biz_no && !params.gmt_refund && !params.refund_fee
}
