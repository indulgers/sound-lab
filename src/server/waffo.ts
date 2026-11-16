/**
 * Waffo Pancake 配置与客户端（海外版支付，Workers 版）。
 *
 * 环境变量（只用这几个名字，不要另发明）：
 *   WAFFO_MERCHANT_ID            商户 ID（MER_...，公开标识外的配置值）
 *   WAFFO_PRIVATE_KEY            RSA 私钥：SDK 自动归一化原始 base64、
 *                                PEM 头尾、字面 \n、Windows 换行；
 *                                构造器在密钥无效时立即抛错。
 *   WAFFO_SUBSCRIPTION_MONTHLY   月付订阅的 Product ID（PROD_...）
 *   WAFFO_SUBSCRIPTION_YEARLY    年付订阅的 Product ID
 *   WAFFO_ENV                    'test'（默认）或 'prod'
 *
 * 2026-11-16：三个一次性包（focus-pack / sleep-pack / rain-night-pack）
 * 已下架，商品 id 环境变量随之换成两个订阅商品；旧变量名不再使用。
 * （旧包的 Product ID 仍保留在 Waffo 后台，只是不再出售。）
 *
 * 本地开发由 .dev.vars 提供；生产由 wrangler secret put 设置。
 * 私钥只在服务端使用，绝不返回给前端、不写日志、不进代码。
 *
 * 参考：https://docs.waffo.ai/zh/integrate/skill
 * SDK：@waffo/pancake-ts（零依赖，fetch + node:crypto；workerd 下
 * nodejs_compat 默认开启，实测可用，见 tests/waffo.test.mjs）。
 */
import { WaffoPancake } from '@waffo/pancake-ts'
import type { WebhookEventData } from '@waffo/pancake-ts'
import { grantOrderEntitlement, grantSubscription, updateSubscriptionStatus, revokeSubscription } from './auth.ts'
import type { SubscriptionRecord } from './auth.ts'
import { getProduct, isSubscriptionProduct } from './products.ts'
import { jsonError } from './pay-shared.ts'
import type { OrderStore } from './store.ts'

export type WaffoEnv = 'test' | 'prod'

export interface WaffoConfig {
  configured: true
  merchantId: string
  privateKey: string
  env: WaffoEnv
  productIds: Record<string, string>
}

export interface WaffoConfigMissing {
  configured: false
  error: 'WAFFO_NOT_CONFIGURED'
  message: string
  missing: string[]
}

export type ResolvedWaffoConfig = WaffoConfig | WaffoConfigMissing

export interface WaffoEnvLike {
  WAFFO_MERCHANT_ID?: string
  WAFFO_PRIVATE_KEY?: string
  WAFFO_SUBSCRIPTION_MONTHLY?: string
  WAFFO_SUBSCRIPTION_YEARLY?: string
  WAFFO_ENV?: string
  /** 商店短 ID（STO_...，Waffo 后台可见）：只用于客户中心链接（取消/换计划）。 */
  WAFFO_STORE_ID?: string
}

/** 取 Waffo 商店短 ID（客户中心链接用）；未配置返回 null。 */
export function getWaffoStoreId(env: WaffoEnvLike): string | null {
  const id = (env.WAFFO_STORE_ID || '').trim()
  return id || null
}

/** WAFFO_ENV 只认 'prod'，其余一律按 'test' 处理。 */
export function normalizeWaffoEnv(value: unknown): WaffoEnv {
  return String(value || '').trim().toLowerCase() === 'prod' ? 'prod' : 'test'
}

