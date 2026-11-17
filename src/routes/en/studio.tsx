/**
 * /en/studio → /en（308，改版：调音台已下线，旅程为首页）。
 * 旧的调音台页面不再存在；语言 URL 的唯一入口是 /en/* 与 /zh/*。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/en/studio')({
  beforeLoad: () => {
    throw redirect({ to: '/en', statusCode: 308 })
  },
})
