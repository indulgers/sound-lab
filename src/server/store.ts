/**
 * 订单与通知事件存储（Cloudflare KV 版）。
 *
 * 接口与 Express 文件版（sound-cocktail-pay-server/src/store.js）保持一致，
 * 只是全部改为异步（KV 是异步的），存储后端从 data/*.json 换成 KV。
 *
 * 键：
 *   order:<outTradeNo>   订单记录
 *   notify:<notifyId>    通知事件（幂等：同一 notify_id 只处理一次）
 *
 * 注意：
 * - KV 是最终一致的（跨区域同步最长约 60 秒），同一订单的连续读写
 *   在极少数情况下可能读到旧值；本产品量级下可接受，与原文件版的
 *   读-改-写竞态在同一量级。
 * - listOrders 用 kv.list({ prefix: 'order:' })，单次最多 1000 条。
 */

// ---- 订单 ----
// 订单字段：outTradeNo, productId, subject, totalAmount, status
//   (CREATED | PAID | CLOSED | REFUNDING | REFUNDED),
//   tradeNo, paidAt, refundedCents, createdAt, updatedAt,
//   userId（下单用户的 userId；登录后下单才有，缺失表示未归属订单）,
//   provider（'alipay' | 'waffo'；老订单缺失表示 alipay）,
//   waffoSessionId / waffoOrderId（Waffo 订单才有）,
//   waffoCheckoutUrl / waffoSessionExpiresAt（Waffo 订单才有：
//   托管收银台地址和会话过期时间，用于“进行中订单”续付；
//   会话创建失败的订单没有这两个字段，不算进行中）。
//
// 进行中（pending）判定：provider='waffo' 且 status='CREATED' 且
// 有 checkoutUrl 且会话未过期。过期时间优先用 waffoSessionExpiresAt；
// 老订单没有该字段时按 createdAt + 24h（Waffo 会话默认有效期）推算，
// 两者都没有时按已过期处理。

export type OrderStatus = 'CREATED' | 'PAID' | 'CLOSED' | 'REFUNDING' | 'REFUNDED'

export type OrderProvider = 'alipay' | 'waffo'

export interface OrderRecord {
  outTradeNo: string
  productId: string
  subject: string
  totalAmount: string
  status: OrderStatus
  tradeNo: string | null
  paidAt: string | null
  refundedCents: string
  refunds?: Array<{ outRequestNo: string; amount: string; createdAt: string }>
  createdAt?: string
  updatedAt?: string
  userId?: string | null
  provider?: OrderProvider
  waffoSessionId?: string | null
  waffoOrderId?: string | null
  waffoCheckoutUrl?: string | null
  /** Waffo 结账会话过期时间（ISO 字符串，来自 session.expiresAt）。 */
  waffoSessionExpiresAt?: string | null
}

export interface NotifyEventRecord {
  notifyId: string
  tradeNo?: string
  outTradeNo: string
  tradeStatus?: string
  rawParams?: Record<string, unknown>
  receivedAt: string
}

