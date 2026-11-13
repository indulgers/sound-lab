/**
 * 法律页（/terms、/privacy，SEO/GEO P1 结构 + Waffo 商家审核清单）。
 *
 * 与 AboutPage 同款渲染：调音台外壳之下的文章（article.blk
 * landing-copy），h1、导语、更新日期、各节（h2 + 段落 + 可选列表），
 * 底部互链另一法律页与回首页。locale 由路由按语言传入，SSR 即
 * 正确语言；文案全部来自 legal.mjs（单一事实来源）。
 */
import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { TERMS_PAGE, PRIVACY_PAGE, LEGAL_UPDATED } from './legal.mjs';
import { t, useLocale, localizePath } from './locale.mjs';

const PAGES = { terms: TERMS_PAGE, privacy: PRIVACY_PAGE };

export default function LegalPage({ page, locale }) {
  const [uiLocale] = useLocale();
  const loc = locale || uiLocale;
  const data = PAGES[page];
  const content = data.content[loc];
  const other = page === 'terms' ? 'privacy' : 'terms';
  // 文章渲染在调音台外壳之下：导航后滚动到顶部会落在调音台上，
  // 所以挂载（及切换 terms/privacy）时直接跳到文章开头。
  // 'instant'：文章在整页调音台之下，smooth 滑过去又慢又怪。
  // sticky header 的偏移靠已有的 .blk[id]{scroll-margin-top:86px}。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.getElementById(`${page}-page`)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [page]);
  return (
    <article className="blk landing-copy" id={`${page}-page`}>
      <div className="sec-head">
        <h1>{content.h1}</h1>
      </div>
      <p className="sec-sub">{content.lead}</p>
      <p className="legal-updated">{LEGAL_UPDATED[loc]}</p>
      {content.sections.map((section) => (
        <section key={section.h2}>
          <h2>{section.h2}</h2>
          {section.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {section.list ? (
            <ul>
              {section.list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <p>
        <Link to={localizePath(`/${other}`, loc)}>{t(loc, `footer.${other}`)}</Link>
        {' · '}
        <Link to={localizePath('/', loc)}>{t(loc, 'landing.backHome')}</Link>
      </p>
    </article>
  );
}
