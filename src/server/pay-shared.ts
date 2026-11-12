/**
 * 支付路由共用小工具（与 Express 版 src/routes/pay.js 的同名逻辑一致）。
 */
import { createKvOrderStore, type OrderStore } from './store.ts'

export function newOutTradeNo(): string {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `SC${ts}${globalThis.crypto.getRandomValues(new Uint8Array(3)).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '').toUpperCase()}`
}

export function newOutRequestNo(prefix: string): string {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${prefix}${ts}${globalThis.crypto.getRandomValues(new Uint8Array(3)).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '').toUpperCase()}`
}

export function paymentNotConfiguredResponse(): Response {
  return Response.json(
    {
      code: 'PAYMENT_NOT_CONFIGURED',
      message: '支付未配置：缺少支付宝沙箱/生产配置，请先完成沙箱配置。',
    },
    { status: 503 },
  )
}

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>): Response {
  return Response.json({ code, message, ...extra }, { status })
}

export function textResponse(text: string): Response {
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 取订单存储；KV 绑定缺失时返回 500（部署时未配 kv_namespaces 就会走到这里）。 */
export function getStore(env: { ORDERS_KV?: KVNamespace }): OrderStore | Response {
  if (!env.ORDERS_KV) {
    return jsonError(500, 'STORE_NOT_CONFIGURED', '订单存储未配置：缺少 ORDERS_KV 绑定，请检查 wrangler.jsonc 的 kv_namespaces。')
  }
  return createKvOrderStore(env.ORDERS_KV)
}

export function isStore(value: OrderStore | Response): value is OrderStore {
  return typeof (value as OrderStore).findOrder === 'function'
}
