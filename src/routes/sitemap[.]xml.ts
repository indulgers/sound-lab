/**
 * GET /sitemap.xml — 动态 sitemap（P0 + P1）。
 *
 * 全部可收录页 × 两种语言（/en/* 与 /zh/*），绝对 URL + lastmod，
 * 每个 <url> 带 xhtml:link hreflang 标注（见 seo.mjs 的 sitemapXml）。
 * /checkout、/return、/waffo-return、/mix/:code 与全部 /api/* 不进索引，
 * 故不列入。
 */
import { createFileRoute } from '@tanstack/react-router'
import { sitemapXml } from '../seo.mjs'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(sitemapXml(), {
          headers: { 'content-type': 'application/xml; charset=utf-8' },
        })
      },
    },
  },
})
