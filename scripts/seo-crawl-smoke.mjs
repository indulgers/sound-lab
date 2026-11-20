#!/usr/bin/env node
/**
 * Run against a built preview or the public domain AFTER deployment.
 *
 *   node scripts/seo-crawl-smoke.mjs http://127.0.0.1:4173
 *   node scripts/seo-crawl-smoke.mjs https://soundcocktail.app
 *
 * Googlebot USER AGENT simulation, not proof of actual Google access/indexing.
 */
const base = (process.argv[2] || process.env.SOUNDLAB_SEO_BASE_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '')
const url = new URL(base)
if (!['http:','https:'].includes(url.protocol)) throw new Error('Expected HTTP URL')
const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
let failures = 0
function check(ok, label, details = '') {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + label + (details ? ' — ' + details : ''))
  if (!ok) failures++
}
async function get(path) {
  const response = await fetch(base + path, {
    headers: { 'user-agent': googlebot },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  })
  const body = await response.text()
  return { response, body }
}
for (const [path,titleHint] of [
  ['/en','Sound Cocktail'],
  ['/zh','Sound Cocktail'],
  ['/en/focus','focus'],
  ['/en/rain','rain'],
  ['/en/cafe','cafe'],
  ['/en/sleep','sleep'],
]) {
  const {response,body} = await get(path)
  const canonical = 'https://soundcocktail.app' + path
  check(response.status === 200, path + ' status', 'HTTP ' + response.status)
  check(!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body) &&
    !/noindex/i.test(response.headers.get('x-robots-tag')||''), path + ' indexable')
  check(body.includes('rel="canonical"') && body.includes(canonical), path + ' canonical')
  check(body.toLowerCase().includes(titleHint.toLowerCase()), path + ' content in SSR HTML')
  if (path === '/en' || path === '/zh') {
    check(body.includes('sc-seo-grid'), path + ' visible discovery section')
    for (const keyword of ['/focus','/rain','/cafe','/sleep','/relax','/recipes']) {
      check(body.includes(path + keyword), path + ' links to ' + keyword)
    }
    check(!body.includes('href="/honeypot"'), path + ' has no hidden crawler trap')
  }
}
const robots = await get('/robots.txt')
check(robots.response.status === 200, 'robots status')
for (const crawler of ['Googlebot','OAI-SearchBot','PerplexityBot','ClaudeBot','Bingbot']) {
  const part = robots.body.split(/\n\n/).find(x => x.startsWith('User-agent: ' + crawler + '\n'))
  check(Boolean(part?.split('\n').some(line => line.trim() === 'Disallow: /honeypot')), crawler + ' exact retired-trap disallow')
}
check(robots.body.includes('Sitemap: https://soundcocktail.app/sitemap.xml'), 'robots advertises canonical sitemap')
const sitemap = await get('/sitemap.xml')
check(sitemap.response.status === 200, 'sitemap status')
check(sitemap.body.includes('<loc>https://soundcocktail.app/en</loc>'), 'sitemap canonical home')
check(sitemap.body.includes('<loc>https://soundcocktail.app/zh/focus</loc>'), 'sitemap localized intent page')
check(!sitemap.body.includes('<lastmod>'), 'sitemap does not invent daily modification dates')
const trap = await get('/honeypot')
check(trap.response.status === 410, 'retired trap never bans visitor', 'HTTP ' + trap.response.status)
console.log(failures ? ('FAIL: ' + failures + ' crawl checks.') : 'PASS: all crawl-discovery checks.')
if (failures) process.exitCode = 1