export function resolveWaffoConfig(env: WaffoEnvLike): ResolvedWaffoConfig {
  const merchantId = (env.WAFFO_MERCHANT_ID || '').trim()
  const privateKey = (env.WAFFO_PRIVATE_KEY || '').trim()
  const monthly = (env.WAFFO_SUBSCRIPTION_MONTHLY || '').trim()
  const yearly = (env.WAFFO_SUBSCRIPTION_YEARLY || '').trim()

  const missing: string[] = []
  if (!merchantId) missing.push('WAFFO_MERCHANT_ID')
  if (!privateKey) missing.push('WAFFO_PRIVATE_KEY')
  if (!monthly) missing.push('WAFFO_SUBSCRIPTION_MONTHLY')
  if (!yearly) missing.push('WAFFO_SUBSCRIPTION_YEARLY')
  if (missing.length > 0) {
    return {
      configured: false,
      error: 'WAFFO_NOT_CONFIGURED',
      message: `Waffo payment is not configured: missing ${missing.join(', ')}. Set them with wrangler secret put (see README).`,
      missing,
    }
  }

  return {
    configured: true,
    merchantId,
    privateKey,
    env: normalizeWaffoEnv(env.WAFFO_ENV),
    productIds: {
      'subscription-monthly': monthly,
      'subscription-yearly': yearly,
    },
  }
}

/** 取某个订阅商品对应的 Waffo Product ID；未配置返回 null。 */
export function getWaffoProductId(cfg: WaffoConfig, productId: string): string | null {
  return cfg.productIds[productId] || null
}

/**
 * 构造 SDK 客户端。SDK 构造器会立即校验私钥格式，
 * 无效密钥抛错（调用方应转为 503 WAFFO_CONFIG_INVALID）。
 */
export function createWaffoClient(cfg: WaffoConfig): WaffoPancake {
  return new WaffoPancake({
    merchantId: cfg.merchantId,
    privateKey: cfg.privateKey,
    environment: cfg.env,
  })
}

export function waffoNotConfiguredResponse(missing: string[]): Response {
  return jsonError(
    503,
    'WAFFO_NOT_CONFIGURED',
    `Waffo payment is not configured: missing ${missing.join(', ')}. Set them with wrangler secret put (see README).`,
    { missing },
  )
}

/** 私钥格式错（SDK 构造器抛错）时的 503。 */
export function waffoConfigInvalidResponse(): Response {
  return jsonError(
    503,
    'WAFFO_CONFIG_INVALID',
    'Waffo payment is misconfigured: the private key could not be parsed. Check WAFFO_PRIVATE_KEY.',
  )
}

/**
 * 共享的“确认已付 + 发权益”步骤：webhook（order.completed）和
 * 订单状态快查（order-status）都走这里，绝不各自另写一份发放逻辑。
 *
 * - markPaidIdempotently 只有首次 CREATED → PAID 返回 true，
 *   所以重复调用只会发放一次权益（grantPack / grantSubscription
 *   本身也是集合/幂等语义）。
 * - 订阅商品：发时效性订阅授权，到期 = 付款时刻 + 计划天数
 *   （月卡 30 天 / 年卡 365 天）；随后 Waffo 的 subscription.activated
 *   事件会用平台给的 currentPeriodEnd 把到期时间校准。
 * - 旧包商品：保留 legacy 的 grantPack（只对 2026-11-16 前的老订单）。
 * - 返回 newlyPaid：true 表示本次刚标记为已付并（有用户时）发放了权益。
 */
export async function confirmWaffoOrderPaid(
  store: OrderStore,
  kv: KVNamespace,
  outTradeNo: string,
  waffoOrderId: string,
): Promise<{ newlyPaid: boolean }> {
  const newlyPaid = await store.markPaidIdempotently(outTradeNo, waffoOrderId)
  const order = await store.findOrder(outTradeNo)
  if (newlyPaid && order?.userId) {
    // 按商品类型发权益：订阅商品发时效性订阅授权（到期 = 付款时刻 +
    // 计划天数；随后 subscription.activated 事件用平台给的
    // currentPeriodEnd 校准），旧包商品发 legacy 包授权。
    await grantOrderEntitlement(kv, order.userId, order.productId, {
      provider: 'waffo',
      subscriptionId: waffoOrderId || null,
    })
  }
  // 记下 Waffo 订单号，便于对账（重复投递时也补记）。
  if (order && waffoOrderId && order.waffoOrderId !== waffoOrderId) {
    await store.saveOrder({ ...order, waffoOrderId })
  }
  return { newlyPaid }
}

