/**
 * Safe discovery mode while Sound Cocktail is not indexed.
 *
 * Keep lightweight abusive-UA checks and per-isolate rate limiting, but stop
 * consulting historical KV IP bans. The previous honeypot had a mismatch:
 * robots.txt disallowed /honeypot/ while HTML linked to /honeypot and crawler-
 * specific rules didn't inherit the generic disallow. This could lead to a
 * 30-day 403 on an otherwise legitimate crawler IP.
 *
 * Disabling KV IP bans is deliberate for the SEO incident: old records still
 * exist in KV but are never consulted, and the legacy /honeypot route is
 * retired separately. Edge WAF controls remain independent.
 */
import { createMiddleware } from '@tanstack/react-start'
import { createRateLimiter, guardRequest } from '../bot-guard.mjs'

const rateLimiter = createRateLimiter()

export const botGuardMiddleware = createMiddleware().server(async ({ request, next }) => {
  const verdict = await guardRequest({ request, env: null, rateLimiter })
  if (verdict) return verdict
  return next()
})
