/**
 * POST /api/waffo/create — 海外版下单（Waffo Pancake 托管收银台）。
 *
 * 与支付宝 POST /api/pay/create 对称：
 * - 金额、商品、订单号一律由服务端决定；下单只传 productId。
 * - 下单必须登录：订单要归属到用户，支付成功后才能把权益发给这个用户。
 * - 金额用服务端 USD 定价（focus $1.99 / sleep $2.99 / rain-night $3.99），
 *   不用 priceSnapshot 覆盖商品价（商品价就是定价）。
 * - 成功返回 { checkoutUrl }：前端在新标签页打开（点击处理里同步
 *   window.open 空白页再跳转，避免 Safari/移动端拦截弹窗）。
 * - 未配置时返回 503 WAFFO_NOT_CONFIGURED，不伪装成功。
 *
 * 参考：https://docs.waffo.ai/zh/integrate/skill
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { getProduct, productAmount } from '../../../server/products'
import { getSessionUserRecord } from '../../../server/auth'
import { createWaffoClient, getWaffoProductId, resolveWaffoConfig, waffoConfigInvalidResponse, waffoNotConfiguredResponse } from '../../../server/waffo'
import { getStore, isStore, jsonError, newOutTradeNo } from '../../../server/pay-shared'

export const Route = createFileRoute('/api/waffo/create')({
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
          return jsonError(400, 'INVALID_PRODUCT', `Unknown product: ${String(body.productId)}`)
        }

        const store = getStore(env)
        if (!isStore(store)) return store

        // 下单必须登录（与支付宝下单一致）。
        const sessionUser = await getSessionUserRecord(env.ORDERS_KV, request)
        if (!sessionUser) {
          return jsonError(401, 'UNAUTHORIZED', 'Please sign in before buying.')
        }

        const cfg = resolveWaffoConfig(env)
        if (!cfg.configured) return waffoNotConfiguredResponse(cfg.missing)

        const waffoProductId = getWaffoProductId(cfg, product.productId)
        if (!waffoProductId) {
          return jsonError(503, 'WAFFO_NOT_CONFIGURED', `No Waffo product configured for ${product.productId}.`)
        }

        const totalAmountUsd = productAmount(product, 'USD')
        const outTradeNo = newOutTradeNo()
        await store.createOrder({
          outTradeNo,
          productId: product.productId,
          subject: product.subject,
          totalAmount: totalAmountUsd,
          userId: sessionUser.userId,
          provider: 'waffo',
        })

        let client
        try {
          client = createWaffoClient(cfg)
        } catch {
          return waffoConfigInvalidResponse()
        }

        const origin = new URL(request.url).origin
        try {
          const session = await client.checkout.authenticated.create(
            {
              productId: waffoProductId,
              currency: 'USD',
              buyerIdentity: sessionUser.userId,
              buyerEmail: sessionUser.email,
              orderMerchantExternalId: outTradeNo,
              successUrl: `${origin}/waffo-return?order=${outTradeNo}&pack=${product.productId}`,
              metadata: { outTradeNo, productId: product.productId, userId: sessionUser.userId },
              language: 'en',
            },
            { idempotencyKey: outTradeNo },
          )
          // 记下 Waffo 会话 ID，便于对账；订单本身已先建好。
          const order = await store.findOrder(outTradeNo)
          if (order) await store.saveOrder({ ...order, waffoSessionId: session.sessionId })
          return Response.json({
            outTradeNo,
            productId: product.productId,
            totalAmount: totalAmountUsd,
            currency: 'USD',
            checkoutUrl: session.checkoutUrl,
            sessionId: session.sessionId,
            expiresAt: session.expiresAt,
          })
        } catch (err) {
          // SDK 抛 WaffoPancakeError（errors[0] 是根因）；网络异常则为普通 Error。
          // 只把根因消息返回给前端，不带堆栈和密钥。
          const message =
            err instanceof WaffoPancakeError
              ? err.message
              : 'Could not reach the Waffo checkout service. Please try again.'
          // eslint-disable-next-line no-console
          console.warn('[waffo create] checkout session failed', {
            outTradeNo,
            status: err instanceof WaffoPancakeError ? err.status : undefined,
            message,
          })
          return jsonError(502, 'WAFFO_API_ERROR', message)
        }
      },
    },
  },
})
