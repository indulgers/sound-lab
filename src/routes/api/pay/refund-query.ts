/**
 * GET /api/pay/refund-query — 退款查询。
 * 与 Express 版 GET /api/pay/refund-query 完全一致
 *（含退款请求后至少间隔 10 秒才能查询的规则）。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { resolvePayConfig } from '../../../server/config'
import { alipayApiCall } from '../../../server/alipay-fetch'
import { getStore, isStore, jsonError, paymentNotConfiguredResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/pay/refund-query')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const outTradeNo = url.searchParams.get('outTradeNo')
        const outRequestNo = url.searchParams.get('outRequestNo')
        if (!outTradeNo || !outRequestNo) {
          return jsonError(400, 'INVALID_PARAMS', 'outTradeNo 与 outRequestNo 必填。')
        }

        const store = getStore(env)
        if (!isStore(store)) return store
        const order = await store.findOrder(outTradeNo)
        if (!order) {
          return jsonError(404, 'ORDER_NOT_FOUND', `订单不存在：${outTradeNo}`)
        }
        const record = (order.refunds || []).find((r) => r.outRequestNo === outRequestNo)
        if (record) {
          const elapsedMs = Date.now() - new Date(record.createdAt).getTime()
          if (elapsedMs < 10000) {
            return jsonError(400, 'REFUND_QUERY_TOO_EARLY', `退款查询发起时间离退款请求太短，请至少间隔 10 秒（还需等待约 ${Math.ceil((10000 - elapsedMs) / 1000)} 秒）。`)
          }
        }

        const cfg = resolvePayConfig(env)
        if (!cfg.configured) return paymentNotConfiguredResponse()

        let result: Record<string, unknown>
        try {
          result = await alipayApiCall(cfg, 'alipay.trade.fastpay.refund.query', {
            out_trade_no: outTradeNo,
            out_request_no: outRequestNo,
          })
        } catch (err) {
          return jsonError(502, 'REFUND_QUERY_FAILED', `退款查询调用异常：${err instanceof Error ? err.message : String(err)}`)
        }

        if (!result || result.code !== '10000') {
          return jsonError(
            502,
            'REFUND_QUERY_FAILED',
            `退款查询未返回成功：${result ? `${result.code} ${result.msg || ''} ${result.sub_msg || ''}`.trim() : '无响应'}`,
          )
        }

        return Response.json({
          outTradeNo,
          outRequestNo,
          refundStatus: result.refund_status || null,
          refundSuccess: result.refund_status === 'REFUND_SUCCESS',
          refundAmount: result.refund_amount || null,
        })
      },
    },
  },
})