/** 订阅 webhook 事件类型（SDK WebhookEventType 的字符串形式）。 */
export const SUBSCRIPTION_EVENT_TYPES = [
  'subscription.activated',
  'subscription.renewed',
  'subscription.recovered',
  'subscription.plan_changed',
  'subscription.past_due',
  'subscription.canceling',
  'subscription.uncanceled',
  'subscription.canceled',
] as const

/**
 * 订阅事件处理（webhook.ts 调用；纯逻辑，可单元测试）。
 *
 * 用户定位（按优先级）：data.merchantProvidedBuyerIdentity
 * （结账时传的 userId）→ 我们自己的订单（orderMerchantExternalId
 * 找到的 order.userId）→ data.orderMetadata.userId。
 * 计划定位：我们自己的订单的 productId → planPrice.total 对照
 * （7.99 月付 / 79.90 年付）→ billingPeriod（monthly / yearly）。
 * 周期结束：data.currentPeriodEnd（ISO 日期）优先；没有时按计划
 * 天数从现在起算（activated / renewed 事件应有该字段）。
 *
 * 事件语义（SDK WebhookEventType 注释）：
 * - activated / renewed / recovered：授予/延长订阅（active）。
 * - plan_changed：按新计划授予（planPrice 定新计划）。
 * - past_due：续费失败，状态记 past_due（保留访问，等重试）。
 * - canceling：用户申请取消，记 canceling（保留访问到周期结束）。
 * - uncanceled：用户撤回取消，恢复 active。
 * - canceled：订阅已终止——周期已过则撤销；周期未过（极少数
 *   提前终止的事件）记 canceling，访问保留到周期结束。
 * - payment_succeeded 是纯扣费事件（无周期/状态），不在这里处理。
 */
export async function applyWaffoSubscriptionEvent(
  store: OrderStore,
  kv: KVNamespace,
  eventType: string,
  data: Partial<WebhookEventData>,
): Promise<{ handled: boolean; userId?: string; subscription?: SubscriptionRecord | null }> {
  if (!SUBSCRIPTION_EVENT_TYPES.includes(eventType as (typeof SUBSCRIPTION_EVENT_TYPES)[number])) {
    return { handled: false }
  }

  const outTradeNo =
    (typeof data.orderMerchantExternalId === 'string' && data.orderMerchantExternalId) ||
    (data.orderMetadata && typeof data.orderMetadata.outTradeNo === 'string' && data.orderMetadata.outTradeNo) ||
    ''
  const order = outTradeNo ? await store.findOrder(outTradeNo) : null
  const userId =
    (typeof data.merchantProvidedBuyerIdentity === 'string' && data.merchantProvidedBuyerIdentity) ||
    order?.userId ||
    (data.orderMetadata && typeof data.orderMetadata.userId === 'string' && data.orderMetadata.userId) ||
    ''
  if (!userId) return { handled: false }

  const plan = resolveSubscriptionPlan(data, order?.productId)
  if (!plan) return { handled: false }
  const product = getProduct(plan)
  const days = product?.durationDays ?? 30
  const periodEnd = parsePeriodEnd(data.currentPeriodEnd) ?? Date.now() + days * 24 * 60 * 60 * 1000
  const subscriptionId =
    (typeof data.orderId === 'string' && data.orderId) || null

  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.renewed':
    case 'subscription.recovered':
    case 'subscription.plan_changed': {
      const subscription = await grantSubscription(kv, userId, {
        provider: 'waffo',
        plan,
        status: 'active',
        currentPeriodEnd: periodEnd,
        subscriptionId,
      })
      return { handled: true, userId, subscription }
    }
    case 'subscription.past_due': {
      const subscription = await updateSubscriptionStatus(kv, userId, 'past_due', periodEnd)
      return { handled: true, userId, subscription }
    }
    case 'subscription.canceling': {
      const subscription = await updateSubscriptionStatus(kv, userId, 'canceling', periodEnd)
      return { handled: true, userId, subscription }
    }
    case 'subscription.uncanceled': {
      const subscription = await updateSubscriptionStatus(kv, userId, 'active', periodEnd)
      return { handled: true, userId, subscription }
    }
    case 'subscription.canceled': {
      if (periodEnd > Date.now()) {
        // 周期未过：当作 canceling 处理，访问保留到周期结束。
        const subscription = await updateSubscriptionStatus(kv, userId, 'canceling', periodEnd)
        return { handled: true, userId, subscription }
      }
      await revokeSubscription(kv, userId)
      return { handled: true, userId, subscription: null }
    }
    default:
      return { handled: false }
  }
}

