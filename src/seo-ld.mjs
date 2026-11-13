/**
 * JSON-LD（SEO/GEO P1）。
 *
 * 三种类型：WebApplication（首页，双语）、FAQPage（落地页）、
 * BreadcrumbList（子页）。JSON-LD 只放页面正文里也出现过的事实——
 * 不虚构评分、评论、作者头衔、价格以外的东西。
 *
 * 用法：路由 head() 里把 ldJsonForRoute(key, locale) 的返回值作为
 * meta 条目 { key: 'script:ld+json', tag: 'script', type: 'application/ld+json',
 * content: JSON.stringify(...) } 写入。
 */
import { SITE_URL } from './seo.mjs';
import { LANDING_PAGES, LANDING_PRESETS, ABOUT_PAGE, faqsForPage } from './landing.mjs';

const CONTEXT = 'https://schema.org';

/** WebApplication：首页，双语。应用类型按 schema.org 枚举写。 */
export function webApplicationLd(locale) {
  const en = locale === 'en';
  return {
    '@context': CONTEXT,
    '@type': 'WebApplication',
    name: 'Sound Cocktail',
    url: `${SITE_URL}/${locale}/`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web browser',
    inLanguage: en ? 'en' : 'zh-CN',
    description: en
      ? 'A free ambient sound mixer. Mix rain, fire, café voices and instruments into a cup, and save it.'
      : '一款免费的环境音混音器。把雨声、篝火、咖啡馆人声和乐器调成一杯，存下来。',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: en ? 'USD' : 'CNY',
      category: 'Free',
    },
    author: { '@type': 'Person', name: 'limer' },
  };
}

/** FAQPage：落地页的 FAQ（只写本页归属的条目）。 */
export function faqPageLd(key) {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: faqsForPage(key).map((f) => ({
      '@type': 'Question',
      name: f.q.en,
      acceptedAnswer: { '@type': 'Answer', text: f.a.en },
    })),
  };
}

/**
 * BreadcrumbList：子页。语言中立（URL 本身含语言前缀）；
 * 首页 → 该页，两级。
 */
export function breadcrumbLd(key, locale, label) {
  const base = `${SITE_URL}/${locale}`;
  const items = [{ '@type': 'ListItem', position: 1, name: 'Sound Cocktail', item: `${base}/` }];
  if (key !== 'home') {
    items.push({ '@type': 'ListItem', position: 2, name: label, item: `${base}/${key}` });
  }
  return { '@context': CONTEXT, '@type': 'BreadcrumbList', itemListElement: items };
}

/**
 * 按路由 key 取 JSON-LD 数组（每项已是对象，调用方 stringify）。
 * 面包屑的 label 由本模块从 landing.mjs 取（落地页用当语言 h1，
 * About 用当语言 h1，首页不用面包屑）。
 * - home：WebApplication
 * - 落地页：FAQPage（本页 FAQ）+ BreadcrumbList
 * - about：BreadcrumbList
 * - 其他：BreadcrumbList（仅在有 label 时返回）
 */
export function ldJsonForRoute(key, locale) {
  if (key === 'home') return [webApplicationLd(locale)];
  if (LANDING_PAGES[key]) {
    return [faqPageLd(key), breadcrumbLd(key, locale, LANDING_PAGES[key].content[locale].h1)];
  }
  if (key === 'about') return [breadcrumbLd('about', locale, ABOUT_PAGE.content[locale].h1)];
  return [];
}

/**
 * 落地页的 OG 描述：landing.mjs 的 seo.ogDescription。
 * 导出供路由层拼 og:title/og:description 时复用。
 */
export function landingOg(key, locale) {
  return LANDING_PAGES[key]?.seo?.[locale] || null;
}

/** About 页的 SEO（与 LANDING_PAGES 同形，供 seo.mjs 引用）。 */
export function aboutSeo(locale) {
  return ABOUT_PAGE.seo[locale];
}

/** 落地页预设配方（mix 对象，0–1），供路由层传给 SoundLabView。 */
export function landingPreset(key) {
  const p = LANDING_PRESETS[key];
  return p ? p.mix : null;
}

/** 落地页预设配方名（双语），供落地页"这页的配方"展示。 */
export function landingPresetName(key, locale) {
  const p = LANDING_PRESETS[key];
  if (!p) return '';
  return locale === 'en' ? p.nameEn : p.name;
}
