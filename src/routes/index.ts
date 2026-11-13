/**
 * 裸路径 / → /en（308，SEO/GEO P1）。
 *
 * 语言 URL 的唯一入口是 /en/* 与 /zh/*；裸路径只做永久重定向，
 * 不渲染内容。站内尚未收录任何 URL，重定向安全。不按 IP/国家自动
 * 重定向（Googlebot 从美国爬取，IP 重定向会藏起中文版）。
 * 支付回跳页 /return、/waffo-return 不走这里。
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/en', statusCode: 308 })
  },
})
