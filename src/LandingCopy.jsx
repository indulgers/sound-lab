/**
 * 场景落地页（SEO/GEO P1）。
 *
 * 独立路由页面：上方是本页旅程的 hero（LandingJourneyHero：旅程海报
 * + 播放/保存），下方是本页的 SEO 正文（h1、导语、3 节、FAQ、内链）。
 * 正文全部是 SSR HTML（由路由按语言传 locale，不依赖水合后的
 * useLocale，避免服务端英文、客户端中文的水合不一致）。
 *
 * 挂载时把本页预设配方"摆"到引擎配比：发 soundcocktail:apply-preset
 * 事件，外壳在 mount useLayoutEffect 里注册的监听器接住后调引擎
 * setMix（只摆配比，不播放）。"播放这个配方"与"存下配方"同样走
 * 事件（soundcocktail:play-mix / soundcocktail:save-mix），由外壳
 * 转交给音频引擎的 playRecipe / saveMixAs。
 */
import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import LandingJourneyHero from './LandingJourneyHero.jsx';
import { LANDING_KEYS, LANDING_PAGES, LANDING_PRESETS, faqsForPage } from './landing.mjs';
import { t, useLocale, localizePath } from './locale.mjs';

export default function LandingCopy({ page, locale }) {
  const [uiLocale] = useLocale();
  const loc = locale || uiLocale;
  const data = LANDING_PAGES[page];
  const preset = LANDING_PRESETS[page];
  const content = data.content[loc];
  const presetName = loc === 'en' ? preset.nameEn : preset.name;
  const faqs = faqsForPage(page);
  const others = LANDING_KEYS.filter((k) => k !== page);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('soundcocktail:apply-preset', { detail: { mix: preset.mix, name: presetName } }),
    );
  }, [page, preset, presetName]);

  function playMix() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('soundcocktail:play-mix', { detail: { name: presetName, mix: preset.mix } }),
    );
  }

  function saveMix() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('soundcocktail:save-mix', { detail: { name: presetName, mix: preset.mix } }),
    );
  }

  return (
    <>
      <LandingJourneyHero page={page} locale={loc} preset={preset} onPlay={playMix} onSave={saveMix} />
      <article className="blk landing-copy" id="landing">
      <div className="sec-head">
        <h1>{content.h1}</h1>
      </div>
      <p className="sec-sub landing-standfirst">{content.standfirst}</p>
      <p className="landing-preset">
        <strong>{t(loc, 'landing.presetLabel')}：</strong>
        {content.presetNote}
      </p>
      {content.sections.map((section) => (
        <section key={section.h2}>
          <h2>{section.h2}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <section id="faq">
        <h2>{t(loc, 'landing.faqTitle')}</h2>
        {faqs.map((faq) => (
          <div className="faq-item" key={faq.id}>
            <h3>{faq.q[loc]}</h3>
            <p>{faq.a[loc]}</p>
          </div>
        ))}
      </section>
      <nav aria-label={t(loc, 'landing.moreTitle')}>
        <h2>{t(loc, 'landing.moreTitle')}</h2>
        <ul className="landing-links">
          {others.map((key) => (
            <li key={key}>
              <Link to={localizePath(`/${key}`, loc)}>{LANDING_PAGES[key].content[loc].h1}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <p>
        <Link to={localizePath('/', loc)}>{t(loc, 'landing.backHome')}</Link>
      </p>
    </article>
    </>
  );
}
