/**
 * GET /honeypot — B6 蜜罐陷阱（见 src/bot-guard.mjs 文件头）。
 *
 * robots.txt 明确 Disallow /honeypot/，每页都有一个正常用户看不到、
 * 点不到的隐藏链接指向它（根路由 shell 里的 #honey）。只有无视
 * robots.txt 又到处跟链接的机器人会踩进来；踩中即把 IP 写进 KV
 * 封禁名单（30 天 TTL），此后它的每次请求都在路由之前被 403。
 *
 * 响应故意极小（21 字节纯文本，no-store）：陷阱本身不产生流量。
 * 已被封的 IP 再次踩进来时，middleware 会放它直通到这里（蜜罐路径
 * 不查封禁名单），记录按一小时一次节流，不会刷爆 KV 写额度。
 * 本路由不进 sitemap，不会被正常爬虫收录。
 */
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { clientIpFromHeaders, recordHoneypotHit, recordStat } from '../bot-guard.mjs'

export const Route = createFileRoute('/honeypot')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ip = clientIpFromHeaders(request.headers)
        const ua = request.headers.get('user-agent') || ''
        recordStat('honeypotHits')
        if (ip) {
          try {
            await recordHoneypotHit(env.ORDERS_KV, ip, ua, Date.now())
          } catch {
            // KV 写失败不影响响应：陷阱本身已记数，封禁下次再写。
            recordStat('kvErrors')
          }
        }
        return new Response('Nothing to see here.\n', {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      },
    },
  },
})
