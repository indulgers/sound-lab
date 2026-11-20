/**
 * Regression tests for 2026-11 SEO discovery incident.
 * We test the exact production source, not a generated SEO-only fixture.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { robotsTxt, sitemapXml, PUBLIC_PATHS } from '../src/seo.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = path => readFileSync(resolve(root, path), 'utf8')

test('SEO incident: all six crawler groups avoid the retired honeypot URL', () => {
  const robots = robotsTxt()
  for (const agent of ['*','Googlebot','OAI-SearchBot','PerplexityBot','ClaudeBot','Bingbot']) {
    const group = robots.split(/\n\n/).find(block => block.startsWith('User-agent: ' + agent + '\n'))
    assert.ok(group, 'missing crawler group ' + agent)
    assert.match(group, /^Allow: \/$/m)
    assert.match(group, /^Disallow: \/honeypot$/m)
    assert.doesNotMatch(group, /Disallow: \/honeypot\//)
  }
  assert.match(robots, /Sitemap: https:\/\/soundcocktail\.app\/sitemap\.xml/)
})

test('SEO incident: no hidden honeypot link remains in SSR root', () => {
  const rootRoute = read('src/routes/__root.tsx')
  assert.doesNotMatch(rootRoute, /href=["']\/honeypot/)
  assert.doesNotMatch(rootRoute, /id=["']honey["']/)
  const retiredRoute = read('src/routes/honeypot.ts')
  assert.match(retiredRoute, /status: 410/)
  assert.doesNotMatch(retiredRoute, /recordHoneypotHit|ORDERS_KV/)
})

test('SEO incident: production middleware ignores historical KV IP bans', () => {
  const middleware = read('src/server/bot-guard-middleware.ts')
  assert.match(middleware, /guardRequest\(\{ request, env: null, rateLimiter \}\)/)
  assert.doesNotMatch(middleware, /import \{ env \} from ['"]cloudflare:workers['"]/)
})

test('SEO discovery: homepage links to all existing playable, indexable use-case pages', () => {
  const home = read('src/HomePage.jsx')
  for (const route of ['/rain','/focus','/cafe','/sleep','/relax','/recipes']) {
    assert.ok(home.includes("path: '" + route + "'"), 'missing SSR link to ' + route)
  }
  assert.match(home, /<nav className="sc-seo-grid"/)
  assert.match(home, /<h2 id="sc-seo-discover-heading">/)
  assert.match(home, /<Link key=\{item\.path\}/)
  const paths = ['/en','/zh','/en/focus','/zh/focus','/en/sleep','/zh/sleep','/en/rain','/zh/rain','/en/cafe','/zh/cafe']
  for (const path of paths) assert.ok(PUBLIC_PATHS.includes(path), path)
})

test('SEO incident: sitemap uses facts for lastmod rather than time of request', () => {
  const xml = sitemapXml()
  assert.doesNotMatch(xml, /<lastmod>/)
  assert.ok(xml.includes('<loc>https://soundcocktail.app/en</loc>'))
  assert.equal((xml.match(/<url>/g) || []).length, PUBLIC_PATHS.length)
  assert.match(sitemapXml(new Date('2026-11-20T00:00:00Z')), /<lastmod>2026-11-20<\/lastmod>/)
})
