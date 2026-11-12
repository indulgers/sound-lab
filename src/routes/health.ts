/**
 * GET /health — 健康检查（与 Express 版 GET /health 一致）。
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true })
      },
    },
  },
})
