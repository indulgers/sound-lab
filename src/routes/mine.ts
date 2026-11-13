/**
 * 裸路径 /mine → /en/mine（308，拆页）。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/mine')({
  beforeLoad: () => {
    throw redirect({ to: '/en/mine', statusCode: 308 })
  },
})
