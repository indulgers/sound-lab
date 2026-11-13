/**
 * 裸路径 /terms → /en/terms（308，SEO/GEO P1）。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  beforeLoad: () => {
    throw redirect({ to: '/en/terms', statusCode: 308 })
  },
})
