/**
 * 机器人防护的服务端中间件（挂在根路由的 server.middleware 上，
 * 见 src/routes/__root.tsx——根路由对所有请求都匹配，所以它在
 * 路由之前跑，覆盖页面、API 路由与服务端处理函数）。
 *
 * 为什么不用 src/start.ts 的 requestMiddleware：实测 TanStack Start
 * 传给 middleware 的 context 里没有 cloudflare env（2026-11-13
 * 探针验证：context.cloudflare.env 为空；根路由 loader 读同一份
 * context，所以 P0 的站长验证 meta 目前也读不到变量——见报告）。
 * 这里直接用 `cloudflare:workers` 的 env 绑定（与支付、认证路由
 * 同一取法），KV 一定能拿到。
 *
 * 本文件只被路由的 server 选项引用，TanStack Start 编译器会把它
 * 从客户端 bundle 里剥离（验证方法：构建后 grep dist/client，
 * 不应出现 cloudflare / ORDERS_KV / botblock）。
 */
import { createMiddleware } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createRateLimiter, guardRequest } from '../bot-guard.mjs'

// 按 isolate 的内存限速器（见 bot-guard.mjs 里的权衡说明）。
const rateLimiter = createRateLimiter()

export const botGuardMiddleware = createMiddleware().server(async ({ request, next }) => {
  const verdict = await guardRequest({ request, env, rateLimiter })
  if (verdict) return verdict
  return next()
})
