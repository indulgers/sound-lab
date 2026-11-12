/**
 * GET /api/region — 当前请求的支付地区（无鉴权，不含个人信息）。
 *
 * 地区只看服务端信号：Cloudflare 国家（request.cf.country，兜底
 * cf-ipcountry 头）。CN → { region: 'cn' }（支付宝 CNY），其他国家
 * → { region: 'overseas' }（Waffo USD）。
 * 本地开发 / 无国家信号时返回 country: null、region: 'overseas'，
 * source: 'unknown'，客户端再按时区 → 浏览器语言自己兜底。
 * 响应不缓存：国家是按请求算的。
 */
import { createFileRoute } from '@tanstack/react-router'
import { countryFromRequest, detectRegion } from '../../region.mjs'

export const Route = createFileRoute('/api/region')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const country = countryFromRequest(request)
        const { region } = detectRegion({ country: country ?? undefined })
        return Response.json({
          country,
          region,
          source: country ? 'country' : 'unknown',
        })
      },
    },
  },
})
