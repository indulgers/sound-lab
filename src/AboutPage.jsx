/**
 * About 页（/about，SEO/GEO P1）。
 *
 * 独立路由页面：作者身份、声音来源、价格与医疗免责。
 * 内容取自 landing.mjs 的 ABOUT_PAGE（与首页 About 区块同一事实
 * 来源，不矛盾：同样说免费混音器、22 种声音、不用下载、不用注册）。
 * locale 由路由按语言传入，SSR 即正确语言。
 */
import { Link } from '@tanstack/react-router';
import { ABOUT_PAGE } from './landing.mjs';
import { t, useLocale, localizePath } from './locale.mjs';

export default function AboutPage({ locale }) {
  const [uiLocale] = useLocale();
  const loc = locale || uiLocale;
  const content = ABOUT_PAGE.content[loc];
  return (
    <article className="blk landing-copy" id="about-page">
      <div className="sec-head">
        <h1>{content.h1}</h1>
      </div>
      <p className="sec-sub">{content.lead}</p>
      {content.sections.map((section) => (
        <section key={section.h2}>
          <h2>{section.h2}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <p>
        <Link to={localizePath('/', loc)}>{t(loc, 'landing.backHome')}</Link>
      </p>
    </article>
  );
}
