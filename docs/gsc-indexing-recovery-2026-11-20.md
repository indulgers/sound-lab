# 2026-11-20: Sound Cocktail Google Search Console discovery incident

## Reported symptom and limits of evidence

GSC Domain property: soundcocktail.app. URL Inspection for
https://soundcocktail.app/en showed:
- Not on Google / URL is unknown to Google
- No detected referring sitemap
- No detected referring page
- Last crawl: Not applicable
- Indexing request already submitted

This is NOT evidence of a penalty or a 403 Googlebot response. Google has
not added the URL to its processed crawl/index record; discovery fields can be
undetermined until processing. Check "Test Live URL" for current crawl access.

User's direct curl to the custom domain and the associated workers.dev host
showed HTTP 200 for /en, /robots.txt and /sitemap.xml. Both expose the
same canonical home, sitemap URLs and robots body. This establishes basic
HTTP health, not confirmed Google crawlability or indexing.

## Verified source-level hazards (production main before the fix)

1. Root SSR HTML hid a link to /honeypot on every page.
2. robots.txt disallowed /honeypot/ (trailing slash), not /honeypot.
3. Per-agent groups for Googlebot/Bingbot/OAI-SearchBot/etc used Allow: /
   without their own honeypot disallow. Google crawlers follow only their
   most specific matching group, not a merged global * group.
4. Visiting /honeypot wrote a 30-day IP ban in ORDERS_KV.
5. Guard middleware checked these bans before checking crawler UA allowlists,
   causing a potential 403 for shared/reassigned IPs.
6. Sitemap set lastmod to the request date for every page, which was not a
   truthful statement of content updates.
7. The homepage was primarily full-screen immersion, with limited visible
   semantic links to existing SEO intent pages; sitemap alone was the primary
   discovery path.

These are genuine vulnerabilities, but the evidence does not prove Googlebot
actually hit the trap. Review WAF/Worker logs, Google Live URL inspection
and GSC crawl stats before asserting root cause.

## Scoped patch in fix/seo-crawl-discovery-p0-20261120

- Root SSR no longer links to the honeypot.
- /honeypot returns 410 Gone, no KV reads/writes, X-Robots-Tag noindex.
- Production guard no longer consults historical KV IP bans. Basic blocked-UA
  checks and per-isolate rate limits remain; Cloudflare WAF configuration is
  unchanged. Historical KV records expire naturally and do not affect traffic.
- robots.txt explicitly disallows the retired /honeypot path in every named
  crawler group and * group; important site pages remain allowed.
- Sitemap defaults to no lastmod; it only includes a date when an actual
  externally known editorial update date is supplied.
- Home page SSR renders a visible, keyboard-accessible, responsive discovery
  section linking to /focus, /rain, /cafe, /sleep, /relax, /recipes, plus
  About, Sources, Terms and Privacy, all localized.
- Tests check the exact crawl logic and SSR link presence. A Googlebot-UA
  HTTP smoke script verifies status, canonical, noindex, sitemap, robots
  and homepage internal links on an actual preview or deployed site.

No payment, auth, subscriptions, long media, or the pending V2 scene refactor
are included. This is intentionally separate from PR #13.

## Release procedure: no claim of indexing until Google confirms

1. Review the PR and CI. Merge to main only after the required checks pass.
2. Confirm Cloudflare's deploy workflow succeeded for main and the custom
   domain points to the same version. Do not assume a CI green deploy implies
   a domain binding is correct.
3. From a machine with public internet, run:

       npm run seo:check -- https://soundcocktail.app

   Simulated Googlebot UA is a smoke test, not Google's real bot or IP.
   For production host, check Cloudflare Security Events for 403/429/
   managed challenges on Googlebot and Google-InspectionTool; validate true
   Google crawlers via Google's published verification methods. Correct
   WAF rules that challenge them.

4. In GSC under the Domain property soundcocktail.app:
   - Sitemaps -> submit sitemap.xml (check "Success" and discovered pages).
   - URL Inspection -> https://soundcocktail.app/en -> "Test Live URL".
     If it shows "URL is available to Google", inspect fetched HTML and
     screenshot, then request indexing once. Existing request is recorded;
     repeated daily requests are not a ranking strategy.
   - Inspect /zh and /en/focus as representative pages.
   - Examine Page Indexing and Settings -> Crawl stats for discovered/crawled
     dates, 403/429/5xx, Google-selected canonical, and status transitions.

5. Recheck 48–72h later and weekly for the first month. Indexing is not
   guaranteed or immediate; Google may take days/weeks. If a live check
   fails with 403/429, fix WAF or the underlying code before expanding
   content. If pages crawl but are excluded, investigate content quality,
   duplicate URLs, and internal linking instead.

## Product SEO growth after index access is confirmed

Already-published routes with playable presets:
  /en/rain, /en/focus, /en/cafe, /en/sleep, /en/relax, /en/recipes

Build a separate P1 growth PR with:
- /en/tools/rain-cafe-sound-mixer — real independent rain/cafe sliders;
  no SEO-only intro page.
- /en/tools/ambient-sound-mixer — configurable rain, forest, cafe and
  environment sounds; shareable recipe.
- Chiang Mai rainy-cafe and Bali wellness pages once the **actual** AI
  scenes are produced and disclosed, avoiding duplicate descriptions of
  Royal Park Rajapruek and Bali rice terraces.
- Original source/permission disclosures, proper SSR semantic content,
  canonical/hreflang, and clear internal links.

Do not invent monthly keyword searches, KD, CPC, ranking or GSC clicks.
Track impression -> click -> play -> customize -> share using actual data.
Do not generate dozens of thin locale pages or spam low-quality backlinks.

## Sources

- https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
- https://support.google.com/webmasters/answer/9012289
- https://support.google.com/webmasters/answer/7440203
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

