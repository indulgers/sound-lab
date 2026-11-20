/**
 * Retired honeypot: discovery-safe 410, no KV writes and no IP bans.
 *
 * This URL was previously linked invisibly from every page and had a robots
 * path mismatch, potentially tricking compliant crawlers into 30-day blocks.
 * It remains a 410 route only to retire any previously discovered URL.
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/honeypot')({
  server: {
    handlers: {
      GET: async () => new Response('Gone.\n', {
        status: 410,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=86400',
          'x-robots-tag': 'noindex',
        },
      }),
    },
  },
})
