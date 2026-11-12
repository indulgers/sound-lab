/**
 * GET /api/pay/query/:outTradeNo — 主动交易查询（支付结果兜底）。
 * 与 Express 版 GET /api/pay/query/:outTradeNo 完全一致。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { resolvePayConfig } from '../../../server/config'
import { alipayApiCall } from '../../../server/alipay-fetch'
import { getStore, isStore, jsonError, paymentNotConfiguredResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/pay/query/$outTradeNo')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { outTradeNo } = params
        const store = getStore(env)
        if (!isStore(store)) return store
        const order = await store.findOrder(outTradeNo)
        if (!order) {
          return jsonError(404, 'ORDER_NOT_FOUND', `订单不存在：${outTradeNo}`)
        }

        const cfg = resolvePayConfig(env)
        if (!cfg.configured) return paymentNotConfiguredResponse()

        let result: Record<string, unknown>
        try {
          result = await alipayApiCall(cfg, 'alipay.trade.query', { out_trade_no: outTradeNo })
        } catch (err) {
          return Response.json({
            outTradeNo,
            status: 'UNKNOWN',
            message: `查询调用异常：${err instanceof Error ? err.message : String(err)}`,
          })
        }

        if (!result || result.code !== '10000') {
          return Response.json({
            outTradeNo,
            status: 'UNKNOWN',
            message: `查询未返回成功：${result ? `${result.code} ${result.msg || ''} ${result.sub_msg || ''}`.trim() : '无响应'}`,
          })
        }

        const businessState = (
          {
            TRADE_SUCCESS: 'PAID',
            TRADE_FINISHED: 'PAID',
            WAIT_BUYER_PAY: 'PENDING_PAYMENT',
            TRADE_CLOSED: 'CLOSED',
          } as Record<string, string>
        )[String(result.trade_status)] || 'UNKNOWN'

        if (businessState === 'PAID') {
          await store.markPaidIdempotently(outTradeNo, String(result.trade_no))
        } else if (businessState === 'CLOSED') {
          await store.recordNonPaidTradeEvent(outTradeNo, 'TRADE_CLOSED')
        }

        // 待支付 / 未知状态不返回 500，也不判定支付成功。
        return Response.json({
          outTradeNo,
          status: businessState,
          tradeStatus: result.trade_status,
          tradeNo: result.trade_no || null,
          totalAmount: result.total_amount || order.totalAmount,
        })
      },
    },
  },
})
