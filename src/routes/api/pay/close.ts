/**
 * POST /api/pay/close — 关闭未支付交易。
 * 与 Express 版 POST /api/pay/close 完全一致。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { resolvePayConfig } from '../../../server/config'
import { alipayApiCall } from '../../../server/alipay-fetch'
import { getStore, isStore, jsonError, paymentNotConfiguredResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/pay/close')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { outTradeNo?: unknown } = {}
        try {
          body = (await request.json()) as typeof body
        } catch {
          body = {}
        }
        const { outTradeNo } = body
        if (!outTradeNo) {
          return jsonError(400, 'INVALID_PARAMS', 'outTradeNo 必填。')
        }

        const store = getStore(env)
        if (!isStore(store)) return store
        const order = await store.findOrder(String(outTradeNo))
        if (!order) {
          return jsonError(404, 'ORDER_NOT_FOUND', `订单不存在：${outTradeNo}`)
        }
        if (order.status !== 'CREATED') {
          return jsonError(400, 'ORDER_NOT_CLOSABLE', `当前订单状态 ${order.status} 不可关闭（仅未支付订单可关闭）。`)
        }

        const cfg = resolvePayConfig(env)
        if (!cfg.configured) return paymentNotConfiguredResponse()

        let result: Record<string, unknown>
        try {
          result = await alipayApiCall(cfg, 'alipay.trade.close', { out_trade_no: String(outTradeNo) })
        } catch (err) {
          return jsonError(502, 'CLOSE_FAILED', `关闭调用异常：${err instanceof Error ? err.message : String(err)}`)
        }
        if (!result || result.code !== '10000') {
          return jsonError(
            502,
            'CLOSE_FAILED',
            `关闭未成功：${result ? `${result.code} ${result.msg || ''} ${result.sub_msg || ''}`.trim() : '无响应'}`,
          )
        }
        await store.recordNonPaidTradeEvent(String(outTradeNo), 'TRADE_CLOSED')
        return Response.json({ outTradeNo, status: 'CLOSED' })
      },
    },
  },
})
