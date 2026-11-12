/**
 * POST /api/pay/create — 下单（pageExec 返回 HTML 支付表单）。
 * 与 Express 版 POST /api/pay/create 完全一致：
 * 金额、商品、订单号一律由服务端决定；下单必须用
 * pageExec('alipay.trade.page.pay', 'POST', ...)，禁止 exec()。
 * 支付表单是 HTML 字符串，前端必须渲染并提交 form，禁止 URL 直接跳转。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getProduct } from '../../../server/products'
import { getNotifyUrl, resolvePayConfig } from '../../../server/config'
import { createSdk } from '../../../server/alipay'
import { getStore, isStore, jsonError, newOutTradeNo, paymentNotConfiguredResponse } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/pay/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { productId?: unknown } = {}
        try {
          body = (await request.json()) as { productId?: unknown }
        } catch {
          body = {}
        }

        const product = getProduct(typeof body.productId === 'string' ? body.productId : '')
        if (!product) {
          return jsonError(400, 'INVALID_PRODUCT', `未知商品：${String(body.productId)}`)
        }

        const cfg = resolvePayConfig(env)
        if (!cfg.configured) return paymentNotConfiguredResponse()

        const store = getStore(env)
        if (!isStore(store)) return store

        const outTradeNo = newOutTradeNo()
        await store.createOrder({
          outTradeNo,
          productId: product.productId,
          subject: product.subject,
          totalAmount: product.totalAmount,
        })

        const origin = new URL(request.url).origin
        const requestOptions: {
          returnUrl: string
          notifyUrl?: string
          bizContent: {
            out_trade_no: string
            total_amount: string
            subject: string
            product_code: string
          }
        } = {
          returnUrl: `${origin}/return?out_trade_no=${outTradeNo}`,
          bizContent: {
            out_trade_no: outTradeNo,
            total_amount: product.totalAmount,
            subject: product.subject,
            product_code: 'FAST_INSTANT_TRADE_PAY',
          },
        }
        const notifyUrl = getNotifyUrl(env)
        if (notifyUrl) requestOptions.notifyUrl = notifyUrl

        const sdk = createSdk(cfg)
        // pageExec 返回 HTML 表单字符串；前端必须渲染并自动提交，禁止 URL 跳转。
        const paymentHtml = sdk.pageExec('alipay.trade.page.pay', 'POST', requestOptions)
        return Response.json({ outTradeNo, productId: product.productId, totalAmount: product.totalAmount, paymentHtml })
      },
    },
  },
})
