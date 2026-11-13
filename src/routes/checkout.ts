/**
 * 裸路径 /checkout → /en/checkout（308，SEO/GEO P1），?pack= 原样保留。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 * 交易页不进索引（目标路由 head 带 noindex）。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/checkout')({
  validateSearch: (search: Record<string, unknown>) => ({
    pack: typeof search.pack === 'string' ? search.pack : '',
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/en/checkout', search, statusCode: 308 })
  },
})
