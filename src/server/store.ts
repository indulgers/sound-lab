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
//   userId（下单用户的 userId；登录后下单才有，缺失表示未归属订单）

export type OrderStatus = 'CREATED' | 'PAID' | 'CLOSED' | 'REFUNDING' | 'REFUNDED'

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
  }): Promise<OrderRecord>
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
}

const ORDER_PREFIX = 'order:'
const NOTIFY_PREFIX = 'notify:'

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
    })
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

  return {
    listOrders,
    findOrder,
    saveOrder,
    createOrder,
    markPaidIdempotently,
    recordNonPaidTradeEvent,
    addRefundedCents,
    insertNotifyEventOnce,
  }
}
