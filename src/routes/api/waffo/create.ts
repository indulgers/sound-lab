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
 * - 防重复付款：同一用户对同一个包已有未过期的进行中订单时，
 *   不建新订单、不建新会话，返回 { resumed: true, checkoutUrl } 续付
 *   原来的收银台；会话过期后才允许重新下单。会话创建失败的订单
 *   会直接关掉，不会留下“进行中”的孤儿单挡住重新下单。
 * - 未配置时返回 503 WAFFO_NOT_CONFIGURED，不伪装成功。
 *
 * 参考：https://docs.waffo.ai/zh/integrate/skill
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { getProduct, productAmount } from '../../../server/products.ts'
import { getSessionUserRecord } from '../../../server/auth.ts'
import { createWaffoClient, getWaffoProductId, resolveWaffoConfig, waffoConfigInvalidResponse, waffoNotConfiguredResponse } from '../../../server/waffo.ts'
import { getStore, isStore, jsonError, newOutTradeNo } from '../../../server/pay-shared.ts'

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

        // 防重复付款：同一用户对同一个包已有未过期的进行中订单时，
        // 不建新订单、不建新会话，直接返回原来的收银台地址续付。
        const pending = await store.findPendingWaffoOrder(sessionUser.userId, product.productId)
        if (pending && pending.waffoCheckoutUrl) {
          return Response.json({
            resumed: true,
            outTradeNo: pending.outTradeNo,
            productId: product.productId,
            totalAmount: pending.totalAmount,
            currency: 'USD',
            checkoutUrl: pending.waffoCheckoutUrl,
            sessionId: pending.waffoSessionId,
            expiresAt: pending.waffoSessionExpiresAt,
          })
        }

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
          // 记下 Waffo 会话 ID、收银台地址和过期时间：订单本身已先建好。
          // checkoutUrl + expiresAt 是“进行中订单”续付的依据。
          const order = await store.findOrder(outTradeNo)
          if (order) {
            await store.saveOrder({
              ...order,
              waffoSessionId: session.sessionId,
              waffoCheckoutUrl: session.checkoutUrl,
              waffoSessionExpiresAt: session.expiresAt,
            })
          }
          return Response.json({
            resumed: false,
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
          // 会话没建出来：用户拿不到收银台地址，这笔订单永远付不了，
          // 直接关掉，避免它被当成“进行中订单”挡住用户重新下单。
          const orphan = await store.findOrder(outTradeNo)
          if (orphan && orphan.status === 'CREATED') {
            await store.saveOrder({ ...orphan, status: 'CLOSED' })
          }
          return jsonError(502, 'WAFFO_API_ERROR', message)
        }
      },
    },
  },
})
