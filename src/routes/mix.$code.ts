/**
 * 裸路径 /mix/:code → /en/mix/:code（308，SEO/GEO P1）。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 * 只有真实分享的混音才有 URL（也不进 sitemap）。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/mix/$code')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/en/mix/$code', params, statusCode: 308 })
  },
})
