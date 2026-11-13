/**
 * GET /robots.txt — 真实的 robots.txt（P0）。
 *
 * 之前没有这个路由，线上返回的是 Cloudflare 内容信号（AI Audit）的
 * 样板注释，没有任何 User-agent 规则与 Sitemap 指向。Worker 路由
 * 优先于 Cloudflare 边缘生成的 robots.txt；如果上线后仍看到样板，
 * 需在 Cloudflare 控制台关闭 AI Audit 的 robots.txt 内容信号注入
 *（见任务报告里的核查步骤）。
 * 明确放行 Googlebot / OAI-SearchBot / PerplexityBot / ClaudeBot /
 * Bingbot，不屏蔽任何 AI 爬虫。
 */
import { createFileRoute } from '@tanstack/react-router'
import { robotsTxt } from '../seo.mjs'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(robotsTxt(), {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      },
    },
  },
})
