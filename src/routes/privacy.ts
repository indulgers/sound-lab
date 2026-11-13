/**
 * 裸路径 /privacy → /en/privacy（308，SEO/GEO P1）。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  beforeLoad: () => {
    throw redirect({ to: '/en/privacy', statusCode: 308 })
  },
})
