/**
 * 裸路径 /sleep → /en/sleep（308，SEO/GEO P1）。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/sleep')({
  beforeLoad: () => {
    throw redirect({ to: '/en/sleep', statusCode: 308 })
  },
})