export interface OrderStore {
  listOrders(): Promise<OrderRecord[]>
  findOrder(outTradeNo: string): Promise<OrderRecord | null>
  saveOrder(order: OrderRecord): Promise<OrderRecord>
  createOrder(input: {
    outTradeNo: string
    productId: string
    subject: string
    totalAmount: string
    userId?: string | null
    provider?: OrderProvider
    waffoSessionId?: string | null
    waffoCheckoutUrl?: string | null
    waffoSessionExpiresAt?: string | null
  }): Promise<OrderRecord>
  /**
   * 找某个用户对某个包的进行中 Waffo 订单（CREATED、未过期、有收银台地址）。
   * 有则返回（下单时应续付它而不是新建）；没有返回 null。
   * nowMs 可注入（测试用），默认 Date.now()。
   */
  findPendingWaffoOrder(userId: string, productId: string, nowMs?: number): Promise<OrderRecord | null>
  /** 列出某个用户全部进行中的 Waffo 订单（最新在前）。 */
  listPendingWaffoOrders(userId: string, nowMs?: number): Promise<OrderRecord[]>
  /** 幂等标记已支付：只有首次从 CREATED 变为 PAID 返回 true。 */
  markPaidIdempotently(outTradeNo: string, tradeNo: string): Promise<boolean>
  recordNonPaidTradeEvent(outTradeNo: string, tradeStatus: string): Promise<void>
  addRefundedCents(outTradeNo: string, cents: bigint): Promise<OrderRecord | null>
  insertNotifyEventOnce(event: {
    notifyId: string
    tradeNo?: string
    outTradeNo: string
    tradeStatus?: string
    rawParams?: Record<string, unknown>
  }): Promise<boolean>
  /**
   * Waffo webhook 事件幂等：同一 delivery id（event.id）只处理一次。
   * 首次插入返回 true；已存在返回 false（调用方直接回 200，不重复发权益）。
   */
  insertWaffoEventOnce(eventId: string): Promise<boolean>
}

const ORDER_PREFIX = 'order:'
const NOTIFY_PREFIX = 'notify:'
const WAFFO_EVENT_PREFIX = 'waffoevt:'

