/**
 * 裸路径 → 语言 URL 的 308 重定向（SEO/GEO P1）。
 *
 * 纯模块（不依赖 React / 路由器），裸路由文件（src/routes/*.ts）
 * 只调用这里，node:test 直接测这里。
 *
 * 规则：
 * - `/` → `/en`（默认语言；站内尚未收录任何 URL，重定向安全）。
 * - 裸内容页（/focus、/sleep、/relax、/rain、/cafe、/about、/terms、/privacy）→ 同名 /en 版。
 * - /checkout → /en/checkout（search 原样保留，?pack= 不丢）。
 * - /mix/:code → /en/mix/:code。
 * - 已带语言前缀（/en/*、/zh/*）与支付回跳页（/return、/waffo-return）、
 *   /api/*、爬虫文件、/health 不重定向，返回 null。
 * - 不按 IP/国家自动重定向：Googlebot 从美国爬取、不带 Accept-Language，
 *   IP 重定向会藏起中文版。
 */
import { localeFromPath, stripLocalePrefix } from './locale.mjs';

/** 裸路径可重定向的内容页（段名即路由段）。 */
export const REDIRECTABLE_BARE = ['focus', 'sleep', 'relax', 'rain', 'cafe', 'about', 'terms', 'privacy'];

export const REDIRECT_STATUS = 308;

/**
 * 给定请求路径，返回 { to, statusCode: 308 } 或 null（不重定向）。
 * pathname 不带 query；checkout 的 search 由路由层原样带上。
 */
export function redirectForPath(pathname) {
  if (typeof pathname !== 'string') return null;
  const path = pathname.replace(/\/+$/, '') || '/';
  if (localeFromPath(path)) return null;
  if (path === '/') return { to: '/en', statusCode: REDIRECT_STATUS };
  if (path === '/checkout') return { to: '/en/checkout', statusCode: REDIRECT_STATUS };
  const mix = path.match(/^\/mix\/([^/]+)$/);
  if (mix) return { to: `/en/mix/${mix[1]}`, statusCode: REDIRECT_STATUS };
  const seg = path.slice(1);
  if (REDIRECTABLE_BARE.includes(seg)) return { to: `/en/${seg}`, statusCode: REDIRECT_STATUS };
  return null;
}

/** 语言前缀的反向操作：供路由层判断当前路径是否已本地化。 */
export function isLocalizedPath(pathname) {
  return localeFromPath(pathname) !== null;
}

export { stripLocalePrefix };