/** 从事件数据定计划：订单 productId 优先，planPrice / billingPeriod 兜底。 */
function resolveSubscriptionPlan(
  data: Partial<WebhookEventData>,
  orderProductId?: string,
): 'subscription-monthly' | 'subscription-yearly' | null {
  if (orderProductId && isSubscriptionProduct(orderProductId)) {
    // plan_changed：新计划以 planPrice 为准（订单记的是旧计划）。
    const fromPrice = planFromPrice(data.planPrice?.total)
    if (fromPrice) return fromPrice
    return orderProductId as 'subscription-monthly' | 'subscription-yearly'
  }
  const fromPrice = planFromPrice(data.planPrice?.total)
  if (fromPrice) return fromPrice
  if (data.billingPeriod === 'monthly') return 'subscription-monthly'
  if (data.billingPeriod === 'yearly') return 'subscription-yearly'
  return null
}

function planFromPrice(total?: string): 'subscription-monthly' | 'subscription-yearly' | null {
  const amount = (total || '').trim()
  if (amount === '7.99') return 'subscription-monthly'
  if (amount === '79.90') return 'subscription-yearly'
  return null
}

/** 解析 ISO 日期（currentPeriodEnd）为 ms 时间戳；解析失败返回 null。 */
function parsePeriodEnd(value?: string): number | null {
  if (typeof value !== 'string' || !value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

/** GraphQL 客户端的最小形状（只用 query；便于测试时传假客户端）。 */
export interface WaffoGraphqlClient {
  graphql: {
    query: (params: {
      query: string
      variables?: Record<string, unknown>
    }) => Promise<{ data?: unknown; errors?: Array<{ message?: string }> | null }>
  }
}

/**
 * 快查：按我们自己的订单号（checkout 时传的 orderMerchantExternalId）
 * 向 Waffo 查这笔订单有没有成功的付款。
 *
 * 用 GraphQL payments 查询（SDK README 与官方 Orders & Payments 文档
 * 都有这个例子；字段只取文档确认过的 id / orderId / status /
 * orderMerchantExternalId）。付款状态以 SDK 的 PaymentStatus 为准，
 * 只有 'succeeded' 算已付。查到就返回 Waffo 订单号，否则返回 null
 * （还没付，或查不到——调用方按“仍在处理”处理，不算失败）。
 * GraphQL 返回 errors 或请求抛错时直接抛错（调用方转 502）。
 */
export async function findSucceededWaffoPayment(
  client: WaffoGraphqlClient,
  outTradeNo: string,
): Promise<{ orderId: string } | null> {
  const result = await client.graphql.query({
    query: `query ($ref: String!) {
      payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
        id
        orderId
        status
        orderMerchantExternalId
      }
    }`,
    variables: { ref: outTradeNo },
  })
  if (result.errors && result.errors.length > 0) {
    throw new Error(`Waffo order lookup failed: ${result.errors[0]?.message || 'GraphQL error'}`)
  }
  const data = (result.data || {}) as {
    payments?: Array<{ orderId?: unknown; status?: unknown }>
  }
  const payments = Array.isArray(data.payments) ? data.payments : []
  const succeeded = payments.find((p) => p.status === 'succeeded' && typeof p.orderId === 'string' && p.orderId)
  return succeeded ? { orderId: succeeded.orderId as string } : null
}