export function createKvOrderStore(kv: KVNamespace): OrderStore {
  const orderKey = (outTradeNo: string) => `${ORDER_PREFIX}${outTradeNo}`
  const notifyKey = (notifyId: string) => `${NOTIFY_PREFIX}${notifyId}`

  async function listOrders(): Promise<OrderRecord[]> {
    const listed = await kv.list({ prefix: ORDER_PREFIX })
    const orders: OrderRecord[] = []
    for (const entry of listed.keys) {
      const record = await kv.get(entry.name, 'json')
      if (record) orders.push(record as OrderRecord)
    }
    return orders
  }

  async function findOrder(outTradeNo: string): Promise<OrderRecord | null> {
    const record = await kv.get(orderKey(outTradeNo), 'json')
    return (record as OrderRecord | null) || null
  }

  async function saveOrder(order: OrderRecord): Promise<OrderRecord> {
    const now = new Date().toISOString()
    const record: OrderRecord = { ...order, updatedAt: now }
    if (!record.createdAt) record.createdAt = now
    await kv.put(orderKey(record.outTradeNo), JSON.stringify(record))
    return record
  }

  async function createOrder(input: {
    outTradeNo: string
    productId: string
    subject: string
    totalAmount: string
    userId?: string | null
    provider?: OrderProvider
    waffoSessionId?: string | null
    waffoCheckoutUrl?: string | null
    waffoSessionExpiresAt?: string | null
  }): Promise<OrderRecord> {
    return saveOrder({
      outTradeNo: input.outTradeNo,
      productId: input.productId,
      subject: input.subject,
      totalAmount: input.totalAmount,
      status: 'CREATED',
      tradeNo: null,
      paidAt: null,
      refundedCents: '0',
      userId: input.userId ?? null,
      provider: input.provider ?? 'alipay',
      waffoSessionId: input.waffoSessionId ?? null,
      waffoOrderId: null,
      waffoCheckoutUrl: input.waffoCheckoutUrl ?? null,
      waffoSessionExpiresAt: input.waffoSessionExpiresAt ?? null,
    })
  }

  /**
   * Waffo 会话是否还有效：优先用 waffoSessionExpiresAt；
   * 老订单没有该字段时按 createdAt + 24h（Waffo 会话默认有效期）推算；
   * 两者都没有按已过期处理。没有 checkoutUrl 的订单（会话创建失败
   * 留下的孤儿单）永远不算进行中。
   */
  function waffoSessionNotExpired(order: OrderRecord, nowMs: number): boolean {
    if (!order.waffoCheckoutUrl) return false
    const explicit = order.waffoSessionExpiresAt ? Date.parse(order.waffoSessionExpiresAt) : NaN
    if (!Number.isNaN(explicit)) return explicit > nowMs
    const created = order.createdAt ? Date.parse(order.createdAt) : NaN
    if (Number.isNaN(created)) return false
    return created + 24 * 60 * 60 * 1000 > nowMs
  }

  function isPendingWaffoOrder(order: OrderRecord, userId: string, productId: string, nowMs: number): boolean {
    return (
      order.provider === 'waffo' &&
      order.status === 'CREATED' &&
      order.userId === userId &&
      order.productId === productId &&
      waffoSessionNotExpired(order, nowMs)
    )
  }

  async function findPendingWaffoOrder(
    userId: string,
    productId: string,
    nowMs: number = Date.now(),
  ): Promise<OrderRecord | null> {
    const orders = await listOrders()
    const pending = orders
      .filter((order) => isPendingWaffoOrder(order, userId, productId, nowMs))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    return pending[0] ?? null
  }

  async function listPendingWaffoOrders(userId: string, nowMs: number = Date.now()): Promise<OrderRecord[]> {
    const orders = await listOrders()
    return orders
      .filter(
        (order) =>
          order.provider === 'waffo' &&
          order.status === 'CREATED' &&
          order.userId === userId &&
          waffoSessionNotExpired(order, nowMs),
      )
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }

  async function markPaidIdempotently(outTradeNo: string, tradeNo: string): Promise<boolean> {
    const order = await findOrder(outTradeNo)
    if (!order) return false
    if (order.status === 'PAID') return false
    if (order.status !== 'CREATED') return false
    await saveOrder({ ...order, status: 'PAID', tradeNo, paidAt: new Date().toISOString() })
    return true
  }

  async function recordNonPaidTradeEvent(outTradeNo: string, tradeStatus: string): Promise<void> {
    const order = await findOrder(outTradeNo)
    if (!order) return
    if (tradeStatus === 'TRADE_CLOSED' && order.status === 'CREATED') {
      await saveOrder({ ...order, status: 'CLOSED' })
    }
  }

  async function addRefundedCents(outTradeNo: string, cents: bigint): Promise<OrderRecord | null> {
    const order = await findOrder(outTradeNo)
    if (!order) return null
    const total = BigInt(order.refundedCents || '0') + BigInt(cents)
    return saveOrder({ ...order, refundedCents: total.toString(), status: 'REFUNDING' })
  }

  async function insertNotifyEventOnce(event: {
    notifyId: string
    tradeNo?: string
    outTradeNo: string
    tradeStatus?: string
    rawParams?: Record<string, unknown>
  }): Promise<boolean> {
    const existing = await kv.get(notifyKey(event.notifyId))
    if (existing !== null) return false
    const record: NotifyEventRecord = {
      notifyId: event.notifyId,
      tradeNo: event.tradeNo,
      outTradeNo: event.outTradeNo,
      tradeStatus: event.tradeStatus,
      rawParams: event.rawParams,
      receivedAt: new Date().toISOString(),
    }
    await kv.put(notifyKey(event.notifyId), JSON.stringify(record))
    return true
  }

  async function insertWaffoEventOnce(eventId: string): Promise<boolean> {
    if (!eventId || typeof eventId !== 'string') return false
    const key = `${WAFFO_EVENT_PREFIX}${eventId}`
    const existing = await kv.get(key)
    if (existing !== null) return false
    await kv.put(key, JSON.stringify({ eventId, receivedAt: new Date().toISOString() }))
    return true
  }

  return {
    listOrders,
    findOrder,
    saveOrder,
    createOrder,
    findPendingWaffoOrder,
    listPendingWaffoOrders,
    markPaidIdempotently,
    recordNonPaidTradeEvent,
    addRefundedCents,
    insertNotifyEventOnce,
    insertWaffoEventOnce,
  }
}
