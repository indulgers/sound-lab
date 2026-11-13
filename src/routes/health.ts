/**
 * GET /health — 健康检查（与 Express 版 GET /health 一致）。
 * 附带机器人防护的内存计数器（botGuard），供确认防护在工作；
 * 计数按 isolate，只含数量、不含 IP。
 */
import { createFileRoute } from '@tanstack/react-router'
import { getBotGuardStats } from '../bot-guard.mjs'

export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, botGuard: getBotGuardStats() })
      },
    },
  },
})
