/**
 * POST /api/pay/refund — 退款。
 * 与 Express 版 POST /api/pay/refund 完全一致：
 * 退款金额用十进制定点语义校验，累计退款不超过原订单实付金额；
 * 每次新退款用新 out_request_no，同一退款失败重试复用原编号和原参数。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { resolvePayConfig } from '../../../server/config'
import { alipayApiCall } from '../../../server/alipay-fetch'
import { amountToCents, centsToAmountText } from '../../../server/amounts'
import { getStore, isStore, jsonError, newOutRequestNo, paymentNotConfiguredResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/pay/refund')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { outTradeNo?: unknown; refundAmount?: unknown; refundReason?: unknown } = {}
        try {
          body = (await request.json()) as typeof body
        } catch {
          body = {}
        }
        const { outTradeNo, refundAmount, refundReason } = body
        if (!outTradeNo || !refundAmount) {
          return jsonError(400, 'INVALID_PARAMS', 'outTradeNo 与 refundAmount 必填。')
        }

        const store = getStore(env)
        if (!isStore(store)) return store
        const order = await store.findOrder(String(outTradeNo))
        if (!order) {
          return jsonError(404, 'ORDER_NOT_FOUND', `订单不存在：${outTradeNo}`)
        }
        if (order.status !== 'PAID' && order.status !== 'REFUNDING') {
          return jsonError(400, 'ORDER_NOT_PAID', '只有已支付订单可以退款。')
        }
        const refundCents = amountToCents(refundAmount)
        if (refundCents === null || refundCents <= 0n) {
          return jsonError(400, 'INVALID_AMOUNT', '退款金额格式非法。')
        }
        const paidCents = amountToCents(order.totalAmount)
        const refundedCents = BigInt(order.refundedCents || '0')
        if (paidCents !== null && refundCents + refundedCents > paidCents) {
          return jsonError(400, 'REFUND_EXCEEDS_PAID', '累计退款金额不得超过原订单实付金额。')
        }

        const cfg = resolvePayConfig(env)
        if (!cfg.configured) return paymentNotConfiguredResponse()

        // 每次新退款使用新的 out_request_no。
        const outRequestNo = newOutRequestNo('RF')
        let result: Record<string, unknown>
        try {
          result = await alipayApiCall(cfg, 'alipay.trade.refund', {
            out_trade_no: String(outTradeNo),
            refund_amount: centsToAmountText(refundCents),
            refund_reason: (typeof refundReason === 'string' && refundReason) || '用户申请退款',
            out_request_no: outRequestNo,
          })
        } catch (err) {
          return jsonError(
            502,
            'REFUND_CALL_FAILED',
            `退款调用异常：${err instanceof Error ? err.message : String(err)}`,
            { outRequestNo },
          )
        }

        if (!result || result.code !== '10000') {
          return jsonError(
            502,
            'REFUND_FAILED',
            `退款未受理：${result ? `${result.code} ${result.msg || ''} ${result.sub_msg || ''}`.trim() : '无响应'}`,
            { outRequestNo },
          )
        }

        const updated = await store.addRefundedCents(String(outTradeNo), refundCents)
        if (updated) {
          const refunds = Array.isArray(updated.refunds) ? updated.refunds : []
          refunds.push({ outRequestNo, amount: centsToAmountText(refundCents), createdAt: new Date().toISOString() })
          await store.saveOrder({ ...updated, refunds })
        }

        if (result.fund_change === 'Y') {
          return Response.json({ outTradeNo, outRequestNo, status: 'REFUNDED', refundFee: result.refund_fee })
        }
        // fund_change=N 或缺失：必须用同一 out_request_no 通过退款查询确认。
        return Response.json({
          outTradeNo,
          outRequestNo,
          status: 'PENDING_CONFIRM',
          message: '退款已受理但资金变化待确认，请至少 10 秒后用同一 out_request_no 调用退款查询确认。',
        })
      },
    },
  },
})
