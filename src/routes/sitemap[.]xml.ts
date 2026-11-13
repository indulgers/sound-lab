/**
 * GET /sitemap.xml — 动态 sitemap（P0）。
 *
 * 只列公开可收录页（/ 与 /focus），绝对 URL + lastmod；
 * /checkout、/return、/waffo-return 与全部 /api/* 不进索引，
 * 故不列入。P1 加 /en + /zh 与场景落地页时，在 seo.mjs 的
 * PUBLIC_PATHS 里扩展。
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
