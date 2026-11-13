/**
 * 站长验证代码中间件（Google / Bing / 百度 verification meta）。
 *
 * 为什么需要它：P0 让根路由 loader 从 context.cloudflare.env 读三组
 * 验证代码，但实测本项目的默认 server-entry 从不往 loader context 里
 * 注入 cloudflare env（框架源码：middleware context 只来自
 * requestOpts.context，默认入口不传；2026-11-13 探针验证 hasEnv:false），
 * 所以 P0 的 meta 标签在变量设置后也不会出现。本中间件直接用
 * cloudflare:workers 的 env 绑定（与支付、认证、机器人防护同一取法），
 * 经 next({ context }) 把 verification 写进中间件上下文；框架把它
 * 包成 additionalContext = { serverContext } 铺进 loader 参数
 *（与 context 并列，见 load-server.js 的 getLoaderContext），根路由
 * loader 读 serverContext.verification。客户端导航时 loader 在浏览器
 * 里跑、中间件不执行，verification 为空——meta 只在 SSR 首屏 HTML
 * 里出现，而这正是 Search Console / 必应 / 百度验证要读的。
 *
 * 本文件只被路由的 server 选项引用，TanStack Start 编译器会把它
 * 从客户端 bundle 里剥离（验证方法：构建后 grep dist/client，
 * 不应出现 cloudflare / GOOGLE_SITE_VERIFICATION）。
 */
import { createMiddleware } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { verificationTokensFromEnv } from '../seo.mjs'

export const verificationMiddleware = createMiddleware().server(async ({ next }) => {
  return next({ context: { verification: verificationTokensFromEnv(env) } })
})
