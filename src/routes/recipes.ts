/**
 * 裸路径 /recipes → /en/recipes（308，拆页）。
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/recipes')({
  beforeLoad: () => {
    throw redirect({ to: '/en/recipes', statusCode: 308 })
  },
})
